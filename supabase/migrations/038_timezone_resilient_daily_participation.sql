-- 038_timezone_resilient_daily_participation.sql
-- Ensure daily participation accurately counts check-ins regardless of timezone boundaries (UTC vs Local)

CREATE OR REPLACE FUNCTION public.get_org_today_participation(p_org_id uuid, p_local_date text DEFAULT NULL::text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  -- 3. Resolve target date: defaults to current local date
  if p_local_date is not null and p_local_date ~ '^\d{4}-\d{2}-\d{2}$' then
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

  -- 5. Count today's check-ins:
  -- Matches if submitted on target date (UTC or local), on current date, or in past 24 hours
  select
    count(distinct coalesce(c.user_id::text, c.id::text))::int,
    max(c.created_at)
  into v_today_checkins, v_last_checkin_at
  from public.checkins c
  where c.organization_id = p_org_id
    and (
      c.week_start = v_target_date
      or (c.created_at at time zone 'UTC')::date = v_target_date
      or (c.created_at at time zone 'Asia/Kolkata')::date = v_target_date
      or (c.created_at at time zone 'UTC')::date = current_date
      or c.created_at >= (now() - interval '24 hours')
    )
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
