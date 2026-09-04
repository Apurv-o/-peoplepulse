-- =============================================================================
-- PeoplePulse — Database Schema Migration 013
-- Fix pgcrypto functions search_path in invitation RPCs
-- =============================================================================

-- Ensure pgcrypto is installed in extensions schema
create extension if not exists "pgcrypto" with schema extensions;

-- Fix create_org_invitation search_path and extensions schema references
create or replace function public.create_org_invitation(
  p_organization_id uuid,
  p_email text,
  p_role text,
  p_team_id uuid default null
)
returns json
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
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
      raise exception 'INVALID_TEAM: Specified team does not belong to this organization.';
    end if;
  end if;

  -- 6. Check if email already belongs to this organization
  if exists (
    select 1
    from public.organization_members om
    join public.profiles p on om.user_id = p.id
    where om.organization_id = p_organization_id
      and lower(p.email) = v_normalized_email
      and om.is_active = true
  ) then
    raise exception 'ALREADY_MEMBER: A user with this email address is already an active member of this organization.';
  end if;

  -- 7. Enforce plan seat limits
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
  v_raw_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_token_hash := encode(extensions.digest(v_raw_token, 'sha256'), 'hex');
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

-- Fix accept_org_invitation search_path and extensions schema references
create or replace function public.accept_org_invitation(
  p_token text
)
returns json
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
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
    select lower(email) into v_user_email
    from auth.users
    where id = v_user_id;
  end if;

  -- 2. Compute token hash
  if p_token is null or length(trim(p_token)) < 16 then
    raise exception 'INVALID_TOKEN: Invitation token is invalid or malformed.';
  end if;
  v_token_hash := encode(extensions.digest(trim(p_token), 'sha256'), 'hex');

  -- 3. Find matching active invitation
  select * into v_invite
  from public.invitations
  where token_hash = v_token_hash
    and accepted_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception 'INVITATION_EXPIRED_OR_NOT_FOUND: Invitation is invalid, expired, or has already been accepted.';
  end if;

  -- 4. Enforce invited email matches authenticated user
  if v_user_email != v_invite.email then
    raise exception 'EMAIL_MISMATCH: This invitation was sent to % but you are signed in as %.', v_invite.email, v_user_email;
  end if;

  -- 5. Fetch organization & check seat capacity
  select * into v_org
  from public.organizations
  where id = v_invite.organization_id;

  select count(*) into v_current_members
  from public.organization_members
  where organization_id = v_invite.organization_id and is_active = true;

  if v_current_members >= v_org.max_seats then
    raise exception 'SEAT_LIMIT_REACHED: Organization has reached its maximum seat limit.';
  end if;

  -- 6. Add or update organization membership
  insert into public.organization_members (
    organization_id,
    user_id,
    role,
    is_active
  ) values (
    v_invite.organization_id,
    v_user_id,
    v_invite.role,
    true
  )
  on conflict (organization_id, user_id) do update
  set role = excluded.role,
      is_active = true,
      updated_at = now();

  -- 7. If team was specified in invitation, assign user to team
  if v_invite.team_id is not null then
    insert into public.team_members (
      team_id,
      user_id
    ) values (
      v_invite.team_id,
      v_user_id
    )
    on conflict (team_id, user_id) do nothing;
  end if;

  -- 8. Mark invitation accepted
  update public.invitations
  set accepted_at = now()
  where id = v_invite.id;

  return json_build_object(
    'success', true,
    'organization_id', v_org.id,
    'organization_name', v_org.name,
    'role', v_invite.role,
    'team_id', v_invite.team_id
  );
end;
$$;

grant execute on function public.create_org_invitation(uuid, text, text, uuid) to authenticated;
grant execute on function public.accept_org_invitation(text) to authenticated;

insert into supabase_migrations.schema_migrations (version, statements)
values ('013', array['fix_pgcrypto_search_path'])
on conflict (version) do nothing;
