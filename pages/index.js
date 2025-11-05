// pages/index.js
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import HeroRotator from '../components/HeroRotator';

/**
 * Home: muestra marcas tomando avatar y portadas si existen.
 * Mantiene contenedores/clases; sólo agrega data binding a imágenes.
 */
export default function HomePage() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr('');
      const { data, error } = await supabase
        .from('brands')
        .select('name, slug, description, avatar_url, cover_photos')
        .order('name', { ascending: true });

      if (error) {
        setErr(error.message || String(error));
        setBrands([]);
      } else {
        setBrands(Array.isArray(data) ? data : []);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <main className="container" style={{ padding: '24px 16px' }}>
      <h1 className="h1">CABURE.STORE</h1>

      {err && (
        <div className="card" style={{ marginTop:12, padding:12, borderColor:'rgba(239,68,68,0.25)', background:'rgba(239,68,68,0.08)', color:'#fecaca' }}>
          {err}
        </div>
      )}

      {loading && (
        <div className="card" style={{ marginTop:12, padding:12 }}>
          Cargando marcas…
        </div>
      )}

      {!loading && (
        <section className="mt">
          {/* Grid existente: cada marca en una card */}
          <div className="grid" style={{ gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(260px,1fr))' }}>
            {brands.map((b) => (
              <Link key={b.slug} href={`/marca/${b.slug}`} className="card" style={{ textDecoration:'none', overflow:'hidden' }}>
                {/* Hero rotador si hay cover_photos */}
                {Array.isArray(b.cover_photos) && b.cover_photos.length > 0 ? (
                  <HeroRotator images={b.cover_photos} alt={b.name} height={180} />
                ) : (
                  // Si no tiene portadas, usamos un placeholder (no toca estilos globales)
                  <div style={{
                    width: '100%', height: 180, borderRadius: 12, border:'1px solid var(--line)',
                    background:'#0f1118'
                  }} />
                )}

                <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:12 }}>
                  {/* Avatar si existe */}
                  {b.avatar_url ? (
                    <img
                      src={b.avatar_url}
                      alt={`${b.name} avatar`}
                      style={{ width:44, height:44, borderRadius:8, objectFit:'cover', border:'1px solid var(--line)' }}
                    />
                  ) : (
                    <div style={{ width:44, height:44, borderRadius:8, border:'1px solid var(--line)', background:'#10121a' }} />
                  )}
                  <div style={{ display:'flex', flexDirection:'column' }}>
                    <strong>{b.name}</strong>
                    {b.description && <span className="small" style={{ color:'var(--muted)' }}>{b.description}</span>}
                  </div>
                </div>
              </Link>
            ))}
            {brands.length === 0 && (
              <div className="card" style={{ padding:12 }}>No hay marcas aún.</div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
