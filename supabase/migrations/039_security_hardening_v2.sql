-- =============================================================================
-- PeoplePulse — Database Schema Migration 039
-- Security Hardening v2: Multi-Tenant RLS & Privacy Invariant Enforcement
--
-- Fixes:
-- 1. Cross-Tenant Profile Breach: Replaces global is_admin() profile policies
--    with organization-scoped membership queries.
-- 2. Billing & Plan Protection: BEFORE UPDATE trigger prevents unauthorized
--    modification of plan, max_seats, and max_teams columns.
-- 3. Account Takeover Guard: Prevents password overwriting of existing accounts
--    in provision_and_accept_invitation.
-- 4. Privacy Threshold Enforcement: Implements n >= 3 suppression on team comparison
--    scores to prevent de-anonymization.
-- 5. Revocation of Over-Granted 'anon' Privileges from Migration 007.
-- 6. Restrict Sensitive RPCs (check_account_exists, dispatch_daily_checkin_notifications)
--    from public/anon access.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. FIX CROSS-TENANT PROFILE RLS POLICIES
-- -----------------------------------------------------------------------------
drop policy if exists "profiles_select_admin" on public.profiles;
drop policy if exists "profiles_update_admin" on public.profiles;
drop policy if exists "profiles_delete_admin" on public.profiles;
drop policy if exists "profiles_insert_admin" on public.profiles;
drop policy if exists "profiles_select_direct_reports" on public.profiles;

-- Allow members within the same active organization to see each other's profiles
create policy "profiles_select_coworkers_and_self"
  on public.profiles
  for select
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.organization_members my_m
      join public.organization_members their_m
        on my_m.organization_id = their_m.organization_id
      where my_m.user_id = auth.uid()
        and their_m.user_id = profiles.id
        and my_m.is_active = true
        and their_m.is_active = true
    )
  );

-- Only organization admins/owners can update profiles of members in their organization
create policy "profiles_update_org_admin"
  on public.profiles
  for update
  using (
    exists (
      select 1
      from public.organization_members my_m
      join public.organization_members their_m
        on my_m.organization_id = their_m.organization_id
      where my_m.user_id = auth.uid()
        and their_m.user_id = profiles.id
        and my_m.role in ('owner', 'admin')
        and my_m.is_active = true
    )
  )
  with check (
    exists (
      select 1
      from public.organization_members my_m
      join public.organization_members their_m
        on my_m.organization_id = their_m.organization_id
      where my_m.user_id = auth.uid()
        and their_m.user_id = profiles.id
        and my_m.role in ('owner', 'admin')
        and my_m.is_active = true
    )
  );

-- -----------------------------------------------------------------------------
-- 2. LOCK ORGANIZATION BILLING & QUOTA COLUMNS
-- -----------------------------------------------------------------------------
create or replace function public.protect_organization_billing_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (old.plan is distinct from new.plan or
      old.max_seats is distinct from new.max_seats or
      old.max_teams is distinct from new.max_teams or
      old.subscription_status is distinct from new.subscription_status or
      old.stripe_customer_id is distinct from new.stripe_customer_id or
      old.stripe_subscription_id is distinct from new.stripe_subscription_id) then
    
    -- Allow service_role, postgres, or supabase_admin only
    if current_user not in ('service_role', 'postgres', 'supabase_admin') and 
       coalesce(auth.jwt() ->> 'role', '') is distinct from 'service_role' then
      raise exception 'SECURITY_VIOLATION: Organization plan, seat limits, and billing fields can only be modified via backend webhook or service role.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_organization_billing on public.organizations;
create trigger trg_protect_organization_billing
  before update on public.organizations
  for each row
  execute function public.protect_organization_billing_fields();

-- -----------------------------------------------------------------------------
-- 3. FIX ACCOUNT TAKEOVER IN PROVISION_AND_ACCEPT_INVITATION
-- -----------------------------------------------------------------------------
create or replace function public.provision_and_accept_invitation(
  p_token text,
  p_password text,
  p_full_name text default null
)
returns json
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_clean_token text;
  v_clean_password text;
  v_token_hash text;
  v_invite record;
  v_org_name text;
  v_user_id uuid;
  v_existing_user_id uuid;
  v_hashed_pw text;
  v_display_name text;
