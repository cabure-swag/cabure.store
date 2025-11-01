// CONTENT-ONLY: sin Topbar/Layout (usa tu layout global)
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

function uid(){ return (globalThis?.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)); }

export default function AdminMarcasContent(){
  const [ok, setOk] = useState(false);
  const [brands, setBrands] = useState([]);
  const [users, setUsers] = useState([]);
  const [sel, setSel] = useState(null);
  const [assign, setAssign] = useState([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      const user = s?.session?.user;
      if (!user) return;
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (data?.role === 'admin') setOk(true);
    })();
  }, []);

  useEffect(()=>{
    if(!ok) return;
    (async ()=>{
      const { data } = await supabase.from('brands').select('*').order('name');
      setBrands(data || []);
      const { data: us } = await supabase.from('profiles').select('id,email,role').order('email');
      setUsers(us || []);
    })();
  }, [ok]);

  useEffect(()=>{
    if (!sel) { setAssign([]); return; }
    (async ()=>{
      const { data } = await supabase.from('brands_vendors').select('user_id').eq('brand_slug', sel.slug);
      setAssign((data||[]).map(x=>x.user_id));
    })();
  }, [sel]);

  async function createBrand(){
    const name = prompt('Nombre de la marca:');
    if (!name) return;
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const { error } = await supabase.from('brands').insert({ slug, name, cover_urls: [] });
    if (error) return alert(error.message);
    const { data } = await supabase.from('brands').select('*').eq('slug', slug).maybeSingle();
    setBrands(b => [data, ...b]);
    setSel(data);
  }

  async function updateField(field, value){
    if (!sel) return;
    const { error } = await supabase.from('brands').update({ [field]: value }).eq('slug', sel.slug);
    if (error) return alert(error.message);
    setSel(s => ({ ...s, [field]: value }));
    setBrands(b => b.map(x => x.slug===sel.slug ? ({ ...x, [field]: value }) : x));
    setMsg('Guardado ✔'); setTimeout(()=>setMsg(''), 1000);
  }

  async function upload(e, type){
    const files = Array.from(e.target.files || []);
    if (!files.length || !sel) return;

    if (type === 'logo'){
      const file = files[0];
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `brands/${sel.slug}/logo-${uid()}.${ext}`;
      const { error } = await supabase.storage.from('media').upload(path, file, { upsert:false, cacheControl:'3600' });
      if (error) return alert(error.message);
      const { data } = supabase.storage.from('media').getPublicUrl(path);
      await updateField('logo_url', data.publicUrl);
      e.target.value='';
      return;
    }

    if (type === 'covers'){
      const urls = Array.isArray(sel.cover_urls) ? [...sel.cover_urls] : [];
      for (const file of files){
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `brands/${sel.slug}/covers/${uid()}.${ext}`;
        const { error } = await supabase.storage.from('media').upload(path, file, { upsert:false, cacheControl:'3600' });
        if (error) { alert(error.message); continue; }
        const { data } = supabase.storage.from('media').getPublicUrl(path);
        urls.push(data.publicUrl);
      }
      await updateField('cover_urls', urls);
      e.target.value='';
      return;
    }
  }

  async function toggleAssign(user_id){
    if (!sel) return;
    const exists = assign.includes(user_id);
    if (exists){
      const { error } = await supabase.from('brands_vendors').delete().eq('brand_slug', sel.slug).eq('user_id', user_id);
      if (error) return alert(error.message);
    } else {
      const { error } = await supabase.from('brands_vendors').insert({ brand_slug: sel.slug, user_id });
      if (error) return alert(error.message);
    }
    const { data } = await supabase.from('brands_vendors').select('user_id').eq('brand_slug', sel.slug);
    setAssign((data||[]).map(x=>x.user_id));
  }

  if (!ok) return <div>No tenés permiso para ver Admin.</div>;

  return (
    <section>
      <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
        <h1>Admin — Marcas</h1>
        <button className="btn" onClick={createBrand}>+ Crear marca</button>
      </div>

      <div className="grid">
        <div className="card">
          <h3>Listado</h3>
          <div className="list">
            {brands.map(b => (
              <button key={b.slug} className={`item ${sel?.slug===b.slug?'on':''}`} onClick={()=>setSel(b)}>
                <img src={b.logo_url || '/logo.png'} alt="" />
                <div>
                  <div>{b.name}</div>
                  <div className="small muted">{b.slug}</div>
                </div>
              </button>
            ))}
            {brands.length===0 && <div className="small">No hay marcas.</div>}
          </div>
        </div>

        <div className="card">
          <h3>Detalle</h3>
          {!sel ? (
            <div className="small">Seleccioná una marca para editar.</div>
          ) : (
            <div className="detail">
              <div className="row gap">
                <div>
                  <div className="lbl">Logo</div>
                  <div className="row" style={{alignItems:'center', gap:8}}>
                    <img src={sel.logo_url || '/logo.png'} alt="" style={{width:64, height:64, borderRadius:12, objectFit:'cover', border:'1px solid var(--line)'}}/>
                    <input type="file" accept="image/*" onChange={(e)=>upload(e,'logo')} />
                  </div>
                </div>
                <div style={{flex:1}}>
                  <div className="lbl">Nombre</div>
                  <input defaultValue={sel.name} onBlur={(e)=>updateField('name', e.target.value)} />
                </div>
                <div style={{flex:1}}>
                  <div className="lbl">Instagram</div>
                  <input defaultValue={sel.instagram || ''} onBlur={(e)=>updateField('instagram', e.target.value)} placeholder="@usuario o url" />
                </div>
              </div>

              <div className="lbl">Descripción</div>
              <textarea defaultValue={sel.description || ''} onBlur={(e)=>updateField('description', e.target.value)} rows={3}/>

              <div className="lbl">Portadas (múltiples)</div>
              <div className="row" style={{alignItems:'center', gap:8}}>
                <div className="thumbs">
                  {(sel.cover_urls || []).map((u,i)=>(
                    <img key={i} src={u} alt="" />
                  ))}
                </div>
                <input type="file" multiple accept="image/*" onChange={(e)=>upload(e,'covers')} />
              </div>

              <h3 style={{marginTop:16}}>Mercado Pago (por marca)</h3>
              <div className="grid2">
                <div><div className="lbl">Alias</div><input defaultValue={sel.mp_alias || ''} onBlur={(e)=>updateField('mp_alias', e.target.value)} /></div>
                <div><div className="lbl">CBU/CVU</div><input defaultValue={sel.mp_cbu || ''} onBlur={(e)=>updateField('mp_cbu', e.target.value)} /></div>
                <div><div className="lbl">Titular</div><input defaultValue={sel.mp_titular || ''} onBlur={(e)=>updateField('mp_titular', e.target.value)} /></div>
                <div><div className="lbl">Access Token</div><input defaultValue={sel.mp_access_token || ''} onBlur={(e)=>updateField('mp_access_token', e.target.value)} /></div>
                <div><div className="lbl">Public Key</div><input defaultValue={sel.mp_public_key || ''} onBlur={(e)=>updateField('mp_public_key', e.target.value)} /></div>
              </div>

              <h3 style={{marginTop:16}}>Asignar vendedores</h3>
              <div className="list-users">
                {users.map(u => {
                  const checked = assign.includes(u.id);
                  return (
                    <label key={u.id} className="row user">
                      <input type="checkbox" checked={checked} onChange={()=>toggleAssign(u.id)} />
                      <span>{u.email}</span>
                      {u.role && <span className="badge">{u.role}</span>}
                    </label>
                  );
                })}
              </div>

              {msg && <div className="small" style={{marginTop:8}}>{msg}</div>}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .row{ display:flex; }
        .gap{ gap:12px; }
        .grid{ display:grid; gap:12px; grid-template-columns: 300px 1fr; }
        .card{ border:1px solid var(--line); border-radius:12px; padding:14px; background:#0e0f16; }
        .list{ display:flex; flex-direction:column; gap:8px; max-height:60vh; overflow:auto; }
        .item{ display:flex; align-items:center; gap:8px; padding:8px; border:1px solid var(--line); border-radius:10px; background:#0f1118; cursor:pointer; text-align:left; }
        .item img{ width:40px; height:40px; border-radius:10px; object-fit:cover; }
        .item.on{ outline:1px solid rgba(124,58,237,.5); }
        .small{ font-size:.9rem; }
        .muted{ color:var(--muted); }
        .lbl{ font-weight:600; margin:8px 0 6px; }
        input, textarea{ width:100%; background:#0f1118; border:1px solid var(--line); color:var(--text); border-radius:10px; padding:8px; }
        .thumbs{ display:flex; gap:8px; flex-wrap:wrap; }
        .thumbs img{ width:84px; height:56px; object-fit:cover; border-radius:8px; border:1px solid var(--line); }
        .grid2{ display:grid; gap:8px; grid-template-columns: repeat(auto-fill, minmax(220px,1fr)); }
        .list-users{ display:flex; flex-direction:column; gap:6px; max-height:30vh; overflow:auto; }
        .user{ gap:8px; align-items:center; }
        .badge{ margin-left:auto; font-size:.8rem; opacity:.8; }
        .btn{ padding:8px 12px; border-radius:10px; background:#7c3aed; color:#fff; border:0; cursor:pointer; }
      `}</style>
    </section>
  );
}
