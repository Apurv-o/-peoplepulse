-- =============================================================================
-- PeoplePulse — Database Schema Migration 005
-- Deterministic Engagement Scoring (Version 1) & Database Trigger
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. WEEK START MONDAY CONSTRAINT
-- Guarantees all week_start values align with ISO Monday (Day 1).
-- -----------------------------------------------------------------------------
alter table public.checkins
  drop constraint if exists check_week_start_monday;

alter table public.checkins
  add constraint check_week_start_monday
  check (extract(isodow from week_start) = 1);

-- -----------------------------------------------------------------------------
-- 2. DETERMINISTIC ENGAGEMENT SCORING FUNCTION (VERSION 1)
-- Formula:
--   inverted_stress = 6 - stress_level (negatively oriented: 1 is best, 5 is worst)
--   raw_score = 0.20 * (workload + support + collab + motivation + inverted_stress)
--   engagement_score = round(((raw_score - 1) / 4) * 100)
-- Bounded to [0, 100].
-- -----------------------------------------------------------------------------
create or replace function public.calculate_engagement_score(
  p_workload integer,
  p_manager_support integer,
  p_team_collaboration integer,
  p_motivation integer,
  p_stress_level integer
)
returns numeric
language plpgsql
immutable
as $$
declare
  v_inverted_stress integer;
  v_raw_score numeric;
  v_score integer;
begin
  -- Validate inputs 1-5
  if p_workload < 1 or p_workload > 5 or
     p_manager_support < 1 or p_manager_support > 5 or
     p_team_collaboration < 1 or p_team_collaboration > 5 or
     p_motivation < 1 or p_motivation > 5 or
     p_stress_level < 1 or p_stress_level > 5 then
    raise exception 'INVALID_METRIC_BOUNDS: All check-in metrics must be between 1 and 5.';
  end if;

  -- Invert stress (1 is lowest stress/best, 5 is highest stress/worst)
  v_inverted_stress := 6 - p_stress_level;

  -- Compute raw weighted average (20% each)
  v_raw_score := 0.20 * (
    p_workload +
    p_manager_support +
    p_team_collaboration +
    p_motivation +
    v_inverted_stress
  );

  -- Normalize from 1-5 scale to 0-100 integer
  v_score := round(((v_raw_score - 1.0) / 4.0) * 100);

  -- Clamp bounds
  if v_score < 0 then
    v_score := 0;
  elsif v_score > 100 then
    v_score := 100;
  end if;

  return v_score;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. AUTOMATIC ENGAGEMENT SCORING TRIGGER
-- On checkin insert, calculates score and writes to sentiment_results.
-- Operates via SECURITY DEFINER to bypass client insert restrictions.
-- -----------------------------------------------------------------------------
create or replace function public.handle_checkin_engagement_score()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_score numeric;
begin
  -- Calculate score using deterministic formula v1
  v_score := public.calculate_engagement_score(
    new.workload,
    new.manager_support,
    new.team_collaboration,
    new.motivation,
    new.stress_level
  );

  -- Insert or update sentiment_results row
  insert into public.sentiment_results (
    checkin_id,
    engagement_score,
    created_at
  ) values (
    new.id,
    v_score,
    now()
  )
  on conflict (checkin_id) do update set
    engagement_score = excluded.engagement_score;

  return new;
end;
$$;

-- Bind trigger to checkins table
drop trigger if exists trg_calculate_engagement_score on public.checkins;

create trigger trg_calculate_engagement_score
  after insert on public.checkins
  for each row
  execute function public.handle_checkin_engagement_score();