begin
  -- 1. Validate inputs
  v_clean_token := trim(coalesce(p_token, ''));
  v_clean_password := trim(coalesce(p_password, ''));

  if length(v_clean_token) < 16 then
    raise exception 'INVALID_TOKEN: Invitation token is invalid or missing.';
  end if;

  -- 2. Resolve invitation by token hash
  v_token_hash := encode(digest(v_clean_token, 'sha256'), 'hex');

  select * into v_invite
  from public.invitations
  where token_hash = v_token_hash
    and accepted_at is null
    and expires_at > now()
  for update;

  if v_invite.id is null then
    raise exception 'INVALID_OR_EXPIRED_INVITATION: This invitation link is either expired, already used, or invalid.';
  end if;

  -- 3. Resolve organization name
  select name into v_org_name
  from public.organizations
  where id = v_invite.organization_id;

  v_display_name := coalesce(nullif(trim(p_full_name), ''), split_part(v_invite.email, '@', 1));

  -- 4. Check if user already exists in auth.users
  select id into v_existing_user_id
  from auth.users
  where lower(email) = lower(v_invite.email)
  limit 1;

  if v_existing_user_id is not null then
    -- If caller is logged in as this user, associate them to the organization
    if auth.uid() = v_existing_user_id then
      v_user_id := v_existing_user_id;
    else
      -- CRITICAL SECURITY FIX: Do NOT overwrite the password of an existing user!
      -- Direct them to log in first with their existing password.
      return json_build_object(
        'status', 'account_exists_login_required',
        'email', v_invite.email,
        'organization_name', v_org_name,
        'message', 'An account already exists for this email address. Please log in with your existing credentials to accept the invitation.'
      );
    end if;
  else
    -- User does not exist: Provision new user account safely
    if length(v_clean_password) < 6 then
      raise exception 'WEAK_PASSWORD: Password must be at least 6 characters.';
    end if;

    v_hashed_pw := extensions.crypt(v_clean_password, extensions.gen_salt('bf', 10));
    v_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      lower(v_invite.email),
      v_hashed_pw,
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      json_build_object('name', v_display_name, 'role', v_invite.role)::jsonb,
      now(),
      now()
    );

    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      v_user_id,
      v_user_id,
      json_build_object('sub', v_user_id::text, 'email', lower(v_invite.email))::jsonb,
      'email',
      v_user_id::text,
      now(),
      now(),
      now()
    ) on conflict (provider, provider_id) do nothing;

    -- Create profile
    insert into public.profiles (id, name, email, role, is_active)
    values (v_user_id, v_display_name, lower(v_invite.email), v_invite.role, true)
    on conflict (id) do update set
      name = coalesce(excluded.name, public.profiles.name),
      is_active = true;
  end if;

  -- 5. Add to organization_members
  insert into public.organization_members (
    organization_id,
    user_id,
    role,
    is_active,
    joined_at
  ) values (
    v_invite.organization_id,
    v_user_id,
    v_invite.role,
    true,
    now()
  ) on conflict (organization_id, user_id) do update set
    role = excluded.role,
    is_active = true;

  -- 6. Assign team if present
  if v_invite.team_id is not null then
    insert into public.team_members (team_id, user_id, joined_at)
    values (v_invite.team_id, v_user_id, now())
    on conflict (team_id, user_id) do nothing;
  end if;

  -- 7. Mark invitation accepted
  update public.invitations
  set accepted_at = now()
  where id = v_invite.id;

  return json_build_object(
    'status', 'success',
    'user_id', v_user_id,
    'email', v_invite.email,
    'organization_id', v_invite.organization_id,
    'organization_name', v_org_name,
    'role', v_invite.role
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. PRIVACY THRESHOLD (n >= 3) IN GET_ORG_TEAM_COMPARISON
-- -----------------------------------------------------------------------------
create or replace function public.get_org_team_comparison(
  p_org_id uuid,
  p_cycle_start text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_authorized boolean;
  v_target_date date;
  v_cycle_start date;
  v_cycle_end date;
  v_teams json;
  v_org_score integer := null;
  v_total_checkins integer := 0;
  v_sentiment_split json := '[]'::json;
  v_pos_count integer := 0;
  v_neu_count integer := 0;
  v_neg_count integer := 0;
  v_sentiment_total integer := 0;
  v_trend json := '[]'::json;
begin
  -- 1. Ensure caller is authenticated
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED: User is not logged in.';
  end if;

  -- 2. Verify caller belongs to the requested organization
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = p_org_id
      and om.user_id = auth.uid()
      and om.is_active = true
  ) into v_is_authorized;

  if not v_is_authorized then
    raise exception 'UNAUTHORIZED: Caller is not an active member of this organization.';
  end if;

  -- 3. Resolve Saturday cycle start date
  if p_cycle_start is not null and p_cycle_start ~ '^\d{4}-\d{2}-\d{2}$' then
    v_cycle_start := p_cycle_start::date;
  else
    v_target_date := current_date;
    v_cycle_start := (v_target_date - (((extract(dow from v_target_date)::int + 1) % 7) || ' days')::interval)::date;
  end if;

  v_cycle_end := v_cycle_start + 6;

  -- 4. Calculate team-by-team engagement with strict n >= 3 privacy threshold:
  -- Teams with < 3 checkins have scores redacted (null) to prevent de-anonymization.
  select coalesce(
    json_agg(
      json_build_object(
        'team_id', sub.team_id,
        'team', sub.team_name,
        'score', case when sub.total_checkins >= 3 then sub.avg_score else null end,
        'total_checkins', sub.total_checkins,
        'privacy_met', sub.total_checkins >= 3
      )
    ),
    '[]'::json
  ) into v_teams
  from (
    select
      t.id as team_id,
      t.name as team_name,
      count(c.id)::int as total_checkins,
      coalesce(round(avg(s.engagement_score)), 0)::int as avg_score
    from public.teams t
    left join public.checkins c on c.team_id = t.id
      and c.organization_id = t.organization_id
      and (c.week_start >= v_cycle_start and c.week_start <= v_cycle_end)
    left join public.sentiment_results s on s.checkin_id = c.id
    where t.organization_id = p_org_id
    group by t.id, t.name
    order by avg_score desc nulls last, total_checkins desc, t.name asc
  ) sub;

  -- 5. Calculate overall org average engagement (strictly with sample size protection)
  select
    round(avg(s.engagement_score))::int,
    count(c.id)::int
  into v_org_score, v_total_checkins
  from public.checkins c
  join public.sentiment_results s on s.checkin_id = c.id
  where c.organization_id = p_org_id
    and (c.week_start >= v_cycle_start and c.week_start <= v_cycle_end);

  if v_total_checkins is null or v_total_checkins < 3 then
    v_org_score := null; -- Redact score if organization has fewer than 3 submissions
  end if;
  if v_total_checkins is null then
    v_total_checkins := 0;
  end if;

  -- 6. Calculate sentiment breakdown (only if total check-ins >= 3)
  if v_total_checkins >= 3 then
    select
      count(*) filter (where s.sentiment_label = 'positive')::int,
      count(*) filter (where s.sentiment_label = 'neutral')::int,
      count(*) filter (where s.sentiment_label = 'negative')::int
    into v_pos_count, v_neu_count, v_neg_count
    from public.checkins c
    join public.sentiment_results s on s.checkin_id = c.id
    where c.organization_id = p_org_id
      and (c.week_start >= v_cycle_start and c.week_start <= v_cycle_end);

    v_sentiment_total := v_pos_count + v_neu_count + v_neg_count;

    if v_sentiment_total > 0 then
      v_sentiment_split := json_build_array(
        json_build_object('name', 'Positive', 'value', round((v_pos_count::numeric / v_sentiment_total) * 100), 'color', '#6FAE8C', 'count', v_pos_count),
        json_build_object('name', 'Neutral', 'value', round((v_neu_count::numeric / v_sentiment_total) * 100), 'color', '#E8B960', 'count', v_neu_count),
        json_build_object('name', 'Negative', 'value', round((v_neg_count::numeric / v_sentiment_total) * 100), 'color', '#D96B6B', 'count', v_neg_count)
      );
    end if;
  end if;

  -- 7. Calculate weekly engagement trend across past cycles
  select coalesce(
    json_agg(
      json_build_object(
        'week', sub_trend.cycle_label,
        'cycle_start', sub_trend.wk_start,
        'score', case when sub_trend.checkin_count >= 3 then sub_trend.avg_score else null end,
        'total_checkins', sub_trend.checkin_count,
        'privacy_met', sub_trend.checkin_count >= 3
      )
      order by sub_trend.wk_start asc
    ),
    '[]'::json
  ) into v_trend
  from (
    select
      cycles.wk_start,
      to_char(cycles.wk_start, 'Mon DD') as cycle_label,
      count(c.id)::int as checkin_count,
      coalesce(round(avg(s.engagement_score)), 0)::int as avg_score
    from (
      select (v_cycle_start - (i * 7 || ' days')::interval)::date as wk_start
      from generate_series(4, 0, -1) as i
    ) cycles
    left join public.checkins c on c.organization_id = p_org_id
      and c.week_start >= cycles.wk_start
      and c.week_start < cycles.wk_start + 7
    left join public.sentiment_results s on s.checkin_id = c.id
    group by cycles.wk_start
  ) sub_trend;

  return json_build_object(
    'status', 'success',
    'cycle_start', v_cycle_start,
    'cycle_end', v_cycle_end,
    'cycle_label', to_char(v_cycle_start, 'Mon DD') || ' – ' || to_char(v_cycle_end, 'Mon DD, YYYY'),
    'teams', v_teams,
    'org_score', v_org_score,
    'total_checkins', v_total_checkins,
    'sentiment_split', v_sentiment_split,
    'engagement_trend', v_trend
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. REVOKE DANGEROUS ANON PRIVILEGES & TIGHTEN RPC GRANTS
-- -----------------------------------------------------------------------------
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;

revoke all on table public.profiles from anon;
revoke all on table public.teams from anon;
revoke all on table public.checkins from anon;
revoke all on table public.sentiment_results from anon;
revoke all on table public.survey_questions from anon;
revoke all on table public.imports from anon;
revoke all on table public.team_members from anon;
revoke all on table public.organizations from anon;
revoke all on table public.organization_members from anon;
revoke all on table public.organization_usage from anon;

-- Tighten RPCs that were previously callable by anon
revoke execute on function public.check_account_exists(text) from public, anon;
grant execute on function public.check_account_exists(text) to authenticated;

revoke execute on function public.dispatch_daily_checkin_notifications(uuid, text) from public, anon;
grant execute on function public.dispatch_daily_checkin_notifications(uuid, text) to authenticated;

-- Record migration
insert into supabase_migrations.schema_migrations (version, name)
values ('039', 'security_hardening_v2')
on conflict (version) do nothing;
