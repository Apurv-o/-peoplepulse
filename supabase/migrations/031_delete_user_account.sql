-- =============================================================================
-- PeoplePulse — Database Schema Migration 031
-- Delete User Account: Permanent account deletion with safe ownership transfer
-- =============================================================================

create or replace function public.delete_user_account()
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_org_id uuid;
  v_other_members int;
  v_next_owner uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- 1. Handle organizations where this user is an 'owner'
  for v_org_id in
    select organization_id from public.organization_members
    where user_id = v_user_id and role = 'owner'
  loop
    -- Check how many other active members exist
    select count(*) into v_other_members
    from public.organization_members
    where organization_id = v_org_id and user_id != v_user_id and is_active = true;

    if v_other_members = 0 then
      -- User was sole member: delete the organization and all its data
      delete from public.organizations where id = v_org_id;
    else
      -- Check if another owner exists
      if not exists (
        select 1 from public.organization_members
        where organization_id = v_org_id and user_id != v_user_id and role = 'owner' and is_active = true
      ) then
        -- Find next owner (prefer admin, otherwise oldest active member)
        select user_id into v_next_owner
        from public.organization_members
        where organization_id = v_org_id and user_id != v_user_id and is_active = true
        order by (case when role = 'admin' then 0 else 1 end), joined_at asc
        limit 1;

        if v_next_owner is not null then
          update public.organization_members
          set role = 'owner'
          where organization_id = v_org_id and user_id = v_next_owner;
        end if;
      end if;
    end if;
  end loop;

  -- 2. Delete team memberships & organization memberships
  delete from public.team_members where user_id = v_user_id;
  delete from public.organization_members where user_id = v_user_id;

  -- 3. Delete profile
  delete from public.profiles where id = v_user_id;

  -- 4. Delete auth user (permanently purges login credentials)
  delete from auth.users where id = v_user_id;

  return true;
end;
$$;

grant execute on function public.delete_user_account() to authenticated;
