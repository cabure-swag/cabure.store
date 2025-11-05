// pages/vendedor/perfil.js
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

const toNumber = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

// Helpers de Storage
const BUCKET = 'brand-media';
const pathAvatar = (slug, ext) => `brands/${slug}/avatar.${ext}`;
const pathCover  = (slug, name) => `brands/${slug}/covers/${name}`;

async function uploadFile(file, path, upsert = true) {
  const { data, error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert, cacheControl: '3600' });
  if (error) throw error;
  return data?.path || path;
}
function publicUrl(path) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl || null;
}

export default function VendedorPerfil() {
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState(null);

  const [myBrands, setMyBrands] = useState([]); // { slug, name, ... }
  const [selected, setSelected] = useState('');
  const [brand, setBrand] = useState(null);

  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const fileAvatarRef = useRef(null);
  const fileCoverRef = useRef(null);

  // Guard vendor/admin + cargar mis marcas (brand_members o vendor_brands)
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const u = session?.user;
      if (!u) { location.replace('/?next=' + encodeURIComponent('/vendedor/perfil')); return; }
      setUser(u);

      const [{ data: a }, { data: vbs }] = await Promise.all([
        supabase.from('admin_emails').select('email').eq('email', u.email),
        supabase.from('vendor_brands').select('brand_slug').eq('user_id', u.id),
      ]);
      const admin = Array.isArray(a) && a.length > 0;
      setIsAdmin(admin);

      const { data: bm } = await supabase
        .from('brand_members')
        .select('brand_slug')
        .eq('user_id', u.id);

      const brandSlugs = new Set([
        ...(Array.isArray(bm) ? bm.map(x=>x.brand_slug) : []),
        ...(Array.isArray(vbs) ? vbs.map(x=>x.brand_slug) : []),
      ]);

      let query = supabase.from('brands')
        .select('name, slug, description, avatar_url, cover_photos, ship_domicilio, ship_sucursal, ship_free_from, mp_fee');
      if (!admin && brandSlugs.size > 0) {
        query = query.in('slug', Array.from(brandSlugs));
      }

      const { data: brands, error } = await query.order('name', { ascending: true });
      if (error) { setErr(error.message || String(error)); setMyBrands([]); setReady(true); return; }

      setMyBrands(Array.isArray(brands) ? brands : []);
      setSelected((brands && brands[0]?.slug) || '');
      setReady(true);
    })();
  }, []);

  // Cargar detalle de la marca seleccionada
  useEffect(() => {
    if (!selected) { setBrand(null); return; }
    (async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('name, slug, description, avatar_url, cover_photos, ship_domicilio, ship_sucursal, ship_free_from, mp_fee')
        .eq('slug', selected)
        .single();
      if (error) { setErr(error.message || String(error)); setBrand(null); return; }
      setBrand(data || null);
      setErr('');
    })();
  }, [selected]);

  // Rotación de portada cada 10s (preview)
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 10000);
    return () => clearInterval(id);
  }, []);
  const currentCover = useMemo(() => {
    const arr = Array.isArray(brand?.cover_photos) ? brand.cover_photos.filter(Boolean) : [];
    if (!arr.length) return null;
    const idx = Math.abs(tick) % arr.length;
    return arr[idx];
  }, [brand, tick]);

  async function saveBasics() {
    if (!brand) return;
    setErr('');
    try {
      setBusy(true);
      const payload = {
        name: brand.name?.trim() || '',
        description: brand.description || null,
        ship_domicilio: brand.ship_domicilio === '' || brand.ship_domicilio == null ? null : toNumber(brand.ship_domicilio, null),
        ship_sucursal: brand.ship_sucursal === '' || brand.ship_sucursal == null ? null : toNumber(brand.ship_sucursal, null),
        ship_free_from: brand.ship_free_from === '' || brand.ship_free_from == null ? null : toNumber(brand.ship_free_from, null),
        mp_fee: brand.mp_fee === '' || brand.mp_fee == null ? null : toNumber(brand.mp_fee, null),
      };
      if (!payload.name) throw new Error('Ingresá el nombre de la marca.');

      const { error } = await supabase.from('brands').update(payload).eq('slug', brand.slug);
      if (error) throw error;
    } catch (e2) {
      setErr(e2?.message || String(e2));
    } finally {
      setBusy(false);
    }
  }

  async function onPickAvatar(e) {
    const file = e?.target?.files?.[0];
    if (!file || !brand?.slug) return;
    setErr('');
    try {
      setBusy(true);
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g,'') || 'jpg';
      const path = pathAvatar(brand.slug, ext);
      await uploadFile(file, path, true);
      const url = publicUrl(path);
      const { error } = await supabase.from('brands').update({ avatar_url: url }).eq('slug', brand.slug);
      if (error) throw error;
      setBrand(b => ({ ...b, avatar_url: url }));
    } catch (e2) {
      setErr(e2?.message || String(e2));
    } finally {
      setBusy(false);
      if (fileAvatarRef.current) fileAvatarRef.current.value = '';
    }
  }

  async function onPickCover(e) {
    const file = e?.target?.files?.[0];
    if (!file || !brand?.slug) return;
    setErr('');
    try {
      setBusy(true);
      const safe = file.name.replace(/[^a-z0-9_\-.]/gi, '_').toLowerCase();
      const path = pathCover(brand.slug, `${Date.now()}_${safe}`);
      await uploadFile(file, path, false);
      const url = publicUrl(path);

      const next = Array.isArray(brand.cover_photos) ? [...brand.cover_photos] : [];
      next.push(url);

      const { error } = await supabase.from('brands').update({ cover_photos: next }).eq('slug', brand.slug);
      if (error) throw error;

      setBrand(b => ({ ...b, cover_photos: next }));
    } catch (e2) {
      setErr(e2?.message || String(e2));
    } finally {
      setBusy(false);
      if (fileCoverRef.current) fileCoverRef.current.value = '';
    }
  }

  async function removeCoverUrl(i) {
    const arr = Array.isArray(brand?.cover_photos) ? [...brand.cover_photos] : [];
    if (i < 0 || i >= arr.length) return;
    const toRemove = arr[i];
    setErr('');
    try {
      setBusy(true);
      // Intento borrar del bucket si pertenece a brand-media
      try {
        const base = supabase.storage.from(BUCKET);
        // Extraer el path después de /storage/v1/object/public/brand-media/
        const prefix = '/storage/v1/object/public/' + BUCKET + '/';
        const idx = toRemove.indexOf(prefix);
        if (idx !== -1) {
          const rel = toRemove.substring(idx + prefix.length);
          await base.remove([rel]);
        }
      } catch (_) { /* no crítico */ }

      arr.splice(i, 1);
      const { error } = await supabase.from('brands').update({ cover_photos: arr.length ? arr : null }).eq('slug', brand.slug);
      if (error) throw error;
      setBrand(b => ({ ...b, cover_photos: arr }));
    } catch (e2) {
      setErr(e2?.message || String(e2));
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <main className="container">
        <div className="card" style={{ padding:16 }}>Verificando acceso…</div>
      </main>
    );
  }

  if (!myBrands.length && !isAdmin) {
    return (
      <main className="container">
        <div className="card" style={{ padding:16 }}>No tenés marcas asignadas.</div>
      </main>
    );
  }

  return (
    <main className="container" style={{ padding: '24px 16px' }}>
      <h1 className="h1">Vendedor · Perfil de marca</h1>

      {err && (
        <div className="card" style={{ marginTop: 12, padding:12, borderColor:'rgba(239,68,68,0.25)', background:'rgba(239,68,68,0.08)', color:'#fecaca' }}>
          {err}
        </div>
      )}

      {/* Selector de marca (si hay varias) */}
      <div className="card" style={{ padding: 12, marginTop: 12 }}>
        <label className="small">Marca</label>
        <select className="input" value={selected} onChange={e=>setSelected(e.target.value)}>
          {myBrands.map(b => (<option key={b.slug} value={b.slug}>{b.name} ({b.slug})</option>))}
          {!myBrands.length && brand?.slug && <option value={brand.slug}>{brand.name} ({brand.slug})</option>}
        </select>
      </div>

      {brand && (
        <div className="card" style={{ padding:16, marginTop: 12 }}>
          {/* Preview portada rotativa */}
          <div style={{ display:'flex', gap:12, alignItems:'center' }}>
            <div style={{ width: '100%', minHeight: 120, borderRadius: 12, border:'1px solid var(--line)', background:'#0f1118', overflow:'hidden' }}>
              {currentCover && (
                <img
                  alt=""
                  src={currentCover}
                  style={{ width:'100%', height:240, objectFit:'cover', display:'block', transition:'opacity .4s ease' }}
                />
              )}
            </div>
            <div style={{ width: 160 }}>
              <div className="small" style={{ color:'var(--muted)' }}>Rotación cada 10s</div>
              <div className="mt">
                <input
                  ref={fileCoverRef}
                  type="file"
                  accept="image/*"
                  onChange={onPickCover}
                />
              </div>
            </div>
          </div>

          <div className="mt row" style={{ gap:12 }}>
            <div style={{ flex: 1 }}>
              <label className="small">Nombre</label>
              <input className="input" value={brand.name || ''} onChange={e=>setBrand(b=>({...b, name: e.target.value}))} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="small">Slug</label>
              <input className="input" value={brand.slug || ''} disabled />
            </div>
          </div>

          <div className="mt">
            <label className="small">Descripción</label>
            <textarea className="input" rows={3} value={brand.description || ''} onChange={e=>setBrand(b=>({...b, description: e.target.value}))} />
          </div>

          <div className="mt row" style={{ gap:12, alignItems:'center' }}>
            <div style={{ flex: '0 0 120px' }}>
              <div className="small">Avatar</div>
              <div style={{ width: 120, height: 120, borderRadius: 12, border:'1px solid var(--line)', overflow:'hidden', background:'#0f1118' }}>
                {brand.avatar_url ? (
                  <img alt="" src={brand.avatar_url} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                ) : (
                  <div style={{ width:'100%', height:'100%', display:'grid', placeItems:'center', color:'var(--muted)' }}>Sin avatar</div>
                )}
              </div>
              <div className="mt">
                <input ref={fileAvatarRef} type="file" accept="image/*" onChange={onPickAvatar} />
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <label className="small">Portadas guardadas</label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px,1fr))', gap:8 }}>
                {(brand.cover_photos || []).map((u, i) => (
                  <div key={i} className="card" style={{ padding:8 }}>
                    <div style={{ borderRadius:8, overflow:'hidden', border:'1px solid var(--line)' }}>
                      <img alt="" src={u} style={{ width:'100%', height:120, objectFit:'cover' }}/>
                    </div>
                    <div className="row" style={{ marginTop:8, justifyContent:'space-between' }}>
                      <span className="small" style={{ color:'var(--muted)' }}>#{i+1}</span>
                      <button className="btn" type="button" onClick={()=>removeCoverUrl(i)}>Eliminar</button>
                    </div>
                  </div>
                ))}
                {(!brand.cover_photos || brand.cover_photos.length === 0) && (
                  <div className="small" style={{ color:'var(--muted)' }}>Aún no cargaste portadas.</div>
                )}
              </div>
            </div>
          </div>

          <div className="mt row" style={{ gap:12 }}>
            <div style={{ flex:1 }}>
              <label className="small">Envío a domicilio ($)</label>
              <input className="input" type="number" value={brand.ship_domicilio ?? ''} onChange={e=>setBrand(b=>({...b, ship_domicilio: e.target.value}))}/>
            </div>
            <div style={{ flex:1 }}>
              <label className="small">Envío a sucursal ($)</label>
              <input className="input" type="number" value={brand.ship_sucursal ?? ''} onChange={e=>setBrand(b=>({...b, ship_sucursal: e.target.value}))}/>
            </div>
            <div style={{ flex:1 }}>
              <label className="small">Gratis desde ($)</label>
              <input className="input" type="number" value={brand.ship_free_from ?? ''} onChange={e=>setBrand(b=>({...b, ship_free_from: e.target.value}))}/>
            </div>
            <div style={{ flex:1 }}>
              <label className="small">Recargo MP (%)</label>
              <input className="input" type="number" value={brand.mp_fee ?? ''} onChange={e=>setBrand(b=>({...b, mp_fee: e.target.value}))}/>
            </div>
          </div>

          <div className="mt row" style={{ gap:12 }}>
            <button className="btn" onClick={saveBasics} disabled={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</button>
          </div>
        </div>
      )}
    </main>
  );
}
