// pages/index.js
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';
import LogoTickerSeamless from '../ui/LogoTickerSeamless';
import HeroRotator from '../components/HeroRotator';

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

  // armamos las imágenes del hero: primero cover_photos[0], después cover_url
  const heroImages = useMemo(() => {
    const imgs = [];
    for (const b of brands) {
      if (Array.isArray(b.cover_photos) && b.cover_photos.length) {
        imgs.push(...b.cover_photos.filter(Boolean));
      } else if (b.cover_url) {
        imgs.push(b.cover_url);
      }
    }
    // quitamos duplicados muy básicos
    return Array.from(new Set(imgs));
  }, [brands]);

  return (
    <>
      <Head>
        <title>Caburé Store</title>
      </Head>

      {/* Hero rotando cada 10s */}
      {heroImages.length > 0 && (
        <div style={{ width: '100%', height: 360, overflow: 'hidden', marginBottom: 18 }}>
          <HeroRotator images={heroImages} alt="Marcas destacadas" height={360} />
        </div>
      )}

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
                    src={
                      (Array.isArray(b.cover_photos) && b.cover_photos[0]) ||
                      b.cover_url ||
                      b.logo_url ||
                      b.avatar_url ||
                      '/logo.png'
                    }
                    alt={b.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div
                    className="overlay"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,.6) 95%)',
                    }}
                  />
                  <div style={{ position: 'absolute', bottom: 10, left: 12, color: '#fff' }}>
                    <div style={{ fontWeight: 600, fontSize: 17 }}>{b.name}</div>
                    {b.instagram ? <div style={{ fontSize: 13 }}>@{b.instagram}</div> : null}
                  </div>
                </div>
                <div style={{ padding: 14 }}>
                  <p style={{ color: 'var(--muted)', fontSize: 14 }}>
                    {b.description ? b.description.slice(0, 110) : 'Ver productos →'}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <style jsx>{`
        :global(.igBtn),
        :global(.igBtn:focus) {
          outline: none;
        }
        :global(.brandCard .card:hover .overlay) {
          box-shadow: inset 0 0 0 1px rgba(124, 58, 237, 0.35);
        }
      `}</style>
    </>
  );
}
