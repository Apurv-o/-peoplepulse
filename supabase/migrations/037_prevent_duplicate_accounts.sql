-- PeoplePulse — Database Schema Migration 037
-- Prevent Duplicate Accounts: Case-Insensitive Unique Index & Account Existence Check RPC

-- 1. Ensure clean, case-insensitive uniqueness on profiles email
create unique index if not exists idx_profiles_lower_email on public.profiles (lower(trim(email)));

-- 2. Ensure case-insensitive indexing on pending invitations
create index if not exists idx_invitations_lower_email on public.invitations (organization_id, lower(trim(email)));

-- 3. Function to safely check if an account exists (for rate-limit friendly duplicate prevention)
create or replace function public.check_account_exists(p_email text)
returns json
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $$
declare
  v_normalized_email text;
  v_exists boolean := false;
begin
  v_normalized_email := lower(trim(p_email));
  if v_normalized_email is null or v_normalized_email = '' then
    return json_build_object('exists', false);
  end if;

  select exists (
    select 1 from auth.users where lower(email) = v_normalized_email
  ) or exists (
    select 1 from public.profiles where lower(trim(email)) = v_normalized_email
  ) into v_exists;

  return json_build_object('exists', v_exists);
end;
$$;

revoke all on function public.check_account_exists(text) from public;
grant execute on function public.check_account_exists(text) to anon, authenticated;

