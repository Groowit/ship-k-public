-- Marketing badges are now derived from product recency and paid order volume.
-- Keep the legacy column empty so operators cannot accidentally treat it as source of truth.
update public.products
set badges = '{}'
where coalesce(array_length(badges, 1), 0) > 0;
