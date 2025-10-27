// pages/index.js
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import LogoTicker from '../ui/LogoTicker';
import { InstagramIcon } from '../ui/Icons';

export default function Home() {
  const [brands, setBrands] = useState([]);

  useEffect(() => {
    supabase
      .from('brands')
      .select('slug,name,logo_url,cover_url,description,instagram')
      .order('name')
      .then(({ data }) => setBrands(data || []));
  }, []);

  return (
    <main>
      <LogoTicker brands={(brands || []).map(b => ({ slug: b.slug, logo_url: b.logo_url }))} speed={40} />

      <div className="container">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20 }}>
          {(brands || []).map(b => {
            const cover = b.cover_url || b.logo_url || '/logo.png';
            return (
              <a key={b.slug} className="card" href={`/marcas/${b.slug}`} style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ position: 'relative', height: 200, background: '#0e0f16' }}>
                  <img src={cover} alt={b.name} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(.9)' }} />
                  <div style={{ position: 'absolute', bottom: -28, left: 16 }}>
                    <img
                      src={b.logo_url || '/logo.png'}
                      alt={b.name}
                      style={{ width: 72, height: 72, borderRadius: 36, objectFit: 'cover', border: '2px solid var(--line)', background: '#0d0f16' }}
                    />
                  </div>
                  {b.instagram && (
                    <a
                      href={b.instagram} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                      style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,.5)', padding: '8px 10px', borderRadius: 12 }}
                      title="Instagram"
                    >
                      <InstagramIcon style={{ fontSize: 18, color: '#fff' }} />
                    </a>
                  )}
                </div>
                <div style={{ padding: 16, paddingTop: 40 }}>
                  <div className="row">
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 20 }}>{b.name}</div>
                      <div className="small" style={{ marginTop: 6, maxHeight: 48, overflow: 'hidden' }}>{b.description}</div>
                    </div>
                    <div className="badge">Ver</div>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </main>
  );
}
