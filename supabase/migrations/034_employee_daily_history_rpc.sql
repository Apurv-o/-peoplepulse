-- PeoplePulse Database Migration 034
-- Secure RPC for employee daily form check-in history and stress tracking

create or replace function public.get_employee_daily_history(
          p_org_id uuid,
          p_target_user_id uuid
        )
        returns json
        language plpgsql
        security definer
        set search_path = public
        as $$
        declare
          v_is_authorized boolean;
          v_emp_profile record;
          v_team_name text;
          v_total_checkins integer := 0;
          v_avg_stress numeric := 0;
          v_avg_workload numeric := 0;
          v_avg_support numeric := 0;
          v_avg_collab numeric := 0;
          v_avg_motivation numeric := 0;
          v_avg_engagement numeric := 0;
          v_latest_stress integer := null;
          v_latest_engagement numeric := null;
          v_checkins json := '[]'::json;
        begin
          -- 1. Ensure authenticated
          if auth.uid() is null then
            raise exception 'UNAUTHENTICATED: User is not logged in.';
          end if;

          -- 2. Verify caller is authorized (admin, owner, manager in organization, or self)
          select exists (
            select 1
            from public.organization_members om
            where om.organization_id = p_org_id
              and om.user_id = auth.uid()
              and om.is_active = true
              and (om.role in ('admin', 'owner', 'manager') or om.user_id = p_target_user_id)
          ) into v_is_authorized;

          if not v_is_authorized then
            raise exception 'UNAUTHORIZED: Caller does not have permission to view employee history.';
          end if;

          -- 3. Fetch employee profile & organization membership details
          select
            p.id as user_id,
            p.name,
            p.email,
            coalesce(om.employee_id, p.employee_id) as employee_id,
            om.role,
            om.joined_at
          into v_emp_profile
          from public.organization_members om
          join public.profiles p on p.id = om.user_id
          where om.organization_id = p_org_id
            and om.user_id = p_target_user_id
            and om.is_active = true
          limit 1;

          if v_emp_profile.user_id is null then
            -- Fallback: Check profile directly if member record isn't joined
            select p.id as user_id, p.name, p.email, p.employee_id, p.role, p.created_at as joined_at
            into v_emp_profile
            from public.profiles p
            where p.id = p_target_user_id
            limit 1;
          end if;

          -- Fetch current team name
          select t.name
          into v_team_name
          from public.team_members tm
          join public.teams t on t.id = tm.team_id
          where tm.user_id = p_target_user_id
            and t.organization_id = p_org_id
          limit 1;

          -- 4. Calculate aggregate statistics
          select
            count(*)::int,
            coalesce(round(avg(c.stress_level)::numeric, 1), 0),
            coalesce(round(avg(c.workload)::numeric, 1), 0),
            coalesce(round(avg(c.manager_support)::numeric, 1), 1),
            coalesce(round(avg(c.team_collaboration)::numeric, 1), 1),
            coalesce(round(avg(c.motivation)::numeric, 1), 1),
            coalesce(round(avg(sr.engagement_score)::numeric, 0), 0)
          into
            v_total_checkins,
            v_avg_stress,
            v_avg_workload,
            v_avg_support,
            v_avg_collab,
            v_avg_motivation,
            v_avg_engagement
          from public.checkins c
          left join public.sentiment_results sr on sr.checkin_id = c.id
          where c.organization_id = p_org_id
            and c.user_id = p_target_user_id;

          -- Fetch latest stress & engagement
          select c.stress_level, sr.engagement_score
          into v_latest_stress, v_latest_engagement
          from public.checkins c
          left join public.sentiment_results sr on sr.checkin_id = c.id
          where c.organization_id = p_org_id
            and c.user_id = p_target_user_id
          order by c.week_start desc, c.created_at desc
          limit 1;

          -- 5. Fetch detailed checkin entries
          select coalesce(json_agg(row_to_json(r)), '[]'::json)
          into v_checkins
          from (
            select
              c.id,
              c.week_start as date,
              c.created_at,
              c.workload,
              c.manager_support,
              c.team_collaboration,
              c.motivation,
              c.stress_level,
              c.free_text,
              c.is_anonymous,
              t.name as team_name,
              sr.engagement_score,
              sr.sentiment_label
            from public.checkins c
            left join public.teams t on t.id = c.team_id
            left join public.sentiment_results sr on sr.checkin_id = c.id
            where c.organization_id = p_org_id
              and c.user_id = p_target_user_id
            order by c.week_start desc, c.created_at desc
          ) r;

          return json_build_object(
            'status', 'success',
            'employee', json_build_object(
              'user_id', v_emp_profile.user_id,
              'name', coalesce(v_emp_profile.name, 'Team Member'),
              'email', v_emp_profile.email,
              'employee_id', v_emp_profile.employee_id,
              'role', coalesce(v_emp_profile.role, 'employee'),
              'team_name', coalesce(v_team_name, 'Unassigned'),
              'joined_at', v_emp_profile.joined_at
            ),
            'metrics', json_build_object(
              'total_checkins', v_total_checkins,
              'avg_stress', v_avg_stress,
              'avg_workload', v_avg_workload,
              'avg_manager_support', v_avg_support,
              'avg_team_collaboration', v_avg_collab,
              'avg_motivation', v_avg_motivation,
              'avg_engagement', v_avg_engagement,
              'latest_stress', v_latest_stress,
              'latest_engagement', v_latest_engagement
            ),
            'history', v_checkins
          );
        end;
        $$;

        revoke all on function public.get_employee_daily_history(uuid, uuid) from public, anon;
        grant execute on function public.get_employee_daily_history(uuid, uuid) to authenticated;
