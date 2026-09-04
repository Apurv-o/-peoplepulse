-- =============================================================================
-- PeoplePulse — Database Schema Migration 015
-- Deterministic Baseline Sentiment Label & Backfill
-- =============================================================================

create or replace function public.handle_checkin_engagement_score()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_score numeric;
  v_label text;
begin
  -- Calculate score using deterministic formula v1
  v_score := public.calculate_engagement_score(
    new.workload,
    new.manager_support,
    new.team_collaboration,
    new.motivation,
    new.stress_level
  );

  -- Derive baseline sentiment label from engagement score
  if v_score >= 70 then
    v_label := 'positive';
  elsif v_score >= 50 then
    v_label := 'neutral';
  else
    v_label := 'negative';
  end if;

  -- Insert or update sentiment_results row with non-null sentiment_label
  insert into public.sentiment_results (
    checkin_id,
    engagement_score,
    sentiment_label,
    created_at
  ) values (
    new.id,
    v_score,
    v_label,
    now()
  )
  on conflict (checkin_id) do update set
    engagement_score = excluded.engagement_score,
    sentiment_label = coalesce(public.sentiment_results.sentiment_label, excluded.sentiment_label);

  return new;
end;
$$;

-- Backfill existing null sentiment labels across all historical check-ins
update public.sentiment_results
set sentiment_label = case
  when engagement_score >= 70 then 'positive'
  when engagement_score >= 50 then 'neutral'
  else 'negative'
end
where sentiment_label is null and engagement_score is not null;

insert into supabase_migrations.schema_migrations (version, name)
values ('015', 'sentiment_label_fallback')
on conflict (version) do nothing;
