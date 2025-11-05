// pages/admin/marcas.js
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

const toNumber = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

export default function AdminMarcas() {
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form state (create/edit)
  const emptyForm = {
    name: '',
    slug: '',
    description: '',
    avatar_url: '',
    cover_photos_str: '',           // UI helper: una URL por línea (se convierte a array)
    ship_domicilio: '',
    ship_sucursal: '',
    ship_free_from: '',
    mp_fee: '',
    mp_alias: '',
    mp_cvu: '',
    mp_cbu: '',
    mp_holder: '',
  };
  const [form, setForm] = useState(emptyForm);
  const [editingSlug, setEditingSlug] = useState(null); // null → create; string → edit
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // Guard de rol admin
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const u = session?.user;
      if (!u) { location.replace('/?next=' + encodeURIComponent('/admin/marcas')); return; }
      const { data: a } = await supabase.from('admin_emails').select('email').eq('email', u.email);
      const admin = Array.isArray(a) && a.length > 0;
      if (!admin) { location.replace('/'); return; }
      setIsAdmin(true);
      setReady(true);
    })();
  }, []);

  // Cargar listado
  useEffect(() => {
    if (!isAdmin) return;
    (async () => { await reload(); })();
  }, [isAdmin]);

  async function reload() {
    setLoading(true);
    const { data, error } = await supabase
      .from('brands')
      .select('name, slug, description, avatar_url, cover_photos, ship_domicilio, ship_sucursal, ship_free_from, mp_fee, mp_alias, mp_cvu, mp_cbu, mp_holder')
      .order('name', { ascending: true });
    if (error) { setErr(error.message || String(error)); setList([]); }
    else setList(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  function startCreate() {
    setEditingSlug(null);
    setForm(emptyForm);
    setErr('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function startEdit(brand) {
    setEditingSlug(brand.slug);
    setForm({
      name: brand.name || '',
      slug: brand.slug || '',
      description: brand.description || '',
      avatar_url: brand.avatar_url || '',
      cover_photos_str: Array.isArray(brand.cover_photos) ? brand.cover_photos.join('\n') : '',
      ship_domicilio: brand.ship_domicilio ?? '',
      ship_sucursal: brand.ship_sucursal ?? '',
      ship_free_from: brand.ship_free_from ?? '',
      mp_fee: brand.mp_fee ?? '',
      mp_alias: brand.mp_alias ?? '',
      mp_cvu: brand.mp_cvu ?? '',
      mp_cbu: brand.mp_cbu ?? '',
      mp_holder: brand.mp_holder ?? '',
    });
    setErr('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submitForm(e) {
    e?.preventDefault?.();
    setErr('');
    const covers = form.cover_photos_str
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 10); // límite razonable

    if (!form.name.trim()) return setErr('Ingresá el nombre de la marca.');
    if (!form.slug.trim()) return setErr('Ingresá el slug (único).');

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: form.description || null,
      avatar_url: form.avatar_url || null,
      cover_photos: covers.length ? covers : null,
      ship_domicilio: form.ship_domicilio === '' ? null : toNumber(form.ship_domicilio, null),
      ship_sucursal: form.ship_sucursal === '' ? null : toNumber(form.ship_sucursal, null),
      ship_free_from: form.ship_free_from === '' ? null : toNumber(form.ship_free_from, null),
      mp_fee: form.mp_fee === '' ? null : toNumber(form.mp_fee, null),
      mp_alias: form.mp_alias || null,
      mp_cvu: form.mp_cvu || null,
      mp_cbu: form.mp_cbu || null,
      mp_holder: form.mp_holder || null,
    };

    try {
      setBusy(true);
      if (editingSlug) {
        // update
        const { error } = await supabase
          .from('brands')
          .update(payload)
          .eq('slug', editingSlug);
        if (error) throw error;
      } else {
        // insert (si slug existe, fallará por unique: OK)
        const { error } = await supabase
          .from('brands')
          .insert(payload);
        if (error) throw error;
      }
      await reload();
      startCreate();
    } catch (e2) {
      setErr(e2?.message || String(e2));
    } finally {
      setBusy(false);
    }
  }

  async function removeBrand(slug) {
    if (!confirm('¿Eliminar la marca y sus datos asociados? Esta acción no se puede deshacer.')) return;
    try {
      setBusy(true);
      const { error } = await supabase.from('brands').delete().eq('slug', slug);
      if (error) throw error;
      await reload();
      if (editingSlug === slug) startCreate();
    } catch (e2) {
      setErr(e2?.message || String(e2));
    } finally {
      setBusy(false);
    }
  }

  const total = useMemo(() => list.length, [list]);

  if (!ready) {
    return (
      <main className="container">
        <div className="card" style={{ padding:16 }}>Verificando acceso…</div>
      </main>
    );
  }

  return (
    <main className="container" style={{ padding: '24px 16px' }}>
      <h1 className="h1">Admin · Marcas</h1>

      {err && (
        <div className="card" style={{ marginTop: 12, padding:12, borderColor:'rgba(239,68,68,0.25)', background:'rgba(239,68,68,0.08)', color:'#fecaca' }}>
          {err}
        </div>
      )}

      {/* Formulario create/edit */}
      <form className="card" onSubmit={submitForm} style={{ padding:16, marginTop: 12 }}>
        <div className="row" style={{ gap: 12 }}>
          <div style={{ flex: 2 }}>
            <label className="small">Nombre</label>
            <input className="input" value={form.name} onChange={e=>setForm(f=>({...f, name: e.target.value}))} required />
          </div>
          <div style={{ flex: 1 }}>
            <label className="small">Slug</label>
            <input className="input" value={form.slug} onChange={e=>setForm(f=>({...f, slug: e.target.value}))} required />
          </div>
        </div>

        <div className="mt">
          <label className="small">Descripción</label>
          <textarea className="input" rows={3} value={form.description} onChange={e=>setForm(f=>({...f, description: e.target.value}))} />
        </div>

        <div className="mt row" style={{ gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label className="small">Avatar (URL)</label>
            <input className="input" value={form.avatar_url} onChange={e=>setForm(f=>({...f, avatar_url: e.target.value}))} placeholder="https://..." />
          </div>
          <div style={{ flex: 2 }}>
            <label className="small">Portadas (una URL por línea, rotan cada 10s)</label>
            <textarea className="input" rows={3} value={form.cover_photos_str} onChange={e=>setForm(f=>({...f, cover_photos_str: e.target.value}))} placeholder={'https://...\nhttps://...\nhttps://...'} />
          </div>
        </div>

        <div className="mt row" style={{ gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label className="small">Envío a domicilio ($)</label>
            <input className="input" type="number" value={form.ship_domicilio} onChange={e=>setForm(f=>({...f, ship_domicilio: e.target.value}))} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="small">Envío a sucursal ($)</label>
            <input className="input" type="number" value={form.ship_sucursal} onChange={e=>setForm(f=>({...f, ship_sucursal: e.target.value}))} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="small">Gratis desde ($)</label>
            <input className="input" type="number" value={form.ship_free_from} onChange={e=>setForm(f=>({...f, ship_free_from: e.target.value}))} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="small">Recargo MP (%)</label>
            <input className="input" type="number" value={form.mp_fee} onChange={e=>setForm(f=>({...f, mp_fee: e.target.value}))} />
          </div>
        </div>

        <div className="mt row" style={{ gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label className="small">MP Alias</label>
            <input className="input" value={form.mp_alias} onChange={e=>setForm(f=>({...f, mp_alias: e.target.value}))} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="small">CVU</label>
            <input className="input" value={form.mp_cvu} onChange={e=>setForm(f=>({...f, mp_cvu: e.target.value}))} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="small">CBU</label>
            <input className="input" value={form.mp_cbu} onChange={e=>setForm(f=>({...f, mp_cbu: e.target.value}))} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="small">Titular</label>
            <input className="input" value={form.mp_holder} onChange={e=>setForm(f=>({...f, mp_holder: e.target.value}))} />
          </div>
        </div>

        <div className="mt row" style={{ gap: 12 }}>
          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'Guardando…' : (editingSlug ? 'Guardar cambios' : 'Crear marca')}
          </button>
          {editingSlug && (
            <button className="btn" type="button" onClick={startCreate} disabled={busy}>Cancelar edición</button>
          )}
        </div>
      </form>

      {/* Listado */}
      <div className="card" style={{ padding:16, marginTop: 16 }}>
        <div className="row" style={{ alignItems:'center', justifyContent:'space-between' }}>
          <strong>Marcas ({total})</strong>
          <button className="btn" onClick={startCreate}>Nueva marca</button>
        </div>

        {loading ? (
          <div className="mt small">Cargando…</div>
        ) : (
          <div className="mt" style={{ display: 'grid', gap: 8 }}>
            {list.map(b => (
              <div key={b.slug} className="row" style={{ alignItems:'center', gap:12, border:'1px solid var(--line)', borderRadius:12, padding:8 }}>
                <div className="row" style={{ gap:10, alignItems:'center', flex:1 }}>
                  {b.avatar_url ? <img alt="" src={b.avatar_url} style={{ width:44, height:44, objectFit:'cover', borderRadius:8, border:'1px solid var(--line)'}}/> : <div style={{ width:44, height:44, borderRadius:8, border:'1px solid var(--line)', background:'#0f1118'}}/>}
                  <div style={{ display:'flex', flexDirection:'column' }}>
                    <strong>{b.name}</strong>
                    <span className="small" style={{ color:'var(--muted)' }}>{b.slug}</span>
                  </div>
                </div>
                <div className="small" style={{ width:160 }}>
                  <div>Dom: ${b.ship_domicilio ?? 0}</div>
                  <div>Suc: ${b.ship_sucursal ?? 0}</div>
                </div>
                <div className="small" style={{ width:200 }}>
                  <div>Gratis desde: ${b.ship_free_from ?? 0}</div>
                  <div>MP %: {b.mp_fee ?? 0}</div>
                </div>
                <div className="row" style={{ gap:8 }}>
                  <button className="btn" onClick={()=>startEdit(b)}>Editar</button>
                  <button className="btn" onClick={()=>removeBrand(b.slug)} style={{ borderColor:'rgba(239,68,68,0.4)' }}>Eliminar</button>
                </div>
              </div>
            ))}
            {list.length === 0 && <div className="small">No hay marcas.</div>}
          </div>
        )}
      </div>
    </main>
  );
}
