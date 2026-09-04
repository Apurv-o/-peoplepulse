-- =============================================================================
-- PeoplePulse — Database Schema Migration 001
-- Entities: profiles, teams, checkins, sentiment_results, survey_questions, imports
-- Enforces:
--   1. Strict anonymous identity constraint (user_id IS NULL iff is_anonymous = true)
--   2. Weekly check-in uniqueness for named employees
--   3. 1–5 metric score bounds and 500-char free_text limit
-- =============================================================================

-- Enable necessary extensions
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. PROFILES
-- Corresponds to authenticated auth.users.
-- Does NOT contain team_id. Direct report relationships use manager_id.
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text unique not null,
  role text not null check (role in ('admin', 'manager', 'employee')),
  manager_id uuid references public.profiles(id) on delete set null,
  department_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Indexes on profiles
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_manager on public.profiles(manager_id);
create index if not exists idx_profiles_email on public.profiles(email);

-- -----------------------------------------------------------------------------
-- 2. TEAMS
-- Represents functional teams/squads managed by a manager profile.
-- -----------------------------------------------------------------------------
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  manager_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_teams_manager on public.teams(manager_id);

-- -----------------------------------------------------------------------------
-- 3. CHECKINS
-- Core weekly pulse survey submissions.
-- Supports both identified employee check-ins and pure anonymous submissions.
-- -----------------------------------------------------------------------------
create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  team_id uuid not null references public.teams(id) on delete cascade,
  week_start date not null,
  workload integer not null check (workload between 1 and 5),
  manager_support integer not null check (manager_support between 1 and 5),
  team_collaboration integer not null check (team_collaboration between 1 and 5),
  motivation integer not null check (motivation between 1 and 5),
  stress_level integer not null check (stress_level between 1 and 5),
  free_text varchar(500),
  is_anonymous boolean not null default false,
  source text not null default 'manual' check (source in ('manual', 'slack', 'google_forms')),
  created_at timestamptz not null default now(),

  -- CRITICAL ANONYMOUS CONSTRAINT:
  -- If is_anonymous is true, user_id MUST be NULL.
  -- If is_anonymous is false, user_id MUST NOT be NULL.
  -- The database strictly prohibits storing user_id in an anonymous check-in.
  constraint check_anonymous_user_id check (
    (is_anonymous = true and user_id is null) or
    (is_anonymous = false and user_id is not null)
  )
);

-- Indexes for efficient queries and aggregations
create index if not exists idx_checkins_team_week on public.checkins(team_id, week_start);
create index if not exists idx_checkins_user on public.checkins(user_id) where user_id is not null;
create index if not exists idx_checkins_anonymous on public.checkins(team_id, week_start, is_anonymous);

-- WEEKLY CHECK-IN UNIQUENESS CONSTRAINT:
-- For named submissions, enforce exactly one submission per employee per week.
-- Designed as a partial unique index so multiple anonymous submissions in the same week remain valid.
create unique index if not exists unique_named_weekly_checkin
  on public.checkins(user_id, week_start)
  where is_anonymous = false and user_id is not null;

-- -----------------------------------------------------------------------------
-- 4. SENTIMENT RESULTS
-- NLP/AI sentiment outputs linked to check-in responses.
-- -----------------------------------------------------------------------------
create table if not exists public.sentiment_results (
  checkin_id uuid primary key references public.checkins(id) on delete cascade,
  sentiment_label text check (sentiment_label in ('positive', 'neutral', 'negative')),
  sentiment_score numeric,
  ai_summary text,
  engagement_score numeric,
  attrition_risk_level text check (attrition_risk_level in ('low', 'medium', 'high')),
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 5. SURVEY QUESTIONS
-- Configurable pulse survey dimensions.
-- -----------------------------------------------------------------------------
create table if not exists public.survey_questions (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  type text not null default 'rating',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 6. IMPORTS
-- Tracking records for future external integrations (Slack, Google Forms).
-- -----------------------------------------------------------------------------
create table if not exists public.imports (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('slack', 'google_forms')),
  status text not null default 'synced',
  synced_at timestamptz default now(),
  record_count integer not null default 0,
  created_at timestamptz not null default now()
);
