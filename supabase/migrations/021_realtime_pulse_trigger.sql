-- =============================================================================
-- PeoplePulse — Database Schema Migration 021
-- Realtime Pulse Sync Trigger on Teams Table
-- =============================================================================

-- 1. Ensure updated_at column exists on public.teams
alter table public.teams add column if not exists updated_at timestamptz default now();

-- 2. Trigger function to touch team updated_at whenever a checkin changes (named or anonymous)
create or replace function public.handle_checkin_realtime_touch()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    update public.teams
    set updated_at = now()
    where id = old.team_id;
    return old;
  else
    update public.teams
    set updated_at = now()
    where id = new.team_id;
    return new;
  end if;
end;
$$;

-- 3. Bind trigger on public.checkins
drop trigger if exists trg_checkin_realtime_touch on public.checkins;

create trigger trg_checkin_realtime_touch
  after insert or update or delete on public.checkins
  for each row
  execute function public.handle_checkin_realtime_touch();
