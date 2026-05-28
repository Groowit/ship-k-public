-- Referral/payment integrity guards:
-- - PayPal capture/create retries must not duplicate orders or commissions.
-- - The Phase 1 launch commission model allows at most one attributed commission per order.

create unique index if not exists payment_transactions_provider_order_unique
on public.payment_transactions (provider, provider_order_id);

create unique index if not exists payment_transactions_provider_capture_unique
on public.payment_transactions (provider, provider_capture_id)
where provider_capture_id is not null;

create unique index if not exists commissions_order_id_unique
on public.commissions (order_id);
