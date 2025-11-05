// ui/LogoTickerSeamless.jsx
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

export default function LogoTickerSeamless({ brands = [], pxPerSec = 36 }) {
  const base = (brands && brands.length) ? brands : new Array(8).fill({ slug:null, logo_url:null });

  const wrapRef = useRef(null);
  const t1Ref  = useRef(null);
  const t2Ref  = useRef(null);

  const S = useRef({ x: 0, w: 1, raf: 0, lastTs: 0 });
  const [wrapW, setWrapW] = useState(0);

  // Repetimos lo suficiente para superar 2x el ancho del contenedor
  const items = useMemo(() => {
    const slotW = 56 + 52; // 56 de logo + ~52 de márgenes (26x2)
    const minLen = Math.max(16, Math.ceil(((wrapW||800) * 2) / slotW));
    const out = [];
    for (let i = 0; i < minLen; i++) out.push(base[i % base.length]);
    return out;
  }, [base, wrapW]);

  const positionTracks = () => {
    const t1 = t1Ref.current, t2 = t2Ref.current;
    if (!t1 || !t2) return;
    const W = S.current.w || t1.scrollWidth || 1;
    t1.style.transform = `translate3d(${S.current.x}px,0,0)`;
    t2.style.transform = `translate3d(${S.current.x + W}px,0,0)`;
  };

  const measure = () => {
    const t1 = t1Ref.current, wrap = wrapRef.current;
    if (!t1 || !wrap) return;
    const wrapWidth = wrap.clientWidth || 0;
    setWrapW(wrapWidth);
    const W = t1.scrollWidth;
    S.current.w = Math.max(1, W);
    // Centrado inicial real
    S.current.x = -Math.floor(W/2) + Math.floor(wrapWidth/2);
    positionTracks();
  };

  useLayoutEffect(() => { measure(); }, [items.length]);
  useEffect(() => {
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const step = (ts) => {
      const t1 = t1Ref.current, t2 = t2Ref.current;
      if (!t1 || !t2) return;

      if (!S.current.lastTs) S.current.lastTs = ts;
      const dt = (ts - S.current.lastTs) / 1000; // segundos
      S.current.lastTs = ts;

      // Avance a velocidad constante (px/seg)
      S.current.x -= pxPerSec * dt;

      const W = S.current.w || t1.scrollWidth || 1;
      if (S.current.x <= -W) S.current.x += W;
      if (S.current.x > 0)   S.current.x -= W;

      positionTracks();
      S.current.raf = requestAnimationFrame(step);
    };
    S.current.raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(S.current.raf);
  }, [pxPerSec]);

  // Drag para “empujar” la banda (mantiene continuidad)
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let dragging = false, lastX = 0;

    const down = (e) => { dragging = true; lastX = 'touches' in e ? e.touches[0].clientX : e.clientX; };
    const move = (e) => {
      if (!dragging) return;
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const dx = x - lastX;
      S.current.x += dx; lastX = x; positionTracks();
    };
    const up = () => { dragging = false; };

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
          <a key={`t1-${i}`} className="cab-slot"
             href={b?.slug ? `/marcas/${b.slug}` : '#'}
             onClick={(e) => { if (!b?.slug) e.preventDefault(); }}
             title={b?.slug || 'marca'}>
            {(b?.logo_url || b?.avatar_url)
              ? <img className="cab-img" src={b.logo_url || b.avatar_url} alt={b.slug || 'marca'} />
              : <div className="cab-empty" />}
          </a>
        ))}
      </div>
      <div ref={t2Ref} className="cab-track">
        {items.map((b, i) => (
          <a key={`t2-${i}`} className="cab-slot"
             href={b?.slug ? `/marcas/${b.slug}` : '#'}
             onClick={(e) => { if (!b?.slug) e.preventDefault(); }}
             title={b?.slug || 'marca'}>
            {(b?.logo_url || b?.avatar_url)
              ? <img className="cab-img" src={b.logo_url || b.avatar_url} alt={b.slug || 'marca'} />
              : <div className="cab-empty" />}
          </a>
        ))}
      </div>

      <style jsx global>{`
        .cab-wrap {
          height: 88px; overflow: hidden; background: #0c0e14;
          border-bottom: 1px solid var(--line); position: relative; cursor: grab; user-select: none;
        }
        .cab-wrap:active { cursor: grabbing; }
        .cab-track { position: absolute; top: 0; left: 0; display: flex; height: 88px; align-items: center; will-change: transform; }
        .cab-slot {
          flex: 0 0 auto; width: 56px; height: 56px; margin: 12px 26px; border-radius: 999px;
          border: 1px solid var(--line); background: #10121a; display: inline-flex; align-items: center; justify-content: center;
        }
        .cab-img {
          display: block; width: 56px !important; height: 56px !important;
          max-width: none !important; max-height: none !important; object-fit: cover; border-radius: 999px; border: 0;
        }
        .cab-empty { width: 56px; height: 56px; border-radius: 999px; border: 1px dashed #222436; background: #0f1118; }
      `}</style>
    </div>
  );
}
