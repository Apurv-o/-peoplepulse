-- =============================================================================
-- PeoplePulse — Database Schema Migration 023
-- Fix multi-tenant team resolution & checkins insert policy
-- Allows users in multiple organizations to have clean scoped team resolution
-- =============================================================================

-- 1. Drop existing policy that depended on get_current_user_team_id()
drop policy if exists "checkins_insert_authenticated" on public.checkins;

-- 2. Drop existing 0-arg function to prevent overload ambiguity
drop function if exists public.get_current_user_team_id();
drop function if exists public.get_current_user_team_id(uuid);

-- 3. Create scoped get_current_user_team_id(p_org_id uuid default null)
create or replace function public.get_current_user_team_id(p_org_id uuid default null)
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

  -- 1. If an organization ID is provided, scope specifically to that organization
  if p_org_id is not null then
    select count(*), (array_agg(tm.team_id order by tm.created_at desc))[1]
    into v_count, v_team_id
    from public.team_members tm
    join public.teams t on tm.team_id = t.id
    where tm.user_id = auth.uid()
      and t.organization_id = p_org_id;

    if v_count = 0 then
      raise exception 'NO_TEAM_ASSIGNED: User has no assigned team membership in this organization.';
    end if;

    return v_team_id;
  end if;

  -- 2. If p_org_id is omitted, query teams across the user's active organizations
  select count(*), (array_agg(tm.team_id order by tm.created_at desc))[1]
  into v_count, v_team_id
  from public.team_members tm
  join public.teams t on tm.team_id = t.id
  where tm.user_id = auth.uid()
    and t.organization_id in (select public.get_current_user_org_ids());

  if v_count = 0 then
    raise exception 'NO_TEAM_ASSIGNED: User has no assigned team membership.';
  end if;

  -- Return primary/most recent team without crashing on users belonging to multiple teams/orgs
  return v_team_id;
end;
$$;

revoke all on function public.get_current_user_team_id(uuid) from public, anon;
grant execute on function public.get_current_user_team_id(uuid) to authenticated;

-- 4. Re-create checkins_insert_authenticated with robust membership check
create policy "checkins_insert_authenticated"
  on public.checkins
  for insert
  with check (
    auth.uid() is not null and
    organization_id in (select public.get_current_user_org_ids()) and
    exists (
      select 1 from public.team_members tm
      join public.teams t on tm.team_id = t.id
      where tm.user_id = auth.uid()
        and tm.team_id = checkins.team_id
        and t.organization_id = checkins.organization_id
    ) and
    (
      (is_anonymous = false and user_id = auth.uid()) or
      (is_anonymous = true and user_id is null)
    )
  );

-- Record migration
insert into supabase_migrations.schema_migrations (version, statements)
values ('023', array['fix_multi_org_team_assignment'])
on conflict (version) do nothing;
