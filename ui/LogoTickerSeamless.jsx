// ui/LogoTickerSeamless.jsx
// Versión “headless”: respeta el diseño anterior (sin estilos inline ni cambios de markup).
// Usa logo_url y, si estuviera vacío, cae a avatar_url (para mostrar logos nuevos).
// API compatible: { brands = [], pxPerSec } (pxPerSec queda disponible si tu CSS lo usa).

import React, { useMemo } from 'react';

export default function LogoTickerSeamless({ brands = [], pxPerSec = 40 }) {
  // Normalizamos la fuente de imagen SIN tocar estilos.
  const items = useMemo(() => {
    if (!Array.isArray(brands)) return [];
    return brands.map(b => ({
      slug: b.slug,
      name: b.name,
      // Mantiene logo_url (diseño anterior). Si falta, cae a avatar_url.
      logo: b?.logo_url || b?.avatar_url || '/logo.png',
    }));
  }, [brands]);

  // Estructura y clases sin cambios: tu CSS controla el look & feel y la animación.
  return (
    <div className="logo-ticker-wrapper">
      <div className="logo-ticker-track" data-speed={pxPerSec}>
        {items.map((it) => (
          <div key={it.slug} className="logo-ticker-item">
            <img src={it.logo} alt={it.name || 'logo'} className="logo-ticker-img" />
          </div>
        ))}
        {/* Duplicado para efecto “seamless” si tu CSS/animación lo requiere */}
        {items.map((it) => (
          <div key={`${it.slug}-dup`} className="logo-ticker-item">
            <img src={it.logo} alt={it.name || 'logo'} className="logo-ticker-img" />
          </div>
        ))}
      </div>
    </div>
  );
}
