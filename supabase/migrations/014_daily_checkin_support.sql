-- =============================================================================
-- PeoplePulse — Database Schema Migration 014
-- Enable Daily Check-ins & Update Aggregation for Daily/Weekly Cycles
-- =============================================================================

-- 1. Drop Monday-only constraint on checkins.week_start
alter table public.checkins
  drop constraint if exists check_week_start_monday;

-- 2. Convert weekly unique index to daily unique index (one per user per day)
drop index if exists public.unique_named_weekly_checkin;

create unique index if not exists unique_named_daily_checkin
  on public.checkins(user_id, week_start)
  where is_anonymous = false and user_id is not null;

-- 3. Update get_team_aggregated_insights to aggregate checkins across range or exact date
create or replace function public.get_team_aggregated_insights(
  p_team_id uuid,
  p_week_start date
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_org_id uuid;
  v_is_authorized boolean;
  total_count int;
  anon_count int;
  named_count int;
  team_metrics json;
  anon_breakdown json;
begin
  -- 1. Ensure caller is authenticated
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED: Must be logged in.';
  end if;

  -- 2. Fetch team's organization
  select organization_id into v_team_org_id
  from public.teams
  where id = p_team_id;

  if v_team_org_id is null then
    raise exception 'TEAM_NOT_FOUND: Team does not exist.';
  end if;

  -- 3. Verify caller belongs to the team's organization AND is manager or org admin
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = v_team_org_id
      and om.user_id = auth.uid()
      and om.is_active = true
      and (
        om.role in ('owner', 'admin')
        or exists (select 1 from public.teams t where t.id = p_team_id and t.manager_id = auth.uid())
      )
  ) into v_is_authorized;

  if not v_is_authorized then
    raise exception 'UNAUTHORIZED: Caller is not the manager of this team or an organization admin.';
  end if;

  -- 4. Gather counts scoped to this team and date/week range
  select
    count(*),
    count(*) filter (where is_anonymous = true),
    count(*) filter (where is_anonymous = false)
  into total_count, anon_count, named_count
  from public.checkins
  where team_id = p_team_id
    and organization_id = v_team_org_id
    and (week_start = p_week_start or (week_start >= p_week_start and week_start < (p_week_start + interval '7 days')::date));

  -- 5. Minimum team sample size protection (n >= 3)
  if total_count < 3 then
    return json_build_object(
      'status', 'insufficient_team_sample',
      'message', 'Fewer than 3 total team check-ins. Team metrics are hidden to protect privacy.',
      'total_count', total_count,
      'anonymous_count', anon_count,
      'named_count', named_count
    );
  end if;

  -- 6. Overall blended metrics
  select json_build_object(
    'avg_workload', round(avg(workload), 2),
    'avg_manager_support', round(avg(manager_support), 2),
    'avg_team_collaboration', round(avg(team_collaboration), 2),
    'avg_motivation', round(avg(motivation), 2),
    'avg_stress_level', round(avg(stress_level), 2)
  ) into team_metrics
  from public.checkins
  where team_id = p_team_id
    and organization_id = v_team_org_id
    and (week_start = p_week_start or (week_start >= p_week_start and week_start < (p_week_start + interval '7 days')::date));

  -- 7. Anonymous-derived breakdown WITH DEDICATED THRESHOLD (anon_count >= 3)
  if anon_count >= 3 then
    select json_build_object(
      'status', 'available',
      'sample_size', anon_count,
      'avg_workload', round(avg(workload), 2),
      'avg_manager_support', round(avg(manager_support), 2),
      'avg_team_collaboration', round(avg(team_collaboration), 2),
      'avg_motivation', round(avg(motivation), 2),
      'avg_stress_level', round(avg(stress_level), 2)
    ) into anon_breakdown
    from public.checkins
    where team_id = p_team_id
      and organization_id = v_team_org_id
      and (week_start = p_week_start or (week_start >= p_week_start and week_start < (p_week_start + interval '7 days')::date))
      and is_anonymous = true;
  else
    anon_breakdown := json_build_object(
      'status', 'insufficient_anonymous_sample',
      'message', 'Fewer than 3 anonymous submissions. Separate anonymous breakdown is locked.',
      'anonymous_count', anon_count
    );
  end if;

  return json_build_object(
    'status', 'ok',
    'total_count', total_count,
    'named_count', named_count,
    'anonymous_count', anon_count,
    'team_metrics', team_metrics,
    'anonymous_breakdown', anon_breakdown
  );
end;
$$;

insert into supabase_migrations.schema_migrations (version, statements)
values ('014', array['daily_checkin_support'])
on conflict (version) do nothing;
