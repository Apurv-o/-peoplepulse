-- =============================================================================
-- PeoplePulse — Database Schema Migration 025
-- Secure RPC to Remove Organization Member
-- =============================================================================

create or replace function public.remove_org_member(
  p_org_id uuid,
  p_user_id uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_is_admin boolean;
  v_target_role text;
begin
  -- 1. Ensure caller is authenticated
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED: User is not logged in.';
  end if;

  -- 2. Verify caller has admin/owner authority for this organization
  select exists (
    select 1
    from public.organization_members
    where organization_id = p_org_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
      and is_active = true
  ) into v_caller_is_admin;

  if not v_caller_is_admin then
    raise exception 'UNAUTHORIZED: Only organization owners and admins can remove members.';
  end if;

  -- 3. Check target member exists and is not the owner
  select role
  into v_target_role
  from public.organization_members
  where organization_id = p_org_id
    and user_id = p_user_id;

  if v_target_role is null then
    raise exception 'NOT_FOUND: Member does not belong to this organization.';
  end if;

  if v_target_role = 'owner' then
    raise exception 'CANNOT_REMOVE_OWNER: The organization owner cannot be removed.';
  end if;

  -- 4. Clean up team memberships for teams in this organization
  delete from public.team_members
  where user_id = p_user_id
    and team_id in (
      select id from public.teams where organization_id = p_org_id
    );

  -- 5. Delete from organization_members
  delete from public.organization_members
  where organization_id = p_org_id
    and user_id = p_user_id;

  -- 6. Touch organization updated_at for instant realtime pulse
  update public.organizations
  set updated_at = now()
  where id = p_org_id;

  return json_build_object(
    'success', true,
    'removed_user_id', p_user_id,
    'organization_id', p_org_id
  );
end;
$$;

revoke all on function public.remove_org_member(uuid, uuid) from public, anon;
grant execute on function public.remove_org_member(uuid, uuid) to authenticated;

-- Record migration in schema_migrations
insert into supabase_migrations.schema_migrations (version, name)
values ('025', 'remove_organization_member')
on conflict (version) do nothing;
