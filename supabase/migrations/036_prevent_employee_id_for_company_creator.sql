-- =============================================================================
-- PeoplePulse — Database Schema Migration 036
-- Prevent Employee ID Generation for Company Creators, Owners & Admins
-- =============================================================================

-- 1. Redefine handle_auto_assign_employee_id()
create or replace function public.handle_auto_assign_employee_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next_val integer;
  v_prefix text := 'EMP';
  v_dept_code text := '';
begin
  -- For organization_members
  if TG_TABLE_NAME = 'organization_members' then
    -- Owners and Admins NEVER get an employee ID
    if NEW.role in ('owner', 'admin') then
      NEW.employee_id := null;
      return NEW;
    end if;

    if NEW.employee_id is null or trim(NEW.employee_id) = '' then
      -- Resolve department code if present
      if NEW.department is not null and trim(NEW.department) != '' then
        v_dept_code := upper(substring(trim(NEW.department) from 1 for 3));
        if v_dept_code = 'MAR' then v_dept_code := 'MAR'; end if;
        if v_dept_code = 'OPE' then v_dept_code := 'OPS'; end if;
        if v_dept_code = 'CUS' then v_dept_code := 'CS'; end if;
        if v_dept_code = 'HUM' then v_dept_code := 'HR'; end if;
      elsif NEW.role = 'manager' then
        v_dept_code := 'MGR';
      end if;

      -- Generate sequential number
      select coalesce(max(nullif(regexp_replace(employee_id, '\D', '', 'g'), '')::int), 100) + 1
      into v_next_val
      from public.organization_members
      where organization_id = NEW.organization_id;

      if v_dept_code != '' then
        NEW.employee_id := format('%s-%s-%s', v_prefix, v_dept_code, lpad(v_next_val::text, 2, '0'));
      else
        NEW.employee_id := format('%s-%s', v_prefix, lpad(v_next_val::text, 4, '0'));
      end if;
    end if;

    -- Only sync to profiles if profile is an actual employee
    if NEW.user_id is not null and NEW.employee_id is not null then
      update public.profiles
      set employee_id = coalesce(employee_id, NEW.employee_id)
      where id = NEW.user_id and role = 'employee';
    end if;
  end if;

  -- For profiles
  if TG_TABLE_NAME = 'profiles' then
    -- Company Owners and Admins NEVER get an employee ID
    if NEW.role in ('owner', 'admin') then
      NEW.employee_id := null;
      return NEW;
    end if;

    -- Only assign employee_id if role is explicitly employee
    if NEW.role = 'employee' then
      if NEW.employee_id is null or trim(NEW.employee_id) = '' then
        select coalesce(max(nullif(regexp_replace(employee_id, '\D', '', 'g'), '')::int), 100) + 1
        into v_next_val
        from public.profiles
        where role = 'employee';

        NEW.employee_id := format('%s-%s', v_prefix, lpad(v_next_val::text, 4, '0'));
      end if;
    else
      NEW.employee_id := null;
    end if;
  end if;

  return NEW;
end;
$$;

-- 2. Redefine handle_new_auth_user() to default direct signups to admin without employee_id
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  -- If metadata specifies role, use it; otherwise default to admin (since all direct signups are to create a company)
  v_role := coalesce(nullif(trim(new.raw_user_meta_data->>'role'), ''), 'admin');

  insert into public.profiles (
    id,
    name,
    email,
    role,
    employee_id
  ) values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    lower(new.email),
    v_role,
    null
  )
  on conflict (id) do update set
    email = excluded.email,
    name = coalesce(public.profiles.name, excluded.name),
    role = case
      when public.profiles.role is null or public.profiles.role = 'employee' then excluded.role
      else public.profiles.role
    end;

  return new;
end;
$$;

-- 3. Redefine create_organization_with_owner() to ensure owner has role admin/owner and no employee_id
create or replace function public.create_organization_with_owner(
  p_name text,
  p_slug text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_normalized_slug text;
  v_org_id uuid;
  v_team_id uuid;
begin
  -- 1. Verify caller is authenticated
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED: Must be logged in to create an organization.';
  end if;

  -- 2. Validate organization name
  if p_name is null or length(trim(p_name)) < 2 then
    raise exception 'INVALID_NAME: Organization name must be at least 2 characters.';
  end if;

  -- 3. Normalize and validate slug
  v_normalized_slug := lower(regexp_replace(trim(p_slug), '[^a-zA-Z0-9\-]', '', 'g'));
  if length(v_normalized_slug) < 2 then
    raise exception 'INVALID_SLUG: Organization slug must contain at least 2 alphanumeric characters.';
  end if;

  -- 4. Check slug uniqueness
  if exists (select 1 from public.organizations where slug = v_normalized_slug) then
    raise exception 'SLUG_TAKEN: An organization with this web identifier already exists.';
  end if;

  -- 5. Create organization with default Free tier limits
  insert into public.organizations (
    name,
    slug,
    plan,
    subscription_status,
    max_seats,
    max_teams
  ) values (
    trim(p_name),
    v_normalized_slug,
    'free',
    'active',
    10,
    1
  ) returning id into v_org_id;

  -- 6. Add creator as Owner in organization_members (employee_id is NULL for owner)
  insert into public.organization_members (
    organization_id,
    user_id,
    role,
    employee_id
  ) values (
    v_org_id,
    v_user_id,
    'owner',
    null
  );

  -- 7. Synchronize profile role to admin and clear any employee_id
  update public.profiles
  set role = 'admin',
      employee_id = null
  where id = v_user_id;

  -- Also update auth user metadata role to admin
  update auth.users
  set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
  where id = v_user_id;

  -- 8. Create default "General" team
  insert into public.teams (
    organization_id,
    name,
    manager_id
  ) values (
    v_org_id,
    'General',
    v_user_id
  ) returning id into v_team_id;

  -- 9. Add owner to default team
  insert into public.team_members (
    team_id,
    user_id
  ) values (
    v_team_id,
    v_user_id
  ) on conflict do nothing;

  return json_build_object(
    'organization_id', v_org_id,
    'name', trim(p_name),
    'slug', v_normalized_slug,
    'team_id', v_team_id,
    'role', 'owner',
    'plan', 'free'
  );
end;
$$;

-- 4. Clean up any existing owners/admins and fix gregeg account
UPDATE public.profiles SET employee_id = null WHERE role in ('admin', 'owner');
UPDATE public.organization_members SET employee_id = null WHERE role in ('owner', 'admin');

-- Explicit fix for user gregeg (dar.knikolov12.3@gmail.com)
UPDATE public.profiles
SET role = 'admin', employee_id = null
WHERE id = '88a7bfdf-52f4-4d42-be8f-06dcf418465d';

UPDATE auth.users
SET raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
WHERE id = '88a7bfdf-52f4-4d42-be8f-06dcf418465d';

-- Record migration
insert into supabase_migrations.schema_migrations (version, name)
values ('036', 'prevent_employee_id_for_company_creator')
on conflict (version) do nothing;
