-- Campos de Mercado Pago por marca + portadas múltiples
alter table public.brands
  add column if not exists mp_alias text,
  add column if not exists mp_cbu text,
  add column if not exists mp_titular text,
  add column if not exists mp_access_token text,
  add column if not exists mp_public_key text,
  add column if not exists cover_urls jsonb;

-- Relación marca - vendedor
create table if not exists public.brands_vendors (
  brand_slug text references public.brands(slug) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamp with time zone default now(),
  primary key (brand_slug, user_id)
);
alter table public.brands_vendors enable row level security;

-- Lectura de asignaciones por el propio usuario
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='brands_vendors' and policyname='bv select self'
  ) then
    create policy "bv select self"
      on public.brands_vendors
      for select to authenticated
      using (user_id = auth.uid());
  end if;
end$$;

-- Lectura genérica de brands para autenticados
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='brands' and policyname='brands read for authenticated'
  ) then
    create policy "brands read for authenticated"
      on public.brands
      for select to authenticated
      using (true);
  end if;
end$$;
