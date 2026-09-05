create or replace function public.inspect_user(p_email text)
returns json
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user json;
  v_identity json;
begin
  select row_to_json(u) into v_user
  from auth.users u
  where lower(email) = lower(p_email);

  select row_to_json(i) into v_identity
  from auth.identities i
  where lower(identity_data->>'email') = lower(p_email) or user_id = (v_user->>'id')::uuid;

  return json_build_object('user', v_user, 'identity', v_identity);
end;
$$;

grant execute on function public.inspect_user(text) to anon, authenticated;
