// ui/LogoTickerSeamless.jsx
// Mismo diseño que tu ZIP: no agregamos estilos ni cambiamos clases.
// Solo ajustamos el src del <img> para que lea logo_url || avatar_url,
// y mantenemos el link a /marcas/[slug].
//
// API esperada: { brands = [], pxPerSec }  (pxPerSec lo dejás si tu CSS lo usa)

import Link from 'next/link';
import React, { useMemo } from 'react';

export default function LogoTickerSeamless({ brands = [], pxPerSec = 40 }) {
  // Normalizamos la data sin tocar estilos ni estructura
  const items = useMemo(() => {
    if (!Array.isArray(brands)) return [];
    return brands.map((b, i) => ({
      key: b?.slug || `brand-${i}`,
      slug: b?.slug || null,
      name: b?.name || 'logo',
      // CLAVE: usar logo_url (legacy) y si no hay, avatar_url (uploads nuevos)
      logo: (b?.logo_url && b.logo_url.trim()) ? b.logo_url : (b?.avatar_url || '/logo.png'),
    }));
  }, [brands]);

  // Estructura y clases sin cambios (tu CSS gobierna la animación y estilos)
  // Duplicamos la lista para scroll "seamless" si tu CSS así lo requiere.
  return (
    <div className="logo-ticker-wrapper" data-speed={pxPerSec}>
      <div className="logo-ticker-track">
        {items.map((it) =>
          it.slug ? (
            <Link key={it.key} href={`/marcas/${it.slug}`} className="logo-ticker-item" aria-label={it.name}>
              <img src={it.logo} alt={it.name} className="logo-ticker-img" />
            </Link>
          ) : (
            <div key={it.key} className="logo-ticker-item" aria-hidden="true">
              <img src={it.logo} alt={it.name} className="logo-ticker-img" />
            </div>
          )
        )}
        {items.map((it, idx) =>
          it.slug ? (
            <Link key={`${it.key}-dup`} href={`/marcas/${it.slug}`} className="logo-ticker-item" aria-label={it.name}>
              <img src={it.logo} alt={it.name} className="logo-ticker-img" />
            </Link>
          ) : (
            <div key={`${it.key}-dup`} className="logo-ticker-item" aria-hidden="true">
              <img src={it.logo} alt={it.name} className="logo-ticker-img" />
            </div>
          )
        )}
      </div>
    </div>
  );
}
