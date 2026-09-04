-- =============================================================================
-- PeoplePulse — Database Migration 007
-- Restore Base Table Privileges for anon & authenticated roles
--
-- WHY: Tables (teams, survey_questions, sentiment_results, team_members,
--      imports) were created with Row Level Security policies but WITHOUT the
--      base Postgres table grants. As a result PostgREST returned 42501
--      "permission denied for table X" for the `authenticated` role, which
--      silently broke the employee dashboard (real check-in history fell back
--      to mock data).
--
-- FIX: Grant table-level privileges to `anon` and `authenticated`. Row-level
--      access is still 100% enforced by the RLS policies in 002/004.
--      This matches Supabase's standard default-privilege configuration.
-- =============================================================================

grant all on table public.profiles to anon, authenticated;
grant all on table public.teams to anon, authenticated;
grant all on table public.checkins to anon, authenticated;
grant all on table public.sentiment_results to anon, authenticated;
grant all on table public.survey_questions to anon, authenticated;
grant all on table public.imports to anon, authenticated;
grant all on table public.team_members to anon, authenticated;

-- Guard against future drift for new objects created via migrations
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant all on functions to anon, authenticated;