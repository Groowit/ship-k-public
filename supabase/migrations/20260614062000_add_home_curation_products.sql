create table if not exists public.home_curation_products (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sort_order integer not null check (sort_order <> 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id),
  unique (sort_order)
);

create index if not exists home_curation_products_product_id_idx
on public.home_curation_products(product_id);

create index if not exists home_curation_products_sort_order_idx
on public.home_curation_products(sort_order);

drop trigger if exists home_curation_products_touch_updated_at on public.home_curation_products;
create trigger home_curation_products_touch_updated_at
before update on public.home_curation_products
for each row execute function public.touch_updated_at();

alter table public.home_curation_products enable row level security;

drop policy if exists "home curation public read" on public.home_curation_products;
drop policy if exists "home curation admin insert" on public.home_curation_products;
drop policy if exists "home curation admin update" on public.home_curation_products;
drop policy if exists "home curation admin delete" on public.home_curation_products;

create policy "home curation public read"
on public.home_curation_products for select
to anon, authenticated
using (
  exists (
    select 1
    from public.products
    where products.id = home_curation_products.product_id
      and products.status = 'active'
      and exists (
        select 1
        from public.product_options
        where product_options.product_id = products.id
          and product_options.stock_quantity > 0
      )
  )
  or (select private.is_admin())
);

create policy "home curation admin insert"
on public.home_curation_products for insert
to authenticated
with check ((select private.is_admin()));

create policy "home curation admin update"
on public.home_curation_products for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "home curation admin delete"
on public.home_curation_products for delete
to authenticated
using ((select private.is_admin()));

revoke all privileges on public.home_curation_products from anon, authenticated;
grant select on public.home_curation_products to anon, authenticated;
grant insert, update, delete on public.home_curation_products to authenticated;
grant all privileges on public.home_curation_products to service_role;

create or replace function public.normalize_home_curation_order()
returns setof public.home_curation_products
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_row record;
begin
  for v_row in
    select id, row_number() over (order by sort_order asc, created_at asc, id asc)::integer as next_sort_order
    from public.home_curation_products
  loop
    update public.home_curation_products
    set sort_order = -v_row.next_sort_order
    where id = v_row.id;
  end loop;

  for v_row in
    select id, abs(sort_order)::integer as next_sort_order
    from public.home_curation_products
    order by abs(sort_order) asc, created_at asc, id asc
  loop
    update public.home_curation_products
    set sort_order = v_row.next_sort_order
    where id = v_row.id;
  end loop;

  return query
  select *
  from public.home_curation_products
  order by sort_order asc, created_at asc, id asc;
end;
$$;

create or replace function public.reorder_home_curation_products(p_entry_ids uuid[])
returns setof public.home_curation_products
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_existing_count integer;
  v_distinct_count integer;
  v_id uuid;
  v_index integer := 1;
begin
  select count(*) into v_existing_count from public.home_curation_products;
  select count(distinct entry_id) into v_distinct_count from unnest(coalesce(p_entry_ids, array[]::uuid[])) as entry_id;

  if coalesce(array_length(p_entry_ids, 1), 0) <> v_existing_count then
    raise exception 'Curation reorder payload must include every entry exactly once' using errcode = '22023';
  end if;

  if v_distinct_count <> v_existing_count then
    raise exception 'Curation reorder payload contains duplicates' using errcode = '22023';
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_entry_ids, array[]::uuid[])) as requested_id
    where not exists (
      select 1
      from public.home_curation_products
      where home_curation_products.id = requested_id
    )
  ) then
    raise exception 'Curation reorder payload contains unknown ids' using errcode = '22023';
  end if;

  foreach v_id in array coalesce(p_entry_ids, array[]::uuid[])
  loop
    update public.home_curation_products
    set sort_order = -v_index
    where id = v_id;
    v_index := v_index + 1;
  end loop;

  v_index := 1;
  foreach v_id in array coalesce(p_entry_ids, array[]::uuid[])
  loop
    update public.home_curation_products
    set sort_order = v_index
    where id = v_id;
    v_index := v_index + 1;
  end loop;

  return query
  select *
  from public.home_curation_products
  order by sort_order asc, created_at asc, id asc;
end;
$$;

revoke all on function public.normalize_home_curation_order() from public;
revoke all on function public.normalize_home_curation_order() from anon;
revoke all on function public.normalize_home_curation_order() from authenticated;
grant execute on function public.normalize_home_curation_order() to service_role;

revoke all on function public.reorder_home_curation_products(uuid[]) from public;
revoke all on function public.reorder_home_curation_products(uuid[]) from anon;
revoke all on function public.reorder_home_curation_products(uuid[]) from authenticated;
grant execute on function public.reorder_home_curation_products(uuid[]) to service_role;
