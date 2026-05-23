do $$
begin
  create type public.product_type as enum ('single', 'curated_set');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.product_difficulty as enum ('Beginner', 'Intermediate');
exception
  when duplicate_object then null;
end $$;

alter table public.products
  add column if not exists product_type public.product_type not null default 'single',
  add column if not exists collection_slug text,
  add column if not exists collection_name text,
  add column if not exists difficulty public.product_difficulty,
  add column if not exists item_count integer check (item_count is null or item_count > 0),
  add column if not exists theme_label text,
  add column if not exists intro_video_url text,
  add column if not exists best_for text,
  add column if not exists result text;

create table if not exists public.product_included_items (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sort_order integer not null default 0,
  name text not null,
  category text not null,
  description text not null,
  created_at timestamptz not null default now(),
  unique (product_id, sort_order)
);

create table if not exists public.product_routine_steps (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sort_order integer not null default 0,
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  unique (product_id, sort_order)
);

create index if not exists products_collection_slug_idx on public.products(collection_slug);
create index if not exists product_included_items_product_id_idx on public.product_included_items(product_id);
create index if not exists product_routine_steps_product_id_idx on public.product_routine_steps(product_id);

grant select on public.product_included_items to anon, authenticated;
grant select on public.product_routine_steps to anon, authenticated;

revoke insert, update, delete, truncate, references, trigger on
  public.product_included_items,
  public.product_routine_steps
from anon, authenticated;

alter table public.product_included_items enable row level security;
alter table public.product_routine_steps enable row level security;

drop policy if exists "product included items anon active read" on public.product_included_items;
drop policy if exists "product included items authenticated active read" on public.product_included_items;
drop policy if exists "product included items admin insert" on public.product_included_items;
drop policy if exists "product included items admin update" on public.product_included_items;
drop policy if exists "product included items admin delete" on public.product_included_items;
drop policy if exists "product routine steps anon active read" on public.product_routine_steps;
drop policy if exists "product routine steps authenticated active read" on public.product_routine_steps;
drop policy if exists "product routine steps admin insert" on public.product_routine_steps;
drop policy if exists "product routine steps admin update" on public.product_routine_steps;
drop policy if exists "product routine steps admin delete" on public.product_routine_steps;

create policy "product included items anon active read"
on public.product_included_items for select
to anon
using (
  exists (
    select 1
    from public.products
    where products.id = product_included_items.product_id
      and products.status = 'active'
  )
);

create policy "product included items authenticated active read"
on public.product_included_items for select
to authenticated
using (
  exists (
    select 1
    from public.products
    where products.id = product_included_items.product_id
      and products.status = 'active'
  )
  or (select private.is_admin())
);

create policy "product routine steps anon active read"
on public.product_routine_steps for select
to anon
using (
  exists (
    select 1
    from public.products
    where products.id = product_routine_steps.product_id
      and products.status = 'active'
  )
);

create policy "product routine steps authenticated active read"
on public.product_routine_steps for select
to authenticated
using (
  exists (
    select 1
    from public.products
    where products.id = product_routine_steps.product_id
      and products.status = 'active'
  )
  or (select private.is_admin())
);
