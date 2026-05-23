drop policy if exists "product images public read" on storage.objects;
drop policy if exists "product images admin read" on storage.objects;

create policy "product images public read"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'product-images');
