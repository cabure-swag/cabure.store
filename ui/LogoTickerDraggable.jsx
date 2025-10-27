// ui/LogoTickerDraggable.jsx
// Banda continua, centrada, con arrastre + inercia. Cada logo linkea a /marcas/[slug].

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export default function LogoTickerDraggable({ brands = [], speed = 18 }) {
  const ordered = [...brands];
  const items = [...ordered, ...ordered, ...ordered]; // triplicamos para loop
  const wrapRef = useRef(null);
  const trackRef = useRef(null);

  const state = useRef({
    x: 0,
    vx: -0.6,          // px/frame base
    dragging: false,
    lastX: 0,
    slotW: 112,
    totalW: 0,
    raf: 0,
  });

  // medir ancho real del slot (para que no “se corra”)
  useLayoutEffect(() => {
    const probe = document.createElement('div');
    probe.style.cssText =
      'position:absolute;visibility:hidden;width:auto;height:64px;margin:14px 24px;border:1px solid transparent;';
    probe.className = 'slotX';
    document.body.appendChild(probe);
    const slotW = Math.max(112, probe.getBoundingClientRect().width || 112);
    document.body.removeChild(probe);
    state.current.slotW = slotW;
    state.current.totalW = slotW * items.length;
    // centrar en el bloque del medio
    state.current.x = -Math.floor(state.current.totalW / 3);
  }, [items.length]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let lastTs = performance.now();

    const tick = (ts) => {
      const dt = Math.max(1, ts - lastTs);
      lastTs = ts;

      const st = state.current;
      if (!st.dragging) {
        st.x += st.vx * (dt / 16.7);
        st.vx *= 0.995;
        if (Math.abs(st.vx) < 0.02) st.vx = -speed * 0.02;
      }

      const W = st.totalW;
      if (st.x <= -W) st.x += W;
      if (st.x >= 0) st.x -= W;

      track.style.transform = `translate3d(${st.x}px,0,0)`;
      st.raf = requestAnimationFrame(tick);
    };

    state.current.raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(state.current.raf);
  }, [speed]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const st = state.current;

    const onDown = (e) => {
      st.dragging = true;
      st.lastX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      st.vx = 0;
    };
    const onMove = (e) => {
      if (!st.dragging) return;
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const dx = x - st.lastX;
      st.x += dx;
      st.vx = dx;
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
        {[...items, ...items].map((b, i) => (
          <a key={i} className="slotX"
             href={b?.slug ? `/marcas/${b.slug}` : '#'}
             onClick={(e) => { if (!b?.slug) e.preventDefault(); }}>
            {b?.logo_url ? <img src={b.logo_url} alt={b.slug} /> : null}
          </a>
        ))}
      </div>

      <style jsx>{`
        .tickerX{
          overflow:hidden; border-bottom:1px solid var(--line);
          background:#0c0e14; cursor:grab; user-select:none;
        }
        .trackX{ display:flex; will-change:transform; }
        .slotX{
          display:inline-flex; align-items:center; justify-content:center;
          width:64px; height:64px; border-radius:999px; background:#10121a;
          border:1px solid var(--line); margin:14px 24px; flex:0 0 auto;
        }
        .slotX img{
          width:64px; height:64px; object-fit:cover; border-radius:999px; border:1px solid var(--line)
        }
        .tickerX:active { cursor:grabbing; }
      `}</style>
    </div>
  );
}
