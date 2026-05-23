revoke all privileges on all tables in schema public from anon, authenticated;
revoke all privileges on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from anon, authenticated;

grant usage on schema public to anon, authenticated, service_role;

grant select on
  public.categories,
  public.products,
  public.product_options,
  public.product_content_blocks,
  public.affiliates
to anon, authenticated;

grant select, update on public.profiles to authenticated;
grant select on
  public.orders,
  public.order_items,
  public.shipping_addresses,
  public.shipments,
  public.payment_transactions,
  public.referral_events,
  public.commissions,
  public.app_settings,
  public.webhook_events
to authenticated;

grant insert, update, delete on
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
to authenticated;

grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
