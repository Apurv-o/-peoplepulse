-- =============================================================================
-- PeoplePulse — Database Schema Migration 016
-- Database Linter Security Hardening & Privilege Lockdown
-- =============================================================================

-- 1. Pin mutable search_path on calculate_engagement_score
alter function public.calculate_engagement_score(integer, integer, integer, integer, integer)
  set search_path = public;

-- 2. Strip API execute privileges from trigger functions
-- Trigger functions must only be called by internal PostgreSQL triggers, never via RPC.
revoke all on function public.handle_checkin_engagement_score() from public, anon, authenticated;
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
revoke all on function public.enforce_organization_seat_limit() from public, anon, authenticated;
revoke all on function public.enforce_organization_team_limit() from public, anon, authenticated;

-- 3. Lock down Service-Role only functions
-- Quota consumption is invoked by the analyze-sentiment Edge Function using service_role.
revoke all on function public.consume_org_ai_quota(uuid) from public, anon, authenticated;
grant execute on function public.consume_org_ai_quota(uuid) to service_role;

-- 4. Strip anon (unauthenticated) execute privileges from internal RLS helpers
revoke all on function public.get_current_user_org_ids() from public, anon;
grant execute on function public.get_current_user_org_ids() to authenticated;

revoke all on function public.is_org_admin(uuid) from public, anon;
grant execute on function public.is_org_admin(uuid) to authenticated;

revoke all on function public.is_team_manager(uuid) from public, anon;
grant execute on function public.is_team_manager(uuid) to authenticated;

revoke all on function public.get_auth_role() from public, anon;
grant execute on function public.get_auth_role() to authenticated;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

revoke all on function public.is_manager() from public, anon;
grant execute on function public.is_manager() to authenticated;

-- 5. Strip anon execute privileges from authenticated business RPCs
revoke all on function public.create_organization_with_owner(text, text) from public, anon;
grant execute on function public.create_organization_with_owner(text, text) to authenticated;

revoke all on function public.create_org_invitation(uuid, text, text, uuid) from public, anon;
grant execute on function public.create_org_invitation(uuid, text, text, uuid) to authenticated;

revoke all on function public.accept_org_invitation(text) from public, anon;
grant execute on function public.accept_org_invitation(text) to authenticated;

revoke all on function public.get_team_aggregated_insights(uuid, date) from public, anon;
grant execute on function public.get_team_aggregated_insights(uuid, date) to authenticated;

revoke all on function public.get_current_user_team_id() from public, anon;
grant execute on function public.get_current_user_team_id() to authenticated;

-- Record migration in schema_migrations
insert into supabase_migrations.schema_migrations (version, name)
values ('016', 'security_hardening_and_linter_fixes')
on conflict (version) do nothing;
