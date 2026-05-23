-- DB writes for checkout/admin flows are performed by a trusted Next.js
-- backend using a Supabase secret/service_role key. The service_role bypasses
-- RLS, so user/admin authorization must happen in the server route before
-- using the privileged client.

drop policy if exists "orders insert" on public.orders;
drop policy if exists "orders admin insert" on public.orders;
drop policy if exists "orders server owner insert" on public.orders;
drop policy if exists "orders delete" on public.orders;
drop policy if exists "orders admin delete" on public.orders;
drop policy if exists "orders server owner delete" on public.orders;
drop policy if exists "orders admin update" on public.orders;
drop policy if exists "order items insert" on public.order_items;
drop policy if exists "order items admin insert" on public.order_items;
drop policy if exists "order items server owner insert" on public.order_items;
drop policy if exists "order items admin update" on public.order_items;
drop policy if exists "order items admin delete" on public.order_items;
drop policy if exists "shipping addresses insert" on public.shipping_addresses;
drop policy if exists "shipping addresses admin insert" on public.shipping_addresses;
drop policy if exists "shipping addresses server owner insert" on public.shipping_addresses;
drop policy if exists "shipping addresses admin update" on public.shipping_addresses;
drop policy if exists "shipping addresses admin delete" on public.shipping_addresses;
drop policy if exists "payment transactions insert" on public.payment_transactions;
drop policy if exists "payment transactions admin insert" on public.payment_transactions;
drop policy if exists "payment transactions server owner insert" on public.payment_transactions;
drop policy if exists "payment transactions admin update" on public.payment_transactions;
drop policy if exists "payment transactions admin delete" on public.payment_transactions;
drop policy if exists "referral events insert" on public.referral_events;
drop policy if exists "referral events admin insert" on public.referral_events;
drop policy if exists "referral events server owner insert" on public.referral_events;
drop policy if exists "referral events admin update" on public.referral_events;
drop policy if exists "referral events admin delete" on public.referral_events;
drop policy if exists "commissions insert" on public.commissions;
drop policy if exists "commissions admin insert" on public.commissions;
drop policy if exists "commissions server owner insert" on public.commissions;
drop policy if exists "commissions admin update" on public.commissions;
drop policy if exists "commissions admin delete" on public.commissions;

drop policy if exists "categories admin insert" on public.categories;
drop policy if exists "categories admin update" on public.categories;
drop policy if exists "categories admin delete" on public.categories;
drop policy if exists "products admin insert" on public.products;
drop policy if exists "products admin update" on public.products;
drop policy if exists "products admin delete" on public.products;
drop policy if exists "product options admin insert" on public.product_options;
drop policy if exists "product options admin update" on public.product_options;
drop policy if exists "product options admin delete" on public.product_options;
drop policy if exists "product blocks admin insert" on public.product_content_blocks;
drop policy if exists "product blocks admin update" on public.product_content_blocks;
drop policy if exists "product blocks admin delete" on public.product_content_blocks;
drop policy if exists "affiliates admin insert" on public.affiliates;
drop policy if exists "affiliates admin update" on public.affiliates;
drop policy if exists "affiliates admin delete" on public.affiliates;
drop policy if exists "shipments admin insert" on public.shipments;
drop policy if exists "shipments admin update" on public.shipments;
drop policy if exists "shipments admin delete" on public.shipments;
drop policy if exists "webhook events admin insert" on public.webhook_events;
drop policy if exists "webhook events admin update" on public.webhook_events;
drop policy if exists "webhook events admin delete" on public.webhook_events;

drop policy if exists "product images admin insert" on storage.objects;
drop policy if exists "product images admin update" on storage.objects;
drop policy if exists "product images admin delete" on storage.objects;
drop policy if exists "product images public read" on storage.objects;

drop function if exists private.has_server_write_secret();

delete from public.app_settings
where key = 'server_write_secret';

revoke insert, update, delete, truncate, references, trigger on
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
from anon, authenticated;
