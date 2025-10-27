// ui/LogoTicker.jsx
// Banda continua, más lenta, intercalado inteligente y cada logo lleva a /marcas/[slug]
export default function LogoTicker({ brands = [], speed = 30 }) {
  // brands = [{ slug, logo_url }]
  // Intercalado: si hay 2 → A,B,A,B... / si 3 → A,B,C,A,B,C...
  const order = [];
  for (let i = 0; i < brands.length; i++) order.push(brands[i]);
  // Duplicamos para continuidad
  const loop = [...order, ...order];

  const trackWidth = `${loop.length * 120}px`; // 64px slot + márgenes ~120

  return (
    <div className="ticker" style={{ '--speed': `${speed}s` }}>
      <div
        className="track"
        style={{
          width: `calc(${trackWidth} * 2)`,
          animation: `marquee var(--speed) linear infinite`,
        }}
      >
        {[...loop, ...loop].map((b, i) => (
          <a
            key={i}
            className="slot"
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
        .ticker{display:flex;overflow:hidden;white-space:nowrap;border-bottom:1px solid var(--line);background:#0c0e14}
        .track{display:inline-block;padding:16px 0}
        .slot{
          display:inline-flex;align-items:center;justify-content:center;
          width:64px;height:64px;border-radius:999px;background:#10121a;border:1px solid var(--line);margin:0 24px
        }
        .slot img{
          height:64px;width:64px;border-radius:999px;object-fit:cover;border:1px solid var(--line)
        }
        @keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
      `}</style>
    </div>
  );
}
