alter table public.profiles
  add column if not exists default_shipping_name text,
  add column if not exists default_shipping_phone text,
  add column if not exists default_shipping_address1 text,
  add column if not exists default_shipping_address2 text,
  add column if not exists default_shipping_city text,
  add column if not exists default_shipping_state text,
  add column if not exists default_shipping_postal_code text,
  add column if not exists default_shipping_country text not null default 'US' check (default_shipping_country = 'US'),
  add column if not exists default_shipping_memo text;

grant update (
  full_name,
  phone,
  marketing_opt_in,
  marketing_opt_in_at,
  default_shipping_name,
  default_shipping_phone,
  default_shipping_address1,
  default_shipping_address2,
  default_shipping_city,
  default_shipping_state,
  default_shipping_postal_code,
  default_shipping_country,
  default_shipping_memo,
  updated_at
) on public.profiles to authenticated;
