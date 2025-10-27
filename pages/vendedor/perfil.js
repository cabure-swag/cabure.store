// pages/vendedor/perfil.js
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { pathSafe } from '../../lib/pathSafe';

export default function VendedorPerfil(){
  const [me, setMe] = useState(null);
  const [brands, setBrands] = useState([]);
  const [brandSlug, setBrandSlug] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      const u = s?.session?.user || null;
      if(!u) return;
      setMe({ id: u.id, email: u.email });

      const { data: vb } = await supabase
        .from('vendor_brands')
        .select('brand_slug, brands!inner(name, description, logo_url, cover_url, ship_domicilio, ship_sucursal, ship_free_from)')
        .eq('user_id', u.id);

      const list = (vb||[]).map(x => ({ slug: x.brand_slug, ...x.brands }));
      setBrands(list);
      if (list.length) setBrandSlug(list[0].slug);
    })();
  }, []);

  async function saveBrand(e){
    e.preventDefault();
    if(!brandSlug) return;
    setSaving(true);
    const f = new FormData(e.currentTarget);
    const description = f.get('description') || null;
    const ship_domicilio = f.get('ship_domicilio') === '' ? null : Number(f.get('ship_domicilio'));
    const ship_sucursal = f.get('ship_sucursal') === '' ? null : Number(f.get('ship_sucursal'));
    const ship_free_from = Number(f.get('ship_free_from') || 0);
    const logo = f.get('logo');
    const cover = f.get('cover');

    let logo_url = brands.find(b => b.slug===brandSlug)?.logo_url || null;
    if (logo && logo.size>0) {
      const path = `brands/${brandSlug}/${Date.now()}_${pathSafe(logo.name)}`;
      const up = await supabase.storage.from('media').upload(path, logo, { contentType: logo.type });
      if (up.error) { setSaving(false); return alert(up.error.message); }
      const { data: pub } = await supabase.storage.from('media').getPublicUrl(path);
      logo_url = pub?.publicUrl || null;
    }

    let cover_url = brands.find(b => b.slug===brandSlug)?.cover_url || null;
    if (cover && cover.size>0) {
      const path = `brands/${brandSlug}/cover_${Date.now()}_${pathSafe(cover.name)}`;
      const up = await supabase.storage.from('media').upload(path, cover, { contentType: cover.type });
      if (up.error) { setSaving(false); return alert(up.error.message); }
      const { data: pub } = await supabase.storage.from('media').getPublicUrl(path);
      cover_url = pub?.publicUrl || null;
    }

    const { error } = await supabase.rpc('vendor_update_brand_public_fields', {
      p_slug: brandSlug,
      p_description: description,
      p_logo_url: logo_url,
      p_cover_url: cover_url,
      p_ship_domicilio: ship_domicilio,
      p_ship_sucursal: ship_sucursal,
      p_ship_free_from: ship_free_from
    });

    setSaving(false);
    if (error) return alert(error.message);
    alert('Marca actualizada');
  }

  if(!me) return <main className="container"><div className="small">Cargando…</div></main>;

  return (
    <main className="container">
      <h1 className="h1">Vendedor — Marca</h1>

      <div className="card">
        <label>Elegí marca</label>
        <select className="input" value={brandSlug || ''} onChange={(e)=>setBrandSlug(e.target.value || null)}>
          <option value="">Seleccionar</option>
          {brands.map(b => <option key={b.slug} value={b.slug}>{b.name}</option>)}
        </select>
      </div>

      {brandSlug && (
        <form onSubmit={saveBrand} className="card grid" style={{ gridTemplateColumns:'1fr 1fr' }}>
          <div style={{ gridColumn:'1/-1' }}><label>Descripción</label><textarea className="input" name="description" rows="3"
            defaultValue={brands.find(b => b.slug===brandSlug)?.description || ''} /></div>

          <div><label>Logo</label><input className="input" type="file" name="logo" accept="image/*" /></div>
          <div><label>Portada</label><input className="input" type="file" name="cover" accept="image/*" /></div>

          <div><label>Envío domicilio (ARS)</label><input className="input" type="number" name="ship_domicilio"
            defaultValue={brands.find(b => b.slug===brandSlug)?.ship_domicilio ?? ''} placeholder="vacío = desactivado" /></div>
          <div><label>Envío sucursal (ARS)</label><input className="input" type="number" name="ship_sucursal"
            defaultValue={brands.find(b => b.slug===brandSlug)?.ship_sucursal ?? ''} placeholder="vacío = desactivado" /></div>
          <div><label>Gratis desde (ARS)</label><input className="input" type="number" name="ship_free_from"
            defaultValue={brands.find(b => b.slug===brandSlug)?.ship_free_from || 0} /></div>

          <div style={{ gridColumn:'1/-1' }}><button className="btn" disabled={saving}>{saving?'Guardando…':'Guardar marca'}</button></div>
        </form>
      )}
    </main>
  );
}
