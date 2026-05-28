-- Canonical brand-editable product detail sections.
-- These rows own only the product story area below the fixed commerce hero/buy box/trust band.

create table if not exists public.product_detail_sections (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sort_order integer not null check (sort_order > 0),
  section_type text not null check (
    section_type in (
      'heading',
      'text',
      'image',
      'long_detail_image',
      'image_text',
      'image_group',
      'video',
      'comparison',
      'steps',
      'notice'
    )
  ),
  schema_version integer not null default 1 check (schema_version = 1),
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, sort_order)
);

create index if not exists product_detail_sections_product_sort_idx
on public.product_detail_sections(product_id, sort_order);

create index if not exists product_detail_sections_section_type_idx
on public.product_detail_sections(section_type);

drop trigger if exists product_detail_sections_touch_updated_at on public.product_detail_sections;
create trigger product_detail_sections_touch_updated_at
before update on public.product_detail_sections
for each row execute function public.touch_updated_at();

alter table public.product_detail_sections enable row level security;

drop policy if exists "product detail sections anon active read" on public.product_detail_sections;
drop policy if exists "product detail sections authenticated scoped read" on public.product_detail_sections;

create policy "product detail sections anon active read"
on public.product_detail_sections for select
to anon
using (
  exists (
    select 1
    from public.products
    where products.id = product_detail_sections.product_id
      and products.status = 'active'
  )
);

create policy "product detail sections authenticated scoped read"
on public.product_detail_sections for select
to authenticated
using (
  exists (
    select 1
    from public.products
    where products.id = product_detail_sections.product_id
      and products.status = 'active'
  )
  or (select private.is_admin())
  or exists (
    select 1
    from public.product_brand_assignments
    join public.brand_memberships
      on brand_memberships.brand_partner_id = product_brand_assignments.brand_partner_id
    where product_brand_assignments.product_id = product_detail_sections.product_id
      and product_brand_assignments.status = 'active'
      and brand_memberships.profile_id = (select auth.uid())
      and brand_memberships.status = 'active'
  )
);

revoke all privileges on public.product_detail_sections from anon, authenticated;
grant select on public.product_detail_sections to anon, authenticated;
grant all privileges on public.product_detail_sections to service_role;

create or replace function public.replace_product_detail_sections(
  p_product_id uuid,
  p_actor_id uuid,
  p_sections jsonb
)
returns setof public.product_detail_sections
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment_id uuid;
  v_section_count integer;
begin
  if p_product_id is null or p_actor_id is null then
    raise exception 'Product and actor are required' using errcode = '22023';
  end if;

  select product_brand_assignments.id
  into v_assignment_id
  from public.product_brand_assignments
  join public.brand_memberships
    on brand_memberships.brand_partner_id = product_brand_assignments.brand_partner_id
  where product_brand_assignments.product_id = p_product_id
    and product_brand_assignments.status = 'active'
    and product_brand_assignments.can_edit_details = true
    and brand_memberships.profile_id = p_actor_id
    and brand_memberships.status = 'active'
    and brand_memberships.member_role in ('owner', 'editor')
  limit 1;

  if v_assignment_id is null and not exists (
    select 1
    from public.profiles
    where profiles.id = p_actor_id
      and profiles.role = 'admin'
  ) then
    raise exception 'Brand product edit access denied' using errcode = '42501';
  end if;

  if jsonb_typeof(p_sections) is distinct from 'array' then
    raise exception 'Sections must be a JSON array' using errcode = '22023';
  end if;

  v_section_count := jsonb_array_length(p_sections);
  if v_section_count > 40 then
    raise exception 'Too many detail sections' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_sections) as section(value)
    where jsonb_typeof(section.value) is distinct from 'object'
      or not (section.value ? 'section_type')
      or not (section.value ? 'schema_version')
      or not (section.value ? 'content')
      or jsonb_typeof(section.value -> 'content') is distinct from 'object'
      or (section.value ->> 'schema_version')::integer <> 1
      or section.value ->> 'section_type' not in (
        'heading',
        'text',
        'image',
        'long_detail_image',
        'image_text',
        'image_group',
        'video',
        'comparison',
        'steps',
        'notice'
      )
  ) then
    raise exception 'Malformed detail section payload' using errcode = '22023';
  end if;

  delete from public.product_detail_sections
  where product_id = p_product_id;

  insert into public.product_detail_sections (
    product_id,
    sort_order,
    section_type,
    schema_version,
    content
  )
  select
    p_product_id,
    section.ordinality::integer,
    section.value ->> 'section_type',
    (section.value ->> 'schema_version')::integer,
    section.value -> 'content'
  from jsonb_array_elements(p_sections) with ordinality as section(value, ordinality);

  update public.product_brand_assignments
  set
    last_content_updated_by = p_actor_id,
    last_content_updated_at = now(),
    updated_at = now()
  where id = v_assignment_id;

  return query
  select *
  from public.product_detail_sections
  where product_id = p_product_id
  order by sort_order asc;
end;
$$;

revoke all on function public.replace_product_detail_sections(uuid, uuid, jsonb) from public;
revoke all on function public.replace_product_detail_sections(uuid, uuid, jsonb) from anon;
revoke all on function public.replace_product_detail_sections(uuid, uuid, jsonb) from authenticated;
grant execute on function public.replace_product_detail_sections(uuid, uuid, jsonb) to service_role;

delete from public.product_detail_sections
where product_id in (
  select id
  from public.products
  where slug = 'bubble-tide-seafoam-splash-hydration-set'
);

with bubble_tide_product as (
  select id
  from public.products
  where slug = 'bubble-tide-seafoam-splash-hydration-set'
)
insert into public.product_detail_sections (
  product_id,
  sort_order,
  section_type,
  schema_version,
  content
)
select
  bubble_tide_product.id,
  section.sort_order,
  section.section_type,
  1,
  section.content
from bubble_tide_product
cross join (
  values
    (
      1,
      'heading',
      '{"text":"Bubble Tide ocean-water skincare story","level":"h2","align":"left"}'::jsonb
    ),
    (
      2,
      'text',
      '{"body":"Seafoam Splash is a playful internal sample for brand staff. It keeps the fixed commerce hero intact while letting the brand team build a rich customer-facing story with document sections.","align":"left"}'::jsonb
    ),
    (
      3,
      'long_detail_image',
      '{"src":"/catalog-assets/brand-samples/bubble-tide-hero.png","alt":"Bubble Tide cartoon ocean skincare long detail visual","caption":"Long Figma-style detail images can live as their own vertical section.","maxWidth":"wide"}'::jsonb
    ),
    (
      4,
      'image_text',
      '{"src":"/catalog-assets/brand-samples/bubble-tide-hero.png","alt":"Bubble Tide seafoam skincare packaging","eyebrow":"Brand sample","title":"Cute, splashy, and easy to revise","body":"Use this block to test how product images, brand copy, and a clear routine message sit together on the public detail page.","imagePosition":"left"}'::jsonb
    ),
    (
      5,
      'steps',
      '{"title":"Ocean hydration routine","items":[{"title":"Bubble cleanse","body":"Start with the cushiony cleanser on damp skin."},{"title":"Press in tide drops","body":"Layer the watery ampoule with light pats."},{"title":"Seal with sea jelly","body":"Finish with the bouncy gel cream."}]}'::jsonb
    ),
    (
      6,
      'notice',
      '{"title":"Internal draft sample","body":"This product is intentionally fictional and exists so brand owners or editors can practice the detail-page editing flow.","tone":"tip"}'::jsonb
    )
) as section(sort_order, section_type, content);
