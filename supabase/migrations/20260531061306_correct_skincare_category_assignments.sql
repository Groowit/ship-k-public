begin;

insert into public.categories (name, slug, sort_order)
values ('Skincare', 'skincare', 10)
on conflict (name) do update
set slug = excluded.slug,
    sort_order = excluded.sort_order;

update public.products p
set category_id = category.id
from public.categories category
where category.name = 'Skincare'
  and p.slug in (
    'bubble-tide-seafoam-splash-hydration-set',
    'birch-water-toner-pads'
  );

commit;
