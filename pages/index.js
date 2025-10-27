import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import LogoTickerDraggable from '../ui/LogoTickerDraggable';
import { InstagramIcon } from '../ui/Icons';

export default function Home() {
  const [brands, setBrands] = useState([]);

  useEffect(() => {
    supabase.from('brands')
      .select('slug,name,logo_url,cover_url,description,instagram')
      .order('name')
      .then(({ data }) => setBrands(data || []));
  }, []);

  return (
    <main>
      <LogoTickerDraggable
        brands={(brands || []).map(b => ({ slug: b.slug, logo_url: b.logo_url }))}
        speed={18}
      />
      <div className="container">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 22 }}>
          {(brands || []).map(b => {
            const cover = b.cover_url || b.logo_url || '/logo.png';
            return (
              <a key={b.slug} className="card" href={`/marcas/${b.slug}`} style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ position: 'relative', height: 220, background: '#0e0f16' }}>
                  <img src={cover} alt={b.name} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(.9)' }} />
                  <div style={{ position: 'absolute', bottom: -32, left: 16 }}>
                    <img
                      src={b.logo_url || '/logo.png'} alt={b.name}
                      style={{ width: 76, height: 76, borderRadius: 38, objectFit: 'cover', border: '2px solid var(--line)' }}
                    />
                  </div>
                </div>

                <div style={{ padding: 16, paddingTop: 44 }}>
                  <div className="row">
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 20 }}>{b.name}</div>
                      <div className="small" style={{ marginTop: 6, maxHeight: 48, overflow: 'hidden' }}>{b.description}</div>
                    </div>
                    <div className="badge">Ver</div>
                  </div>

                  {b.instagram && (
                    <div style={{ display:'flex', justifyContent:'flex-end', marginTop:10 }}>
                      <a
                        href={b.instagram} target="_blank" rel="noreferrer"
                        onClick={(e)=>e.stopPropagation()}
                        className="btn-ghost ig-anim" title="Instagram"
                        style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'8px 10px' }}
                      >
                        <InstagramIcon style={{ fontSize: 18 }} />
                        <span className="small">Instagram</span>
                      </a>
                    </div>
                  )}
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </main>
  );
}
