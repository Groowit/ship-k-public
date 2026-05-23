alter table public.profiles
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists privacy_accepted_at timestamptz,
  add column if not exists marketing_opt_in_at timestamptz;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  marketing_opt_in_value boolean := coalesce(
    (new.raw_user_meta_data ->> 'marketing_opt_in')::boolean,
    false
  );
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    role,
    marketing_opt_in,
    terms_accepted_at,
    privacy_accepted_at,
    marketing_opt_in_at
  )
  values (
    new.id,
    coalesce(new.email, new.id::text || '@auth.local'),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    'customer'::public.profile_role,
    marketing_opt_in_value,
    nullif(new.raw_user_meta_data ->> 'terms_accepted_at', '')::timestamptz,
    nullif(new.raw_user_meta_data ->> 'privacy_accepted_at', '')::timestamptz,
    case
      when marketing_opt_in_value then
        nullif(new.raw_user_meta_data ->> 'marketing_opt_in_at', '')::timestamptz
      else null
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke update on public.profiles from authenticated;
grant update (
  full_name,
  phone,
  marketing_opt_in,
  terms_accepted_at,
  privacy_accepted_at,
  marketing_opt_in_at,
  updated_at
) on public.profiles to authenticated;
