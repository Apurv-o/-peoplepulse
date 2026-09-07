-- =============================================================================
-- PeoplePulse — Database Schema Migration 035
-- Saturday Weekly Engagement Cycle Reset & Multi-Week Trend RPC
--
-- Business Rule:
-- Engagement tracking operates on a weekly cycle beginning every Saturday at 12:00 AM (00:00:00)
-- through Friday at 23:59:59. On Saturday at 12:00 AM, the weekly engagement metrics
-- (Org Engagement score, Team Comparison breakdown, Sentiment split, and Weekly check-in totals)
-- automatically reset so the new week begins tracking fresh data.
-- Historical check-ins and past weekly cycles are preserved in multi-week trend buckets.
-- =============================================================================

-- Drop legacy signature if exists to prevent function ambiguity
drop function if exists public.get_org_team_comparison(uuid);

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

  -- 3. Resolve Saturday cycle start date:
  -- Every Saturday at 12:00 AM, the weekly engagement data resets so the new week tracks fresh data.
  -- Cycle runs from Saturday 00:00:00 to next Friday 23:59:59.
  if p_cycle_start is not null and p_cycle_start ~ '^\d{4}-\d{2}-\d{2}$' then
    v_cycle_start := p_cycle_start::date;
  else
    v_target_date := current_date;
    v_cycle_start := (v_target_date - (((extract(dow from v_target_date)::int + 1) % 7) || ' days')::interval)::date;
  end if;

  v_cycle_end := v_cycle_start + 6;

  -- 4. Calculate team-by-team engagement strictly within the active Saturday cycle
  select coalesce(
    json_agg(
      json_build_object(
        'team_id', sub.team_id,
        'team', sub.team_name,
        'score', sub.avg_score,
        'total_checkins', sub.total_checkins
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
    order by avg_score desc, total_checkins desc, t.name asc
  ) sub;

  -- 5. Calculate overall org average engagement and total checkins strictly for active Saturday cycle
  select
    round(avg(s.engagement_score))::int,
    count(c.id)::int
  into v_org_score, v_total_checkins
  from public.checkins c
  join public.sentiment_results s on s.checkin_id = c.id
  where c.organization_id = p_org_id
    and (c.week_start >= v_cycle_start and c.week_start <= v_cycle_end);

  if v_total_checkins is null then
    v_total_checkins := 0;
  end if;

  -- 6. Calculate sentiment breakdown for active Saturday cycle
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
  else
    v_sentiment_split := '[]'::json;
  end if;

  -- 7. Calculate weekly engagement trend across the past 5 Saturday cycles
  select coalesce(
    json_agg(
      json_build_object(
        'week', sub_trend.cycle_label,
        'cycle_start', sub_trend.wk_start,
        'score', sub_trend.avg_score,
        'total_checkins', sub_trend.checkin_count
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

revoke all on function public.get_org_team_comparison(uuid, text) from public, anon;
grant execute on function public.get_org_team_comparison(uuid, text) to authenticated;

-- Record migration
insert into supabase_migrations.schema_migrations (version, name)
values ('035', 'saturday_engagement_cycle_reset')
on conflict (version) do nothing;
