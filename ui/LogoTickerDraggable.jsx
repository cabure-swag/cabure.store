// ui/LogoTickerDraggable.jsx
import { useEffect, useLayoutEffect, useRef } from 'react';

export default function LogoTickerDraggable({ brands = [], speed = 18 }) {
  // duplicamos varias veces para continuidad
  const items = [...brands, ...brands, ...brands, ...brands];

  const wrapRef = useRef(null);
  const trackRef = useRef(null);
  const st = useRef({ x: 0, vx: -0.6, dragging: false, lastX: 0, trackW: 0, raf: 0 });

  // medir ancho real del track
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const track = trackRef.current;
    if (!wrap || !track) return;
    // Forzamos layout y medimos
    st.current.trackW = track.scrollWidth;
    // arrancar en el medio para que no “se corra”
    st.current.x = -Math.floor(st.current.trackW / 2);
    track.style.transform = `translate3d(${st.current.x}px,0,0)`;
  }, [brands.length]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let lastTs = performance.now();

    const tick = (ts) => {
      const dt = Math.max(1, ts - lastTs);
      lastTs = ts;
      const S = st.current;

      if (!S.dragging) {
        S.x += S.vx * (dt / 16.7);
        S.vx *= 0.995;
        if (Math.abs(S.vx) < 0.02) S.vx = -speed * 0.02;
      }

      const W = S.trackW || track.scrollWidth || 1;
      // loop continuo
      if (S.x <= -W) S.x += W;
      if (S.x >= 0) S.x -= W;

      track.style.transform = `translate3d(${S.x}px,0,0)`;
      S.raf = requestAnimationFrame(tick);
    };

    st.current.raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(st.current.raf);
  }, [speed]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const S = st.current;
    if (!wrap) return;

    const onDown = (e) => {
      S.dragging = true;
      S.lastX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      S.vx = 0;
    };
    const onMove = (e) => {
      if (!S.dragging) return;
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const dx = x - S.lastX;
      S.x += dx;
      S.vx = dx;
      S.lastX = x;
    };
    const onUp = () => { S.dragging = false; };

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
            {b?.logo_url ? <img src={b.logo_url} alt={b.slug} /> : <div className="empty" />}
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
          width:72px; height:72px; border-radius:999px; background:#10121a;
          border:1px solid var(--line); margin:14px 28px; flex:0 0 auto;
        }
        .slotX img{
          width:72px; height:72px; object-fit:cover; border-radius:999px; border:1px solid var(--line)
        }
        .slotX .empty{ width:72px; height:72px; border-radius:999px; background:#0f1118; border:1px dashed #222436; }
        .tickerX:active { cursor:grabbing; }
      `}</style>
    </div>
  );
}
