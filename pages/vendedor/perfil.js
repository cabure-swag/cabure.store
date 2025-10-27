// pages/vendedor/perfil.js
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

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
      const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).maybeSingle();
      setMe({ ...p, id: u.id, email: u.email });

      // marcas asignadas
      const { data: vb } = await supabase
        .from('vendor_brands')
        .select('brand_slug, brands!inner(name, description, logo_url, cover_url, ship_domicilio, ship_sucursal, ship_free_from)')
        .eq('user_id', u.id);

      const list = (vb||[]).map(x => ({ slug: x.brand_slug, ...x.brands }));
      setBrands(list);
      if (list.length) setBrandSlug(list[0].slug);
    })();
  }, []);

  async function saveProfile(e){
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const display_name = f.get('display_name') || null;
    const bio = f.get('bio') || null;
    const avatar = f.get('avatar');
    const cover = f.get('cover');

    let avatar_url = me?.avatar_url || null;
    if (avatar && avatar.size>0) {
      const path = `avatars/${me.id}_${Date.now()}_${avatar.name}`;
      const up = await supabase.storage.from('media').upload(path, avatar);
      if (up.error) return alert(up.error.message);
      const { data: pub } = await supabase.storage.from('media').getPublicUrl(path);
      avatar_url = pub?.publicUrl || null;
    }

    let cover_url = me?.cover_url || null;
    if (cover && cover.size>0) {
      const path = `avatars/${me.id}_cover_${Date.now()}_${cover.name}`;
      const up = await supabase.storage.from('media').upload(path, cover);
      if (up.error) return alert(up.error.message);
      const { data: pub } = await supabase.storage.from('media').getPublicUrl(path);
      cover_url = pub?.publicUrl || null;
    }

    const { error } = await supabase.from('profiles').update({ display_name, bio, avatar_url, cover_url }).eq('id', me.id);
    if (error) return alert(error.message);
    alert('Perfil guardado');
  }

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
      const path = `brands/${brandSlug}/${Date.now()}_${logo.name}`;
      const up = await supabase.storage.from('media').upload(path, logo);
      if (up.error) { setSaving(false); return alert(up.error.message); }
      const { data: pub } = await supabase.storage.from('media').getPublicUrl(path);
      logo_url = pub?.publicUrl || null;
    }

    let cover_url = brands.find(b => b.slug===brandSlug)?.cover_url || null;
    if (cover && cover.size>0) {
      const path = `brands/${brandSlug}/cover_${Date.now()}_${cover.name}`;
      const up = await supabase.storage.from('media').upload(path, cover);
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
      <h1 className="h1">Vendedor — Perfil y Marca</h1>

      <div className="grid" style={{ gridTemplateColumns:'1fr 1fr' }}>
        <div className="card">
          <strong>Mi perfil</strong>
          <form onSubmit={saveProfile} className="grid" style={{ gridTemplateColumns:'1fr 1fr' }}>
            <div><label>Nombre a mostrar</label><input className="input" name="display_name" defaultValue={me.display_name || ''} /></div>
            <div><label>Bio</label><input className="input" name="bio" defaultValue={me.bio || ''} /></div>
            <div><label>Avatar</label><input className="input" type="file" name="avatar" accept="image/*" /></div>
            <div><label>Portada</label><input className="input" type="file" name="cover" accept="image/*" /></div>
            <div style={{ gridColumn:'1/-1' }}><button className="btn">Guardar perfil</button></div>
          </form>
        </div>

        <div className="card">
          <strong>Mi marca</strong>
          <div className="mb">
            <label>Elegí marca</label>
            <select className="input" value={brandSlug || ''} onChange={(e)=>setBrandSlug(e.target.value || null)}>
              <option value="">Seleccionar</option>
              {brands.map(b => <option key={b.slug} value={b.slug}>{b.name}</option>)}
            </select>
          </div>

          {brandSlug && (
            <form onSubmit={saveBrand} className="grid" style={{ gridTemplateColumns:'1fr 1fr' }}>
              <div style={{ gridColumn:'1/-1' }}><label>Descripción</label><textarea className="input" name="description" rows="3"
                defaultValue={brands.find(b => b.slug===brandSlug)?.description || ''} /></div>
              <div><label>Logo</label><input className="input" type="file" name="logo" accept="image/*" /></div>
              <div><label>Portada</label><input className="input" type="file" name="cover" accept="image/*" /></div>
              <div><label>Envío domicilio (ARS)</label><input className="input" type="number" name="ship_domicilio"
                defaultValue={brands.find(b => b.slug===brandSlug)?.ship_domicilio ?? ''} placeholder="vacío = off" /></div>
              <div><label>Envío sucursal (ARS)</label><input className="input" type="number" name="ship_sucursal"
                defaultValue={brands.find(b => b.slug===brandSlug)?.ship_sucursal ?? ''} placeholder="vacío = off" /></div>
              <div><label>Gratis desde (ARS)</label><input className="input" type="number" name="ship_free_from"
                defaultValue={brands.find(b => b.slug===brandSlug)?.ship_free_from || 0} /></div>
              <div style={{ gridColumn:'1/-1' }}><button className="btn" disabled={saving}>{saving?'Guardando…':'Guardar marca'}</button></div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
