// ui/LogoTickerSeamless.jsx
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export default function LogoTickerSeamless({ brands = [], speed = 22 }) {
  const base = brands.length ? brands : new Array(8).fill({ slug: null, logo_url: null });
  const wrapRef = useRef(null);
  const track1 = useRef(null);
  const track2 = useRef(null);
  const S = useRef({ x: 0, vx: -0.6, drag: false, lastX: 0, w: 0, raf: 0 });

  // Construir HTML de una tira
  const renderTrack = (ref) => (
    <div ref={ref} className="track">
      {base.map((b, i) => (
        <a key={i} className="slot"
           href={b?.slug ? `/marcas/${b.slug}` : '#'}
           onClick={(e) => { if (!b?.slug) e.preventDefault(); }}>
          {b?.logo_url ? <img src={b.logo_url} alt={b.slug}/> : <div className="empty" />}
        </a>
      ))}
    </div>
  );

  const measure = () => {
    const t1 = track1.current;
    if (!t1) return;
    S.current.w = t1.scrollWidth;
    // alineamos: track1 en x, track2 a continuación
    t1.style.transform = `translate3d(${S.current.x}px,0,0)`;
    track2.current.style.transform = `translate3d(${S.current.x + S.current.w}px,0,0)`;
  };

  useLayoutEffect(() => { measure(); }, [brands.length]);

  useEffect(() => {
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const step = () => {
      const t1 = track1.current, t2 = track2.current;
      if (!t1 || !t2) return;
      if (!S.current.drag) {
        S.current.x += S.current.vx;
        S.current.vx *= 0.995;
        if (Math.abs(S.current.vx) < 0.02) S.current.vx = -speed * 0.02;
      }
      const W = S.current.w || t1.scrollWidth || 1;

      // Cuando la primera tira sale completamente a la izquierda, rotamos
      if (S.current.x <= -W) S.current.x += W;
      if (S.current.x > 0) S.current.x -= W;

      t1.style.transform = `translate3d(${S.current.x}px,0,0)`;
      t2.style.transform = `translate3d(${S.current.x + W}px,0,0)`;
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
    el.addEventListener('touchmove', move, { passive: true });
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
    <div ref={wrapRef} className="wrap">
      {renderTrack(track1)}
      {renderTrack(track2)}

      <style jsx>{`
        .wrap{ overflow:hidden; border-bottom:1px solid var(--line); background:#0c0e14; cursor:grab; user-select:none; position:relative }
        .track{ position:absolute; top:0; left:0; display:flex; height:100px; align-items:center }
        .slot{
          display:inline-flex; align-items:center; justify-content:center;
          width:78px; height:78px; border-radius:999px; background:#10121a;
          border:1px solid var(--line); margin:14px 32px; flex:0 0 auto;
        }
        .slot img{ width:78px; height:78px; object-fit:cover; border-radius:999px; border:1px solid var(--line) }
        .empty{ width:78px; height:78px; border-radius:999px; background:#0f1118; border:1px dashed #222436; }
        .wrap:active { cursor:grabbing; }
      `}</style>
    </div>
  );
}
