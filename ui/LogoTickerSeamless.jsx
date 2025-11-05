import { useEffect, useRef, useMemo } from 'react';

/**
 * Banda de logos infinita con arrastre táctil.
 * Cambio mínimo: si no hay brand.logo_url, usamos brand.avatar_url. No se tocan estilos.
 */
export default function LogoTickerSeamless({ brands = [] }) {
  const items = useMemo(() => (Array.isArray(brands) ? brands : []), [brands]);
  const wrapRef = useRef(null);
  const t1Ref = useRef(null);
  const t2Ref = useRef(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let x = 0, startX = 0, dragging = false;
    let raf;
    function sync(){
      if (!t1Ref.current || !t2Ref.current) return;
      const width = t1Ref.current.scrollWidth;
      const mod = ((x % width) + width) % width;
      t1Ref.current.style.transform = `translate3d(${-mod}px,0,0)`;
      t2Ref.current.style.transform = `translate3d(${width - mod}px,0,0)`;
    }
    function step(){ x -= 0.2; sync(); raf = requestAnimationFrame(step); }
    raf = requestAnimationFrame(step);

    function down(e){ dragging = true; startX = e.touches ? e.touches[0].clientX : e.clientX; }
    function move(e){ if (!dragging) return; const cx = e.touches ? e.touches[0].clientX : e.clientX; x += (cx - startX); startX = cx; }
    function up(){ dragging = false; }

    el.addEventListener('mousedown', down);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    el.addEventListener('touchstart', down, { passive: true });
    el.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('touchend', up);

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('mousedown', down);
      window.removeEventListener('mousemove', move);
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
              ? <img className="cab-img" src={b.logo_url || b.avatar_url} alt={b?.slug || 'marca'} />
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
              ? <img className="cab-img" src={b.logo_url || b.avatar_url} alt={b?.slug || 'marca'} />
              : <div className="cab-empty" />}
          </a>
        ))}
      </div>

      <style jsx global>{`
        .cab-wrap { position: relative; height: 88px; overflow: hidden; }
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
