// ui/LogoTickerSeamless.jsx
import { useEffect, useLayoutEffect, useRef } from 'react';

/**
 * Banda de logos continua, tamaño fijo (56px), sin cortes, centrada.
 * - Dos tracks encadenados (tira infinita).
 * - Arranca centrada (desplaza media tira).
 * - Drag + inercia + recalcula en resize.
 */
export default function LogoTickerSeamless({ brands = [], speed = 18 }) {
  const base = (brands && brands.length) ? brands : new Array(8).fill({ slug:null, logo_url:null });

  const wrapRef = useRef(null);
  const t1Ref  = useRef(null);
  const t2Ref  = useRef(null);
  const S = useRef({ x: 0, vx: -0.6, drag: false, lastX: 0, w: 0, raf: 0, measured:false });

  const Track = ({ innerRef }) => (
    <div ref={innerRef} className="cab-track">
      {base.map((b, i) => (
        <a
          key={i}
          className="cab-slot"
          href={b?.slug ? `/marcas/${b.slug}` : '#'}
          onClick={(e) => { if (!b?.slug) e.preventDefault(); }}
          title={b?.slug || 'marca'}
        >
          {b?.logo_url
            ? <img className="cab-img" src={b.logo_url} alt={b.slug || 'marca'} />
            : <div className="cab-empty" />}
        </a>
      ))}
    </div>
  );

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
    if (!t1) return;
    const W = t1.scrollWidth;
    S.current.w = W > 0 ? W : 1;

    // Arrancamos “centrados”: desplazamos media tira a la izquierda
    if (!S.current.measured) {
      S.current.x = -Math.floor(S.current.w / 2);
      S.current.measured = true;
    }
    positionTracks();
  };

  useLayoutEffect(() => { S.current.measured = false; measure(); }, [brands?.length]);
  useEffect(() => {
    const onResize = () => { S.current.measured = false; measure(); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

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

  useEffect(() => {
    const el = wrapRef.current;
    const state = S.current;
    if (!el) return;

    const down = (e) => { state.drag = true; state.lastX = 'touches' in e ? e.touches[0].clientX : e.clientX; state.vx = 0; };
    const move = (e) => {
      if (!state.drag) return;
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const dx = x - state.lastX;
      state.x += dx; state.vx = dx; state.lastX = x;
    };
    const up = () => { state.drag = false; };

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
      <Track innerRef={t1Ref} />
      <Track innerRef={t2Ref} />

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
