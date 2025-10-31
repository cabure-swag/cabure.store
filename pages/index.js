// pages/index.js
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import RotatingCover from '../components/RotatingCover';
import LogoTicker from '../components/LogoTicker';

function useBrands(){
  const [rows, setRows] = useState([]);
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const { data: brands, error } = await supabase
          .from('brands')
          .select('slug,name,logo_url,cover_url,instagram')
          .order('name', { ascending: true });
        if (cancel) return;
        if (error) {
          console.warn('brands list error', error);
          setRows([]);
          return;
        }
        if (!brands || !brands.length) { setRows([]); return; }

        // Intentar brand_covers si existe; si falla, ignorar.
        const slugs = brands.map(b => b.slug);
        let coversBySlug = {};
        if (slugs.length){
          try {
            const { data: bc, error: ebc } = await supabase
              .from('brand_covers')
              .select('brand_slug,url,position')
              .in('brand_slug', slugs)
              .order('position', { ascending: true });
            if (!ebc && Array.isArray(bc)) {
              for (const r of bc) {
                coversBySlug[r.brand_slug] = coversBySlug[r.brand_slug] || [];
                if (r.url) coversBySlug[r.brand_slug].push(r.url);
              }
            }
          } catch (e) {
            console.warn('brand_covers exception (ignorado):', e?.message || e);
          }
        }

        const enriched = brands.map(b => {
          const coverList =
            (coversBySlug[b.slug] && coversBySlug[b.slug].length && coversBySlug[b.slug]) ||
            [b.cover_url || b.logo_url || '/logo.png'];
        return { ...b, coverList: coverList.filter(Boolean) };
        });

        setRows(enriched);
      } catch (e) {
        console.warn('brands list exception', e);
        if (!cancel) setRows([]);
      }
    })();
    return () => { cancel = true; };
  }, []);
  return rows;
}

export default function Home(){
  const brands = useBrands();

  // Datos para la banda: slug + name + logo_url
  const tickerItems = brands.map(b => ({
    slug: b.slug,
    name: b.name,
    logo_url: b.logo_url || '/logo.png',
  }));

  return (
    <main>
      <div className="container">
        {/* === Banda de logos (continua, centrada, drag con inercia) === */}
        <section className="band">
          <LogoTicker
            items={tickerItems}
            height={86}  // un poco más grande como pediste
            gap={28}
            speed={55}  // suave
          />
        </section>

        {/* Grilla de marcas con portada rotatoria */}
        <section>
          <div className="grid-brands">
            {brands.map(b => (
              <Link key={b.slug} href={`/marcas/${b.slug}`} className="brand-card card">
                <div className="cover">
                  <RotatingCover
                    images={b.coverList}
                    alt={b.name}
                    intervalMs={10000}
                    objectFit="cover"
                  />
                  <div className="overlay">
                    <img src={b.logo_url || '/logo.png'} alt={b.name} className="logo"/>
                    <div className="name">{b.name}</div>
                    {b.instagram && (
                      <a
                        href={b.instagram.startsWith('http') ? b.instagram : `https://instagram.com/${b.instagram.replace('@','')}`}
                        target="_blank" rel="noreferrer" aria-label="Instagram" className="ig-mini"
                        onClick={(e)=>e.stopPropagation()}
                      >
                        {/* Mini ícono IG */}
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                          fill="currentColor" width="18" height="18" aria-hidden="true">
                          <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2zm0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5A4.25 4.25 0 0 0 7.75 20.5h8.5A4.25 4.25 0 0 0 20.5 16.25v-8.5A4.25 4.25 0 0 0 16.25 3.5h-8.5zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 1.5A3.5 3.5 0 1 0 12 15a3.5 3.5 0 0 0 0-7zm4.75-.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5z"/>
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <style jsx>{`
        .band{ margin: 10px 0 22px; }

        .grid-brands{
          display:grid; gap:16px;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        }
        .brand-card{ padding:0; overflow:hidden; }
        .cover{ position:relative; height:200px; background:#0e0f16; border-radius:12px; overflow:hidden; }
        .overlay{
          position:absolute; left:12px; right:12px; bottom:12px;
          display:flex; align-items:center; gap:10px;
          background: rgba(17,18,26,.55); backdrop-filter: blur(6px);
          border:1px solid var(--line); border-radius:12px; padding:8px 10px;
        }
        .logo{ width:42px; height:42px; border-radius:999px; object-fit:cover; border:1px solid var(--line); }
        .name{ font-weight:700; }
        .ig-mini{
          margin-left:auto; width:34px; height:34px; border-radius:10px; display:inline-flex; align-items:center; justify-content:center;
          border:1px solid var(--line); background: rgba(17,18,26,.6); color:#fff;
          transition: transform .15s ease, background .15s ease; text-decoration:none;
        }
        .ig-mini:hover{ background: rgba(255,255,255,.1); transform: translateY(-1px); }
      `}</style>
    </main>
  );
}
