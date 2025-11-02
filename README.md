
# CABUREE v3 (estructura por secciones)
- Navbar: **CABURE.STORE** -> `/marcas`, Soporte solo en dropdown; Mis Compras en dropdown.
- Home: banda con **círculos placeholder** si no hay logos, luego grilla de marcas (sin título "Marcas").
- Admin: `/admin` → **Marcas / Métricas / Soporte** (secciones).
  - Crear marca: **logo (archivo)**, MP token/public key, alias transferencia (sin URL ni envíos aquí).
  - Editar marca: envíos, %MP.
  - Métricas: selector **type=month**; admin puede **eliminar pedidos**.
  - Soporte: responder tickets.
- Vendedor: `/vendedor` → **Catálogo & Perfil / Métricas / Pedidos & Chats** (selector de marca).
- Marca: catálogo con subida de imagen de productos (archivo).
- Checkout: envíos por marca, %MP (global 10% si vacío).
- Chat por pedido: tabla `order_messages`.
- Health: `/api/debug/health`.

## Variables (Vercel)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Supabase
1. SQL Editor → ejecutar `supabase/schema.sql` completo.
2. Storage → bucket **`media`** público.
3. Hacer admin:
```sql
insert into public.admin_emails(email) values ('cabureswag@gmail.com')
on conflict (email) do nothing;

update public.profiles set role='admin' where email='cabureswag@gmail.com';
```
