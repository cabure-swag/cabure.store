// CONTENT-ONLY
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import ImageUploader from '../../components/ImageUploader';
import Toast from '../../components/Toast';

export default function AdminMarcas(){
  const [ok, setOk] = useState(false);
  const [brands, setBrands] = useState([]);
  const [sel, setSel] = useState(null);
  const [users, setUsers] = useState([]);
  const [assigned, setAssigned] = useState([]);
  const [toast, setToast] = useState('');

  useEffect(()=>{ (async ()=>{
    const { data: s } = await supabase.auth.getSession();
    const user = s?.session?.user;
    if(!user) return;
    const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if(data?.role==='admin') setOk(true);
  })(); }, []);

  useEffect(()=>{ if(!ok) return; (async ()=>{
    const { data: b } = await supabase.from('brands').select('*').order('name');
    setBrands(b||[]);
    const { data: us } = await supabase.from('profiles').select('id,email,role').order('email');
    setUsers(us||[]);
  })(); }, [ok]);

  useEffect(()=>{ if(!sel) return setAssigned([]); (async ()=>{
    const { data } = await supabase.from('brands_vendors').select('user_id').eq('brand_slug', sel.slug);
    setAssigned((data||[]).map(x=>x.user_id));
  })(); }, [sel]);

  if(!ok) return <div>No tenés permiso para ver Admin.</div>;

  async function createBrand(){
    const name = prompt('Nombre de la marca');
    if(!name) return;
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-');
    const { error } = await supabase.from('brands').insert({ slug, name, cover_urls: [] });
    if(error) return alert(error.message);
    const { data } = await supabase.from('brands').select('*').eq('slug', slug).maybeSingle();
    setBrands(b=>[data,...b]); setSel(data);
    setToast('Marca creada');
  }

  async function upd(field, value){
    if(!sel) return;
    const { error } = await supabase.from('brands').update({ [field]: value }).eq('slug', sel.slug);
    if(error) return alert(error.message);
    setSel(s=>({...s, [field]: value}));
    setBrands(b=>b.map(x=>x.slug===sel.slug ? ({...x,[field]:value}) : x));
    setToast('Guardado');
  }

  async function uploadLogo(urls){
    if(!urls?.length) return;
    await upd('logo_url', urls[0]);
  }
  async function uploadCovers(urls){
    const arr = Array.isArray(sel.cover_urls) ? [...sel.cover_urls] : [];
    const joined = [...arr, ...urls];
    await upd('cover_urls', joined);
  }
  async function removeCover(i){
    const arr = Array.isArray(sel.cover_urls) ? [...sel.cover_urls] : [];
    arr.splice(i,1);
    await upd('cover_urls', arr);
  }

  async function toggleVendor(uid){
    if(!sel) return;
    if(assigned.includes(uid)){
      const { error } = await supabase.from('brands_vendors').delete().eq('brand_slug', sel.slug).eq('user_id', uid);
      if(error) return alert(error.message);
    }else{
      const { error } = await supabase.from('brands_vendors').insert({ brand_slug: sel.slug, user_id: uid });
      if(error) return alert(error.message);
    }
    const { data } = await supabase.from('brands_vendors').select('user_id').eq('brand_slug', sel.slug);
    setAssigned((data||[]).map(x=>x.user_id));
    setToast('Asignaciones actualizadas');
  }

  return (
    <section>
      <div className="row head">
        <h1>Admin — Marcas</h1>
        <button className="btn" onClick={createBrand}>+ Crear marca</button>
      </div>

      <div className="grid">
        <div className="card list">
          {brands.map(b=>(
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

        <div className="card">
          {!sel ? <div className="small">Seleccioná una marca.</div> : (
            <div className="detail">
              <div className="row gap">
                <div>
                  <div className="lbl">Logo</div>
                  <img src={sel.logo_url || '/logo.png'} alt="" className="logo"/>
                  <ImageUploader folder={`brands/${sel.slug}`} multiple={false} onUploaded={uploadLogo}/>
                </div>
                <div style={{flex:1}}>
                  <div className="lbl">Nombre</div>
                  <input defaultValue={sel.name} onBlur={(e)=>upd('name', e.target.value)} />
                  <div className="lbl">Instagram</div>
                  <input defaultValue={sel.instagram || ''} onBlur={(e)=>upd('instagram', e.target.value)} placeholder="@usuario o url"/>
                </div>
              </div>

              <div className="lbl">Descripción</div>
              <textarea defaultValue={sel.description || ''} onBlur={(e)=>upd('description', e.target.value)} rows={3}/>

              <div className="lbl">Portadas (múltiples)</div>
              <div className="thumbs">
                {(sel.cover_urls||[]).map((u,i)=>(
                  <div key={i} className="th">
                    <img src={u} alt=""/>
                    <button className="mini" onClick={()=>removeCover(i)}>✕</button>
                  </div>
                ))}
              </div>
              <ImageUploader folder={`brands/${sel.slug}/covers`} multiple={true} onUploaded={uploadCovers}/>

              <h3 style={{marginTop:14}}>Mercado Pago (por marca)</h3>
              <div className="grid2">
                <div><div className="lbl">Alias</div><input defaultValue={sel.mp_alias||''} onBlur={(e)=>upd('mp_alias', e.target.value)} /></div>
                <div><div className="lbl">CBU/CVU</div><input defaultValue={sel.mp_cbu||''} onBlur={(e)=>upd('mp_cbu', e.target.value)} /></div>
                <div><div className="lbl">Titular</div><input defaultValue={sel.mp_titular||''} onBlur={(e)=>upd('mp_titular', e.target.value)} /></div>
                <div><div className="lbl">Access Token</div><input defaultValue={sel.mp_access_token||''} onBlur={(e)=>upd('mp_access_token', e.target.value)} /></div>
                <div><div className="lbl">Public Key</div><input defaultValue={sel.mp_public_key||''} onBlur={(e)=>upd('mp_public_key', e.target.value)} /></div>
              </div>

              <h3 style={{marginTop:14}}>Asignar vendedores</h3>
              <div className="list-users">
                {users.map(u=>{
                  const on = assigned.includes(u.id);
                  return (
                    <label key={u.id} className="row user">
                      <input type="checkbox" checked={on} onChange={()=>toggleVendor(u.id)} />
                      <span>{u.email}</span>
                      <span className="badge">{u.role||'user'}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <Toast msg={toast} onDone={()=>setToast('')} />

      <style jsx>{`
        .row{ display:flex; align-items:center; }
        .head{ justify-content:space-between; margin-bottom:10px; }
        .grid{ display:grid; gap:12px; grid-template-columns: 320px 1fr; }
        .card{ border:1px solid var(--line); border-radius:12px; padding:14px; background:#0e0f16; }
        .list{ display:flex; flex-direction:column; gap:8px; max-height:60vh; overflow:auto; }
        .item{ display:flex; gap:8px; align-items:center; text-align:left; padding:8px; border:1px solid var(--line); border-radius:10px; background:#0f1118; cursor:pointer; }
        .item img{ width:44px; height:44px; border-radius:10px; object-fit:cover; }
        .item.on{ outline:1px solid rgba(124,58,237,.45); }
        .small{ font-size:.9rem; }
        .muted{ color:var(--muted); }
        .lbl{ font-weight:600; margin:8px 0 6px; }
        input, textarea{ width:100%; background:#0f1118; border:1px solid var(--line); color:var(--text); border-radius:10px; padding:8px; }
        .logo{ width:72px; height:72px; border-radius:12px; object-fit:cover; border:1px solid var(--line); margin-bottom:6px; }
        .thumbs{ display:flex; gap:8px; flex-wrap:wrap; }
        .th{ position:relative; }
        .th img{ width:110px; height:70px; object-fit:cover; border-radius:8px; border:1px solid var(--line); }
        .mini{ position:absolute; top:4px; right:4px; border:1px solid var(--line); background:#0f1118; color:var(--text); border-radius:8px; padding:2px 6px; cursor:pointer; }
        .grid2{ display:grid; gap:8px; grid-template-columns: repeat(auto-fill, minmax(220px,1fr)); }
        .list-users{ display:flex; flex-direction:column; gap:6px; max-height:30vh; overflow:auto; }
        .user{ gap:8px; }
        .badge{ margin-left:auto; opacity:.8; font-size:.85rem; }
        .btn{ padding:8px 12px; background:#7c3aed; color:#fff; border:0; border-radius:10px; cursor:pointer; }
      `}</style>
    </section>
  );
}
