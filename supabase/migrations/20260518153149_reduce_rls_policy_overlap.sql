create index if not exists order_items_product_option_id_idx on public.order_items (product_option_id);

drop policy if exists "categories admin manage" on public.categories;
drop policy if exists "categories admin insert" on public.categories;
drop policy if exists "categories admin update" on public.categories;
drop policy if exists "categories admin delete" on public.categories;

drop policy if exists "products public active read" on public.products;
drop policy if exists "products admin manage" on public.products;
drop policy if exists "products anon active read" on public.products;
drop policy if exists "products authenticated read" on public.products;
drop policy if exists "products admin insert" on public.products;
drop policy if exists "products admin update" on public.products;
drop policy if exists "products admin delete" on public.products;

drop policy if exists "product options public active read" on public.product_options;
drop policy if exists "product options admin manage" on public.product_options;
drop policy if exists "product options anon active read" on public.product_options;
drop policy if exists "product options authenticated read" on public.product_options;
drop policy if exists "product options admin insert" on public.product_options;
drop policy if exists "product options admin update" on public.product_options;
drop policy if exists "product options admin delete" on public.product_options;

drop policy if exists "product blocks public active read" on public.product_content_blocks;
drop policy if exists "product blocks admin manage" on public.product_content_blocks;
drop policy if exists "product blocks anon active read" on public.product_content_blocks;
drop policy if exists "product blocks authenticated read" on public.product_content_blocks;
drop policy if exists "product blocks admin insert" on public.product_content_blocks;
drop policy if exists "product blocks admin update" on public.product_content_blocks;
drop policy if exists "product blocks admin delete" on public.product_content_blocks;

drop policy if exists "affiliates public active read" on public.affiliates;
drop policy if exists "affiliates admin manage" on public.affiliates;
drop policy if exists "affiliates anon active read" on public.affiliates;
drop policy if exists "affiliates authenticated read" on public.affiliates;
drop policy if exists "affiliates admin insert" on public.affiliates;
drop policy if exists "affiliates admin update" on public.affiliates;
drop policy if exists "affiliates admin delete" on public.affiliates;

drop policy if exists "orders admin manage" on public.orders;
drop policy if exists "orders admin insert" on public.orders;
drop policy if exists "orders admin update" on public.orders;
drop policy if exists "orders admin delete" on public.orders;

drop policy if exists "order items admin manage" on public.order_items;
drop policy if exists "order items admin insert" on public.order_items;
drop policy if exists "order items admin update" on public.order_items;
drop policy if exists "order items admin delete" on public.order_items;

drop policy if exists "shipping addresses admin manage" on public.shipping_addresses;
drop policy if exists "shipping addresses admin insert" on public.shipping_addresses;
drop policy if exists "shipping addresses admin update" on public.shipping_addresses;
drop policy if exists "shipping addresses admin delete" on public.shipping_addresses;

drop policy if exists "shipments admin manage" on public.shipments;
drop policy if exists "shipments admin insert" on public.shipments;
drop policy if exists "shipments admin update" on public.shipments;
drop policy if exists "shipments admin delete" on public.shipments;

drop policy if exists "payment transactions admin manage" on public.payment_transactions;
drop policy if exists "payment transactions admin insert" on public.payment_transactions;
drop policy if exists "payment transactions admin update" on public.payment_transactions;
drop policy if exists "payment transactions admin delete" on public.payment_transactions;

drop policy if exists "referral events admin manage" on public.referral_events;
drop policy if exists "referral events admin insert" on public.referral_events;
drop policy if exists "referral events admin update" on public.referral_events;
drop policy if exists "referral events admin delete" on public.referral_events;

drop policy if exists "commissions admin manage" on public.commissions;
drop policy if exists "commissions admin insert" on public.commissions;
drop policy if exists "commissions admin update" on public.commissions;
drop policy if exists "commissions admin delete" on public.commissions;

drop policy if exists "webhook events admin manage" on public.webhook_events;
drop policy if exists "webhook events admin insert" on public.webhook_events;
drop policy if exists "webhook events admin update" on public.webhook_events;
drop policy if exists "webhook events admin delete" on public.webhook_events;

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
