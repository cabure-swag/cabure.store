// ui/LogoTickerDraggable.jsx
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

export default function LogoTickerDraggable({ brands = [], speed = 18 }) {
  const base = brands.length ? brands : new Array(6).fill({ slug: null, logo_url: null });

  const [repeats, setRepeats] = useState(12);
  const computeRepeats = () => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const perLogo = 72 + 28 * 2; // diámetro + márgenes
    const need = Math.ceil((vw * 4) / (base.length * perLogo)); // 4× ancho viewport
    setRepeats(Math.max(12, need));
  };

  useEffect(() => {
    computeRepeats();
    const onResize = () => computeRepeats();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base.length]);

  const items = useMemo(() => {
    const arr = [];
    for (let i = 0; i < repeats; i++) arr.push(...base);
    return arr;
  }, [base, repeats]);

  const wrapRef = useRef(null);
  const trackRef = useRef(null);
  const st = useRef({ x: 0, vx: -0.6, dragging: false, lastX: 0, trackW: 0, raf: 0 });

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    st.current.trackW = track.scrollWidth;
    st.current.x = -Math.floor(st.current.trackW / 2);
    track.style.transform = `translate3d(${st.current.x}px,0,0)`;
  }, [items.length]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let last = performance.now();

    const frame = (ts) => {
      const dt = Math.max(1, ts - last);
      last = ts;
      const S = st.current;
      if (!S.dragging) {
        S.x += S.vx * (dt / 16.7);
        S.vx *= 0.995;
        if (Math.abs(S.vx) < 0.02) S.vx = -speed * 0.02;
      }
      const W = S.trackW || track.scrollWidth || 1;
      S.x = ((S.x % W) + W) % W - W; // wrap continuo
      track.style.transform = `translate3d(${S.x}px,0,0)`;
      S.raf = requestAnimationFrame(frame);
    };

    st.current.raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(st.current.raf);
  }, [speed]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const S = st.current;
    if (!wrap) return;

    const onDown = (e) => { S.dragging = true; S.lastX = 'touches' in e ? e.touches[0].clientX : e.clientX; S.vx = 0; };
    const onMove = (e) => {
      if (!S.dragging) return;
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const dx = x - S.lastX; S.x += dx; S.vx = dx; S.lastX = x;
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
        {items.map((b, i) => (
          <a key={i} className="slotX"
             href={b?.slug ? `/marcas/${b.slug}` : '#'}
             onClick={(e) => { if (!b?.slug) e.preventDefault(); }}>
            {b?.logo_url ? <img src={b.logo_url} alt={b.slug} /> : <div className="empty" />}
          </a>
        ))}
      </div>

      <style jsx>{`
        .tickerX{ overflow:hidden; border-bottom:1px solid var(--line); background:#0c0e14; cursor:grab; user-select:none; }
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
