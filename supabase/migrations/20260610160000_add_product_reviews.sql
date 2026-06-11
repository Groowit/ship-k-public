-- Product reviews and ratings:
-- - verified-purchase eligibility is enforced by trusted server routes
-- - public trust signals include only visible, non-deleted reviews
-- - one review identity is allowed per purchased order item, even after soft delete

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  profile_id uuid not null references public.profiles(id),
  rating integer not null check (rating between 1 and 5),
  body text check (body is null or char_length(body) <= 5000),
  status text not null default 'visible' check (status in ('visible', 'hidden')),
  hidden_at timestamptz,
  hidden_by uuid references public.profiles(id) on delete set null,
  hidden_reason text check (hidden_reason is null or char_length(hidden_reason) <= 500),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_item_id)
);

create table if not exists public.product_review_images (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.product_reviews(id) on delete cascade,
  image_path text not null check (length(trim(image_path)) > 0),
  public_url text not null check (length(trim(public_url)) > 0),
  sort_order integer not null check (sort_order between 1 and 5),
  created_at timestamptz not null default now(),
  unique (review_id, sort_order)
);

create table if not exists public.product_review_helpful_votes (
  review_id uuid not null references public.product_reviews(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (review_id, profile_id)
);

create index if not exists product_reviews_product_visible_idx
on public.product_reviews (product_id, status, deleted_at, created_at desc, id desc);

create index if not exists product_reviews_profile_id_idx
on public.product_reviews (profile_id);

create index if not exists product_reviews_order_id_idx
on public.product_reviews (order_id);

create index if not exists product_review_images_review_sort_idx
on public.product_review_images (review_id, sort_order);

create index if not exists product_review_helpful_votes_review_idx
on public.product_review_helpful_votes (review_id);

drop trigger if exists product_reviews_touch_updated_at on public.product_reviews;
create trigger product_reviews_touch_updated_at
before update on public.product_reviews
for each row execute function public.touch_updated_at();

alter table public.product_reviews enable row level security;
alter table public.product_review_images enable row level security;
alter table public.product_review_helpful_votes enable row level security;

revoke all privileges on
  public.product_reviews,
  public.product_review_images,
  public.product_review_helpful_votes
from anon, authenticated;

grant select on
  public.product_reviews,
  public.product_review_images
to anon, authenticated;

grant select on public.product_review_helpful_votes to authenticated;

grant all privileges on
  public.product_reviews,
  public.product_review_images,
  public.product_review_helpful_votes
to service_role;

drop policy if exists "product reviews anon public read" on public.product_reviews;
drop policy if exists "product reviews authenticated scoped read" on public.product_reviews;
drop policy if exists "product review images anon public read" on public.product_review_images;
drop policy if exists "product review images authenticated scoped read" on public.product_review_images;
drop policy if exists "product review helpful votes owner or admin read" on public.product_review_helpful_votes;

create policy "product reviews anon public read"
on public.product_reviews for select
to anon
using (
  status = 'visible'
  and deleted_at is null
  and exists (
    select 1
    from public.products
    where products.id = product_reviews.product_id
      and products.status = 'active'
  )
);

create policy "product reviews authenticated scoped read"
on public.product_reviews for select
to authenticated
using (
  (status = 'visible' and deleted_at is null and exists (
    select 1
    from public.products
    where products.id = product_reviews.product_id
      and products.status = 'active'
  ))
  or profile_id = (select auth.uid())
  or (select private.is_admin())
  or (
    status = 'visible'
    and deleted_at is null
    and exists (
      select 1
      from public.product_brand_assignments
      join public.brand_memberships
        on brand_memberships.brand_partner_id = product_brand_assignments.brand_partner_id
      where product_brand_assignments.product_id = product_reviews.product_id
        and product_brand_assignments.status = 'active'
        and brand_memberships.profile_id = (select auth.uid())
        and brand_memberships.status = 'active'
    )
  )
);

create policy "product review images anon public read"
on public.product_review_images for select
to anon
using (
  exists (
    select 1
    from public.product_reviews
    join public.products
      on products.id = product_reviews.product_id
    where product_reviews.id = product_review_images.review_id
      and product_reviews.status = 'visible'
      and product_reviews.deleted_at is null
      and products.status = 'active'
  )
);

create policy "product review images authenticated scoped read"
on public.product_review_images for select
to authenticated
using (
  exists (
    select 1
    from public.product_reviews
    join public.products
      on products.id = product_reviews.product_id
    where product_reviews.id = product_review_images.review_id
      and product_reviews.status = 'visible'
      and product_reviews.deleted_at is null
      and products.status = 'active'
  )
  or exists (
    select 1
    from public.product_reviews
    where product_reviews.id = product_review_images.review_id
      and product_reviews.profile_id = (select auth.uid())
  )
  or (select private.is_admin())
  or exists (
    select 1
    from public.product_reviews
    join public.product_brand_assignments
      on product_brand_assignments.product_id = product_reviews.product_id
    join public.brand_memberships
      on brand_memberships.brand_partner_id = product_brand_assignments.brand_partner_id
    where product_reviews.id = product_review_images.review_id
      and product_reviews.status = 'visible'
      and product_reviews.deleted_at is null
      and product_brand_assignments.status = 'active'
      and brand_memberships.profile_id = (select auth.uid())
      and brand_memberships.status = 'active'
  )
);

create policy "product review helpful votes owner or admin read"
on public.product_review_helpful_votes for select
to authenticated
using (
  profile_id = (select auth.uid())
  or (select private.is_admin())
);
