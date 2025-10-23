
create extension if not exists pgcrypto;
create table if not exists public.profiles (id uuid primary key references auth.users(id) on delete cascade, email text unique, role text not null default 'user' check (role in ('user','vendor','admin')), created_at timestamptz default now());
create or replace function public.handle_new_user() returns trigger as $$ begin insert into public.profiles (id,email,role) values (new.id,new.email,'user') on conflict (id) do update set email=excluded.email; return new; end; $$ language plpgsql security definer;
drop trigger if exists on_auth_user_created on auth.users; create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
create table if not exists public.brands (slug text primary key, name text not null, description text, instagram text, mp_fee integer, logo_url text, ship_domicilio integer, ship_sucursal integer, ship_free_from integer not null default 0, mp_access_token text, mp_public_key text, transfer_alias text, transfer_titular text);
create table if not exists public.products (id uuid primary key default gen_random_uuid(), brand_slug text not null references public.brands(slug) on delete cascade, name text not null, price integer not null, stock integer not null default 0, image_url text);
create table if not exists public.vendor_brands (user_id uuid not null references public.profiles(id) on delete cascade, brand_slug text not null references public.brands(slug) on delete cascade, created_at timestamptz default now(), primary key(user_id,brand_slug));
create table if not exists public.orders (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id), brand_slug text not null references public.brands(slug), shipping text not null check (shipping in ('domicilio','sucursal')), pay text not null check (pay in ('transferencia','mp')), mp_fee integer not null default 10, ship_cost integer not null default 0, subtotal integer not null, total integer not null, created_at timestamptz default now());
create table if not exists public.order_items (id bigserial primary key, order_id uuid not null references public.orders(id) on delete cascade, product_id uuid references public.products(id) on delete set null, name text not null, price integer not null, qty integer not null check (qty>0));
create table if not exists public.support_tickets (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, subject text not null, status text not null default 'open' check (status in ('open','closed')), created_at timestamptz default now());
create table if not exists public.support_messages (id bigserial primary key, ticket_id uuid not null references public.support_tickets(id) on delete cascade, message text not null, from_admin boolean not null default false, created_at timestamptz default now());

alter table public.profiles enable row level security; alter table public.brands enable row level security; alter table public.products enable row level security; alter table public.vendor_brands enable row level security; alter table public.orders enable row level security; alter table public.order_items enable row level security; alter table public.support_tickets enable row level security; alter table public.support_messages enable row level security;

create policy "profiles self select" on public.profiles for select using (auth.uid()=id or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
create policy "profiles admin update" on public.profiles for update using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

create policy "brands readable by all" on public.brands for select using (true);
create policy "brands write admin only" on public.brands for all using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

create policy "products readable by all" on public.products for select using (true);
create policy "products write admin" on public.products for all using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
create policy "products write vendor" on public.products for all using (exists(select 1 from public.vendor_brands vb where vb.user_id=auth.uid() and vb.brand_slug=brand_slug));

create policy "vendor_brands admin read" on public.vendor_brands for select using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
create policy "vendor_brands self read" on public.vendor_brands for select using (user_id=auth.uid());
create policy "vendor_brands admin insert" on public.vendor_brands for insert with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
create policy "vendor_brands admin delete" on public.vendor_brands for delete using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

create policy "orders owner read" on public.orders for select using (user_id=auth.uid());
create policy "orders owner insert" on public.orders for insert with check (user_id=auth.uid());
create policy "orders admin read" on public.orders for select using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
create policy "orders vendor read" on public.orders for select using (exists(select 1 from public.vendor_brands vb where vb.user_id=auth.uid() and vb.brand_slug=brand_slug));

create policy "order_items owner read" on public.order_items for select using (exists(select 1 from public.orders o where o.id=order_id and o.user_id=auth.uid()));
create policy "order_items admin read" on public.order_items for select using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
create policy "order_items vendor read" on public.order_items for select using (exists(select 1 from public.orders o join public.vendor_brands vb on vb.brand_slug=o.brand_slug where o.id=order_id and vb.user_id=auth.uid()));
create policy "order_items owner insert" on public.order_items for insert with check (exists(select 1 from public.orders o where o.id=order_id and o.user_id=auth.uid()));

create policy "tickets owner read" on public.support_tickets for select using (user_id=auth.uid());
create policy "tickets owner insert" on public.support_tickets for insert with check (user_id=auth.uid());
create policy "tickets admin read" on public.support_tickets for select using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','vendor')));

create policy "messages owner read" on public.support_messages for select using (exists(select 1 from public.support_tickets t where t.id=ticket_id and t.user_id=auth.uid()));
create policy "messages owner insert" on public.support_messages for insert with check (exists(select 1 from public.support_tickets t where t.id=ticket_id and t.user_id=auth.uid()));
create policy "messages admin read" on public.support_messages for select using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','vendor')));
create policy "messages admin insert" on public.support_messages for insert with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','vendor')));
