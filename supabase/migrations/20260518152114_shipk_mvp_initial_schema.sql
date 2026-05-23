create extension if not exists "pgcrypto";

create schema if not exists private;
revoke all on schema private from public;

create type public.profile_role as enum ('customer', 'admin');
create type public.product_status as enum ('draft', 'active', 'archived');
create type public.content_block_type as enum ('image', 'text', 'image_text');
create type public.order_status as enum (
  'pending_payment',
  'paid',
  'preparing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded'
);
create type public.commission_status as enum (
  'pending',
  'approved',
  'paid',
  'cancelled'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  phone text,
  role public.profile_role not null default 'customer',
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id),
  brand_name text not null,
  name text not null,
  slug text not null unique,
  short_description text not null,
  description text not null,
  hero_image_path text,
  status public.product_status not null default 'draft',
  badges text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_options (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  sku text not null unique,
  price_cents integer not null check (price_cents >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  created_at timestamptz not null default now()
);

create table public.product_content_blocks (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  type public.content_block_type not null,
  sort_order integer not null default 0,
  title text,
  eyebrow text,
  body text,
  image_path text,
  image_alt text,
  image_position text check (image_position in ('left', 'right')),
  created_at timestamptz not null default now()
);

create table public.affiliates (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  code text not null unique check (code ~ '^[a-z0-9_-]{3,64}$'),
  display_name text not null,
  status text not null default 'active' check (status in ('active', 'paused', 'blocked')),
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  order_number text not null unique,
  status public.order_status not null default 'pending_payment',
  currency text not null default 'USD' check (currency = 'USD'),
  subtotal_cents integer not null check (subtotal_cents >= 0),
  shipping_cents integer not null check (shipping_cents >= 0),
  tax_cents integer not null default 0 check (tax_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  referral_code text references public.affiliates(code),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id),
  product_option_id uuid references public.product_options(id),
  product_name text not null,
  option_name text not null,
  sku text not null,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity integer not null check (quantity > 0),
  line_total_cents integer not null check (line_total_cents >= 0)
);

create table public.shipping_addresses (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  address1 text not null,
  address2 text,
  city text not null,
  state text not null,
  postal_code text not null,
  country text not null default 'US' check (country = 'US'),
  memo text,
  created_at timestamptz not null default now()
);

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  carrier text,
  tracking_number text,
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null default 'paypal' check (provider = 'paypal'),
  provider_order_id text not null,
  provider_capture_id text,
  status text not null,
  amount_cents integer not null check (amount_cents >= 0),
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.referral_events (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid references public.affiliates(id) on delete set null,
  referral_code text not null,
  anonymous_id text,
  user_id uuid references auth.users(id) on delete set null,
  landing_path text,
  clicked_at timestamptz not null default now(),
  expires_at timestamptz not null,
  order_id uuid references public.orders(id) on delete set null
);

create table public.commissions (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid references public.affiliates(id) on delete set null,
  order_id uuid not null references public.orders(id) on delete cascade,
  base_cents integer not null check (base_cents >= 0),
  rate_bps integer not null default 1000 check (rate_bps >= 0),
  amount_cents integer not null check (amount_cents >= 0),
  status public.commission_status not null default 'pending',
  hold_until timestamptz not null,
  approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.webhook_events (
  id text primary key,
  provider text not null default 'paypal',
  event_type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

create index products_category_id_idx on public.products (category_id);
create index product_options_product_id_idx on public.product_options (product_id);
create unique index product_content_blocks_product_sort_idx on public.product_content_blocks (product_id, sort_order);
create index affiliates_profile_id_idx on public.affiliates (profile_id);
create index orders_user_id_idx on public.orders (user_id);
create index orders_referral_code_idx on public.orders (referral_code);
create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_product_id_idx on public.order_items (product_id);
create index order_items_product_option_id_idx on public.order_items (product_option_id);
create index shipping_addresses_order_id_idx on public.shipping_addresses (order_id);
create index shipments_order_id_idx on public.shipments (order_id);
create index payment_transactions_order_id_idx on public.payment_transactions (order_id);
create index referral_events_affiliate_id_idx on public.referral_events (affiliate_id);
create index referral_events_user_id_idx on public.referral_events (user_id);
create index referral_events_order_id_idx on public.referral_events (order_id);
create index commissions_affiliate_id_idx on public.commissions (affiliate_id);
create index commissions_order_id_idx on public.commissions (order_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

create trigger products_touch_updated_at
before update on public.products
for each row execute function public.touch_updated_at();

create trigger orders_touch_updated_at
before update on public.orders
for each row execute function public.touch_updated_at();

create trigger shipments_touch_updated_at
before update on public.shipments
for each row execute function public.touch_updated_at();

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, new.id::text || '@auth.local'),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    'customer'::public.profile_role
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

revoke all on function private.is_admin() from public;
revoke all on function private.handle_new_user() from public;
grant usage on schema private to authenticated, service_role;
grant execute on function private.is_admin() to authenticated, service_role;

grant usage on schema public to anon, authenticated, service_role;
revoke all privileges on all tables in schema public from anon, authenticated;
revoke all privileges on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from anon, authenticated;

grant select on
  public.categories,
  public.products,
  public.product_options,
  public.product_content_blocks,
  public.affiliates
to anon, authenticated;

grant select, update on public.profiles to authenticated;
grant select on
  public.orders,
  public.order_items,
  public.shipping_addresses,
  public.shipments,
  public.payment_transactions,
  public.referral_events,
  public.commissions,
  public.app_settings,
  public.webhook_events
to authenticated;

grant insert, update, delete on
  public.categories,
  public.products,
  public.product_options,
  public.product_content_blocks,
  public.affiliates,
  public.orders,
  public.order_items,
  public.shipping_addresses,
  public.shipments,
  public.payment_transactions,
  public.referral_events,
  public.commissions,
  public.app_settings,
  public.webhook_events
to authenticated;

grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_options enable row level security;
alter table public.product_content_blocks enable row level security;
alter table public.affiliates enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.shipping_addresses enable row level security;
alter table public.shipments enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.referral_events enable row level security;
alter table public.commissions enable row level security;
alter table public.app_settings enable row level security;
alter table public.webhook_events enable row level security;

create policy "profiles owner select"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id or (select private.is_admin()));

create policy "profiles owner update"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id or (select private.is_admin()))
with check ((select auth.uid()) = id or (select private.is_admin()));

create policy "categories public read"
on public.categories for select
to anon, authenticated
using (true);

create policy "categories admin insert"
on public.categories for insert
to authenticated
with check ((select private.is_admin()));

create policy "categories admin update"
on public.categories for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "categories admin delete"
on public.categories for delete
to authenticated
using ((select private.is_admin()));

create policy "products anon active read"
on public.products for select
to anon
using (status = 'active');

create policy "products authenticated read"
on public.products for select
to authenticated
using (status = 'active' or (select private.is_admin()));

create policy "products admin insert"
on public.products for insert
to authenticated
with check ((select private.is_admin()));

create policy "products admin update"
on public.products for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "products admin delete"
on public.products for delete
to authenticated
using ((select private.is_admin()));

create policy "product options anon active read"
on public.product_options for select
to anon
using (
  exists (
    select 1 from public.products
    where products.id = product_options.product_id
      and products.status = 'active'
  )
);

create policy "product options authenticated read"
on public.product_options for select
to authenticated
using (
  (select private.is_admin())
  or exists (
    select 1 from public.products
    where products.id = product_options.product_id
      and products.status = 'active'
  )
);

create policy "product options admin insert"
on public.product_options for insert
to authenticated
with check ((select private.is_admin()));

create policy "product options admin update"
on public.product_options for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "product options admin delete"
on public.product_options for delete
to authenticated
using ((select private.is_admin()));

create policy "product blocks anon active read"
on public.product_content_blocks for select
to anon
using (
  exists (
    select 1 from public.products
    where products.id = product_content_blocks.product_id
      and products.status = 'active'
  )
);

create policy "product blocks authenticated read"
on public.product_content_blocks for select
to authenticated
using (
  (select private.is_admin())
  or exists (
    select 1 from public.products
    where products.id = product_content_blocks.product_id
      and products.status = 'active'
  )
);

create policy "product blocks admin insert"
on public.product_content_blocks for insert
to authenticated
with check ((select private.is_admin()));

create policy "product blocks admin update"
on public.product_content_blocks for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "product blocks admin delete"
on public.product_content_blocks for delete
to authenticated
using ((select private.is_admin()));

create policy "affiliates anon active read"
on public.affiliates for select
to anon
using (status = 'active');

create policy "affiliates authenticated read"
on public.affiliates for select
to authenticated
using (status = 'active' or (select private.is_admin()));

create policy "affiliates admin insert"
on public.affiliates for insert
to authenticated
with check ((select private.is_admin()));

create policy "affiliates admin update"
on public.affiliates for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "affiliates admin delete"
on public.affiliates for delete
to authenticated
using ((select private.is_admin()));

create policy "orders owner read"
on public.orders for select
to authenticated
using ((select auth.uid()) = user_id or (select private.is_admin()));

create policy "orders admin insert"
on public.orders for insert
to authenticated
with check ((select private.is_admin()));

create policy "orders admin update"
on public.orders for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "orders admin delete"
on public.orders for delete
to authenticated
using ((select private.is_admin()));

create policy "order items owner read"
on public.order_items for select
to authenticated
using (
  exists (
    select 1 from public.orders
    where orders.id = order_items.order_id
      and (orders.user_id = (select auth.uid()) or (select private.is_admin()))
  )
);

create policy "order items admin insert"
on public.order_items for insert
to authenticated
with check ((select private.is_admin()));

create policy "order items admin update"
on public.order_items for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "order items admin delete"
on public.order_items for delete
to authenticated
using ((select private.is_admin()));

create policy "shipping addresses owner read"
on public.shipping_addresses for select
to authenticated
using (
  exists (
    select 1 from public.orders
    where orders.id = shipping_addresses.order_id
      and (orders.user_id = (select auth.uid()) or (select private.is_admin()))
  )
);

create policy "shipping addresses admin insert"
on public.shipping_addresses for insert
to authenticated
with check ((select private.is_admin()));

create policy "shipping addresses admin update"
on public.shipping_addresses for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "shipping addresses admin delete"
on public.shipping_addresses for delete
to authenticated
using ((select private.is_admin()));

create policy "shipments owner read"
on public.shipments for select
to authenticated
using (
  exists (
    select 1 from public.orders
    where orders.id = shipments.order_id
      and (orders.user_id = (select auth.uid()) or (select private.is_admin()))
  )
);

create policy "shipments admin insert"
on public.shipments for insert
to authenticated
with check ((select private.is_admin()));

create policy "shipments admin update"
on public.shipments for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "shipments admin delete"
on public.shipments for delete
to authenticated
using ((select private.is_admin()));

create policy "payment transactions admin read"
on public.payment_transactions for select
to authenticated
using ((select private.is_admin()));

create policy "payment transactions admin insert"
on public.payment_transactions for insert
to authenticated
with check ((select private.is_admin()));

create policy "payment transactions admin update"
on public.payment_transactions for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "payment transactions admin delete"
on public.payment_transactions for delete
to authenticated
using ((select private.is_admin()));

create policy "referral events admin read"
on public.referral_events for select
to authenticated
using ((select private.is_admin()));

create policy "referral events admin insert"
on public.referral_events for insert
to authenticated
with check ((select private.is_admin()));

create policy "referral events admin update"
on public.referral_events for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "referral events admin delete"
on public.referral_events for delete
to authenticated
using ((select private.is_admin()));

create policy "commissions admin read"
on public.commissions for select
to authenticated
using ((select private.is_admin()));

create policy "commissions admin insert"
on public.commissions for insert
to authenticated
with check ((select private.is_admin()));

create policy "commissions admin update"
on public.commissions for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "commissions admin delete"
on public.commissions for delete
to authenticated
using ((select private.is_admin()));

create policy "app settings admin manage"
on public.app_settings for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "webhook events admin read"
on public.webhook_events for select
to authenticated
using ((select private.is_admin()));

create policy "webhook events admin insert"
on public.webhook_events for insert
to authenticated
with check ((select private.is_admin()));

create policy "webhook events admin update"
on public.webhook_events for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "webhook events admin delete"
on public.webhook_events for delete
to authenticated
using ((select private.is_admin()));

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "product images admin read"
on storage.objects for select
to authenticated
using (bucket_id = 'product-images' and (select private.is_admin()));

create policy "product images admin insert"
on storage.objects for insert
to authenticated
with check (bucket_id = 'product-images' and (select private.is_admin()));

create policy "product images admin update"
on storage.objects for update
to authenticated
using (bucket_id = 'product-images' and (select private.is_admin()))
with check (bucket_id = 'product-images' and (select private.is_admin()));

create policy "product images admin delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'product-images' and (select private.is_admin()));
