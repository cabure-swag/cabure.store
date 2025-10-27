// ui/LogoTickerSeamless.jsx
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

/**
 * Banda de logos continua, centrada y sin cortes:
 * - Duplica logos hasta cubrir >= 2x el ancho del contenedor (para que nunca “se acabe”).
 * - Centrado inicial real: -(W/2) + wrapWidth/2
 * - Drag + inercia, 2 tracks encadenados.
 */
export default function LogoTickerSeamless({ brands = [], speed = 18 }) {
  const baseRaw = (brands && brands.length) ? brands : new Array(8).fill({ slug:null, logo_url:null });

  const wrapRef = useRef(null);
  const t1Ref  = useRef(null);
  const t2Ref  = useRef(null);

  // Estado interno (posiciones / medidas)
  const S = useRef({ x: 0, vx: -0.6, drag: false, lastX: 0, w: 1, raf: 0 });
  const [wrapW, setWrapW] = useState(0);

  // Repetimos logos para que una tira sea bien larga (≥ 2x contenedor)
  const items = useMemo(() => {
    // Si aún no sabemos el ancho del contenedor, devolvemos al menos 24 ítems para evitar que quede corto
    const minLen = 24;
    const base = baseRaw.length ? baseRaw : new Array(8).fill({ slug:null, logo_url:null });
    const out = [];
    const need = Math.max(minLen, Math.ceil((wrapW || 800) / 56) * 8); // aprox: cada slot ~ 56+(margen) → usamos factor 8 para estar holgados
    for (let i = 0; i < need; i++) out.push(base[i % base.length]);
    return out;
  }, [baseRaw, wrapW]);

  // Centrado + medición
  const positionTracks = () => {
    const t1 = t1Ref.current;
    const t2 = t2Ref.current;
    if (!t1 || !t2) return;
    const W = S.current.w || t1.scrollWidth || 1;
    t1.style.transform = `translate3d(${S.current.x}px,0,0)`;
    t2.style.transform = `translate3d(${S.current.x + W}px,0,0)`;
  };

  const measure = () => {
    const t1 = t1Ref.current;
    const wrap = wrapRef.current;
    if (!t1 || !wrap) return;

    const wrapWidth = wrap.clientWidth || 0;
    setWrapW(wrapWidth);

    // ancho real de una tira
    const W = t1.scrollWidth;
    S.current.w = Math.max(1, W);

    // centrado real: mover para que el centro de la tira coincida con el centro del contenedor
    const targetX = -Math.floor(S.current.w / 2) + Math.floor(wrapWidth / 2);
    S.current.x = targetX;

    positionTracks();
  };

  useLayoutEffect(() => { measure(); }, [items.length]);

  useEffect(() => {
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Animación (seamless + inercia)
  useEffect(() => {
    const step = () => {
      const t1 = t1Ref.current, t2 = t2Ref.current;
      if (!t1 || !t2) return;

      if (!S.current.drag) {
        S.current.x += S.current.vx;
        S.current.vx *= 0.995;
        if (Math.abs(S.current.vx) < 0.02) S.current.vx = -speed * 0.02;
      }

      const W = S.current.w || t1.scrollWidth || 1;
      if (S.current.x <= -W) S.current.x += W;
      if (S.current.x > 0)   S.current.x -= W;

      positionTracks();
      S.current.raf = requestAnimationFrame(step);
    };
    S.current.raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(S.current.raf);
  }, [speed]);

  // Drag + inercia
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const down = (e) => {
      S.current.drag = true;
      S.current.lastX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      S.current.vx = 0;
    };
    const move = (e) => {
      if (!S.current.drag) return;
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const dx = x - S.current.lastX;
      S.current.x += dx;
      S.current.vx = dx;
      S.current.lastX = x;
    };
    const up = () => { S.current.drag = false; };

    el.addEventListener('mousedown', down);
    el.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    el.addEventListener('touchstart', down, { passive: true });
    el.addEventListener('touchmove', move,  { passive: true });
    window.addEventListener('touchend', up);

    return () => {
      el.removeEventListener('mousedown', down);
      el.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      el.removeEventListener('touchstart', down);
      el.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
  }, []);

  return (
    <div ref={wrapRef} className="cab-wrap">
      <div ref={t1Ref} className="cab-track">
        {items.map((b, i) => (
          <a
            key={`t1-${i}`}
            className="cab-slot"
            href={b?.slug ? `/marcas/${b.slug}` : '#'}
            onClick={(e) => { if (!b?.slug) e.preventDefault(); }}
            title={b?.slug || 'marca'}
          >
            {b?.logo_url ? <img className="cab-img" src={b.logo_url} alt={b.slug || 'marca'} /> : <div className="cab-empty" />}
          </a>
        ))}
      </div>
      <div ref={t2Ref} className="cab-track">
        {items.map((b, i) => (
          <a
            key={`t2-${i}`}
            className="cab-slot"
            href={b?.slug ? `/marcas/${b.slug}` : '#'}
            onClick={(e) => { if (!b?.slug) e.preventDefault(); }}
            title={b?.slug || 'marca'}
          >
            {b?.logo_url ? <img className="cab-img" src={b.logo_url} alt={b.slug || 'marca'} /> : <div className="cab-empty" />}
          </a>
        ))}
      </div>

      <style jsx global>{`
        .cab-wrap {
          height: 88px;
          overflow: hidden;
          background: #0c0e14;
          border-bottom: 1px solid var(--line);
          position: relative;
          cursor: grab;
          user-select: none;
        }
        .cab-wrap:active { cursor: grabbing; }

        .cab-track {
          position: absolute;
          top: 0; left: 0;
          display: flex;
          height: 88px;
          align-items: center;
          will-change: transform;
        }

        .cab-slot {
          flex: 0 0 auto;
          width: 56px; height: 56px;
          margin: 12px 26px;
          border-radius: 999px;
          border: 1px solid var(--line);
          background: #10121a;
          display: inline-flex; align-items: center; justify-content: center;
        }

        /* Evitar que estilos globales agranden las imágenes */
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
          width: 56px; height: 56px; border-radius: 999px;
          border: 1px dashed #222436; background: #0f1118;
        }
      `}</style>
    </div>
  );
}
