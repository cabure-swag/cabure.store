// pages/admin/marcas.js
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

function slugify(s) {
  return (s || '')
    .toString()
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export default function AdminMarcas() {
  const [ok, setOk] = useState(false);
  const [brands, setBrands] = useState([]);
  const [busyCreate, setBusyCreate] = useState(false);

  async function load() {
    const { data: bs } = await supabase.from('brands').select('*').order('name');
    setBrands(bs || []);
  }

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const u = sess?.session?.user;
      if (!u) return setOk(false);
      const { data: a } = await supabase.from('admin_emails').select('email').eq('email', u.email);
      const admin = Array.isArray(a) && a.length > 0;
      setOk(admin);
      if (admin) await load();
    })();
  }, []);

  async function onCreate(e) {
    e.preventDefault();
    if (busyCreate) return;
    setBusyCreate(true);
    const form = e.currentTarget;

    try {
      const f = new FormData(form);
      const name = f.get('name');
      const slug = slugify(f.get('slug') || name);
      const desc = f.get('description') || '';
      const ig = f.get('instagram') || '';
      const logoFile = f.get('logo');
      const coverFile = f.get('cover');

      let logo_url = null;
      if (logoFile && logoFile.size > 0) {
        const path = `brands/${slug}/${Date.now()}_${logoFile.name}`;
        const up = await supabase.storage.from('media').upload(path, logoFile);
        if (up.error) throw new Error(`Error subiendo logo: ${up.error.message}`);
        const { data: pub } = supabase.storage.from('media').getPublicUrl(path);
        logo_url = pub?.publicUrl || null;
      }

      let cover_url = null;
      if (coverFile && coverFile.size > 0) {
        const path = `brands/${slug}/cover_${Date.now()}_${coverFile.name}`;
        const up = await supabase.storage.from('media').upload(path, coverFile);
        if (up.error) throw new Error(`Error subiendo portada: ${up.error.message}`);
        const { data: pub } = supabase.storage.from('media').getPublicUrl(path);
        cover_url = pub?.publicUrl || null;
      }

      const { error } = await supabase
        .from('brands')
        .insert({ slug, name, description: desc, instagram: ig, logo_url, cover_url });

      if (error) throw new Error(error.message);

      form.reset();
      alert('Marca creada');
      await load();
    } catch (err) {
      alert(err.message || 'No se pudo crear la marca');
    } finally {
      setBusyCreate(false);
    }
  }

  async function onSave(e, slug) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const mp_access_token = f.get('mp_access_token') || null;
    const mp_public_key = f.get('mp_public_key') || null;
    const transfer_alias = f.get('transfer_alias') || null;
    const transfer_titular = f.get('transfer_titular') || null;
    const ship_domicilio = f.get('ship_domicilio') === '' ? null : Number(f.get('ship_domicilio'));
    const ship_sucursal = f.get('ship_sucursal') === '' ? null : Number(f.get('ship_sucursal'));
    const ship_free_from = Number(f.get('ship_free_from') || 0);
    const mp_fee = f.get('mp_fee') === '' ? null : Number(f.get('mp_fee'));

    const { error } = await supabase
      .from('brands')
      .update({
        mp_access_token, mp_public_key,
        transfer_alias, transfer_titular,
        ship_domicilio, ship_sucursal, ship_free_from,
        mp_fee,
      })
      .eq('slug', slug);

    if (error) return alert(`No se pudo guardar: ${error.message}`);
    alert('Guardado');
  }

  if (!ok) return <main className="container"><h1 className="h1">Admin — Marcas</h1><p className="small">Necesitás cuenta admin.</p></main>;

  return (
    <main className="container">
      <h1 className="h1">Admin — Marcas</h1>

      <div className="card">
        <strong>Crear marca</strong>
        <form onSubmit={onCreate} className="grid" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
          <div><label>Nombre</label><input className="input" name="name" required /></div>
          <div><label>Slug (opcional)</label><input className="input" name="slug" placeholder="auto desde nombre" /></div>
          <div style={{ gridColumn: '1/-1' }}><label>Descripción</label><textarea name="description" className="input" rows="3" /></div>
          <div><label>Instagram (URL)</label><input className="input" name="instagram" placeholder="https://instagram.com/tu-marca" /></div>
          <div><label>Logo (archivo)</label><input className="input" type="file" name="logo" accept="image/*" /></div>
          <div><label>Portada (archivo)</label><input className="input" type="file" name="cover" accept="image/*" /></div>
          <div style={{ gridColumn: '1/-1' }}>
            <button className="btn" disabled={busyCreate}>{busyCreate ? 'Creando…' : 'Crear'}</button>
          </div>
        </form>
        <p className="small">Logo y portada son opcionales; si subís archivos van al bucket público <b>media</b>.</p>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', marginTop: 16 }}>
        {brands.map(b => (
          <div key={b.slug} className="card">
            <div className="row">
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <img src={b.logo_url || '/logo.png'} alt={b.name} style={{ width: 40, height: 40, borderRadius: 20, objectFit: 'cover', border: '1px solid var(--line)' }} />
                <div>
                  <strong>{b.name}</strong>
                  <div className="small">{b.slug}</div>
                </div>
              </div>
              <a className="badge" href={`/marcas/${b.slug}`}>Ver</a>
            </div>

            <form onSubmit={(e) => onSave(e, b.slug)} className="grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 12 }}>
              <div><label>MP Access Token</label><input className="input" name="mp_access_token" defaultValue={b.mp_access_token || ''} /></div>
              <div><label>MP Public Key (opcional)</label><input className="input" name="mp_public_key" defaultValue={b.mp_public_key || ''} /></div>
              <div><label>Alias/CBU</label><input className="input" name="transfer_alias" defaultValue={b.transfer_alias || ''} /></div>
              <div><label>Titular</label><input className="input" name="transfer_titular" defaultValue={b.transfer_titular || ''} /></div>
              <div><label>Envío a domicilio (ARS)</label><input className="input" type="number" name="ship_domicilio" defaultValue={b.ship_domicilio ?? ''} placeholder="vacío = desactivado" /></div>
              <div><label>Envío a sucursal (ARS)</label><input className="input" type="number" name="ship_sucursal" defaultValue={b.ship_sucursal ?? ''} placeholder="vacío = desactivado" /></div>
              <div><label>Gratis desde (ARS)</label><input className="input" type="number" name="ship_free_from" defaultValue={b.ship_free_from || 0} /></div>
              <div><label>% MP (vacío = global 10)</label><input className="input" type="number" name="mp_fee" defaultValue={b.mp_fee ?? ''} /></div>
              <div style={{ gridColumn: '1/-1' }}><button className="btn">Guardar</button></div>
            </form>
          </div>
        ))}
      </div>
    </main>
  );
}
