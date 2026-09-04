-- =============================================================================
-- PeoplePulse — Database Schema Migration 009
-- Organization Onboarding & Cryptographically Secure Tokenized Invitations
-- =============================================================================

-- Enable pgcrypto
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. INVITATIONS TABLE
-- -----------------------------------------------------------------------------
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'manager', 'employee')),
  team_id uuid references public.teams(id) on delete set null,
  token_hash text not null,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_invitations_org_email on public.invitations(organization_id, lower(email));
create index if not exists idx_invitations_token_hash on public.invitations(token_hash);
create index if not exists idx_invitations_expires on public.invitations(expires_at);

-- Enable RLS and grants
alter table public.invitations enable row level security;
grant all on table public.invitations to anon, authenticated;

drop policy if exists "invitations_select_admin" on public.invitations;
create policy "invitations_select_admin"
  on public.invitations
  for select
  using (public.is_org_admin(organization_id));

drop policy if exists "invitations_delete_admin" on public.invitations;
create policy "invitations_delete_admin"
  on public.invitations
  for delete
  using (public.is_org_admin(organization_id));

-- -----------------------------------------------------------------------------
-- 2. ONBOARDING RPC: create_organization_with_owner
-- Atomically provisions a new organization, owner membership, and default team.
-- -----------------------------------------------------------------------------
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

  -- 6. Add creator as Owner in organization_members
  insert into public.organization_members (
    organization_id,
    user_id,
    role
  ) values (
    v_org_id,
    v_user_id,
    'owner'
  );

  -- 7. Synchronize compatibility profile role
  update public.profiles
  set role = 'admin'
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

