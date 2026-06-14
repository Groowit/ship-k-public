drop policy if exists "home curation public read" on public.home_curation_products;
drop policy if exists "home curation admin read" on public.home_curation_products;

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
);

create policy "home curation admin read"
on public.home_curation_products for select
to authenticated
using ((select private.is_admin()));
