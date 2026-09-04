-- =============================================================================
-- PeoplePulse — Database Schema Migration 008
-- Multi-Tenant Organizations, Memberships, and Database-Level Tenant Isolation
-- =============================================================================

-- Enable pgcrypto if not already enabled
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. ORGANIZATIONS TABLE
-- Represents the top-level customer tenant boundary.
-- -----------------------------------------------------------------------------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  billing_email text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'enterprise')),
  subscription_status text not null default 'active' check (
    subscription_status in ('trialing', 'active', 'past_due', 'canceled', 'incomplete')
  ),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  max_seats integer not null default 10,
  max_teams integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_organizations_slug on public.organizations(slug);

-- -----------------------------------------------------------------------------
-- 2. ORGANIZATION MEMBERS TABLE
-- Authoritative SaaS membership and role model.
-- Roles: owner, admin, manager, employee
-- -----------------------------------------------------------------------------
create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'manager', 'employee')),
  job_title text,
  department text,
  is_active boolean not null default true,
  joined_at timestamptz not null default now(),
  constraint unique_org_user unique (organization_id, user_id)
);

create index if not exists idx_org_members_user on public.organization_members(user_id);
create index if not exists idx_org_members_org on public.organization_members(organization_id);

-- -----------------------------------------------------------------------------
-- 3. SEED DEFAULT TENANT: ACME CORP & NON-DESTRUCTIVE DATA BACKFILL
-- Guarantees existing test users and check-ins are not orphaned or deleted.
-- -----------------------------------------------------------------------------
do $$
declare
  v_acme_id uuid;
begin
  -- Insert default Acme Corp if not exists
  select id into v_acme_id from public.organizations where slug = 'acme-corp';
  if v_acme_id is null then
    insert into public.organizations (
      name,
      slug,
      billing_email,
      plan,
      subscription_status,
      max_seats,
      max_teams
    ) values (
      'Acme Corp',
      'acme-corp',
      'admin@company.com',
      'pro',
      'active',
      100,
      50
    ) returning id into v_acme_id;
  end if;

  -- Backfill memberships for existing profiles
  -- Admin user -> owner
  insert into public.organization_members (organization_id, user_id, role)
  select v_acme_id, p.id, 'owner'
  from public.profiles p
  where p.email = 'admin@company.com'
  on conflict (organization_id, user_id) do nothing;

  -- Sarah Patel -> manager
  insert into public.organization_members (organization_id, user_id, role)
  select v_acme_id, p.id, 'manager'
  from public.profiles p
  where p.email = 'sarah.patel@company.com'
  on conflict (organization_id, user_id) do nothing;

  -- Alex Morgan -> employee
  insert into public.organization_members (organization_id, user_id, role)
  select v_acme_id, p.id, 'employee'
  from public.profiles p
  where p.email = 'alex.morgan@company.com'
  on conflict (organization_id, user_id) do nothing;

  -- Catch any other unassigned profiles as employees
  insert into public.organization_members (organization_id, user_id, role)
  select v_acme_id, p.id, case when p.role = 'admin' then 'admin' when p.role = 'manager' then 'manager' else 'employee' end
  from public.profiles p
  where p.id not in (select user_id from public.organization_members where organization_id = v_acme_id)
  on conflict (organization_id, user_id) do nothing;
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. ADD TENANT OWNERSHIP (COLUMNS & BACKFILL)
-- -----------------------------------------------------------------------------
alter table public.teams
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

alter table public.checkins
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

alter table public.survey_questions
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

alter table public.imports
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

-- Backfill organization_id on existing rows
do $$
declare
  v_acme_id uuid;
begin
  select id into v_acme_id from public.organizations where slug = 'acme-corp' limit 1;

  update public.teams set organization_id = v_acme_id where organization_id is null;
  update public.checkins set organization_id = v_acme_id where organization_id is null;
  update public.imports set organization_id = v_acme_id where organization_id is null;
  -- Note: survey_questions.organization_id is left NULL for system-default questions
end;
$$;

-- Apply NOT NULL constraints after successful backfill
alter table public.teams alter column organization_id set not null;
alter table public.checkins alter column organization_id set not null;
alter table public.imports alter column organization_id set not null;

create index if not exists idx_teams_organization on public.teams(organization_id);
create index if not exists idx_checkins_organization on public.checkins(organization_id);
create index if not exists idx_survey_questions_organization on public.survey_questions(organization_id);
create index if not exists idx_imports_organization on public.imports(organization_id);

-- -----------------------------------------------------------------------------
-- 5. TENANT SECURITY DEFINER HELPER FUNCTIONS
-- Explicit search_path = public, non-recursive to avoid RLS loops.
-- -----------------------------------------------------------------------------

-- Get all active organization IDs for the current authenticated user
create or replace function public.get_current_user_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.organization_members
  where user_id = auth.uid() and is_active = true;
$$;

