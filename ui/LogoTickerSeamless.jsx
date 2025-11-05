// ui/LogoTickerSeamless.jsx
// Mismo diseño que tu ZIP: clases y estructura intactas.
// Solo ajusta el src del <img> a logo_url || avatar_url, y hace cada logo clickeable a /marcas/[slug].

import Link from 'next/link';
import React, { useMemo } from 'react';

export default function LogoTickerSeamless({ brands = [], pxPerSec = 40 }) {
  // Normalizamos sin tocar el look (lo gobierna tu CSS externo)
  const items = useMemo(() => {
    if (!Array.isArray(brands)) return [];
    return brands.map((b, i) => ({
      key: b?.slug || `brand-${i}`,
      slug: b?.slug || null,
      name: b?.name || 'logo',
      // CLAVE: priorizar logo_url (legacy) y, si no existe, caer a avatar_url (nuevo)
      logo: (b?.logo_url && b.logo_url.trim()) ? b.logo_url : (b?.avatar_url || '/logo.png'),
    }));
  }, [brands]);

  // Estructura/clases igual que en el ZIP; tu CSS maneja animación y estilo.
  return (
    <div className="logo-ticker-wrapper" data-speed={pxPerSec}>
      <div className="logo-ticker-track">
        {items.map((it) =>
          it.slug ? (
            <Link
              key={it.key}
              href={`/marcas/${it.slug}`}
              className="logo-ticker-item"
              aria-label={it.name}
            >
              <img src={it.logo} alt={it.name} className="logo-ticker-img" />
            </Link>
          ) : (
            <div key={it.key} className="logo-ticker-item" aria-hidden="true">
              <img src={it.logo} alt={it.name} className="logo-ticker-img" />
            </div>
          )
        )}

        {/* Duplicado para scroll seamless si tu CSS lo usa */}
        {items.map((it) =>
          it.slug ? (
            <Link
              key={`${it.key}-dup`}
              href={`/marcas/${it.slug}`}
              className="logo-ticker-item"
              aria-label={it.name}
            >
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
