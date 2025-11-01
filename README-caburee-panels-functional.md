CABUREE — Panels Funcionales (Admin + Vendedor)
===============================================

Este paquete agrega **paneles funcionales** sin layout/topbar internos. Usa tu layout global.

Incluye
-------
- `components/ImageUploader.jsx` (subida a Storage `media`, público de lectura, autenticado para escribir)
- `components/Toast.jsx` (notif. simple)
- `pages/admin/marcas.js` (**CRUD marcas**: nombre, desc, IG, logo, **portadas múltiples**, **MP por marca**, **asignar vendedores**)
- `pages/admin/usuarios.js` (cambiar rol de perfiles)
- `pages/vendedor/perfil.js` (editar marca asignada: logo, portadas, IG, envíos)
- `pages/vendedor/catalogo.js` (**CRUD productos**: crear/editar/eliminar + hasta 5 imágenes por producto)
- `supabase/rls_and_schema.sql` (**RLS + Storage** + tablas `brands_vendors`, `products`, `product_images`, `product_categories` si faltan)

Requisitos
----------
- `lib/supabaseClient.js` existente.
- Bucket `media` creado en Supabase.
- Ejecutar **una vez**: `supabase/rls_and_schema.sql` en el SQL Editor de Supabase.
- Variables NEXT_PUBLIC_SUPABASE_URL / ANON ya configuradas.

Notas
-----
- Las páginas son *content-only*: no duplican cabeceras ni main.
- Si ya tenés tablas/columnas, el SQL usa `if not exists` para no romper.
- RLS mínima: Admin puede todo; Vendor actualiza sólo sus marcas; Vendor gestiona productos de sus marcas.
