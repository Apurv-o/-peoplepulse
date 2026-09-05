-- =============================================================================
-- PeoplePulse — Database Schema Migration 029
-- Auto Provisioning Null Token Fix for Supabase GoTrue Auth
-- =============================================================================

-- 1. Patch any existing auth.users rows that have null tokens
update auth.users
set confirmation_token = coalesce(confirmation_token, ''),
    recovery_token = coalesce(recovery_token, ''),
    email_change_token_new = coalesce(email_change_token_new, ''),
    email_change = coalesce(email_change, ''),
    email_change_token_current = coalesce(email_change_token_current, ''),
    phone_change = coalesce(phone_change, ''),
    phone_change_token = coalesce(phone_change_token, ''),
    reauthentication_token = coalesce(reauthentication_token, '')
where confirmation_token is null
   or recovery_token is null
   or email_change_token_new is null
   or email_change is null;

-- 2. Update provision_and_accept_invitation to ensure non-null empty strings for GoTrue
create or replace function public.provision_and_accept_invitation(
  p_token text,
  p_password text,
  p_full_name text default null
)
returns json
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_clean_token text;
  v_clean_password text;
  v_token_hash text;
  v_invite record;
  v_org_name text;
  v_user_id uuid;
  v_existing_user_id uuid;
  v_hashed_pw text;
  v_display_name text;
begin
  -- 1. Validate inputs
  v_clean_token := trim(coalesce(p_token, ''));
  v_clean_password := trim(coalesce(p_password, ''));

  if length(v_clean_token) < 16 then
    raise exception 'INVALID_TOKEN: Invitation token is invalid or missing.';
  end if;

  if length(v_clean_password) < 6 then
    raise exception 'WEAK_PASSWORD: Password must be at least 6 characters.';
  end if;

  -- 2. Resolve invitation by token hash
  v_token_hash := encode(digest(v_clean_token, 'sha256'), 'hex');

  select * into v_invite
  from public.invitations
  where token_hash = v_token_hash
    and accepted_at is null
    and expires_at > now()
  for update;

  if v_invite.id is null then
    raise exception 'INVALID_OR_EXPIRED_INVITATION: This invitation link is either expired, already used, or invalid.';
  end if;

  -- 3. Resolve organization name
  select name into v_org_name
  from public.organizations
  where id = v_invite.organization_id;

  v_display_name := coalesce(nullif(trim(p_full_name), ''), split_part(v_invite.email, '@', 1));
  v_hashed_pw := extensions.crypt(v_clean_password, extensions.gen_salt('bf', 10));

  -- 4. Check if user already exists in auth.users
  select id into v_existing_user_id
  from auth.users
  where lower(email) = lower(v_invite.email)
  limit 1;

  if v_existing_user_id is not null then
    -- User already exists: update password directly & ensure email is confirmed
    v_user_id := v_existing_user_id;

    update auth.users
    set encrypted_password = v_hashed_pw,
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        confirmation_token = coalesce(confirmation_token, ''),
        recovery_token = coalesce(recovery_token, ''),
        email_change_token_new = coalesce(email_change_token_new, ''),
        email_change = coalesce(email_change, ''),
        email_change_token_current = coalesce(email_change_token_current, ''),
        phone_change = coalesce(phone_change, ''),
        phone_change_token = coalesce(phone_change_token, ''),
        reauthentication_token = coalesce(reauthentication_token, ''),
        updated_at = now()
    where id = v_user_id;

    -- Update or create profile
    insert into public.profiles (id, name, email, role, is_active)
    values (v_user_id, v_display_name, lower(v_invite.email), v_invite.role, true)
    on conflict (id) do update set
      name = coalesce(excluded.name, public.profiles.name),
      is_active = true;
  else
    -- User does not exist: Provision user directly in auth.users without triggering email rate limits!
    v_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      email_change_token_current,
      phone_change,
      phone_change_token,
      reauthentication_token,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      lower(v_invite.email),
      v_hashed_pw,
      now(),
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      json_build_object('name', v_display_name, 'role', v_invite.role, 'email_verified', true)::jsonb,
      now(),
      now()
    );

    -- Create matching identity for Supabase auth
    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      gen_random_uuid(),
      v_user_id,
      json_build_object('sub', v_user_id, 'email', lower(v_invite.email), 'email_verified', true, 'phone_verified', false)::jsonb,
      'email',
      v_user_id::text,
      now(),
      now(),
      now()
    ) on conflict (provider, provider_id) do update set
      identity_data = excluded.identity_data,
      updated_at = now();

    -- Create profile
    insert into public.profiles (id, name, email, role, is_active)
    values (v_user_id, v_display_name, lower(v_invite.email), v_invite.role, true)
    on conflict (id) do update set
      name = excluded.name,
      is_active = true;
  end if;

  -- 5. Attach user to organization_members
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
  ) on conflict (organization_id, user_id) do update set
    role = excluded.role,
    is_active = true;

  -- 6. Attach user to assigned team if designated in invitation
  if v_invite.team_id is not null then
    insert into public.team_members (team_id, user_id)
    values (v_invite.team_id, v_user_id)
    on conflict (team_id, user_id) do nothing;
  end if;

  -- 7. Mark invitation as accepted
  update public.invitations
  set accepted_at = now()
  where id = v_invite.id;

  -- 8. Touch organization and team for realtime pulse
  update public.organizations
  set updated_at = now()
  where id = v_invite.organization_id;

  if v_invite.team_id is not null then
    update public.teams
    set updated_at = now()
    where id = v_invite.team_id;
  end if;

  return json_build_object(
    'success', true,
    'email', v_invite.email,
    'user_id', v_user_id,
    'organization_id', v_invite.organization_id,
    'organization_name', coalesce(v_org_name, 'your organization'),
    'role', v_invite.role
  );
end;
$$;

-- Grant execution to anon and authenticated
revoke all on function public.provision_and_accept_invitation(text, text, text) from public;
grant execute on function public.provision_and_accept_invitation(text, text, text) to anon, authenticated;
