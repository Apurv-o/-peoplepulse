-- PeoplePulse Database Migration 033
-- 1. Redefine get_org_today_participation: resets strictly at 12:00 AM midnight
create or replace function public.get_org_today_participation(
  p_org_id uuid,
  p_local_date text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_authorized boolean;
  v_today_checkins integer := 0;
  v_active_members integer := 0;
  v_participation_pct integer := 0;
  v_target_date date;
  v_last_checkin_at timestamptz;
begin
  -- 1. Ensure authenticated
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

  -- 3. Resolve target date: defaults to current local date, resetting at 12:00 AM midnight
  if p_local_date is not null and p_local_date ~ '^\\d{4}-\\d{2}-\\d{2}$' then
    v_target_date := p_local_date::date;
  else
    v_target_date := current_date;
  end if;

  -- 4. Count eligible members in organization (exclude admin, manager, owner)
  select count(*)::int
  into v_active_members
  from public.organization_members
  where organization_id = p_org_id
    and is_active = true
    and role not in ('admin', 'manager', 'owner');

  -- 5. Count strictly today's check-ins submitted on v_target_date (starting from 12:00 AM)
  select
    count(distinct coalesce(c.user_id::text, c.id::text))::int,
    max(c.created_at)
  into v_today_checkins, v_last_checkin_at
  from public.checkins c
  where c.organization_id = p_org_id
    and (c.week_start = v_target_date or (c.created_at at time zone 'UTC')::date = v_target_date)
    and (c.user_id is null or c.user_id not in (
      select user_id from public.organization_members
      where organization_id = p_org_id and role in ('admin', 'manager', 'owner')
    ));

  -- 6. Calculate percentage
  if v_active_members > 0 then
    v_participation_pct := least(100, round((v_today_checkins::numeric / v_active_members) * 100))::int;
  else
    v_participation_pct := 0;
  end if;

  return json_build_object(
    'today_checkins', v_today_checkins,
    'active_members', v_active_members,
    'eligible_members', v_active_members,
    'total_members', (select count(*)::int from public.organization_members where organization_id = p_org_id and is_active = true),
    'participation_pct', v_participation_pct,
    'last_checkin_at', v_last_checkin_at,
    'target_date', v_target_date
  );
end;
$$;

revoke all on function public.get_org_today_participation(uuid, text) from public, anon;
grant execute on function public.get_org_today_participation(uuid, text) to authenticated;

-- 2. Create notifications table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  organization_id uuid references public.organizations(id) on delete cascade not null,
  type text not null default 'daily_checkin_reminder',
  title text not null,
  message text not null,
  target_date date not null default current_date,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_date on public.notifications(user_id, target_date);
create index if not exists idx_notifications_org on public.notifications(organization_id);

alter table public.notifications enable row level security;

drop policy if exists "Users can view their own notifications" on public.notifications;
create policy "Users can view their own notifications"
  on public.notifications
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can update their own notifications" on public.notifications;
create policy "Users can update their own notifications"
  on public.notifications
  for update
  using (auth.uid() = user_id);

-- 3. Create dispatch_daily_checkin_notifications function
create or replace function public.dispatch_daily_checkin_notifications(
  p_org_id uuid,
  p_target_date text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_date date;
  v_count integer := 0;
begin
  if p_target_date is not null and p_target_date ~ '^\\d{4}-\\d{2}-\\d{2}$' then
    v_date := p_target_date::date;
  else
    v_date := current_date;
  end if;

  insert into public.notifications (
    user_id,
    organization_id,
    type,
    title,
    message,
    target_date,
    is_read,
    created_at
  )
  select
    om.user_id,
    p_org_id,
    'daily_checkin_reminder',
    'Daily Pulse Check-in Ready',
    'A new day has started! Today''s 60-second confidential pulse check-in is now open.',
    v_date,
    false,
    now()
  from public.organization_members om
  where om.organization_id = p_org_id
    and om.is_active = true
    and om.role not in ('admin', 'manager', 'owner')
    and not exists (
      select 1 from public.notifications n
      where n.user_id = om.user_id
        and n.organization_id = p_org_id
        and n.target_date = v_date
        and n.type = 'daily_checkin_reminder'
    );

  get diagnostics v_count = row_count;

  return json_build_object(
    'status', 'success',
    'date', v_date,
    'notifications_dispatched', v_count
  );
end;
$$;

grant execute on function public.dispatch_daily_checkin_notifications(uuid, text) to authenticated, anon;
