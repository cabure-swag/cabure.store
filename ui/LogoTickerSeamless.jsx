// ui/LogoTickerSeamless.jsx
// Banda de logos con diseño original (.cab-*) y animación seamless.
// Cambios:
//  - Más separación entre logos (margen).
//  - Soporta rutas de Storage en avatar_url (convierte a URL pública).
//  - Fallback: logo_url || avatar_url || '/logo.png'.
//  - Cada logo con slug linkea a /marcas/[slug].

import Link from 'next/link';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/,'') || '';

export default function LogoTickerSeamless({ brands = [], pxPerSec = 36 }) {
  const base = (Array.isArray(brands) && brands.length) ? brands : new Array(8).fill({ slug: null, logo_url: null });

  const wrapRef = useRef(null);
  const t1Ref = useRef(null);
  const t2Ref = useRef(null);

  const S = useRef({ x: 0, w: 1, raf: 0, lastTs: 0 });
  const [wrapW, setWrapW] = useState(0);

  const items = useMemo(() => {
    // Ajustamos la estimación de ancho de slot: 56 de logo + ~76 de márgenes (más aire)
    const slotW = 56 + 76;
    const minLen = Math.max(12, Math.ceil((wrapW * 2) / slotW));
    const out = [];
    for (let i = 0; i < minLen; i++) out.push(base[i % base.length]);
    return out;
  }, [base, wrapW]);

  const measure = () => {
    const wr = wrapRef.current;
    setWrapW(wr ? wr.clientWidth : 0);
  };

  useLayoutEffect(() => { measure(); }, []);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const fn = () => measure();
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  const positionTracks = () => {
    const t1 = t1Ref.current, t2 = t2Ref.current;
    if (!t1 || !t2) return;
    const W = S.current.w || t1.scrollWidth || 1;
    t1.style.transform = `translate3d(${S.current.x}px,0,0)`;
    t2.style.transform = `translate3d(${S.current.x + W}px,0,0)`;
  };

  useEffect(() => {
    const t1 = t1Ref.current;
    if (!t1) return;

    const step = (ts) => {
      if (!S.current.lastTs) S.current.lastTs = ts;
      const dt = (ts - S.current.lastTs) / 1000;
      S.current.lastTs = ts;

      S.current.x += -pxPerSec * dt;
      const W = (S.current.w = t1.scrollWidth || 1);
      if (S.current.x <= -W) S.current.x += W;

      positionTracks();
      S.current.raf = requestAnimationFrame(step);
    };

    S.current.raf = requestAnimationFrame(step);
    return () => {
      if (S.current.raf) cancelAnimationFrame(S.current.raf);
      S.current.raf = 0;
      S.current.lastTs = 0;
    };
  }, [pxPerSec, items.length]);

  // Si viene una ruta (sin http), construimos la URL pública del Storage
  const toPublicUrl = (pathOrUrl) => {
    if (!pathOrUrl) return null;
    if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
    if (!SUPA_URL) return pathOrUrl; // fallback: lo dejamos como vino
    const clean = String(pathOrUrl).replace(/^\/+/, '');
    return `${SUPA_URL}/storage/v1/object/public/${clean}`;
  };

  // Normalizar el src del logo SIN cambiar estilos externos
  const srcFor = (b) => {
    const raw = (b?.logo_url && b.logo_url.trim()) ? b.logo_url : b?.avatar_url;
    return toPublicUrl(raw) || '/logo.png';
  };

  const Slot = ({ b, i, track }) => {
    const key = `${track}-${b?.slug ?? i}`;
    const hasImg = !!(b && (b.logo_url || b.avatar_url));

    const content = hasImg
      ? <img src={srcFor(b)} alt={b?.name || 'logo'} className="cab-img" loading="lazy" decoding="async" draggable="false" />
      : <div className="cab-empty" />;

    if (b?.slug) {
      return (
        <Link key={key} href={`/marcas/${b.slug}`} className="cab-slot" aria-label={b?.name || b.slug}>
          {content}
        </Link>
      );
    }
    return (
      <div key={key} className="cab-slot" aria-hidden="true">
        {content}
      </div>
    );
  };

  return (
    <div ref={wrapRef} className="cab-wrap" aria-label="Banda de logos">
      <div ref={t1Ref} className="cab-track">
        {items.map((b, i) => <Slot b={b} i={i} track="t1" />)}
      </div>

      <div ref={t2Ref} className="cab-track">
        {items.map((b, i) => <Slot b={b} i={i} track="t2" />)}
      </div>

      {/* Estilos locales del ticker: mantiene estética pero con más separación */}
      <style jsx>{`
        .cab-wrap {
          position: relative;
          width: 100%;
          height: 88px;
          overflow: hidden;
          border-bottom: 1px solid var(--line);
          user-select: none;
        }
        .cab-track {
          position: absolute;
          top: 0;
          left: 0;
          display: inline-flex;
          height: 88px;
          align-items: center;
          will-change: transform;
        }
        .cab-slot {
          flex: 0 0 auto;
          width: 56px;
          height: 56px;
          margin: 12px 38px;      /* <- más aire (antes ~26px) */
          border-radius: 999px;
          border: 1px solid var(--line);
          background: #10121a;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          overflow: hidden;        /* círculo perfecto, recorte seguro */
        }
        .cab-img {
          display: block;
          width: 56px !important;
          height: 56px !important;
          max-width: none !important;
          max-height: none !important;
          object-fit: cover;
          border-radius: 999px;
          border: 0;
          pointer-events: none;
          -webkit-user-drag: none;
        }
        .cab-empty {
          width: 56px;
          height: 56px;
          border-radius: 999px;
          border: 1px dashed #222436;
          background: #0f1118;
        }
      `}</style>
    </div>
  );
}