-- -----------------------------------------------------------------------------
-- 3. INVITATION RPC: create_org_invitation
-- Generates a secure random token, stores SHA-256 hash, and enforces seat limits.
-- -----------------------------------------------------------------------------
create or replace function public.create_org_invitation(
  p_organization_id uuid,
  p_email text,
  p_role text,
  p_team_id uuid default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_normalized_email text;
  v_max_seats integer;
  v_current_members integer;
  v_pending_invites integer;
  v_raw_token text;
  v_token_hash text;
  v_invite_id uuid;
  v_expires_at timestamptz;
begin
  -- 1. Verify caller is authenticated
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED: Must be logged in to send invitations.';
  end if;

  -- 2. Verify caller is admin or owner of target organization
  if not public.is_org_admin(p_organization_id) then
    raise exception 'UNAUTHORIZED: Only organization owners or admins can invite new members.';
  end if;

  -- 3. Validate role ('owner' is strictly prohibited through normal invitations)
  if p_role not in ('admin', 'manager', 'employee') then
    raise exception 'INVALID_ROLE: Role must be admin, manager, or employee.';
  end if;

  -- 4. Validate email
  v_normalized_email := lower(trim(p_email));
  if v_normalized_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' then
    raise exception 'INVALID_EMAIL: Please provide a valid email address.';
  end if;

  -- 5. Verify team belongs to organization if provided
  if p_team_id is not null then
    if not exists (select 1 from public.teams where id = p_team_id and organization_id = p_organization_id) then
      raise exception 'INVALID_TEAM: The selected team does not belong to this organization.';
    end if;
  end if;

  -- 6. Check if user is already an active member of this organization
  if exists (
    select 1
    from public.organization_members om
    join public.profiles p on om.user_id = p.id
    where om.organization_id = p_organization_id
      and lower(p.email) = v_normalized_email
      and om.is_active = true
  ) then
    raise exception 'ALREADY_MEMBER: A user with this email is already an active member of this organization.';
  end if;

  -- 7. Enforce seat limit
  select max_seats into v_max_seats
  from public.organizations
  where id = p_organization_id;

  select count(*) into v_current_members
  from public.organization_members
  where organization_id = p_organization_id and is_active = true;

  select count(*) into v_pending_invites
  from public.invitations
  where organization_id = p_organization_id
    and accepted_at is null
    and expires_at > now();

  if (v_current_members + v_pending_invites) >= v_max_seats then
    raise exception 'SEAT_LIMIT_REACHED: Organization seat capacity of % members has been reached. Please upgrade your plan to invite more team members.', v_max_seats;
  end if;

  -- 8. Generate cryptographically secure token & SHA-256 hash
  v_raw_token := encode(gen_random_bytes(32), 'hex');
  v_token_hash := encode(digest(v_raw_token, 'sha256'), 'hex');
  v_expires_at := now() + interval '7 days';

  -- 9. Insert or replace existing unaccepted invitation
  insert into public.invitations (
    organization_id,
    email,
    role,
    team_id,
    token_hash,
    invited_by,
    expires_at
  ) values (
    p_organization_id,
    v_normalized_email,
    p_role,
    p_team_id,
    v_token_hash,
    v_caller_id,
    v_expires_at
  )
  returning id into v_invite_id;

  -- Return raw token to caller once for link creation
  return json_build_object(
    'invitation_id', v_invite_id,
    'token', v_raw_token,
    'email', v_normalized_email,
    'role', p_role,
    'team_id', p_team_id,
    'expires_at', v_expires_at
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. INVITATION ACCEPTANCE RPC: accept_org_invitation
-- Validates token hash, enforces email match, attaches user to org and team.
-- -----------------------------------------------------------------------------
create or replace function public.accept_org_invitation(
  p_token text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_user_email text;
  v_token_hash text;
  v_invite record;
  v_org record;
  v_current_members integer;
begin
  -- 1. Ensure caller is authenticated
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED: Please log in or sign up before accepting an invitation.';
  end if;

  -- Fetch caller email from profiles
  select lower(email) into v_user_email
  from public.profiles
  where id = v_user_id;

  if v_user_email is null then
    -- Fallback to auth.users if profile trigger has not yet completed
    select lower(email) into v_user_email
    from auth.users
    where id = v_user_id;
  end if;

  -- 2. Compute token hash
  if p_token is null or length(trim(p_token)) < 16 then
    raise exception 'INVALID_TOKEN: Invitation token is invalid or malformed.';
  end if;
  v_token_hash := encode(digest(trim(p_token), 'sha256'), 'hex');

  -- 3. Find matching active invitation
  select * into v_invite
  from public.invitations
  where token_hash = v_token_hash
    and accepted_at is null
    and expires_at > now()
  for update;

  if v_invite.id is null then
    raise exception 'INVALID_OR_EXPIRED_INVITATION: This invitation link is either expired, already used, or invalid.';
  end if;

  -- 4. Enforce email match
  if lower(v_invite.email) != v_user_email then
    raise exception 'EMAIL_MISMATCH: This invitation was sent to % but you are logged in as %.', v_invite.email, v_user_email;
  end if;

  -- 5. Fetch organization & check seat capacity
  select * into v_org
  from public.organizations
  where id = v_invite.organization_id;

  select count(*) into v_current_members
  from public.organization_members
  where organization_id = v_invite.organization_id and is_active = true;

  if v_current_members >= v_org.max_seats then
    raise exception 'SEAT_LIMIT_REACHED: The organization has reached its maximum seat capacity. Please contact the administrator.';
  end if;

  -- 6. Add user to organization_members
  insert into public.organization_members (
    organization_id,
    user_id,
    role,
    is_active,
    joined_at
  ) values (
    v_invite.organization_id,
    v_user_id,
    v_invite.role,
    true,
    now()
  )
  on conflict (organization_id, user_id) do update set
    role = excluded.role,
    is_active = true;

  -- 7. Add user to team if specified
  if v_invite.team_id is not null then
    insert into public.team_members (
      team_id,
      user_id
    ) values (
      v_invite.team_id,
      v_user_id
    )
    on conflict do nothing;
  end if;

  -- 8. Synchronize profile compatibility role
  update public.profiles
  set role = case
    when v_invite.role = 'admin' then 'admin'
    when v_invite.role = 'manager' then 'manager'
    else 'employee'
  end
  where id = v_user_id;

  -- 9. Mark invitation accepted
  update public.invitations
  set accepted_at = now()
  where id = v_invite.id;

  return json_build_object(
    'organization_id', v_invite.organization_id,
    'organization_name', v_org.name,
    'organization_slug', v_org.slug,
    'role', v_invite.role,
    'team_id', v_invite.team_id,
    'accepted_at', now()
  );
end;
$$;

-- Record migration in schema_migrations
insert into supabase_migrations.schema_migrations (version, name)
values ('009', 'invitations_and_onboarding')
on conflict (version) do nothing;
