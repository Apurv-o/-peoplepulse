-- =============================================================================
-- PeoplePulse — Database RLS & Security Migration 002
-- Row Level Security (RLS), Role-Based Authorization, and Anonymous Protection
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. SECURITY DEFINER AUTHORIZATION HELPERS
-- Avoid recursive RLS policies and guarantee role authorization from database.
-- -----------------------------------------------------------------------------

create or replace function public.get_auth_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'manager'
  );
$$;

-- -----------------------------------------------------------------------------
-- 2. ENABLE ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.checkins enable row level security;
alter table public.sentiment_results enable row level security;
alter table public.survey_questions enable row level security;
alter table public.imports enable row level security;

-- -----------------------------------------------------------------------------
-- 3. PROFILES POLICIES
-- Uses manager_id for direct report access (profiles does NOT contain team_id).
-- -----------------------------------------------------------------------------

-- Users can read their own profile
create policy "profiles_select_own"
  on public.profiles
  for select
  using (id = auth.uid());

-- Managers can read profiles of their direct reports (profiles.manager_id = auth.uid())
create policy "profiles_select_direct_reports"
  on public.profiles
  for select
  using (
    public.is_manager() and manager_id = auth.uid()
  );

-- Admins can view all profiles
create policy "profiles_select_admin"
  on public.profiles
  for select
  using (public.is_admin());

-- Only Admins can insert/update/delete profiles (admin-created accounts model)
create policy "profiles_insert_admin"
  on public.profiles
  for insert
  with check (public.is_admin());

create policy "profiles_update_admin"
  on public.profiles
  for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "profiles_delete_admin"
  on public.profiles
  for delete
  using (public.is_admin());

-- Users can update non-role fields of their own profile
create policy "profiles_update_own"
  on public.profiles
  for update
  using (id = auth.uid())
  with check (
    id = auth.uid() and
    role = (select p.role from public.profiles p where p.id = auth.uid()) -- prevents changing role
  );

-- -----------------------------------------------------------------------------
-- 4. TEAMS POLICIES
-- -----------------------------------------------------------------------------

-- Team managers can view their own managed teams
create policy "teams_select_manager"
  on public.teams
  for select
  using (manager_id = auth.uid());

-- Admins can view and manage all teams
create policy "teams_all_admin"
  on public.teams
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- Authenticated users can view team names
create policy "teams_select_authenticated"
  on public.teams
  for select
  using (auth.uid() is not null);

-- -----------------------------------------------------------------------------
-- 5. CHECKINS POLICIES (CORE ANONYMOUS INTEGRITY)
-- -----------------------------------------------------------------------------

-- INSERT Policy:
-- Employees can submit check-ins:
-- - If named (is_anonymous = false): user_id MUST equal auth.uid()
-- - If anonymous (is_anonymous = true): user_id MUST be NULL
create policy "checkins_insert_authenticated"
  on public.checkins
  for insert
  with check (
    auth.uid() is not null and
    (
      (is_anonymous = false and user_id = auth.uid()) or
      (is_anonymous = true and user_id is null)
    )
  );

-- SELECT Policy for Employees:
-- An employee can ONLY read their own named submissions.
create policy "checkins_select_own_named"
  on public.checkins
  for select
  using (
    is_anonymous = false and
    user_id = auth.uid()
  );

-- SELECT Policy for Managers:
-- A manager can ONLY read named submissions of their managed direct reports.
-- (profiles.manager_id = auth.uid() and checkins.is_anonymous = false)
create policy "checkins_select_manager_named_direct_reports"
  on public.checkins
  for select
  using (
    public.is_manager() and
    is_anonymous = false and
    user_id in (
      select id from public.profiles where manager_id = auth.uid()
    )
  );

-- CRITICAL ANONYMOUS RESTRICTION:
-- NO SELECT policy is granted for raw rows where is_anonymous = true!
-- Neither managers nor admins can run SELECT * FROM checkins WHERE is_anonymous = true.
-- All anonymous feedback and metrics MUST pass through the security definer
-- aggregation function with strict sample size protection (n >= 3).

-- -----------------------------------------------------------------------------
-- 6. SENTIMENT RESULTS POLICIES
-- -----------------------------------------------------------------------------

-- Employees can read sentiment results of their own named check-ins
create policy "sentiment_select_own"
  on public.sentiment_results
  for select
  using (
    checkin_id in (
      select id from public.checkins where user_id = auth.uid() and is_anonymous = false
    )
  );

