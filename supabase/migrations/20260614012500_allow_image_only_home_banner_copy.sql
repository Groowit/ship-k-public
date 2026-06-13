alter table if exists public.home_banners
drop constraint if exists home_banners_topic_check;

alter table if exists public.home_banners
drop constraint if exists home_banners_headline_check;

alter table if exists public.home_banners
drop constraint if exists home_banners_description_check;

alter table if exists public.home_banners
alter column topic set default '',
alter column headline set default '',
alter column description set default '';

notify pgrst, 'reload schema';
