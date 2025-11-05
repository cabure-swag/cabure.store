// ui/LogoTickerSeamless.jsx
// Banda de logos con diseño original (clases .cab-*) y animación seamless.
// Lee logo_url y, si no hay, avatar_url (uploads del panel Vendedor).
// Cada logo navega a /marcas/[slug] manteniendo el mismo look.

import Link from 'next/link';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

export default function LogoTickerSeamless({ brands = [], pxPerSec = 36 }) {
  // Base: si no hay marcas, placeholders para no romper el layout
  const base = (Array.isArray(brands) && brands.length) ? brands : new Array(8).fill({ slug: null, logo_url: null });

  const wrapRef = useRef(null);
  const t1Ref = useRef(null);
  const t2Ref = useRef(null);

  // Estado interno de la animación
  const S = useRef({ x: 0, w: 1, raf: 0, lastTs: 0 });
  const [wrapW, setWrapW] = useState(0);

  // Repetimos lo suficiente para cubrir ~2x el ancho del wrapper
  const items = useMemo(() => {
    const slotW = 56 + 52; // 56 de logo + ~52 de márgenes
    const minLen = Math.max(12, Math.ceil((wrapW * 2) / slotW));
    const out = [];
    for (let i = 0; i < minLen; i++) out.push(base[i % base.length]);
    return out;
  }, [base, wrapW]);

  // Medición del wrapper
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

  // Posicionar pistas
  const positionTracks = () => {
    const t1 = t1Ref.current, t2 = t2Ref.current;
    if (!t1 || !t2) return;
    const W = S.current.w || t1.scrollWidth || 1;
    t1.style.transform = `translate3d(${S.current.x}px,0,0)`;
    t2.style.transform = `translate3d(${S.current.x + W}px,0,0)`;
  };

  // Animación por RAF
  useEffect(() => {
    const t1 = t1Ref.current;
    if (!t1) return;

    const step = (ts) => {
      if (!S.current.lastTs) S.current.lastTs = ts;
      const dt = (ts - S.current.lastTs) / 1000; // seg
      S.current.lastTs = ts;

      // distancia = velocidad * dt (px/s)
      const dx = -pxPerSec * dt;
      S.current.x += dx;

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

  // Normalizar el src del logo SIN cambiar estilos externos
  const srcFor = (b) => (b && (b.logo_url || b.avatar_url)) ? (b.logo_url || b.avatar_url) : '/logo.png';

  // Un slot: si hay slug, lo hacemos link manteniendo la clase .cab-slot
  const Slot = ({ b, i, track }) => {
    const key = `${track}-${b?.slug ?? i}`;
    const content = (b && (b.logo_url || b.avatar_url))
      ? <img src={srcFor(b)} alt={b?.name || 'logo'} className="cab-img" />
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

      {/* Estilos locales del ticker. Mantienen la estética original (.cab-*) */}
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
          margin: 12px 26px;
          border-radius: 999px;
          border: 1px solid var(--line);
          background: #10121a;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none; /* mantiene el look al ser <a> */
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
