-- =============================================================================
-- PeoplePulse — Database Schema Migration 023
-- Public Invitation Details Lookup RPC
-- Allows invited employees to safely preview their invitation details (org name, email, role, team)
-- =============================================================================

create or replace function public.get_invitation_details(p_token text)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token_hash text;
  v_invite record;
  v_org_name text;
  v_team_name text;
begin
  if p_token is null or length(trim(p_token)) < 16 then
    return json_build_object('valid', false, 'error', 'Invalid token format.');
  end if;

  v_token_hash := encode(digest(trim(p_token), 'sha256'), 'hex');

  select * into v_invite
  from public.invitations
  where token_hash = v_token_hash
    and accepted_at is null
    and expires_at > now();

  if v_invite.id is null then
    return json_build_object(
      'valid', false,
      'error', 'This invitation link is either expired, already used, or invalid.'
    );
  end if;

  -- Fetch organization name
  select name into v_org_name
  from public.organizations
  where id = v_invite.organization_id;

  -- Fetch team name if assigned
  if v_invite.team_id is not null then
    select name into v_team_name
    from public.teams
    where id = v_invite.team_id;
  end if;

  return json_build_object(
    'valid', true,
    'email', v_invite.email,
    'role', v_invite.role,
    'organization_id', v_invite.organization_id,
    'organization_name', coalesce(v_org_name, 'Organization'),
    'team_name', v_team_name,
    'expires_at', v_invite.expires_at
  );
end;
$$;

grant execute on function public.get_invitation_details(text) to anon, authenticated;
