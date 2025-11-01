CABUREE — Panels (Admin + Vendedor) — FIX
=========================================

Este ZIP reemplaza los archivos anteriores **sin** incluir Topbar ni layout propio,
para evitar el problema de "página dentro de la página". Los componentes aquí
renderizan **solo el contenido**, asumiendo que tu layout global se ocupa del resto.

Qué incluye
-----------
- `pages/admin/index.js` → Dashboard Admin (placeholder con KPIs listos para conectar).
- `pages/admin/marcas.js` → CRUD marcas (logo + portadas múltiples + Instagram + descripción) + asignación de vendedores + campos MP por marca.
- `pages/admin/usuarios.js` → listado de usuarios con cambio de rol (user/vendor/admin).
- `pages/admin/pedidos.js`, `pages/admin/metricas.js`, `pages/admin/soporte.js` → placeholders sin layout extra.
- `pages/vendedor/index.js` → Dashboard vendedor (placeholder).
- `pages/vendedor/perfil.js` → edición de marca asignada (logo, portadas múltiples, IG, descripción, envíos).
- `pages/vendedor/catalogo.js` → selector de marca + listado de productos (base para tu CRUD existente).
- `supabase/rls_and_storage_fix.sql` → Políticas RLS/Storage mínimas para que los botones funcionen.

Requisitos
----------
- Debe existir `lib/supabaseClient.js` (tu cliente actual).
- Debe existir el bucket de Storage `media` en Supabase.
- Ejecutá el SQL `supabase/rls_and_storage_fix.sql` una sola vez.

Pasos
-----
1) Subí/mergeá estos archivos en tu repo y hacé deploy en Vercel.
2) En Supabase → SQL Editor → pegá y corré `supabase/rls_and_storage_fix.sql`.
3) Probá:
   - /admin/marcas → Crear marca, subir logo y portadas, cambiar MP por marca y asignar vendedores.
   - /vendedor/perfil → Elegir marca asignada y editar portadas/envíos/IG.
   - /vendedor/catalogo → Ver productos de la marca seleccionada (usa tu data).

Notas
-----
- No se incluyen Topbar/Sidebar para evitar duplicaciones. Tu layout global debe envolver estas páginas.
- Si no ves marcas para el vendedor, asegurate de asignarlo en /admin/marcas (tabla brands_vendors).
- Si un botón "no hace nada", revisá la consola y la RLS (ejecutá el SQL de este ZIP).
