-- =============================================================================
-- PeoplePulse — Database Schema Migration 018
-- Fix Manager Insights Authorization, ISO Week Aggregation, and Real-Time Support
-- =============================================================================

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
  v_is_direct_manager_or_admin boolean;
  v_week_monday date;
  v_week_end date;
  total_count int;
  anon_count int;
  named_count int;
  today_count int;
  team_metrics json;
  anon_breakdown json;
  v_comments json;
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

  -- 3. Verify caller belongs to the team's organization AND is manager, admin, or owner
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = v_team_org_id
      and om.user_id = auth.uid()
      and om.is_active = true
      and (
        om.role in ('owner', 'admin', 'manager')
        or exists (select 1 from public.teams t where t.id = p_team_id and t.manager_id = auth.uid())
      )
  ) into v_is_authorized;

  if not v_is_authorized then
    raise exception 'UNAUTHORIZED: Caller is not a manager or admin of this organization.';
  end if;

  -- Check if caller is direct manager of this specific team or org admin/owner
  select (
    exists (select 1 from public.teams t where t.id = p_team_id and t.manager_id = auth.uid())
    or exists (
      select 1 from public.organization_members om
      where om.organization_id = v_team_org_id
        and om.user_id = auth.uid()
        and om.is_active = true
        and om.role in ('owner', 'admin')
    )
  ) into v_is_direct_manager_or_admin;

  -- 4. Calculate ISO week boundaries containing p_week_start
  -- Monday is day 1, Sunday is day 7.
  v_week_monday := (p_week_start - ((extract(isodow from p_week_start)::int - 1) || ' days')::interval)::date;
  v_week_end := (v_week_monday + interval '7 days')::date;

  -- 5. Gather counts scoped to this team and cycle
  select
    count(*),
    count(*) filter (where is_anonymous = true),
    count(*) filter (where is_anonymous = false),
    count(*) filter (where week_start = p_week_start)
  into total_count, anon_count, named_count, today_count
  from public.checkins
  where team_id = p_team_id
    and organization_id = v_team_org_id
    and (week_start >= v_week_monday and week_start < v_week_end);

  -- 6. Minimum team sample size protection (n >= 3)
  if total_count < 3 then
    return json_build_object(
      'status', 'insufficient_team_sample',
      'message', 'Fewer than 3 total team check-ins received for this pulse cycle. Team metrics are hidden to protect privacy.',
      'total_count', total_count,
      'anonymous_count', anon_count,
      'named_count', named_count,
      'today_count', today_count,
      'week_start', v_week_monday,
      'week_end', (v_week_end - interval '1 day')::date
    );
  end if;

  -- 7. Overall blended metrics
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
    and (week_start >= v_week_monday and week_start < v_week_end);

  -- 8. Anonymous-derived breakdown WITH DEDICATED THRESHOLD (anon_count >= 3)
  if anon_count >= 3 then
    -- Collect comments only if direct manager or org admin
    if v_is_direct_manager_or_admin then
      select coalesce(
        json_agg(free_text) filter (where free_text is not null and length(trim(free_text)) > 0),
        '[]'::json
      ) into v_comments
      from public.checkins
      where team_id = p_team_id
        and organization_id = v_team_org_id
        and (week_start >= v_week_monday and week_start < v_week_end)
        and is_anonymous = true;
    else
      v_comments := '[]'::json;
    end if;

    select json_build_object(
      'status', 'available',
      'sample_size', anon_count,
      'avg_workload', round(avg(workload), 2),
      'avg_manager_support', round(avg(manager_support), 2),
      'avg_team_collaboration', round(avg(team_collaboration), 2),
      'avg_motivation', round(avg(motivation), 2),
      'avg_stress_level', round(avg(stress_level), 2),
      'comments', coalesce(v_comments, '[]'::json)
    ) into anon_breakdown
    from public.checkins
    where team_id = p_team_id
      and organization_id = v_team_org_id
      and (week_start >= v_week_monday and week_start < v_week_end)
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
    'today_count', today_count,
    'week_start', v_week_monday,
    'week_end', (v_week_end - interval '1 day')::date,
    'team_metrics', team_metrics,
    'anonymous_breakdown', anon_breakdown
  );
end;
$$;

-- Security & Permissions
revoke all on function public.get_team_aggregated_insights(uuid, date) from public, anon;
grant execute on function public.get_team_aggregated_insights(uuid, date) to authenticated;

-- Record migration in schema_migrations
insert into supabase_migrations.schema_migrations (version, name)
values ('018', 'fix_manager_insights_and_authorization')
on conflict (version) do nothing;
