create table if not exists public.checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  product_slug text not null,
  quantity integer not null check (quantity > 0 and quantity <= 9),
  total_cents integer not null check (total_cents > 0),
  currency text not null default 'USD' check (currency = 'USD'),
  nonce text not null,
  provider text,
  provider_order_id text,
  status text not null default 'created' check (
    status in ('created', 'paypal_order_created', 'captured', 'expired')
  ),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_order_id),
  unique (id, nonce)
);

alter table public.checkout_sessions enable row level security;

revoke all on public.checkout_sessions from public, anon, authenticated;
grant all on public.checkout_sessions to service_role;

create index if not exists checkout_sessions_user_provider_order_idx
  on public.checkout_sessions (user_id, provider, provider_order_id);

create index if not exists checkout_sessions_expires_at_idx
  on public.checkout_sessions (expires_at);

drop trigger if exists checkout_sessions_touch_updated_at on public.checkout_sessions;
create trigger checkout_sessions_touch_updated_at
before update on public.checkout_sessions
for each row execute function public.touch_updated_at();
