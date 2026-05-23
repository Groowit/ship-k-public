-- Promoter portal support:
-- - self-service affiliate profile linked to a customer profile
-- - one canonical product referral link per promoter/product
-- - 48-hour click attribution with owner-scoped dashboard reads

alter table public.affiliates
add column if not exists terms_accepted_at timestamptz,
add column if not exists updated_at timestamptz not null default now();

create unique index if not exists affiliates_profile_id_unique
on public.affiliates (profile_id)
where profile_id is not null;

drop trigger if exists affiliates_touch_updated_at on public.affiliates;
create trigger affiliates_touch_updated_at
before update on public.affiliates
for each row execute function public.touch_updated_at();

create table if not exists public.affiliate_links (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  link_token text not null unique check (link_token ~ '^[a-z0-9_-]{8,96}$'),
  destination_path text not null check (destination_path ~ '^/products/[a-z0-9-]+$'),
  status text not null default 'active' check (status in ('active', 'paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (affiliate_id, product_id)
);

drop trigger if exists affiliate_links_touch_updated_at on public.affiliate_links;
create trigger affiliate_links_touch_updated_at
before update on public.affiliate_links
for each row execute function public.touch_updated_at();

alter table public.referral_events
add column if not exists affiliate_link_id uuid references public.affiliate_links(id) on delete set null,
add column if not exists link_token text,
add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.commissions
add column if not exists affiliate_link_id uuid references public.affiliate_links(id) on delete set null;

create index if not exists affiliate_links_affiliate_id_idx
on public.affiliate_links (affiliate_id);

create index if not exists affiliate_links_product_id_idx
on public.affiliate_links (product_id);

create index if not exists referral_events_affiliate_link_id_idx
on public.referral_events (affiliate_link_id);

create index if not exists referral_events_link_token_idx
on public.referral_events (link_token);

create index if not exists referral_events_anonymous_link_idx
on public.referral_events (affiliate_link_id, anonymous_id);

create index if not exists commissions_affiliate_link_id_idx
on public.commissions (affiliate_link_id);

alter table public.affiliate_links enable row level security;

drop policy if exists "affiliates anon active read" on public.affiliates;
drop policy if exists "affiliates authenticated read" on public.affiliates;
drop policy if exists "affiliates owner or admin read" on public.affiliates;

create policy "affiliates owner or admin read"
on public.affiliates for select
to authenticated
using (
  profile_id = (select auth.uid())
  or (select private.is_admin())
);

drop policy if exists "affiliate links owner or admin read" on public.affiliate_links;

create policy "affiliate links owner or admin read"
on public.affiliate_links for select
to authenticated
using (
  exists (
    select 1
    from public.affiliates
    where affiliates.id = affiliate_links.affiliate_id
      and (
        affiliates.profile_id = (select auth.uid())
        or (select private.is_admin())
      )
  )
);

drop policy if exists "referral events promoter owner read" on public.referral_events;
create policy "referral events promoter owner read"
on public.referral_events for select
to authenticated
using (
  exists (
    select 1
    from public.affiliates
    where affiliates.id = referral_events.affiliate_id
      and affiliates.profile_id = (select auth.uid())
  )
);

drop policy if exists "commissions promoter owner read" on public.commissions;
create policy "commissions promoter owner read"
on public.commissions for select
to authenticated
using (
  exists (
    select 1
    from public.affiliates
    where affiliates.id = commissions.affiliate_id
      and affiliates.profile_id = (select auth.uid())
  )
);

revoke select on public.affiliates from anon;
revoke all privileges on public.affiliate_links from anon, authenticated;
grant select on public.affiliates to authenticated;
grant select on public.affiliate_links to authenticated;
grant all privileges on public.affiliate_links to service_role;