-- Managers can read sentiment results of their direct reports' named check-ins
create policy "sentiment_select_manager"
  on public.sentiment_results
  for select
  using (
    public.is_manager() and
    checkin_id in (
      select c.id from public.checkins c
      join public.profiles p on c.user_id = p.id
      where p.manager_id = auth.uid() and c.is_anonymous = false
    )
  );

-- Admins can view sentiment results for named records
create policy "sentiment_select_admin"
  on public.sentiment_results
  for select
  using (
    public.is_admin() and
    checkin_id in (
      select id from public.checkins where is_anonymous = false
    )
  );

-- -----------------------------------------------------------------------------
-- 7. SURVEY QUESTIONS & IMPORTS POLICIES
-- -----------------------------------------------------------------------------

-- Authenticated users can view active survey questions
create policy "survey_questions_select_active"
  on public.survey_questions
  for select
  using (auth.uid() is not null and is_active = true);

-- Admins can manage survey questions
create policy "survey_questions_admin"
  on public.survey_questions
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- Only Admins can view and manage data imports
create policy "imports_admin"
  on public.imports
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- 8. STRENGTHENED ANONYMOUS AGGREGATION FUNCTION (n >= 3 DEDICATED THRESHOLDS)
-- -----------------------------------------------------------------------------
-- Guarantees:
-- 1. Total team metrics require total_count >= 3.
-- 2. Anonymous-specific breakdowns require anon_count >= 3.
--    (e.g., 10 total responses with 1 anonymous response will NOT reveal
--    the anonymous breakdown, preventing identity inference).
-- -----------------------------------------------------------------------------

create or replace function public.get_team_aggregated_insights(
  p_team_id uuid,
  p_week_start date
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  is_auth_manager boolean;
  total_count int;
  anon_count int;
  named_count int;
  team_metrics json;
  anon_breakdown json;
begin
  -- 1. Verify caller is authorized manager for this team or admin
  select exists (
    select 1 from public.teams where id = p_team_id and manager_id = auth.uid()
  ) into is_auth_manager;

  if not (is_auth_manager or public.is_admin()) then
    raise exception 'Unauthorized: Caller is not the manager of this team or an admin.';
  end if;

  -- 2. Gather counts
  select
    count(*),
    count(*) filter (where is_anonymous = true),
    count(*) filter (where is_anonymous = false)
  into total_count, anon_count, named_count
  from public.checkins
  where team_id = p_team_id and week_start = p_week_start;

  -- 3. Check minimum team sample size (n >= 3)
  if total_count < 3 then
    return json_build_object(
      'status', 'insufficient_team_sample',
      'message', 'Fewer than 3 total team check-ins. Team metrics are hidden to protect privacy.',
      'total_count', total_count,
      'anonymous_count', anon_count,
      'named_count', named_count
    );
  end if;

  -- 4. Calculate overall team aggregated metrics (blended)
  select json_build_object(
    'avg_workload', round(avg(workload), 2),
    'avg_manager_support', round(avg(manager_support), 2),
    'avg_team_collaboration', round(avg(team_collaboration), 2),
    'avg_motivation', round(avg(motivation), 2),
    'avg_stress_level', round(avg(stress_level), 2)
  ) into team_metrics
  from public.checkins
  where team_id = p_team_id and week_start = p_week_start;

  -- 5. Calculate anonymous-derived breakdown WITH DEDICATED THRESHOLD:
  -- Even if total_count >= 3 (e.g. 10), if anon_count < 3 (e.g. 1),
  -- the anonymous breakdown MUST NOT be revealed!
  if anon_count >= 3 then
    select json_build_object(
      'status', 'available',
      'sample_size', anon_count,
      'avg_workload', round(avg(workload), 2),
      'avg_stress_level', round(avg(stress_level), 2),
      'comments', coalesce(json_agg(free_text) filter (where free_text is not null and length(trim(free_text)) > 0), '[]'::json)
    ) into anon_breakdown
    from public.checkins
    where team_id = p_team_id and week_start = p_week_start and is_anonymous = true;
  else
    anon_breakdown := json_build_object(
      'status', 'insufficient_anonymous_sample',
      'message', 'Fewer than 3 anonymous submissions. Anonymous-specific breakdown is locked.',
      'sample_size', anon_count
    );
  end if;

  return json_build_object(
    'status', 'ok',
    'team_id', p_team_id,
    'week_start', p_week_start,
    'total_count', total_count,
    'anonymous_count', anon_count,
    'named_count', named_count,
    'team_metrics', team_metrics,
    'anonymous_breakdown', anon_breakdown
  );
end;
$$;
