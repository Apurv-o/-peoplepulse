-- =============================================================================
-- PeoplePulse — Database Schema Migration 024
-- Realtime Daily Participation Tracking and Pulse Sync Triggers
-- =============================================================================

-- 1. Ensure updated_at column exists on public.organizations
alter table public.organizations add column if not exists updated_at timestamptz default now();

-- 2. Add public.organizations to supabase_realtime publication for instant broadcast
alter table public.organizations replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'organizations'
  ) then
    alter publication supabase_realtime add table public.organizations;
  end if;
end $$;

-- 3. Enhance realtime pulse trigger to touch both teams AND organizations
create or replace function public.handle_checkin_realtime_touch()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_team_id uuid;
begin
  if tg_op = 'DELETE' then
    v_org_id := old.organization_id;
    v_team_id := old.team_id;
    if v_team_id is not null then
      update public.teams set updated_at = now() where id = v_team_id;
    end if;
    if v_org_id is not null then
      update public.organizations set updated_at = now() where id = v_org_id;
    end if;
    return old;
  else
    v_org_id := new.organization_id;
    v_team_id := new.team_id;
    if v_team_id is not null then
      update public.teams set updated_at = now() where id = v_team_id;
    end if;
    if v_org_id is not null then
      update public.organizations set updated_at = now() where id = v_org_id;
    end if;
    return new;
  end if;
end;
$$;

drop trigger if exists trg_checkin_realtime_touch on public.checkins;
create trigger trg_checkin_realtime_touch
  after insert or update or delete on public.checkins
  for each row
  execute function public.handle_checkin_realtime_touch();

-- 4. Security-Definer RPC to calculate real-time daily participation safely
-- (Counts both named and anonymous check-ins without exposing individual anonymous identities)
create or replace function public.get_org_today_participation(
  p_org_id uuid,
  p_local_date text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_authorized boolean;
  v_today_checkins integer := 0;
  v_active_members integer := 0;
  v_participation_pct integer := 0;
  v_target_date date;
  v_utc_date date;
  v_last_checkin_at timestamptz;
begin
  -- 1. Ensure authenticated
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

  -- 3. Resolve target date
  if p_local_date is not null and p_local_date ~ '^\d{4}-\d{2}-\d{2}$' then
    v_target_date := p_local_date::date;
  else
    v_target_date := current_date;
  end if;
  v_utc_date := current_date;

  -- 4. Count active members in organization
  select count(*)::int
  into v_active_members
  from public.organization_members
  where organization_id = p_org_id
    and is_active = true;

  -- 5. Count today's check-ins (named AND anonymous within today or past 24 hours)
  select
    count(*)::int,
    max(c.created_at)
  into v_today_checkins, v_last_checkin_at
  from public.checkins c
  where c.organization_id = p_org_id
    and (
      c.week_start = v_target_date
      or c.week_start = v_utc_date
      or c.created_at >= (now() - interval '24 hours')
    );

  -- 6. Calculate percentage
  if v_active_members > 0 then
    v_participation_pct := least(100, round((v_today_checkins::numeric / v_active_members) * 100))::int;
  else
    v_participation_pct := 0;
  end if;

  return json_build_object(
    'today_checkins', v_today_checkins,
    'active_members', v_active_members,
    'participation_pct', v_participation_pct,
    'last_checkin_at', v_last_checkin_at
  );
end;
$$;

revoke all on function public.get_org_today_participation(uuid, text) from public, anon;
grant execute on function public.get_org_today_participation(uuid, text) to authenticated;