-- Check if caller is owner or admin in a given organization
create or replace function public.is_org_admin(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = p_org_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
      and is_active = true
  );
$$;

-- Check if caller is manager of a given team or admin of its organization
create or replace function public.is_team_manager(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.teams t
    where t.id = p_team_id
      and (
        t.manager_id = auth.uid()
        or public.is_org_admin(t.organization_id)
      )
  );
$$;

-- Ensure get_current_user_team_id enforces caller belongs to team in caller's organization
create or replace function public.get_current_user_team_id()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_team_id uuid;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED: User is not logged in.';
  end if;

  select count(*), max(tm.team_id)
  into v_count, v_team_id
  from public.team_members tm
  join public.teams t on tm.team_id = t.id
  where tm.user_id = auth.uid()
    and t.organization_id in (select public.get_current_user_org_ids());

  if v_count = 0 then
    raise exception 'NO_TEAM_ASSIGNED: User has no assigned team membership.';
  elsif v_count > 1 then
    raise exception 'MULTIPLE_TEAMS_ASSIGNED: User belongs to multiple teams in active organization.';
  end if;

  return v_team_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY — STRICT TENANT ISOLATION
-- -----------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

-- Table privileges
grant all on table public.organizations to anon, authenticated;
grant all on table public.organization_members to anon, authenticated;

-- Organizations Policies
drop policy if exists "organizations_select_member" on public.organizations;
create policy "organizations_select_member"
  on public.organizations
  for select
  using (id in (select public.get_current_user_org_ids()));

drop policy if exists "organizations_update_admin" on public.organizations;
create policy "organizations_update_admin"
  on public.organizations
  for update
  using (public.is_org_admin(id))
  with check (public.is_org_admin(id));

-- Organization Members Policies
drop policy if exists "org_members_select_coworkers" on public.organization_members;
create policy "org_members_select_coworkers"
  on public.organization_members
  for select
  using (organization_id in (select public.get_current_user_org_ids()));

drop policy if exists "org_members_insert_admin" on public.organization_members;
create policy "org_members_insert_admin"
  on public.organization_members
  for insert
  with check (public.is_org_admin(organization_id));

drop policy if exists "org_members_update_admin" on public.organization_members;
create policy "org_members_update_admin"
  on public.organization_members
  for update
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

drop policy if exists "org_members_delete_admin" on public.organization_members;
create policy "org_members_delete_admin"
  on public.organization_members
  for delete
  using (public.is_org_admin(organization_id));

-- Teams Policies
drop policy if exists "teams_select_authenticated" on public.teams;
drop policy if exists "teams_select_manager" on public.teams;
drop policy if exists "teams_all_admin" on public.teams;

create policy "teams_select_org_member"
  on public.teams
  for select
  using (organization_id in (select public.get_current_user_org_ids()));

create policy "teams_admin_all"
  on public.teams
  for all
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

-- Team Members Policies
drop policy if exists "team_members_select_own" on public.team_members;
drop policy if exists "team_members_select_manager" on public.team_members;
drop policy if exists "team_members_admin_all" on public.team_members;

create policy "team_members_select_org"
  on public.team_members
  for select
  using (
    team_id in (
      select id from public.teams
      where organization_id in (select public.get_current_user_org_ids())
    )
  );

create policy "team_members_admin_all"
  on public.team_members
  for all
  using (
    public.is_org_admin((select organization_id from public.teams where id = team_members.team_id))
  )
  with check (
    public.is_org_admin((select organization_id from public.teams where id = team_members.team_id))
  );

-- Checkins Policies (Preserving strict anonymous protection)
drop policy if exists "checkins_insert_authenticated" on public.checkins;
drop policy if exists "checkins_select_own_named" on public.checkins;
drop policy if exists "checkins_select_manager_named_direct_reports" on public.checkins;

-- INSERT: Enforce caller belongs to checkin's organization, team belongs to organization,
-- and anonymous rules are preserved.
create policy "checkins_insert_authenticated"
  on public.checkins
  for insert
  with check (
    auth.uid() is not null and
    organization_id in (select public.get_current_user_org_ids()) and
    team_id = public.get_current_user_team_id() and
    (select organization_id from public.teams where id = checkins.team_id) = organization_id and
    (
      (is_anonymous = false and user_id = auth.uid()) or
      (is_anonymous = true and user_id is null)
    )
  );

-- SELECT (Named Check-ins only):
create policy "checkins_select_named"
  on public.checkins
  for select
  using (
    organization_id in (select public.get_current_user_org_ids()) and
    is_anonymous = false and
    (
      user_id = auth.uid() or
      public.is_team_manager(team_id) or
      public.is_org_admin(organization_id)
    )
  );

-- CRITICAL: Zero SELECT policy on raw anonymous rows! Raw anonymous check-ins
-- remain 100% inaccessible to direct SELECT for all client roles.

