-- =============================================================================
-- PeoplePulse — Database Schema Migration 006
-- AI Sentiment Result Validation & Service-Role Restricted Persistence
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. SENTIMENT SCORE RANGE CONSTRAINT
-- Validates that sentiment_score falls within the normalized [-1.0, +1.0] bounds.
-- -----------------------------------------------------------------------------
alter table public.sentiment_results
  drop constraint if exists check_sentiment_score_range;

alter table public.sentiment_results
  add constraint check_sentiment_score_range
  check (
    sentiment_score is null or
    (sentiment_score >= -1.0 and sentiment_score <= 1.0)
  );

-- -----------------------------------------------------------------------------
-- 2. ONE-TIME PROCESSING TOKEN COLUMN
-- Required by the atomic token consumption function below.
-- -----------------------------------------------------------------------------
alter table public.checkins
  add column if not exists processing_token text;

-- -----------------------------------------------------------------------------
-- 3. SERVICE-ROLE RESTRICTED SENTIMENT UPDATE FUNCTION
-- Updates sentiment_label, sentiment_score, and ai_summary for a checkin.
-- -----------------------------------------------------------------------------
create or replace function public.update_checkin_sentiment(
  p_checkin_id uuid,
  p_sentiment_label text,
  p_sentiment_score numeric,
  p_ai_summary text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Validate sentiment_label
  if p_sentiment_label not in ('positive', 'neutral', 'negative') then
    raise exception 'INVALID_SENTIMENT_LABEL: Must be positive, neutral, or negative.';
  end if;

  -- Validate sentiment_score range
  if p_sentiment_score < -1.0 or p_sentiment_score > 1.0 then
    raise exception 'INVALID_SENTIMENT_SCORE: Must be between -1.0 and 1.0.';
  end if;

  update public.sentiment_results
  set
    sentiment_label = p_sentiment_label,
    sentiment_score = p_sentiment_score,
    ai_summary = p_ai_summary
  where checkin_id = p_checkin_id;
end;
$$;

-- CRITICAL SECURITY ENFORCEMENT:
-- Strip all execute privileges from PUBLIC, anon, and authenticated.
-- Grant exclusively to service_role.
revoke all on function public.update_checkin_sentiment(uuid, text, numeric, text) from public, anon, authenticated;
grant execute on function public.update_checkin_sentiment(uuid, text, numeric, text) to service_role;

-- -----------------------------------------------------------------------------
-- 4. ATOMIC TOKEN CONSUMPTION FUNCTION (ANTI-RACE CONDITION)
-- Atomically validates and consumes the one-time anonymous processing token.
-- Prevents race conditions and guarantees exactly-once processing:
-- If two concurrent requests arrive, exactly one will update the row and return true.
-- The other will see processing_token = null and return false.
-- -----------------------------------------------------------------------------
create or replace function public.consume_anonymous_processing_token(
  p_checkin_id uuid,
  p_processing_token text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated_id uuid;
begin
  if p_processing_token is null or length(trim(p_processing_token)) = 0 then
    return false;
  end if;

  update public.checkins
  set processing_token = null
  where id = p_checkin_id
    and processing_token = p_processing_token
  returning id into v_updated_id;

  return v_updated_id is not null;
end;
$$;

-- CRITICAL SECURITY ENFORCEMENT:
-- Strip all execute privileges from PUBLIC, anon, and authenticated.
-- Grant exclusively to service_role.
revoke all on function public.consume_anonymous_processing_token(uuid, text) from public, anon, authenticated;
grant execute on function public.consume_anonymous_processing_token(uuid, text) to service_role;
