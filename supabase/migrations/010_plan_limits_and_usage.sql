-- =============================================================================
-- PeoplePulse — Database Schema Migration 010
-- Plan Limits, Monthly AI Usage Tracking, and Server-Side Quota Enforcement
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ORGANIZATION USAGE TABLE
-- Tracks periodic resource consumption per tenant (e.g. monthly AI sentiment calls).
-- -----------------------------------------------------------------------------
create table if not exists public.organization_usage (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  period_month date not null, -- Normalized to 1st of month (YYYY-MM-01)
  ai_analyses_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unique_org_usage_month unique (organization_id, period_month)
);

create index if not exists idx_org_usage_lookup on public.organization_usage(organization_id, period_month);

alter table public.organization_usage enable row level security;
grant all on table public.organization_usage to anon, authenticated;

drop policy if exists "usage_select_admin" on public.organization_usage;
create policy "usage_select_admin"
  on public.organization_usage
  for select
  using (public.is_org_admin(organization_id));

-- -----------------------------------------------------------------------------
-- 2. SERVER-SIDE SEAT LIMIT ENFORCEMENT TRIGGER
-- Enforces that active members cannot exceed organizations.max_seats.
-- -----------------------------------------------------------------------------
create or replace function public.enforce_organization_seat_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max_seats integer;
  v_current_count integer;
begin
  -- Only validate on new active memberships or reactivation
  if (TG_OP = 'INSERT' and new.is_active = true) or
     (TG_OP = 'UPDATE' and old.is_active = false and new.is_active = true) then

    select max_seats into v_max_seats
    from public.organizations
    where id = new.organization_id;

    if v_max_seats is not null then
      select count(*) into v_current_count
      from public.organization_members
      where organization_id = new.organization_id
        and is_active = true
        and id != coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

      if v_current_count >= v_max_seats then
        raise exception 'SEAT_LIMIT_REACHED: Organization has reached its maximum capacity of % seat(s). Upgrade plan to add more members.', v_max_seats;
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_org_seat_limit on public.organization_members;
create trigger trg_enforce_org_seat_limit
  before insert or update on public.organization_members
  for each row
  execute function public.enforce_organization_seat_limit();

-- -----------------------------------------------------------------------------
-- 3. SERVER-SIDE TEAM LIMIT ENFORCEMENT TRIGGER
-- Enforces that team count cannot exceed organizations.max_teams.
-- -----------------------------------------------------------------------------
create or replace function public.enforce_organization_team_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max_teams integer;
  v_current_count integer;
begin
  select max_teams into v_max_teams
  from public.organizations
  where id = new.organization_id;

  if v_max_teams is not null then
    select count(*) into v_current_count
    from public.teams
    where organization_id = new.organization_id;

    if v_current_count >= v_max_teams then
      raise exception 'TEAM_LIMIT_REACHED: Organization has reached its maximum of % team(s). Upgrade to Pro for unlimited teams.', v_max_teams;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_org_team_limit on public.teams;
create trigger trg_enforce_org_team_limit
  before insert on public.teams
  for each row
  execute function public.enforce_organization_team_limit();

-- -----------------------------------------------------------------------------
-- 4. ATOMIC AI QUOTA VERIFICATION & CONSUMPTION RPC
-- Called by the analyze-sentiment Edge Function prior to invoking Gemini API.
-- -----------------------------------------------------------------------------
create or replace function public.consume_org_ai_quota(
  p_organization_id uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_month date;
  v_current_count integer;
begin
  -- Fetch plan
  select plan into v_plan
  from public.organizations
  where id = p_organization_id;

  if v_plan is null then
    return json_build_object('allowed', false, 'reason', 'ORGANIZATION_NOT_FOUND');
  end if;

  v_month := date_trunc('month', current_date)::date;

  -- Pro and Enterprise have unlimited AI analyses
  if v_plan in ('pro', 'enterprise') then
    -- Record analytics usage asynchronously
    insert into public.organization_usage (organization_id, period_month, ai_analyses_count, updated_at)
    values (p_organization_id, v_month, 1, now())
    on conflict (organization_id, period_month)
    do update set ai_analyses_count = organization_usage.ai_analyses_count + 1, updated_at = now()
    returning ai_analyses_count into v_current_count;

    return json_build_object(
      'allowed', true,
      'plan', v_plan,
      'used', v_current_count,
      'limit', null
    );
  end if;

  -- Free tier: 10 AI analyses per calendar month
  select coalesce(ai_analyses_count, 0) into v_current_count
  from public.organization_usage
  where organization_id = p_organization_id and period_month = v_month;

  if v_current_count >= 10 then
    return json_build_object(
      'allowed', false,
      'reason', 'quota_exceeded',
      'plan', 'free',
      'used', v_current_count,
      'limit', 10,
      'message', 'Free plan limit of 10 AI sentiment analyses per month reached. Upgrade to Pro for unlimited AI insights.'
    );
  end if;

  -- Atomically increment
  insert into public.organization_usage (organization_id, period_month, ai_analyses_count, updated_at)
  values (p_organization_id, v_month, 1, now())
  on conflict (organization_id, period_month)
  do update set ai_analyses_count = organization_usage.ai_analyses_count + 1, updated_at = now()
  returning ai_analyses_count into v_current_count;

  if v_current_count > 10 then
    -- Race condition guard
    return json_build_object(
      'allowed', false,
      'reason', 'quota_exceeded',
      'plan', 'free',
      'used', v_current_count,
      'limit', 10
    );
  end if;

  return json_build_object(
    'allowed', true,
    'plan', 'free',
    'used', v_current_count,
    'limit', 10
  );
end;
$$;

-- Restrict execute privilege to service_role and authenticated users
revoke all on function public.consume_org_ai_quota(uuid) from public, anon;
grant execute on function public.consume_org_ai_quota(uuid) to authenticated, service_role;

-- Record migration in schema_migrations
insert into supabase_migrations.schema_migrations (version, name)
values ('010', 'plan_limits_and_usage')
on conflict (version) do nothing;
