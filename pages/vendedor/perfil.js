// pages/vendedor/perfil.js
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

function uid() {
  return (globalThis?.crypto?.randomUUID?.() || Math.random().toString(36).slice(2));
}

export default function VendedorPerfil(){
  const [session, setSession] = useState(null);
  const [myBrands, setMyBrands] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState('');
  const [brand, setBrand] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // Sesión
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Marcas (ajustá el filtro a tu esquema si corresponde)
  useEffect(() => {
    if(!session) return;
    (async () => {
      const { data } = await supabase
        .from('brands')
        .select('slug,name,logo_url,cover_url,cover_urls')
        .order('name', { ascending: true });
      setMyBrands(data || []);
      if (!selectedSlug && data?.[0]?.slug) setSelectedSlug(data[0].slug);
    })();
  }, [session]);

  // Marca seleccionada
  useEffect(() => {
    if(!selectedSlug) { setBrand(null); return; }
    (async () => {
      const { data } = await supabase
        .from('brands')
        .select('slug,name,logo_url,cover_url,cover_urls')
        .eq('slug', selectedSlug)
        .maybeSingle();
      setBrand(data || null);
    })();
  }, [selectedSlug]);

  async function onUploadCovers(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length || !brand) return;

    setSaving(true); setMsg('Subiendo imágenes...');
    try {
      const urls = Array.isArray(brand.cover_urls) ? [...brand.cover_urls] : [];
      for (const file of files) {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `brands/${brand.slug}/covers/${uid()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('media').upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        });
        if (upErr) throw upErr;

        const { data: pub } = supabase.storage.from('media').getPublicUrl(path);
        if (pub?.publicUrl) urls.push(pub.publicUrl);
      }
      const { error: updb } = await supabase
        .from('brands')
        .update({ cover_urls: urls })
        .eq('slug', brand.slug);
      if (updb) throw updb;

      setBrand(b => ({ ...b, cover_urls: urls }));
      setMsg('Portadas actualizadas ✔');
    } catch (err) {
      console.error(err);
      setMsg('Error subiendo imágenes');
    } finally {
      setSaving(false);
      e.target.value = '';
      setTimeout(()=>setMsg(''), 3000);
    }
  }

  async function removeCover(idx) {
    if (!brand) return;
    const urls = Array.isArray(brand.cover_urls) ? [...brand.cover_urls] : [];
    const [removed] = urls.splice(idx, 1);
    setSaving(true); setMsg('Eliminando...');
    try {
      if (removed?.includes('/storage/v1/object/public/media/')) {
        const marker = '/object/public/media/';
        const pos = removed.indexOf(marker);
        if (pos !== -1) {
          const key = removed.slice(pos + marker.length);
          await supabase.storage.from('media').remove([key]);
        }
      }
      const { error } = await supabase
        .from('brands')
        .update({ cover_urls: urls })
        .eq('slug', brand.slug);
      if (error) throw error;
      setBrand(b => ({ ...b, cover_urls: urls }));
      setMsg('Portada eliminada ✔');
    } catch (err) {
      console.error(err);
      setMsg('Error eliminando portada');
    } finally {
      setSaving(false);
      setTimeout(()=>setMsg(''), 3000);
    }
  }

  const list = Array.isArray(brand?.cover_urls) ? brand.cover_urls : [];

  return (
    <main>
      <div className="container">
        <h1>Vendedor — Perfil & Portadas</h1>

        {!session ? (
          <div className="card">Iniciá sesión con Google.</div>
        ) : (
          <>
            <div className="card">
              <label className="lbl">Marca</label>
              <select
                value={selectedSlug}
                onChange={e=>setSelectedSlug(e.target.value)}
              >
                {myBrands.map(b => <option key={b.slug} value={b.slug}>{b.name}</option>)}
              </select>
            </div>

            {brand && (
              <div className="card">
                <div className="row" style={{ alignItems:'center', gap:12 }}>
                  <div>
                    <div className="small" style={{opacity:.8}}>Portadas actuales ({list.length})</div>
                    <div className="thumbs">
                      {list.map((u, i) => (
                        <div key={i} className="thumb">
                          <img src={u} alt={`cover-${i}`} />
                          <button className="btn-ghost" onClick={()=>removeCover(i)} disabled={saving}>Eliminar</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt">
                  <label className="lbl">Agregar nuevas portadas (podés subir varias):</label>
                  <input type="file" multiple accept="image/*" onChange={onUploadCovers} disabled={saving}/>
                  <div className="small" style={{opacity:.8, marginTop:6}}>
                    Se mostrarán rotando cada 10 segundos en la portada de la marca (si hay 2 o más).
                  </div>
                </div>

                {msg && <div className="small" style={{marginTop:10}}>{msg}</div>}
              </div>
            )}
          </>
        )}
      </div>

      <style jsx>{`
        .lbl{ display:block; margin-bottom:6px; font-weight:600; }
        select{ background:#0f1118; border:1px solid var(--line); border-radius:10px; padding:8px 10px; color:var(--text); }
        .thumbs{ display:flex; flex-wrap:wrap; gap:12px; margin-top:8px; }
        .thumb{ width:160px; }
        .thumb img{ width:100%; height:100px; object-fit:cover; border-radius:10px; border:1px solid var(--line); }
      `}</style>
    </main>
  );
}
