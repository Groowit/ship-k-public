alter table if exists public.home_banners
add column if not exists headline_text_color text;

alter table if exists public.home_banners
add column if not exists description_text_color text;

update public.home_banners
set
  headline_text_color = coalesce(headline_text_color, text_color, 'black'),
  description_text_color = coalesce(description_text_color, text_color, 'black')
where headline_text_color is null
  or description_text_color is null;

alter table if exists public.home_banners
alter column headline_text_color set default 'black',
alter column headline_text_color set not null,
alter column description_text_color set default 'black',
alter column description_text_color set not null;

alter table if exists public.home_banners
drop constraint if exists home_banners_headline_text_color_check;

alter table if exists public.home_banners
drop constraint if exists home_banners_description_text_color_check;

alter table if exists public.home_banners
add constraint home_banners_headline_text_color_check
check (
  headline_text_color in ('black', 'white', 'shipk-pink', 'teal', 'coral', 'muted-dark')
);

alter table if exists public.home_banners
add constraint home_banners_description_text_color_check
check (
  description_text_color in ('black', 'white', 'shipk-pink', 'teal', 'coral', 'muted-dark')
);

notify pgrst, 'reload schema';
