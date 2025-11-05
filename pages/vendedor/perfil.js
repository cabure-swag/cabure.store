// pages/vendedor/perfil.js
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

const toNumber = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

export default function VendedorPerfil() {
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState(null);

  const [myBrands, setMyBrands] = useState([]); // { slug, name, ... }
  const [selected, setSelected] = useState('');
  const [brand, setBrand] = useState(null);

  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

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

      // Mis slugs por membership (preferente)
      const { data: bm } = await supabase
        .from('brand_members')
        .select('brand_slug')
        .eq('user_id', u.id);

      const brandSlugs = new Set([
        ...(Array.isArray(bm) ? bm.map(x=>x.brand_slug) : []),
        ...(Array.isArray(vbs) ? vbs.map(x=>x.brand_slug) : []),
      ]);

      // Admin puede ver todas (pero en perfil mostramos solo sus asignadas; si no hay, listamos todas)
      let query = supabase.from('brands').select('name, slug, description, avatar_url, cover_photos, ship_domicilio, ship_sucursal, ship_free_from, mp_fee');
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

  async function save() {
    if (!brand) return;
    setErr('');
    try {
      setBusy(true);
      const payload = {
        name: brand.name?.trim() || '',
        description: brand.description || null,
        avatar_url: brand.avatar_url || null,
        cover_photos: Array.isArray(brand.cover_photos) ? brand.cover_photos.filter(Boolean).slice(0,10) : null,
        ship_domicilio: brand.ship_domicilio === '' || brand.ship_domicilio == null ? null : toNumber(brand.ship_domicilio, null),
        ship_sucursal: brand.ship_sucursal === '' || brand.ship_sucursal == null ? null : toNumber(brand.ship_sucursal, null),
        ship_free_from: brand.ship_free_from === '' || brand.ship_free_from == null ? null : toNumber(brand.ship_free_from, null),
        mp_fee: brand.mp_fee === '' || brand.mp_fee == null ? null : toNumber(brand.mp_fee, null),
      };
      if (!payload.name) throw new Error('Ingresá el nombre de la marca.');

      const { error } = await supabase
        .from('brands')
        .update(payload)
        .eq('slug', brand.slug);
      if (error) throw error;

      // recargar resumen de mis marcas
      const idx = myBrands.findIndex(b => b.slug === brand.slug);
      if (idx !== -1) {
        const copy = [...myBrands];
        copy[idx] = { ...copy[idx], ...payload };
        setMyBrands(copy);
      }
    } catch (e2) {
      setErr(e2?.message || String(e2));
    } finally {
      setBusy(false);
    }
  }

  function addCoverUrl() {
    setBrand(b => ({ ...b, cover_photos: [...(b?.cover_photos || []), '' ] }));
  }
  function updateCoverUrl(i, v) {
    const arr = Array.isArray(brand?.cover_photos) ? [...brand.cover_photos] : [];
    arr[i] = v;
    setBrand(b => ({ ...b, cover_photos: arr }));
  }
  function removeCoverUrl(i) {
    const arr = Array.isArray(brand?.cover_photos) ? [...brand.cover_photos] : [];
    arr.splice(i,1);
    setBrand(b => ({ ...b, cover_photos: arr }));
  }

  // Vista previa rotativa (solo UI, 10s)
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
          {/* Si es admin y no tiene membership, igual verá el primer resultado de la carga */}
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
            <div style={{ width: 120, textAlign:'center' }}>
              <div className="small" style={{ color:'var(--muted)' }}>Rotación</div>
              <div className="small" style={{ color:'var(--muted)' }}>cada 10s</div>
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

          <div className="mt row" style={{ gap:12 }}>
            <div style={{ flex:1 }}>
              <label className="small">Avatar (URL)</label>
              <input className="input" value={brand.avatar_url || ''} onChange={e=>setBrand(b=>({...b, avatar_url: e.target.value}))} placeholder="https://..." />
            </div>
            <div style={{ flex:2 }}>
              <label className="small">Portadas (URLs)</label>
              <div style={{ display:'grid', gap:8 }}>
                {(brand.cover_photos || []).map((u, i) => (
                  <div key={i} className="row" style={{ gap:8 }}>
                    <input className="input" value={u} onChange={e=>updateCoverUrl(i, e.target.value)} placeholder="https://..." />
                    <button className="btn" type="button" onClick={()=>removeCoverUrl(i)}>✕</button>
                  </div>
                ))}
                <button className="btn" type="button" onClick={addCoverUrl}>+ Agregar portada</button>
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
            <button className="btn" onClick={save} disabled={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</button>
          </div>
        </div>
      )}
    </main>
  );
}
