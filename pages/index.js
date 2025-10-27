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
        <title>cabure.store</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* Banda de logos: una sola tira continua sin cortes */}
      <section>
        <LogoTickerSeamless brands={brands} />
      </section>

      {/* Grid de marcas (sin "Marcas destacadas") */}
      <main className="container" style={{ paddingTop: 18 }}>
        <div
          className="grid"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 18 }}
        >
          {brands.map((b) => (
            <Link
              key={b.slug}
              href={`/marcas/${b.slug}`}
              className="brandCard"
              style={{ textDecoration: 'none' }}
            >
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div
                  className="cover"
                  style={{
                    position: 'relative',
                    height: 220,
                    background: '#0e0f16',
                  }}
                >
                  <img
                    src={b.cover_url || b.logo_url || '/logo.png'}
                    alt={b.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      filter: 'brightness(.85)',
                    }}
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
                      <div className="h2" style={{ margin: 0, fontSize: 18 }}>
                        {b.name}
                      </div>
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
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          border: '1px solid var(--line)',
                          textDecoration: 'none',
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          width="18"
                          height="18"
                          aria-hidden="true"
                        >
                          <path
                            d="M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5zm5 5a5 5 0 100 10 5 5 0 000-10zm6.5-.75a1.25 1.25 0 11-2.5 0 1.25 1.25 0 012.5 0zM12 9a3 3 0 110 6 3 3 0 010-6z"
                            fill="currentColor"
                          />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}

          {/* Si no hay marcas aún, mostramos “placeholders” circulares en la banda solamente. */}
        </div>
      </main>

      <style jsx>{`
        :global(.igBtn) {
          color: var(--text);
          transition: transform 140ms ease, box-shadow 140ms ease;
        }
        :global(.igBtn:hover) {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(124, 58, 237, 0.25);
        }
        :global(.brandCard .card:hover .overlay) {
          outline: 0;
          box-shadow: inset 0 0 0 1px rgba(124, 58, 237, 0.35);
        }
      `}</style>
    </>
  );
}