-- Sentiment Results Policies
drop policy if exists "sentiment_select_own" on public.sentiment_results;
drop policy if exists "sentiment_select_manager" on public.sentiment_results;
drop policy if exists "sentiment_select_admin" on public.sentiment_results;

create policy "sentiment_select_named"
  on public.sentiment_results
  for select
  using (
    checkin_id in (
      select c.id from public.checkins c
      where c.is_anonymous = false
        and c.organization_id in (select public.get_current_user_org_ids())
        and (
          c.user_id = auth.uid()
          or public.is_team_manager(c.team_id)
          or public.is_org_admin(c.organization_id)
        )
    )
  );

-- Survey Questions Policies
drop policy if exists "survey_questions_select_active" on public.survey_questions;
drop policy if exists "survey_questions_admin" on public.survey_questions;

create policy "survey_questions_select_active"
  on public.survey_questions
  for select
  using (
    auth.uid() is not null
    and is_active = true
    and (
      organization_id is null
      or organization_id in (select public.get_current_user_org_ids())
    )
  );

create policy "survey_questions_admin"
  on public.survey_questions
  for all
  using (
    organization_id is not null and public.is_org_admin(organization_id)
  )
  with check (
    organization_id is not null and public.is_org_admin(organization_id)
  );

-- Imports Policies
drop policy if exists "imports_admin" on public.imports;

create policy "imports_admin"
  on public.imports
  for all
  using (
    public.is_org_admin(organization_id)
  )
  with check (
    public.is_org_admin(organization_id)
  );

-- -----------------------------------------------------------------------------
-- 7. MULTI-TENANT SECURED AGGREGATION FUNCTION (n >= 3)
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
  v_team_org_id uuid;
  v_is_authorized boolean;
  total_count int;
  anon_count int;
  named_count int;
  team_metrics json;
  anon_breakdown json;
begin
  -- 1. Ensure caller is authenticated
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED: Must be logged in.';
  end if;

  -- 2. Fetch team's organization
  select organization_id into v_team_org_id
  from public.teams
  where id = p_team_id;

  if v_team_org_id is null then
    raise exception 'TEAM_NOT_FOUND: Team does not exist.';
  end if;

  -- 3. Verify caller belongs to the team's organization AND is manager or org admin
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = v_team_org_id
      and om.user_id = auth.uid()
      and om.is_active = true
      and (
        om.role in ('owner', 'admin')
        or exists (select 1 from public.teams t where t.id = p_team_id and t.manager_id = auth.uid())
      )
  ) into v_is_authorized;

  if not v_is_authorized then
    raise exception 'UNAUTHORIZED: Caller is not the manager of this team or an organization admin.';
  end if;

  -- 4. Gather counts scoped to this team, week, and organization
  select
    count(*),
    count(*) filter (where is_anonymous = true),
    count(*) filter (where is_anonymous = false)
  into total_count, anon_count, named_count
  from public.checkins
  where team_id = p_team_id
    and organization_id = v_team_org_id
    and week_start = p_week_start;

  -- 5. Minimum team sample size protection (n >= 3)
  if total_count < 3 then
    return json_build_object(
      'status', 'insufficient_team_sample',
      'message', 'Fewer than 3 total team check-ins. Team metrics are hidden to protect privacy.',
      'total_count', total_count,
      'anonymous_count', anon_count,
      'named_count', named_count
    );
  end if;

  -- 6. Overall blended metrics
  select json_build_object(
    'avg_workload', round(avg(workload), 2),
    'avg_manager_support', round(avg(manager_support), 2),
    'avg_team_collaboration', round(avg(team_collaboration), 2),
    'avg_motivation', round(avg(motivation), 2),
    'avg_stress_level', round(avg(stress_level), 2)
  ) into team_metrics
  from public.checkins
  where team_id = p_team_id
    and organization_id = v_team_org_id
    and week_start = p_week_start;

  -- 7. Anonymous-derived breakdown WITH DEDICATED THRESHOLD (anon_count >= 3)
  if anon_count >= 3 then
    select json_build_object(
      'status', 'available',
      'sample_size', anon_count,
      'avg_workload', round(avg(workload), 2),
      'avg_stress_level', round(avg(stress_level), 2),
      'comments', coalesce(
        json_agg(free_text) filter (
          where free_text is not null and length(trim(free_text)) > 0
        ),
        '[]'::json
      )
    ) into anon_breakdown
    from public.checkins
    where team_id = p_team_id
      and organization_id = v_team_org_id
      and week_start = p_week_start
      and is_anonymous = true;
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
    'organization_id', v_team_org_id,
    'week_start', p_week_start,
    'total_count', total_count,
    'anonymous_count', anon_count,
    'named_count', named_count,
    'team_metrics', team_metrics,
    'anonymous_breakdown', anon_breakdown
  );
end;
$$;

-- Record migration in schema_migrations
insert into supabase_migrations.schema_migrations (version, name)
values ('008', 'organizations_and_tenancy')
on conflict (version) do nothing;

