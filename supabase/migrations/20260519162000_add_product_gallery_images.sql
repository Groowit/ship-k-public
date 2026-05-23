create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_path text not null,
  alt_text text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (product_id, sort_order)
);

create index if not exists product_images_product_id_idx
on public.product_images(product_id);

grant select on public.product_images to anon, authenticated;

revoke insert, update, delete, truncate, references, trigger
on public.product_images
from anon, authenticated;

alter table public.product_images enable row level security;

drop policy if exists "product images anon active read" on public.product_images;
drop policy if exists "product images authenticated active read" on public.product_images;

create policy "product images anon active read"
on public.product_images for select
to anon
using (
  exists (
    select 1
    from public.products
    where products.id = product_images.product_id
      and products.status = 'active'
  )
);

create policy "product images authenticated active read"
on public.product_images for select
to authenticated
using (
  exists (
    select 1
    from public.products
    where products.id = product_images.product_id
      and products.status = 'active'
  )
  or (select private.is_admin())
);
