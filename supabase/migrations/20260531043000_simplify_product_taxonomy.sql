begin;

insert into public.categories (name, slug, sort_order)
values
  ('Skincare', 'skincare', 10),
  ('Makeup', 'makeup', 20)
on conflict (name) do update
set slug = excluded.slug,
    sort_order = excluded.sort_order;

with product_targets as (
  select
    p.id,
    case
      when lower(concat_ws(' ', p.slug, p.name, p.short_description, p.description, p.best_for, p.result, array_to_string(p.badges, ' '))) ~
        '(skincare|skin care|cleanser|foam|toner|pads|serum|ampoule|essence|cica|ceramide|barrier|birch|rice|sunscreen|spf|mask|moisturizer|moisturising|moisturizing|hydration|hydrate|hydro)'
        and lower(concat_ws(' ', p.slug, p.name, p.short_description, p.description, p.best_for, p.result, array_to_string(p.badges, ' '))) !~
        '(makeup|lip|lips|eye|eyes|shadow|liner|brow|lash|blush|cheek|cushion|gloss|tint|powder|primer|palette|idol|k-pop|kpop|y2k|definition|cool-tone|warm-honey)'
        then 'Skincare'
      when p.collection_slug in ('k-pop-idol', 'y2k-cute', 'cool-tone', 'warm-tone', 'date-night')
        or p.slug in ('k-pop-idol-look', 'y2k-cute-bomb', 'cool-tone-drama', 'warm-honey-look', 'makeup-starter-set', 'gloss-makeup-set', 'definition-makeup-set', 'warm-makeup-set')
        or (
          lower(concat_ws(' ', p.slug, p.name, p.short_description, p.description, p.best_for, p.result, array_to_string(p.badges, ' '))) ~
          '(makeup|lip|lips|eye|eyes|shadow|liner|brow|lash|blush|cheek|cushion|gloss|tint|powder|primer|palette|idol|k-pop|kpop|y2k|definition|cool-tone|warm-honey)'
          and lower(concat_ws(' ', p.slug, p.name, p.short_description, p.description, p.best_for, p.result, array_to_string(p.badges, ' '))) !~
          '(skincare|skin care|cleanser|foam|toner|pads|serum|ampoule|essence|cica|ceramide|barrier|birch|rice|sunscreen|spf|mask|moisturizer|moisturising|moisturizing|hydration|hydrate|hydro)'
        )
        then 'Makeup'
      when existing.name = 'Makeup'
        then 'Makeup'
      else 'Skincare'
    end as category_name
  from public.products p
  left join public.categories existing on existing.id = p.category_id
)
update public.products p
set category_id = category.id
from product_targets target
join public.categories category on category.name = target.category_name
where p.id = target.id;

with legacy_products(old_slug, new_slug, new_name, new_badges) as (
  values
    ('daily-k-glow-set', 'skincare-starter-set', 'Skincare Starter Set', array['BEST', 'Skincare']),
    ('glass-skin-starter', 'hydration-skincare-set', 'Hydration Skincare Set', array['HOT', 'Skincare']),
    ('k-pop-idol-look', 'makeup-starter-set', 'Makeup Starter Set', array['NEW', 'Makeup']),
    ('y2k-cute-bomb', 'gloss-makeup-set', 'Gloss Makeup Set', array['PLAY', 'Makeup']),
    ('cool-tone-drama', 'definition-makeup-set', 'Definition Makeup Set', array['DEFINITION', 'Makeup']),
    ('warm-honey-look', 'warm-makeup-set', 'Warm Makeup Set', array['WARM', 'Makeup'])
)
update public.products p
set name = legacy.new_name,
    badges = legacy.new_badges
from legacy_products legacy
where p.slug = legacy.old_slug;

with legacy_products(old_slug, new_slug) as (
  values
    ('daily-k-glow-set', 'skincare-starter-set'),
    ('glass-skin-starter', 'hydration-skincare-set'),
    ('k-pop-idol-look', 'makeup-starter-set'),
    ('y2k-cute-bomb', 'gloss-makeup-set'),
    ('cool-tone-drama', 'definition-makeup-set'),
    ('warm-honey-look', 'warm-makeup-set')
)
update public.products p
set slug = legacy.new_slug
from legacy_products legacy
where p.slug = legacy.old_slug
  and not exists (
    select 1
    from public.products existing
    where existing.slug = legacy.new_slug
      and existing.id <> p.id
  );

delete from public.categories category
where category.name not in ('Skincare', 'Makeup')
  and not exists (
    select 1
    from public.products product
    where product.category_id = category.id
  );

alter table public.products
  alter column product_type drop default;

alter type public.product_type rename to product_type_old;

create type public.product_type as enum ('single', 'set');

alter table public.products
  alter column product_type type public.product_type
  using (
    case
      when product_type::text = 'curated_set' then 'set'
      else product_type::text
    end
  )::public.product_type,
  alter column product_type set default 'single';

drop type public.product_type_old;

drop index if exists public.products_collection_slug_idx;

alter table public.products
  drop column if exists collection_slug,
  drop column if exists collection_name,
  drop column if exists theme_label;

commit;
