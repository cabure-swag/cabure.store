// pages/index.js
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';
import LogoTickerSeamless from '../ui/LogoTickerSeamless';

export default function HomePage() {
  const [brands, setBrands] = useState([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('brands')
        .select('slug,name,description,instagram,logo_url,cover_url,avatar_url,cover_photos')
        .order('name', { ascending: true });
      setBrands(data || []);
    })();
  }, []);

  return (
    <>
      <Head>
        <title>CABURE.STORE</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* Banda de logos */}
      <section>
        <LogoTickerSeamless brands={brands} pxPerSec={40} />
      </section>

      {/* Grid de marcas */}
      <main className="container" style={{ paddingTop: 18 }}>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 18 }}>
          {brands.map((b) => (
            <Link key={b.slug} href={`/marcas/${b.slug}`} className="brandCard" style={{ textDecoration: 'none' }}>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="cover" style={{ position: 'relative', height: 220, background: '#0e0f16' }}>
                  <img
                    src={(Array.isArray(b.cover_photos) && b.cover_photos[0]) || b.cover_url || b.logo_url || '/logo.png'}
                    alt={b.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(.85)' }}
                  />

                  {/* Overlay inferior con logo + nombre + IG */}
                  <div
                    className="overlay"
                    style={{
                      position: 'absolute',
                      left: 12,
                      right: 12,
                      bottom: 12,
                      display: 'flex',
                      gap: 12,
                      alignItems: 'center',
                      background: 'rgba(8,9,14,.45)',
                      borderRadius: 12,
                      padding: 8,
                      border: '1px solid var(--line)',
                      backdropFilter: 'blur(6px)',
                    }}
                  >
                    <img
                      src={b.avatar_url || b.logo_url || '/logo.png'}
                      alt={b.name}
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        objectFit: 'cover',
                        border: '1px solid var(--line)',
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="h2" style={{ margin: 0, fontSize: 18 }}>{b.name}</div>
                      {b.description && (
                        <div
                          className="small"
                          style={{
                            color: 'var(--muted)',
                            marginTop: 2,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={b.description}
                        >
                          {b.description}
                        </div>
                      )}
                    </div>

                    {b.instagram && (
                      <a
                        className="igBtn"
                        onClick={(e) => e.stopPropagation()}
                        href={
                          b.instagram.startsWith('http')
                            ? b.instagram
                            : `https://instagram.com/${b.instagram.replace(/^@/, '')}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 12px',
                          borderRadius: 999,
                          border: '1px solid rgba(124, 58, 237, 0.55)',
                          background: 'rgba(124, 58, 237, 0.12)',
                          color: '#d4bfff',
                          fontWeight: 600,
                          fontSize: 14,
                          transition: 'transform 140ms ease, box-shadow 140ms ease',
                          textDecoration:'none',
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        <span className="small">@{b.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '')}</span>
                        <svg viewBox="0 0 448 512" width="16" height="16" aria-hidden="true">
                          <path fill="currentColor"
                            d="M224,202.66A53.34,53.34,0,1,0,277.33,256,53.38,53.38,0,0,0,224,202.66Zm124.71-41a54,54,0,0,0-30.44-30.44C297.77,120,224,120,224,120s-73.77,0-94.27,11.22A54,54,0,0,0,99.29,161.7C88,182.2,88,256,88,256s0,73.77,11.22,94.27a54,54,0,0,0,30.44,30.44C150.23,392,224,392,224,392s73.77,0,94.27-11.22a54,54,0,0,0,30.44-30.44C360,329.77,360,256,360,256S360,182.2,348.71,161.7ZM224,338a82,82,0,1,1,82-82A82,82,0,0,1,224,338Zm85.33-148.88a19.2,19.2,0,1,1,19.2-19.2A19.19,19.19,0,0,1,309.33,189.12Z"/>
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <style jsx>{`
        :global(.igBtn)
        :global(.igBtn:focus) { outline: none; }
        :global(.brandCard .card:hover .overlay) {
          box-shadow: inset 0 0 0 1px rgba(124, 58, 237, 0.35);
        }
      `}</style>
    </>
  );
}
