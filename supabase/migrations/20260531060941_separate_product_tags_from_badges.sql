begin;

alter table public.products
  add column if not exists tags text[] not null default '{}';

with curated_tags(slug, tags) as (
  values
    ('skincare-starter-set', array['STARTER', 'SKINCARE', '5 ITEMS']::text[]),
    ('hydration-skincare-set', array['HYDRATION', 'SKINCARE', '6 ITEMS']::text[]),
    ('makeup-starter-set', array['MAKEUP', 'STARTER', '7 ITEMS']::text[]),
    ('gloss-makeup-set', array['GLOSS', 'MAKEUP', '6 ITEMS']::text[]),
    ('definition-makeup-set', array['DEFINITION', 'MAKEUP', '7 ITEMS']::text[]),
    ('warm-makeup-set', array['WARM', 'MAKEUP', '6 ITEMS']::text[]),
    ('bubble-tide-seafoam-splash-hydration-set', array['SEAFOAM', 'HYDRATION', 'SET']::text[]),
    ('birch-water-toner-pads', array['TONER PAD', 'HYDRATION', 'QUICK PREP']::text[]),
    ('seoul-cica-calm-ampoule', array['CICA', 'AMPOULE', 'CALM']::text[]),
    ('rice-ceramide-barrier-cream', array['RICE', 'CREAM', 'COMFORT']::text[]),
    ('peach-cloud-cream-blush', array['BLUSH', 'PEACH', 'CREAM']::text[]),
    ('soft-mauve-shadow-quad', array['EYE', 'MAUVE', 'QUAD']::text[]),
    ('cherry-jelly-lip-tint', array['LIP TINT', 'CHERRY', 'GLOSS']::text[]),
    ('shipk-curated', array['SKINCARE', 'SET']::text[])
),
category_tags as (
  select
    p.id,
    array_remove(
      array[
        upper(coalesce(c.name, 'Skincare')),
        case when p.product_type::text in ('set', 'curated_set') then 'SET' else 'SINGLE' end,
        case when p.item_count is not null then p.item_count::text || ' ITEMS' end
      ],
      null
    )::text[] as tags
  from public.products p
  left join public.categories c on c.id = p.category_id
),
product_tags as (
  select
    p.id,
    coalesce(curated_tags.tags, category_tags.tags, '{}') as tags
  from public.products p
  left join curated_tags on curated_tags.slug = p.slug
  left join category_tags on category_tags.id = p.id
)
update public.products p
set tags = product_tags.tags
from product_tags
where p.id = product_tags.id
  and cardinality(p.tags) = 0;

with normalized_badges as (
  select
    p.id,
    array(
      select distinct normalized.badge
      from unnest(coalesce(p.badges, '{}')) raw_badge(value)
      cross join lateral (
        select case
          when upper(trim(raw_badge.value)) in ('BEST', 'BESTSELLER', 'BEST SELLER') then 'BESTSELLER'
          when upper(trim(raw_badge.value)) in ('NEW', 'NEW ARRIVAL', 'NEWARRIVAL') then 'NEW ARRIVAL'
          when upper(trim(raw_badge.value)) in ('LIMITED', 'LIMITED DROP') then 'LIMITED'
          when upper(trim(raw_badge.value)) in ('EDITOR PICK', 'EDITOR''S PICK', 'RECOMMENDED') then 'EDITOR''S PICK'
          else null
        end as badge
      ) normalized
      where normalized.badge is not null
    )::text[] as badges
  from public.products p
),
curated_badges(slug, badges) as (
  values
    ('skincare-starter-set', array['BESTSELLER']::text[]),
    ('makeup-starter-set', array['NEW ARRIVAL']::text[])
),
product_badges as (
  select
    p.id,
    coalesce(curated_badges.badges, normalized_badges.badges, '{}') as badges
  from public.products p
  left join normalized_badges on normalized_badges.id = p.id
  left join curated_badges on curated_badges.slug = p.slug
)
update public.products p
set badges = product_badges.badges
from product_badges
where p.id = product_badges.id;

commit;
