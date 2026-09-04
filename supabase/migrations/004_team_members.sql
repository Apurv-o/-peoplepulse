-- =============================================================================
-- PeoplePulse — Database Schema Migration 004
-- Team Membership & Trusted Server-Side Team Resolution
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. TEAM MEMBERS JUNCTION TABLE
-- Defines explicit membership between profiles and teams.
-- -----------------------------------------------------------------------------
create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create index if not exists idx_team_members_user on public.team_members(user_id);
create index if not exists idx_team_members_team on public.team_members(team_id);

-- Enable Row Level Security
alter table public.team_members enable row level security;

-- -----------------------------------------------------------------------------
-- 2. TEAM MEMBERS RLS POLICIES
-- -----------------------------------------------------------------------------

-- Users can view their own team memberships
create policy "team_members_select_own"
  on public.team_members
  for select
  using (user_id = auth.uid());

-- Managers can view memberships for teams they manage
create policy "team_members_select_manager"
  on public.team_members
  for select
  using (
    public.is_manager() and
    team_id in (select id from public.teams where manager_id = auth.uid())
  );

-- Admins can view and manage all team memberships
create policy "team_members_admin_all"
  on public.team_members
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- 3. TRUSTED TEAM RESOLUTION FUNCTION
-- Resolves the authenticated caller's single authorized team directly in Postgres.
-- Rules:
--   - 0 teams -> Raises exception 'NO_TEAM_ASSIGNED'
--   - >1 teams -> Raises exception 'MULTIPLE_TEAMS_ASSIGNED'
--   - Exactly 1 team -> Returns team_id
-- -----------------------------------------------------------------------------
create or replace function public.get_current_user_team_id()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_team_id uuid;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED: User is not logged in.';
  end if;

  select count(*), max(team_id)
  into v_count, v_team_id
  from public.team_members
  where user_id = auth.uid();

  if v_count = 0 then
    raise exception 'NO_TEAM_ASSIGNED: User has no assigned team membership.';
  elsif v_count > 1 then
    raise exception 'MULTIPLE_TEAMS_ASSIGNED: User belongs to multiple teams. Ambiguous assignment.';
  end if;

  return v_team_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. UPDATE CHECKINS INSERT SECURITY
-- Enforces that checkins.team_id MUST equal the authenticated user's trusted team.
-- Frontend can NEVER spoof or arbitrarily select team_id.
-- Preserves strict anonymous identity constraints.
-- -----------------------------------------------------------------------------
drop policy if exists "checkins_insert_authenticated" on public.checkins;

create policy "checkins_insert_authenticated"
  on public.checkins
  for insert
  with check (
    auth.uid() is not null and
    team_id = public.get_current_user_team_id() and
    (
      (is_anonymous = false and user_id = auth.uid()) or
      (is_anonymous = true and user_id is null)
    )
  );
