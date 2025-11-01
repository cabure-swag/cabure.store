-- CORREGIDO: usa pg_policies.policyname

alter table if exists public.profiles add column if not exists role text;

alter table if exists public.brands
  add column if not exists mp_alias text,
  add column if not exists mp_cbu text,
  add column if not exists mp_titular text,
  add column if not exists mp_access_token text,
  add column if not exists mp_public_key text,
  add column if not exists cover_urls jsonb;

create table if not exists public.brands_vendors(
  brand_slug text references public.brands(slug) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key(brand_slug,user_id)
);
alter table public.brands_vendors enable row level security;

create table if not exists public.products(
  id uuid primary key default gen_random_uuid(),
  brand_slug text references public.brands(slug) on delete cascade,
  name text not null,
  description text,
  price numeric default 0,
  stock int default 1 check (stock>=1),
  image_url text,
  created_at timestamptz default now()
);
alter table public.products enable row level security;

create table if not exists public.product_images(
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  url text not null,
  position int default 0
);
alter table public.product_images enable row level security;

create table if not exists public.product_categories(
  product_id uuid references public.products(id) on delete cascade,
  category_id uuid,
  primary key(product_id, category_id)
);
alter table public.product_categories enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='brands' and policyname='brands select auth') then
    create policy "brands select auth" on public.brands for select to authenticated using (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='brands' and policyname='brands admin write') then
    create policy "brands admin write" on public.brands
      for all to authenticated
      using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'))
      with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='brands' and policyname='brands vendor update own') then
    create policy "brands vendor update own" on public.brands
      for update to authenticated
      using (exists(select 1 from public.brands_vendors bv where bv.brand_slug=brands.slug and bv.user_id=auth.uid()))
      with check (exists(select 1 from public.brands_vendors bv where bv.brand_slug=brands.slug and bv.user_id=auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='brands_vendors' and policyname='bv select self') then
    create policy "bv select self" on public.brands_vendors for select to authenticated using (user_id=auth.uid());
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='products' and policyname='products select brand') then
    create policy "products select brand" on public.products for select to authenticated using (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='products' and policyname='products insert own') then
    create policy "products insert own" on public.products for insert to authenticated
      with check (
        exists(select 1 from public.brands_vendors bv where bv.brand_slug=products.brand_slug and bv.user_id=auth.uid())
        or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')
      );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='products' and policyname='products update own') then
    create policy "products update own" on public.products for update to authenticated
      using (
        exists(select 1 from public.brands_vendors bv where bv.brand_slug=products.brand_slug and bv.user_id=auth.uid())
        or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')
      )
      with check (
        exists(select 1 from public.brands_vendors bv where bv.brand_slug=products.brand_slug and bv.user_id=auth.uid())
        or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')
      );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='products' and policyname='products delete own') then
    create policy "products delete own" on public.products for delete to authenticated
      using (
        exists(select 1 from public.brands_vendors bv where bv.brand_slug=products.brand_slug and bv.user_id=auth.uid())
        or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')
      );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='product_images' and policyname='pi select') then
    create policy "pi select" on public.product_images for select to authenticated using (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='product_images' and policyname='pi write own') then
    create policy "pi write own" on public.product_images
      for all to authenticated
      using (exists(
        select 1 from public.products pr
        join public.brands_vendors bv on bv.brand_slug=pr.brand_slug
        where pr.id=product_images.product_id
          and (bv.user_id=auth.uid() or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'))
      ))
      with check (exists(
        select 1 from public.products pr
        join public.brands_vendors bv on bv.brand_slug=pr.brand_slug
        where pr.id=product_images.product_id
          and (bv.user_id=auth.uid() or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'))
      ));
  end if;
end $$;

-- STORAGE policies
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='media public read') then
    create policy "media public read" on storage.objects for select to public using (bucket_id='media');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='media auth insert') then
    create policy "media auth insert" on storage.objects for insert to authenticated with check (bucket_id='media');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='media auth update') then
    create policy "media auth update" on storage.objects for update to authenticated using (bucket_id='media') with check (bucket_id='media');
  end if;
end $$;
