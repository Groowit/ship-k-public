alter table public.products
  add column if not exists disclosure_notes jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_disclosure_notes_object_check'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_disclosure_notes_object_check
      check (
        disclosure_notes is null
        or jsonb_typeof(disclosure_notes) = 'object'
      );
  end if;
end $$;
