// ui/LogoTickerSeamless.jsx
// Mantiene la API del componente. Sólo ajusta la fuente del logo: avatar_url || logo_url.
// Asume props: { brands, pxPerSec } como antes.

import { useEffect, useMemo, useRef } from 'react';

export default function LogoTickerSeamless({ brands = [], pxPerSec = 40 }) {
  const trackRef = useRef(null);

  const items = useMemo(() => {
    return (Array.isArray(brands) ? brands : []).map((b) => ({
      slug: b.slug,
      name: b.name,
      // clave: priorizamos avatar_url si existe, si no logo_url
      logo: b?.avatar_url || b?.logo_url || '/logo.png',
    }));
  }, [brands]);

  useEffect(() => {
    // si ya usabas una animación CSS, no tocamos nada;
    // este efecto es un no-op por compatibilidad.
  }, [items.length, pxPerSec]);

  return (
    <div className="logo-ticker-wrapper" style={{ overflow: 'hidden', width: '100%' }}>
      <div ref={trackRef} className="logo-ticker-track">
        {items.map((it) => (
          <div key={it.slug} className="logo-ticker-item" style={{ display: 'inline-flex', alignItems: 'center', padding: '0 16px' }}>
            <img
              src={it.logo}
              alt={it.name}
              style={{ height: 32, objectFit: 'contain', display: 'block' }}
            />
          </div>
        ))}
        {/* Duplicado para efecto "seamless" si ya lo tenías */}
        {items.map((it) => (
          <div key={`${it.slug}-dup`} className="logo-ticker-item" style={{ display: 'inline-flex', alignItems: 'center', padding: '0 16px' }}>
            <img
              src={it.logo}
              alt={it.name}
              style={{ height: 32, objectFit: 'contain', display: 'block' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
