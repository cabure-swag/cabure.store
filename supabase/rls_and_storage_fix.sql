-- ===== RLS y Storage mínimas para que los paneles funcionen =====

-- 1) brands: lectura para autenticados
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='brands' and policyname='brands select auth'
  ) then
    create policy "brands select auth" on public.brands
      for select to authenticated
      using (true);
  end if;
end$$;

-- 2) brands: escritura por ADMIN
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='brands' and policyname='brands admin write'
  ) then
    create policy "brands admin write" on public.brands
      for all to authenticated
      using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
      with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
  end if;
end$$;

-- 3) brands: update por VENDOR en sus marcas asignadas
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='brands' and policyname='brands vendor update own'
  ) then
    create policy "brands vendor update own" on public.brands
      for update to authenticated
      using (exists (
        select 1 from public.brands_vendors bv
        where bv.brand_slug = brands.slug and bv.user_id = auth.uid()
      ))
      with check (exists (
        select 1 from public.brands_vendors bv
        where bv.brand_slug = brands.slug and bv.user_id = auth.uid()
      ));
  end if;
end$$;

-- 4) tabla brands_vendors (si no existe)
create table if not exists public.brands_vendors (
  brand_slug text references public.brands(slug) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamp with time zone default now(),
  primary key (brand_slug, user_id)
);
alter table public.brands_vendors enable row level security;

-- 4.a) lectura propia de asignaciones
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='brands_vendors' and policyname='bv select self'
  ) then
    create policy "bv select self" on public.brands_vendors
      for select to authenticated
      using (user_id = auth.uid());
  end if;
end$$;

-- 5) columnas MP por marca y cover_urls (por si faltan)
alter table public.brands
  add column if not exists mp_alias text,
  add column if not exists mp_cbu text,
  add column if not exists mp_titular text,
  add column if not exists mp_access_token text,
  add column if not exists mp_public_key text,
  add column if not exists cover_urls jsonb;

-- 6) Storage 'media' (crear bucket manualmente si no existe)
-- Políticas de lectura pública y escritura autenticada
do $$
begin
  if not exists (
    select 1 from pg_policies
    where polname='media public read'
  ) then
    create policy "media public read" on storage.objects
    for select to public
    using (bucket_id = 'media');
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where polname='media auth insert'
  ) then
    create policy "media auth insert" on storage.objects
    for insert to authenticated
    with check (bucket_id = 'media');
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where polname='media auth update'
  ) then
    create policy "media auth update" on storage.objects
    for update to authenticated
    using (bucket_id = 'media')
    with check (bucket_id = 'media');
  end if;
end$$;
