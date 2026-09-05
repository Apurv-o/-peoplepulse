-- =============================================================================
-- PeoplePulse — Database Schema Migration 019
-- Resend and Revoke Organization Invitations RPCs
-- =============================================================================

-- 1. RPC: resend_org_invitation
-- Regenerates a fresh 7-day token for an existing pending invitation and returns the raw token.
create or replace function public.resend_org_invitation(
  p_invitation_id uuid
)
returns json
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
as $$
declare
  v_caller_id uuid;
  v_invite record;
  v_raw_token text;
  v_token_hash text;
  v_expires_at timestamptz;
begin
  -- 1. Ensure caller is authenticated
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED: Must be logged in to manage invitations.';
  end if;

  -- 2. Fetch invitation
  select * into v_invite
  from public.invitations
  where id = p_invitation_id
  for update;

  if not found then
    raise exception 'INVITATION_NOT_FOUND: Invitation does not exist.';
  end if;

  if v_invite.accepted_at is not null then
    raise exception 'ALREADY_ACCEPTED: This invitation has already been accepted.';
  end if;

  -- 3. Verify caller is admin or owner of target organization
  if not public.is_org_admin(v_invite.organization_id) then
    raise exception 'UNAUTHORIZED: Only organization owners or admins can resend invitations.';
  end if;

  -- 4. Generate new token and 7-day expiration
  v_raw_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_token_hash := encode(extensions.digest(v_raw_token, 'sha256'), 'hex');
  v_expires_at := now() + interval '7 days';

  update public.invitations
  set token_hash = v_token_hash,
      expires_at = v_expires_at,
      created_at = now()
  where id = p_invitation_id;

  return json_build_object(
    'invitation_id', p_invitation_id,
    'token', v_raw_token,
    'email', v_invite.email,
    'role', v_invite.role,
    'team_id', v_invite.team_id,
    'expires_at', v_expires_at
  );
end;
$$;

-- 2. RPC: revoke_org_invitation
-- Cancels/deletes a pending invitation.
create or replace function public.revoke_org_invitation(
  p_invitation_id uuid
)
returns json
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
as $$
declare
  v_caller_id uuid;
  v_invite record;
begin
  -- 1. Ensure caller is authenticated
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED: Must be logged in to manage invitations.';
  end if;

  -- 2. Fetch invitation
  select * into v_invite
  from public.invitations
  where id = p_invitation_id;

  if not found then
    raise exception 'INVITATION_NOT_FOUND: Invitation does not exist.';
  end if;

  -- 3. Verify caller is admin or owner of target organization
  if not public.is_org_admin(v_invite.organization_id) then
    raise exception 'UNAUTHORIZED: Only organization owners or admins can revoke invitations.';
  end if;

  -- 4. Delete invitation
  delete from public.invitations
  where id = p_invitation_id;

  return json_build_object(
    'success', true,
    'revoked_id', p_invitation_id,
    'email', v_invite.email
  );
end;
$$;

-- Privileges
revoke all on function public.resend_org_invitation(uuid) from public, anon;
grant execute on function public.resend_org_invitation(uuid) to authenticated;

revoke all on function public.revoke_org_invitation(uuid) from public, anon;
grant execute on function public.revoke_org_invitation(uuid) to authenticated;

-- Record migration in schema_migrations
insert into supabase_migrations.schema_migrations (version, name)
values ('019', 'resend_and_revoke_invitations')
on conflict (version) do nothing;
