// CONTENT-ONLY: sin Topbar/Layout (usa tu layout global)
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

function uid(){ return (globalThis?.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)); }

async function fetchRole() {
  const { data: s } = await supabase.auth.getSession();
  const user = s?.session?.user;
  if (!user) return { user: null, role: null };
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  return { user, role: data?.role || 'user' };
}
async function fetchBrandsForUser({ user, role }) {
  if (role === 'admin') {
    const { data } = await supabase.from('brands').select('slug,name,logo_url,cover_urls,description,instagram,ship_domicilio,ship_sucursal,ship_free_from').order('name');
    return data || [];
  }
  const { data: assigned } = await supabase.from('brands_vendors').select('brand_slug').eq('user_id', user.id);
  if (Array.isArray(assigned) && assigned.length){
    const slugs = assigned.map(x=>x.brand_slug);
    const { data } = await supabase.from('brands').select('slug,name,logo_url,cover_urls,description,instagram,ship_domicilio,ship_sucursal,ship_free_from').in('slug', slugs).order('name');
    return data || [];
  }
  return [];
}

export default function VendedorPerfilContent(){
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [myBrands, setMyBrands] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState('');
  const [brand, setBrand] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    let active = true;
    (async () => {
      const { user, role } = await fetchRole();
      if (!active) return;
      setRole(role);
      const list = await fetchBrandsForUser({ user, role });
      if (!active) return;
      setMyBrands(list);
      if (!selectedSlug && list?.[0]?.slug) setSelectedSlug(list[0].slug);
    })();
    return () => { active = false; };
  }, [session]);

  useEffect(() => {
    if(!selectedSlug) { setBrand(null); return; }
    let active = true;
    (async () => {
      const { data } = await supabase.from('brands').select('*').eq('slug', selectedSlug).maybeSingle();
      if (!active) return;
      setBrand(data || null);
    })();
    return () => { active = false; };
  }, [selectedSlug]);

  async function updateField(field, value){
    if (!brand) return;
    setSaving(true);
    const { error } = await supabase.from('brands').update({ [field]: value }).eq('slug', brand.slug);
    setSaving(false);
    if (error) return alert(error.message);
    setBrand(b => ({ ...b, [field]: value }));
    setMsg('Guardado ✔'); setTimeout(()=>setMsg(''), 1200);
  }

  async function uploadLogo(e){
    const file = e.target.files?.[0]; if(!file || !brand) return;
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `brands/${brand.slug}/logo-${uid()}.${ext}`;
    const { error } = await supabase.storage.from('media').upload(path, file, { upsert:false, cacheControl:'3600' });
    if (error) return alert(error.message);
    const { data } = supabase.storage.from('media').getPublicUrl(path);
    await updateField('logo_url', data.publicUrl);
    e.target.value='';
  }

  async function uploadCovers(e){
    const files = Array.from(e.target.files || []);
    if (!files.length || !brand) return;
    const urls = Array.isArray(brand.cover_urls) ? [...brand.cover_urls] : [];
    for (const file of files){
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `brands/${brand.slug}/covers/${uid()}.${ext}`;
      const { error } = await supabase.storage.from('media').upload(path, file, { upsert:false, cacheControl:'3600' });
      if (error) { alert(error.message); continue; }
      const { data } = supabase.storage.from('media').getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    await updateField('cover_urls', urls);
    e.target.value='';
  }

  if (!session) return <div>Iniciá sesión.</div>;
  if (!role || (role!=='admin' && role!=='vendor')) return <div>No tenés permiso para ver Vendedor.</div>;

  return (
    <section>
      <h1>Vendedor — Perfil & Portadas</h1>
      <div className="card">
        <label className="lbl">Marca</label>
        <select value={selectedSlug} onChange={e=>setSelectedSlug(e.target.value)}>
          {(myBrands||[]).map(b => <option key={b.slug} value={b.slug}>{b.name}</option>)}
        </select>
      </div>

      {brand && (
        <div className="card">
          <div className="row gap">
            <div style={{width:160}}>
              <div className="lbl">Logo</div>
              <img src={brand.logo_url || '/logo.png'} alt="" style={{width:'100%', height:120, objectFit:'cover', borderRadius:12, border:'1px solid var(--line)'}}/>
              <input type="file" accept="image/*" onChange={uploadLogo} disabled={saving} />
            </div>
            <div style={{flex:1}}>
              <div className="lbl">Descripción</div>
              <textarea defaultValue={brand.description || ''} rows={3} onBlur={(e)=>updateField('description', e.target.value)} />
              <div className="row gap">
                <div style={{flex:1}}>
                  <div className="lbl">Instagram</div>
                  <input defaultValue={brand.instagram || ''} onBlur={(e)=>updateField('instagram', e.target.value)} placeholder="@usuario o url" />
                </div>
              </div>
              <div className="row gap">
                <div>
                  <div className="lbl">Envío a domicilio (ARS)</div>
                  <input type="number" defaultValue={brand.ship_domicilio ?? ''} onBlur={(e)=>updateField('ship_domicilio', e.target.value===''? null : Number(e.target.value))}/>
                </div>
                <div>
                  <div className="lbl">Envío a sucursal (ARS)</div>
                  <input type="number" defaultValue={brand.ship_sucursal ?? ''} onBlur={(e)=>updateField('ship_sucursal', e.target.value===''? null : Number(e.target.value))}/>
                </div>
                <div>
                  <div className="lbl">Envío gratis desde (ARS)</div>
                  <input type="number" defaultValue={brand.ship_free_from ?? 0} onBlur={(e)=>updateField('ship_free_from', Number(e.target.value||0))}/>
                </div>
              </div>
            </div>
          </div>

          <div className="lbl" style={{marginTop:10}}>Portadas (múltiples)</div>
          <div className="thumbs">
            {(brand.cover_urls || []).map((u,i)=>(<img key={i} src={u} alt="" />))}
          </div>
          <input type="file" multiple accept="image/*" onChange={uploadCovers} disabled={saving} />

          {msg && <div className="small" style={{marginTop:8}}>{msg}</div>}
        </div>
      )}

      <style jsx>{`
        .lbl{ display:block; margin:8px 0 6px; font-weight:600; }
        .row{ display:flex; }
        .gap{ gap:12px; }
        .card{ border:1px solid var(--line); border-radius:12px; padding:14px; background:#0e0f16; margin-bottom:12px; }
        select, input, textarea{ width:100%; background:#0f1118; border:1px solid var(--line); color:var(--text); border-radius:10px; padding:8px; }
        .thumbs{ display:flex; gap:8px; margin-bottom:8px; flex-wrap:wrap; }
        .thumbs img{ width:100px; height:64px; object-fit:cover; border-radius:8px; border:1px solid var(--line); }
      `}</style>
    </section>
  );
}
