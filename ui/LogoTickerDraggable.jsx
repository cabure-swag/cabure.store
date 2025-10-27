// ui/LogoTickerDraggable.jsx
// Banda 100% continua, intercalado, arrastre con mouse/touch + inercia al soltar.
// Cada logo linkea a /marcas/[slug].

import { useEffect, useRef } from 'react';

export default function LogoTickerDraggable({ brands = [], speed = 20 }) {
  // Intercalado simple (A,B,C,A,B,C...)
  const ordered = [...brands];
  // Triplicamos para que sea realmente continuo
  const items = [...ordered, ...ordered, ...ordered];

  const wrapRef = useRef(null);
  const trackRef = useRef(null);
  const state = useRef({
    x: 0,
    vx: -0.4,          // velocidad base (px/frame). Negativa = hacia la izquierda
    dragging: false,
    lastX: 0,
    raf: 0,
  });

  useEffect(() => {
    const wrap = wrapRef.current;
    const track = trackRef.current;
    if (!wrap || !track) return;

    const SLOT_W = 112; // ~64px logo + márgenes
    const totalW = items.length * SLOT_W;

    let lastTs = performance.now();

    const tick = (ts) => {
      const dt = Math.max(1, ts - lastTs); // ms
      lastTs = ts;

      const st = state.current;
      if (!st.dragging) {
        // inercia + velocidad base
        st.x += st.vx * (dt / 16.7);         // normalizar a ~60fps
        st.vx *= 0.995;                       // leve fricción
        if (Math.abs(st.vx) < 0.02) st.vx = -speed * 0.02; // vuelve a velocidad base lenta
      }

      // wrap infinito
      if (st.x <= -totalW) st.x += totalW;
      if (st.x >= 0) st.x -= totalW;

      track.style.transform = `translate3d(${st.x}px,0,0)`;
      st.raf = requestAnimationFrame(tick);
    };

    state.current.raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(state.current.raf);
  }, [items, speed]);

  // Drag
  useEffect(() => {
    const wrap = wrapRef.current;
    const st = state.current;
    if (!wrap) return;

    const onDown = (e) => {
      st.dragging = true;
      st.startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      st.lastX = st.startX;
      st.vx = 0;
    };
    const onMove = (e) => {
      if (!st.dragging) return;
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const dx = x - st.lastX;
      st.x += dx;
      st.vx = dx; // velocidad instantánea para inercia
      st.lastX = x;
    };
    const onUp = () => { st.dragging = false; };

    wrap.addEventListener('mousedown', onDown);
    wrap.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    wrap.addEventListener('touchstart', onDown, { passive: true });
    wrap.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onUp);

    return () => {
      wrap.removeEventListener('mousedown', onDown);
      wrap.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      wrap.removeEventListener('touchstart', onDown);
      wrap.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, []);

  return (
    <div ref={wrapRef} className="tickerX">
      <div ref={trackRef} className="trackX">
        {items.map((b, i) => (
          <a
            key={i}
            className="slotX"
            href={b?.slug ? `/marcas/${b.slug}` : '#'}
            onClick={(e) => { if (!b?.slug) e.preventDefault(); }}
            title={b?.slug || ''}
            style={{ pointerEvents: b?.slug ? 'auto' : 'none' }}
          >
            {b?.logo_url ? <img src={b.logo_url} alt={b.slug} /> : null}
          </a>
        ))}
      </div>

      <style jsx>{`
        .tickerX{ overflow:hidden; border-bottom:1px solid var(--line); background:#0c0e14; cursor:grab; }
        .trackX{ display:flex; will-change:transform; }
        .slotX{
          display:inline-flex; align-items:center; justify-content:center;
          width:64px; height:64px; border-radius:999px; background:#10121a;
          border:1px solid var(--line); margin:14px 24px; flex:0 0 auto;
        }
        .slotX img{
          width:64px; height:64px; object-fit:cover; border-radius:999px; border:1px solid var(--line);
        }
        .tickerX:active { cursor:grabbing; }
      `}</style>
    </div>
  );
}
