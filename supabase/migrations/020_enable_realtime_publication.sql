-- =============================================================================
-- PeoplePulse — Database Schema Migration 020
-- Enable Supabase Realtime Publication and Replica Identity
-- =============================================================================

-- Ensure replica identity full on realtime tables for reliable WAL decoding
alter table public.checkins replica identity full;
alter table public.sentiment_results replica identity full;
alter table public.organization_members replica identity full;
alter table public.invitations replica identity full;
alter table public.teams replica identity full;
alter table public.team_members replica identity full;

-- Add tables to supabase_realtime publication
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'checkins') then
    alter publication supabase_realtime add table public.checkins;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'sentiment_results') then
    alter publication supabase_realtime add table public.sentiment_results;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'organization_members') then
    alter publication supabase_realtime add table public.organization_members;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'invitations') then
    alter publication supabase_realtime add table public.invitations;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'teams') then
    alter publication supabase_realtime add table public.teams;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'team_members') then
    alter publication supabase_realtime add table public.team_members;
  end if;
end $$;
