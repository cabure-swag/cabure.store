
# CABUREE — Fixed build
- Navbar: **CABURE.STORE** (link a `/marcas`), sin duplicados.
- Home: **banda de logos** y luego grilla de marcas (sin título extra).
- Admin: creación de marcas con **subida de logo (archivo)**, secretos MP/transfer, **analytics inline** (30 días).
- Vendedor: **selector de marca**; admin ve todas; KPIs y lista de pedidos.
- Marca: productos, carrito por marca y **subida de imagen**.
- Checkout: envíos por marca (off si no seteado), recargo MP (10% global si la marca no define).
- Soporte: tickets + mensajes.
- Salud: `/api/debug/health`.

## Variables en Vercel
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Supabase
1. Ejecutá `supabase/schema.sql` (incluye anti-recursión usando `admin_emails`).
2. Storage → bucket **`media`** público.
3. Logueate y agregá admin:
```sql
insert into public.admin_emails(email) values ('cabureswag@gmail.com')
on conflict (email) do nothing;

update public.profiles set role='admin' where email='cabureswag@gmail.com';
```

