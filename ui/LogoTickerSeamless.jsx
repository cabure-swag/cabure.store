// ui/LogoTickerSeamless.jsx
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

export default function LogoTickerSeamless({ brands = [], pxPerSec = 36 }) {
  // Prioridad de imagen: avatar_url > logo_url > cover_url > /logo.png
  const base =
    brands && brands.length
      ? brands.map((b) => ({
          slug: b.slug ?? null,
          src: b.avatar_url || b.logo_url || b.cover_url || '/logo.png',
        }))
      : new Array(8).fill({ slug: null, src: '/logo.png' });

  const wrapRef = useRef(null);
  const t1Ref = useRef(null);
  const t2Ref = useRef(null);

  const S = useRef({ x: 0, w: 1, raf: 0, lastTs: 0 });
  const [wrapW, setWrapW] = useState(0);

  // repetimos hasta cubrir 2x el ancho
  const items = useMemo(() => {
    const slotW = 56 + 52;
    const wrapWidth = wrapW || 1200;
    const needed = Math.ceil((wrapWidth * 2) / slotW);
    const arr = [];
    for (let i = 0; i < needed; i++) {
      const idx = i % base.length;
      arr.push(base[idx]);
    }
    return arr;
  }, [base, wrapW]);

  const positionTracks = () => {
    const t1 = t1Ref.current;
    const t2 = t2Ref.current;
    if (!t1 || !t2) return;
    const x = S.current.x;
    const w = S.current.w;
    t1.style.transform = `translate3d(${x}px,0,0)`;
    t2.style.transform = `translate3d(${x + w}px,0,0)`;
  };

  const measure = () => {
    const t1 = t1Ref.current;
    const wrap = wrapRef.current;
    if (!t1 || !wrap) return;
    const wrapWidth = wrap.clientWidth || 0;
    setWrapW(wrapWidth);
    const W = t1.scrollWidth;
    S.current.w = Math.max(1, W);
    S.current.x = -Math.floor(W / 2) + Math.floor(wrapWidth / 2);
    positionTracks();
  };

  useLayoutEffect(() => {
    measure();
  }, [items.length]);

  useEffect(() => {
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const step = (ts) => {
      const t1 = t1Ref.current,
        t2 = t2Ref.current;
      if (!t1 || !t2) return;

      if (!S.current.lastTs) S.current.lastTs = ts;
      const dt = (ts - S.current.lastTs) / 1000;
      S.current.lastTs = ts;

      S.current.x -= pxPerSec * dt;

      if (S.current.x <= -S.current.w) {
        S.current.x += S.current.w;
      }

      positionTracks();
      S.current.raf = requestAnimationFrame(step);
    };
    S.current.raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(S.current.raf);
  }, [pxPerSec]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let dragging = false;
    let lastX = 0;

    const down = (e) => {
      dragging = true;
      lastX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    };
    const move = (e) => {
      if (!dragging) return;
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const dx = x - lastX;
      S.current.x += dx;
      lastX = x;
      positionTracks();
    };
    const up = () => {
      dragging = false;
    };

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
    <div ref={wrapRef} style={{ width: '100%', overflow: 'hidden', padding: '12px 0' }}>
      <div ref={t1Ref} style={{ display: 'inline-flex', gap: 26, alignItems: 'center' }}>
        {items.map((b, i) => (
          <img
            key={`t1-${i}-${b.slug || i}`}
            src={b.src}
            alt={b.slug || 'logo'}
            style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: '999px', background: '#0e0f16' }}
          />
        ))}
      </div>
      <div
        ref={t2Ref}
        style={{ display: 'inline-flex', gap: 26, alignItems: 'center', position: 'absolute', top: 0, left: 0 }}
      >
        {items.map((b, i) => (
          <img
            key={`t2-${i}-${b.slug || i}`}
            src={b.src}
            alt={b.slug || 'logo'}
            style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: '999px', background: '#0e0f16' }}
          />
        ))}
      </div>
    </div>
  );
}
