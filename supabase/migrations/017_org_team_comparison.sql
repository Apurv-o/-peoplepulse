-- =============================================================================
-- PeoplePulse — Database Schema Migration 017
-- Real-time Team Comparison RPC for Organizations
-- =============================================================================

create or replace function public.get_org_team_comparison(p_org_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_authorized boolean;
  v_teams json;
  v_org_score integer;
  v_total_checkins integer;
  v_sentiment_split json;
  v_pos_count integer;
  v_neu_count integer;
  v_neg_count integer;
  v_sentiment_total integer;
begin
  -- 1. Ensure user is authenticated
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

  -- 3. Calculate team-by-team engagement and check-in counts
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
    left join public.checkins c on c.team_id = t.id and c.organization_id = t.organization_id
    left join public.sentiment_results s on s.checkin_id = c.id
    where t.organization_id = p_org_id
    group by t.id, t.name
    order by avg_score desc, total_checkins desc, t.name asc
  ) sub;

  -- 4. Calculate overall org average engagement and total checkins
  select
    coalesce(round(avg(s.engagement_score)), 0)::int,
    count(c.id)::int
  into v_org_score, v_total_checkins
  from public.checkins c
  left join public.sentiment_results s on s.checkin_id = c.id
  where c.organization_id = p_org_id;

  -- 5. Calculate sentiment breakdown
  select
    count(*) filter (where s.sentiment_label = 'positive')::int,
    count(*) filter (where s.sentiment_label = 'neutral')::int,
    count(*) filter (where s.sentiment_label = 'negative')::int
  into v_pos_count, v_neu_count, v_neg_count
  from public.checkins c
  join public.sentiment_results s on s.checkin_id = c.id
  where c.organization_id = p_org_id;

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

  return json_build_object(
    'teams', v_teams,
    'org_score', v_org_score,
    'total_checkins', v_total_checkins,
    'sentiment_split', v_sentiment_split
  );
end;
$$;

-- Security & Privileges
revoke all on function public.get_org_team_comparison(uuid) from public, anon;
grant execute on function public.get_org_team_comparison(uuid) to authenticated;

-- Record migration in schema_migrations
insert into supabase_migrations.schema_migrations (version, name)
values ('017', 'org_team_comparison')
on conflict (version) do nothing;
