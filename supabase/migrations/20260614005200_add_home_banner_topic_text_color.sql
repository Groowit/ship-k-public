alter table if exists public.home_banners
add column if not exists topic_text_color text;

update public.home_banners
set topic_text_color = coalesce(topic_text_color, text_color, headline_text_color, 'black')
where topic_text_color is null;

alter table if exists public.home_banners
alter column topic_text_color set default 'black',
alter column topic_text_color set not null;

alter table if exists public.home_banners
drop constraint if exists home_banners_topic_text_color_check;

alter table if exists public.home_banners
add constraint home_banners_topic_text_color_check
check (
  topic_text_color in ('black', 'white', 'shipk-pink', 'teal', 'coral', 'muted-dark')
);

notify pgrst, 'reload schema';
