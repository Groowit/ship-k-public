alter table if exists public.home_banners
drop constraint if exists home_banners_link_path_check;

alter table if exists public.home_banners
drop constraint if exists home_banners_link_path_internal_check;

alter table if exists public.home_banners
add constraint home_banners_link_path_internal_check
check (
  link_path like '/%' and
  link_path not like '//%' and
  position('://' in link_path) = 0 and
  position(chr(92) in link_path) = 0 and
  link_path !~ '[[:space:]]'
);
