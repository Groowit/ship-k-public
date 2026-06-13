create table if not exists public.home_banners (
  id uuid primary key default gen_random_uuid(),
  topic text not null default '',
  headline text not null default '',
  description text not null default '',
  background_image_path text not null check (char_length(trim(background_image_path)) > 0),
  side_image_path text check (
    side_image_path is null or char_length(trim(side_image_path)) > 0
  ),
  link_path text not null check (
    link_path like '/%' and
    link_path not like '//%' and
    position('://' in link_path) = 0 and
    position(chr(92) in link_path) = 0 and
    link_path !~ '[[:space:]]'
  ),
  font_key text not null default 'brand-display' check (
    font_key in ('brand-display', 'black-sans', 'standard-sans')
  ),
  text_color text not null default 'black' check (
    text_color in ('black', 'white', 'shipk-pink', 'teal', 'coral', 'muted-dark')
  ),
  topic_text_color text not null default 'black' check (
    topic_text_color in ('black', 'white', 'shipk-pink', 'teal', 'coral', 'muted-dark')
  ),
  headline_text_color text not null default 'black' check (
    headline_text_color in ('black', 'white', 'shipk-pink', 'teal', 'coral', 'muted-dark')
  ),
  description_text_color text not null default 'black' check (
    description_text_color in ('black', 'white', 'shipk-pink', 'teal', 'coral', 'muted-dark')
  ),
  sort_order integer not null check (sort_order <> 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sort_order)
);

create index if not exists home_banners_sort_order_idx
on public.home_banners(sort_order);

drop trigger if exists home_banners_touch_updated_at on public.home_banners;
create trigger home_banners_touch_updated_at
before update on public.home_banners
for each row execute function public.touch_updated_at();

alter table public.home_banners enable row level security;

drop policy if exists "home banners public read" on public.home_banners;
drop policy if exists "home banners admin insert" on public.home_banners;
drop policy if exists "home banners admin update" on public.home_banners;
drop policy if exists "home banners admin delete" on public.home_banners;

create policy "home banners public read"
on public.home_banners for select
to anon, authenticated
using (true);

create policy "home banners admin insert"
on public.home_banners for insert
to authenticated
with check ((select private.is_admin()));

create policy "home banners admin update"
on public.home_banners for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "home banners admin delete"
on public.home_banners for delete
to authenticated
using ((select private.is_admin()));

revoke all privileges on public.home_banners from anon, authenticated;
grant select on public.home_banners to anon, authenticated;
grant insert, update, delete on public.home_banners to authenticated;
grant all privileges on public.home_banners to service_role;

create or replace function public.normalize_home_banner_order()
returns setof public.home_banners
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
begin
  for v_row in
    select id, row_number() over (order by sort_order asc, created_at asc, id asc)::integer as next_sort_order
    from public.home_banners
  loop
    update public.home_banners
    set sort_order = -v_row.next_sort_order
    where id = v_row.id;
  end loop;

  for v_row in
    select id, abs(sort_order)::integer as next_sort_order
    from public.home_banners
    order by abs(sort_order) asc, created_at asc, id asc
  loop
    update public.home_banners
    set sort_order = v_row.next_sort_order
    where id = v_row.id;
  end loop;

  return query
  select *
  from public.home_banners
  order by sort_order asc, created_at asc, id asc;
end;
$$;

create or replace function public.reorder_home_banners(p_banner_ids uuid[])
returns setof public.home_banners
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_count integer;
  v_distinct_count integer;
  v_id uuid;
  v_index integer := 1;
begin
  select count(*) into v_existing_count from public.home_banners;
  select count(distinct banner_id) into v_distinct_count from unnest(coalesce(p_banner_ids, array[]::uuid[])) as banner_id;

  if coalesce(array_length(p_banner_ids, 1), 0) <> v_existing_count then
    raise exception 'Banner reorder payload must include every banner exactly once' using errcode = '22023';
  end if;

  if v_distinct_count <> v_existing_count then
    raise exception 'Banner reorder payload contains duplicates' using errcode = '22023';
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_banner_ids, array[]::uuid[])) as requested_id
    where not exists (
      select 1
      from public.home_banners
      where home_banners.id = requested_id
    )
  ) then
    raise exception 'Banner reorder payload contains unknown ids' using errcode = '22023';
  end if;

  foreach v_id in array coalesce(p_banner_ids, array[]::uuid[])
  loop
    update public.home_banners
    set sort_order = -v_index
    where id = v_id;
    v_index := v_index + 1;
  end loop;

  v_index := 1;
  foreach v_id in array coalesce(p_banner_ids, array[]::uuid[])
  loop
    update public.home_banners
    set sort_order = v_index
    where id = v_id;
    v_index := v_index + 1;
  end loop;

  return query
  select *
  from public.home_banners
  order by sort_order asc, created_at asc, id asc;
end;
$$;

revoke all on function public.normalize_home_banner_order() from public;
revoke all on function public.normalize_home_banner_order() from anon;
revoke all on function public.normalize_home_banner_order() from authenticated;
grant execute on function public.normalize_home_banner_order() to service_role;

revoke all on function public.reorder_home_banners(uuid[]) from public;
revoke all on function public.reorder_home_banners(uuid[]) from anon;
revoke all on function public.reorder_home_banners(uuid[]) from authenticated;
grant execute on function public.reorder_home_banners(uuid[]) to service_role;
