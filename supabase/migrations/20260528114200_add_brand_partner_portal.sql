-- Brand Partner portal support:
-- - ordinary customer profiles become brand members through scoped membership rows
-- - admins assign existing products to brands
-- - brand members edit only assigned product detail content through trusted server routes
-- - brand reports are read-only aggregates, with no payout or settlement mutation surface

create table if not exists public.brand_partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (length(slug) between 2 and 96),
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  contact_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.brand_memberships (
  id uuid primary key default gen_random_uuid(),
  brand_partner_id uuid not null references public.brand_partners(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null default 'editor' check (member_role in ('owner', 'editor', 'viewer')),
  status text not null default 'active' check (status in ('active', 'paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_partner_id, profile_id)
);

create table if not exists public.product_brand_assignments (
  id uuid primary key default gen_random_uuid(),
  brand_partner_id uuid not null references public.brand_partners(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  can_edit_details boolean not null default true,
  assigned_by uuid references public.profiles(id) on delete set null,
  last_content_updated_by uuid references public.profiles(id) on delete set null,
  last_content_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_partner_id, product_id)
);

create index if not exists brand_partners_status_idx
on public.brand_partners (status);

create index if not exists brand_memberships_profile_id_idx
on public.brand_memberships (profile_id);

create index if not exists brand_memberships_brand_partner_id_idx
on public.brand_memberships (brand_partner_id);

create index if not exists product_brand_assignments_brand_partner_id_idx
on public.product_brand_assignments (brand_partner_id);

create index if not exists product_brand_assignments_product_id_idx
on public.product_brand_assignments (product_id);

create unique index if not exists product_brand_assignments_one_active_product_idx
on public.product_brand_assignments (product_id)
where status = 'active';

drop trigger if exists brand_partners_touch_updated_at on public.brand_partners;
create trigger brand_partners_touch_updated_at
before update on public.brand_partners
for each row execute function public.touch_updated_at();

drop trigger if exists brand_memberships_touch_updated_at on public.brand_memberships;
create trigger brand_memberships_touch_updated_at
before update on public.brand_memberships
for each row execute function public.touch_updated_at();

drop trigger if exists product_brand_assignments_touch_updated_at on public.product_brand_assignments;
create trigger product_brand_assignments_touch_updated_at
before update on public.product_brand_assignments
for each row execute function public.touch_updated_at();

alter table public.brand_partners enable row level security;
alter table public.brand_memberships enable row level security;
alter table public.product_brand_assignments enable row level security;

drop policy if exists "brand partners member or admin read" on public.brand_partners;
drop policy if exists "brand memberships self or admin read" on public.brand_memberships;
drop policy if exists "product brand assignments member or admin read" on public.product_brand_assignments;

create policy "brand partners member or admin read"
on public.brand_partners for select
to authenticated
using (
  (select private.is_admin())
  or exists (
    select 1
    from public.brand_memberships
    where brand_memberships.brand_partner_id = brand_partners.id
      and brand_memberships.profile_id = (select auth.uid())
      and brand_memberships.status = 'active'
  )
);

create policy "brand memberships self or admin read"
on public.brand_memberships for select
to authenticated
using (
  profile_id = (select auth.uid())
  or (select private.is_admin())
);

create policy "product brand assignments member or admin read"
on public.product_brand_assignments for select
to authenticated
using (
  (select private.is_admin())
  or exists (
    select 1
    from public.brand_memberships
    where brand_memberships.brand_partner_id = product_brand_assignments.brand_partner_id
      and brand_memberships.profile_id = (select auth.uid())
      and brand_memberships.status = 'active'
  )
);

revoke all privileges on
  public.brand_partners,
  public.brand_memberships,
  public.product_brand_assignments
from anon, authenticated;

grant select on
  public.brand_partners,
  public.brand_memberships,
  public.product_brand_assignments
to authenticated;

grant all privileges on
  public.brand_partners,
  public.brand_memberships,
  public.product_brand_assignments
to service_role;
