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
        .select('slug,name,description,instagram,logo_url,cover_url')
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
                    src={b.cover_url || b.logo_url || '/logo.png'}
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
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      background: 'rgba(17,18,26,.58)',
                      border: '1px solid var(--line)',
                      borderRadius: 12,
                      backdropFilter: 'blur(6px)',
                    }}
                  >
                    <img
                      src={b.logo_url || '/logo.png'}
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
                            : `https://instagram.com/${b.instagram.replace('@', '')}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Instagram"
                        title="Instagram"
                      >
                        {/* Instagram “oficial” (simpleicons-like) */}
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="18" height="18" aria-hidden="true">
                          <path fill="currentColor"
                            d="M224,202.66A53.34,53.34,0,1,0,277.34,256,53.38,53.38,0,0,0,224,202.66Zm124.71-41a54,54,0,0,0-30.46-30.46C298.07,120,224,120,224,120s-74.07,0-94.25,11.2a54,54,0,0,0-30.46,30.46C88,161.93,88,236,88,236s0,74.07,11.29,94.25a54,54,0,0,0,30.46,30.46C150,372,224,372,224,372s74.07,0,94.25-11.29a54,54,0,0,0,30.46-30.46C360,310.07,360,236,360,236S360,161.93,348.71,161.71ZM224,338a82,82,0,1,1,82-82A82,82,0,0,1,224,338Zm85-148.71a19.2,19.2,0,1,1,19.2-19.2A19.19,19.19,0,0,1,309,189.29Z"/>
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
        :global(.igBtn) {
          color: var(--text);
          display:inline-flex; align-items:center; justify-content:center;
          width: 36px; height: 36px; border-radius: 10px; border: 1px solid var(--line);
          transition: transform 140ms ease, box-shadow 140ms ease;
          text-decoration:none;
        }
        :global(.igBtn:hover) {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(124, 58, 237, 0.25);
        }
        :global(.brandCard .card:hover .overlay) {
          box-shadow: inset 0 0 0 1px rgba(124, 58, 237, 0.35);
        }
      `}</style>
    </>
  );
}
