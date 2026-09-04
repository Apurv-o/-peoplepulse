-- =============================================================================
-- PeoplePulse — Database Schema Migration 012
-- Fix get_current_user_team_id() function (replace max(uuid) with explicit fetch)
-- =============================================================================

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

  select count(*), (array_agg(tm.team_id))[1]
  into v_count, v_team_id
  from public.team_members tm
  join public.teams t on tm.team_id = t.id
  where tm.user_id = auth.uid()
    and t.organization_id in (select public.get_current_user_org_ids());

  if v_count = 0 then
    raise exception 'NO_TEAM_ASSIGNED: User has no assigned team membership.';
  elsif v_count > 1 then
    raise exception 'MULTIPLE_TEAMS_ASSIGNED: User belongs to multiple teams in active organization.';
  end if;

  return v_team_id;
end;
$$;

insert into supabase_migrations.schema_migrations (version, statements)
values ('012', array['fix_get_current_user_team_id'])
on conflict (version) do nothing;
