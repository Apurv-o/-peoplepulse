-- =============================================================================
-- PeoplePulse — Database Schema Migration 022
-- Real-time Password Reset RPCs and Verification Code System
-- =============================================================================

create table if not exists public.password_reset_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code text not null,
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- Index for fast code lookup
create index if not exists idx_password_reset_lookup on public.password_reset_codes(email, code, used_at, expires_at);

-- Enable RLS
alter table public.password_reset_codes enable row level security;

-- No direct client select/insert/update/delete — access only through security definer RPCs
drop policy if exists "password_reset_no_direct_access" on public.password_reset_codes;

-- 1. Request Password Reset Code RPC
create or replace function public.request_password_reset(p_email text)
returns json
language plpgsql
security definer
set search_path = public, auth, extensions, pg_catalog
as $$
declare
  v_user_id uuid;
  v_code text;
  v_clean_email text;
begin
  v_clean_email := lower(trim(p_email));
  if v_clean_email is null or length(v_clean_email) = 0 then
    raise exception 'EMAIL_REQUIRED: Please provide an email address.';
  end if;

  -- Verify user exists in auth.users
  select id into v_user_id
  from auth.users
  where lower(email) = v_clean_email;

  if v_user_id is null then
    raise exception 'USER_NOT_FOUND: No account registered with this email address.';
  end if;

  -- Invalidate any existing unused codes for this email
  update public.password_reset_codes
  set used_at = now()
  where lower(email) = v_clean_email
    and used_at is null;

  -- Generate 6-digit numeric verification code
  v_code := lpad(floor(random() * 900000 + 100000)::text, 6, '0');

  insert into public.password_reset_codes (email, code, expires_at)
  values (v_clean_email, v_code, now() + interval '15 minutes');

  return json_build_object(
    'success', true,
    'email', v_clean_email,
    'code', v_code,
    'expires_in_minutes', 15,
    'message', 'Password reset code generated.'
  );
end;
$$;

-- 2. Verify Code and Update Password RPC
create or replace function public.verify_and_update_password(
  p_email text,
  p_code text,
  p_new_password text
)
returns json
language plpgsql
security definer
set search_path = public, auth, extensions, pg_catalog
as $$
declare
  v_clean_email text;
  v_clean_code text;
  v_code_record record;
  v_hashed_pw text;
begin
  v_clean_email := lower(trim(p_email));
  v_clean_code := trim(p_code);

  if length(p_new_password) < 6 then
    raise exception 'WEAK_PASSWORD: Password must be at least 6 characters long.';
  end if;

  -- Look up valid unused code
  select * into v_code_record
  from public.password_reset_codes
  where lower(email) = v_clean_email
    and code = v_clean_code
    and used_at is null
    and expires_at > now()
  order by created_at desc
  limit 1;

  if v_code_record.id is null then
    raise exception 'INVALID_OR_EXPIRED_CODE: The reset code is invalid or has expired. Please request a new one.';
  end if;

  -- Mark code as used
  update public.password_reset_codes
  set used_at = now()
  where id = v_code_record.id;

  -- Hash new password using bcrypt ($2a$10$)
  v_hashed_pw := extensions.crypt(p_new_password, extensions.gen_salt('bf', 10));

  -- Update auth.users encrypted_password directly
  update auth.users
  set encrypted_password = v_hashed_pw,
      updated_at = now()
  where lower(email) = v_clean_email;

  return json_build_object(
    'success', true,
    'email', v_clean_email,
    'message', 'Password has been updated successfully.'
  );
end;
$$;

-- Grant execution to public and anon so unauthenticated users on login screen can reset
grant execute on function public.request_password_reset(text) to anon, authenticated;
grant execute on function public.verify_and_update_password(text, text, text) to anon, authenticated;
