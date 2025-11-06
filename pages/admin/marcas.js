// pages/admin/marcas.js
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

const toNumber = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

// ==== Storage helpers (consistentes con /vendedor/perfil) ====
const BUCKET = 'brand-media';
const pathAvatar = (slug, ext) => `brands/${slug}/avatar.${ext}`;
const pathCover  = (slug, fileSafe) => `brands/${slug}/covers/${Date.now()}_${fileSafe}`;

async function uploadFile(file, path, upsert = true) {
  const { data, error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert, cacheControl: '3600' });
  if (error) throw error;
  return data?.path || path;
}
function publicUrl(path) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl || null;
}
async function removePublicFileIfBelongs(publicURL) {
  try {
    const base = supabase.storage.from(BUCKET);
    const prefix = '/storage/v1/object/public/' + BUCKET + '/';
    const idx = publicURL.indexOf(prefix);
    if (idx !== -1) {
      const rel = publicURL.substring(idx + prefix.length);
      await base.remove([rel]);
    }
  } catch (_e) { /* no crítico */ }
}

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
    ship_domicilio: '',
    ship_sucursal: '',
    ship_free_from: '',
    mp_fee: '',
    // datos de cobro
    mp_access_token: '',   // ⬅️ NUEVO: token por marca
    mp_alias: '',
    mp_cvu: '',
    mp_cbu: '',
    mp_holder: '',
    // visuales
    avatar_url: '',
    cover_photos: [],
  };
  const [form, setForm] = useState(emptyForm);
  const [editingSlug, setEditingSlug] = useState(null); // null → create; string → edit
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const fileAvatarRef = useRef(null);
  const fileCoverRef  = useRef(null);

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
      .select(`
        name, slug, description, avatar_url, cover_photos,
        ship_domicilio, ship_sucursal, ship_free_from,
        mp_fee, mp_access_token, mp_alias, mp_cvu, mp_cbu, mp_holder
      `)
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
    // limpiar inputs file
    if (fileAvatarRef.current) fileAvatarRef.current.value = '';
    if (fileCoverRef.current) fileCoverRef.current.value = '';
  }

  function startEdit(brand) {
    setEditingSlug(brand.slug);
    setForm({
      name: brand.name || '',
      slug: brand.slug || '',
      description: brand.description || '',
      ship_domicilio: brand.ship_domicilio ?? '',
      ship_sucursal: brand.ship_sucursal ?? '',
      ship_free_from: brand.ship_free_from ?? '',
      mp_fee: brand.mp_fee ?? '',
      mp_access_token: brand.mp_access_token || '', // ⬅️ token en edición
      mp_alias: brand.mp_alias || '',
      mp_cvu: brand.mp_cvu || '',
      mp_cbu: brand.mp_cbu || '',
      mp_holder: brand.mp_holder || '',
      avatar_url: brand.avatar_url || '',
      cover_photos: Array.isArray(brand.cover_photos) ? brand.cover_photos : [],
    });
    setErr('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (fileAvatarRef.current) fileAvatarRef.current.value = '';
    if (fileCoverRef.current) fileCoverRef.current.value = '';
  }

  async function submitForm(e) {
    e?.preventDefault?.();
    setErr('');

    if (!form.name.trim()) return setErr('Ingresá el nombre de la marca.');
    if (!form.slug.trim()) return setErr('Ingresá el slug (único).');

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: form.description || null,
      ship_domicilio: form.ship_domicilio === '' ? null : toNumber(form.ship_domicilio, null),
      ship_sucursal: form.ship_sucursal === '' ? null : toNumber(form.ship_sucursal, null),
      ship_free_from: form.ship_free_from === '' ? null : toNumber(form.ship_free_from, null),
      mp_fee: form.mp_fee === '' ? null : toNumber(form.mp_fee, null),
      // cobro (token + opcionales según cómo cobren)
      mp_access_token: form.mp_access_token || null,
      mp_alias: form.mp_alias || null,
      mp_cvu: form.mp_cvu || null,
      mp_cbu: form.mp_cbu || null,
      mp_holder: form.mp_holder || null,
      // imágenes
      avatar_url: form.avatar_url || null,
      cover_photos: Array.isArray(form.cover_photos) && form.cover_photos.length ? form.cover_photos : null,
    };

    try {
      setBusy(true);
      if (editingSlug) {
        const { error } = await supabase.from('brands').update(payload).eq('slug', editingSlug);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('brands').insert(payload);
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
      // Nota: esto NO borra archivos del bucket; podríamos hacerlo si querés.
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

  // ===== Uploads =====
  async function onPickAvatar(e) {
    const file = e?.target?.files?.[0];
    const slug = (editingSlug ? editingSlug : form.slug)?.trim();
    if (!file) return;
    if (!slug) { setErr('Para subir avatar primero completá el Slug.'); return; }
    setErr('');
    try {
      setBusy(true);
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g,'') || 'jpg';
      const path = pathAvatar(slug, ext);
      await uploadFile(file, path, true);
      const url = publicUrl(path);
      // Persistir en DB
      const { error } = await supabase.from('brands').update({ avatar_url: url }).eq('slug', slug);
      if (error) throw error;

      // Refrescar form/lista si corresponde
      setForm(f => ({ ...f, avatar_url: url }));
      if (editingSlug === slug) {
        setList(prev => prev.map(b => b.slug === slug ? { ...b, avatar_url: url } : b));
      }
    } catch (e2) {
      setErr(e2?.message || String(e2));
    } finally {
      setBusy(false);
      if (fileAvatarRef.current) fileAvatarRef.current.value = '';
    }
  }

  async function onPickCover(e) {
    const file = e?.target?.files?.[0];
    const slug = (editingSlug ? editingSlug : form.slug)?.trim();
    if (!file) return;
    if (!slug) { setErr('Para subir portadas primero completá el Slug.'); return; }
    setErr('');
    try {
      setBusy(true);
      const safe = file.name.replace(/[^a-z0-9_\-.]/gi, '_').toLowerCase();
      const path = pathCover(slug, safe);
      await uploadFile(file, path, false);
      const url = publicUrl(path);

      const current = editingSlug
        ? (list.find(b=>b.slug===slug)?.cover_photos||[])
        : (form.cover_photos||[]);
      const next = Array.isArray(current) ? [...current] : [];
      next.push(url);

      const { error } = await supabase.from('brands').update({ cover_photos: next }).eq('slug', slug);
      if (error) throw error;

      if (editingSlug) {
        setList(prev => prev.map(b => b.slug === slug ? { ...b, cover_photos: next } : b));
        if (editingSlug === form.slug) setForm(f => ({ ...f, cover_photos: next }));
      } else {
        setForm(f => ({ ...f, cover_photos: next }));
      }
    } catch (e2) {
      setErr(e2?.message || String(e2));
    } finally {
      setBusy(false);
      if (fileCoverRef.current) fileCoverRef.current.value = '';
    }
  }

  async function removeCoverUrl(i) {
    const slug = (editingSlug ? editingSlug : form.slug)?.trim();
    if (!slug) return;
    const current = editingSlug
      ? (list.find(b => b.slug === slug)?.cover_photos || [])
      : (form.cover_photos || []);
    if (!Array.isArray(current) || i < 0 || i >= current.length) return;

    const toRemove = current[i];
    setErr('');
    try {
      setBusy(true);
      await removePublicFileIfBelongs(toRemove);

      const next = [...current];
      next.splice(i, 1);
      const { error } = await supabase.from('brands').update({ cover_photos: next.length ? next : null }).eq('slug', slug);
      if (error) throw error;

      if (editingSlug) {
        setList(prev => prev.map(b => b.slug === slug ? { ...b, cover_photos: next } : b));
        if (editingSlug === form.slug) setForm(f => ({ ...f, cover_photos: next }));
      } else {
        setForm(f => ({ ...f, cover_photos: next }));
      }
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

        {/* Avatar + Portadas (UPLOAD) */}
        <div className="mt row" style={{ gap:12, alignItems:'center' }}>
          <div style={{ flex: '0 0 140px' }}>
            <label className="small">Avatar</label>
            <div style={{ width: 120, height: 120, borderRadius: 12, border:'1px solid var(--line)', overflow:'hidden', background:'#0f1118' }}>
              {form.avatar_url ? (
                <img alt="" src={form.avatar_url} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
              ) : (
                <div style={{ width:'100%', height:'100%', display:'grid', placeItems:'center', color:'var(--muted)' }}>Sin avatar</div>
              )}
            </div>
            <div className="mt">
              <input ref={fileAvatarRef} type="file" accept="image/*" onChange={onPickAvatar} />
              <div className="small" style={{ color:'var(--muted)' }}>Requiere completar Slug</div>
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <label className="small">Portadas guardadas</label>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px,1fr))', gap:8 }}>
              {(form.cover_photos || []).map((u, i) => (
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
              {(!form.cover_photos || form.cover_photos.length === 0) && (
                <div className="small" style={{ color:'var(--muted)' }}>Aún no cargaste portadas.</div>
              )}
            </div>
            <div className="mt">
              <input ref={fileCoverRef} type="file" accept="image/*" onChange={onPickCover} />
              <div className="small" style={{ color:'var(--muted)' }}>Requiere completar Slug</div>
            </div>
          </div>
        </div>

        {/* Envíos */}
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

        {/* Cobro - MP */}
        <div className="mt row" style={{ gap: 12 }}>
          <div style={{ flex: 2 }}>
            <label className="small">Token de MP (privado)</label>
            <input
              className="input"
              type="text"
              placeholder="APP_USR-XXXXXXXXX..."
              value={form.mp_access_token}
              onChange={e=>setForm(f=>({...f, mp_access_token: e.target.value}))}
            />
            <div className="small" style={{ color:'var(--muted)', marginTop: 6 }}>
              Este token pertenece a la cuenta del vendedor en Mercado Pago. No lo compartas.
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <label className="small">Alias</label>
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
