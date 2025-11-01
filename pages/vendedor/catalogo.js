// CONTENT-ONLY
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import ImageUploader from '../../components/ImageUploader';
import Toast from '../../components/Toast';

function isAdmin(role){ return role==='admin'; }

async function getRole(){
  const { data: s } = await supabase.auth.getSession();
  const user = s?.session?.user;
  if(!user) return { user:null, role:null };
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  return { user, role: data?.role || 'user' };
}
async function getBrands({ user, role }){
  if(isAdmin(role)){
    const { data } = await supabase.from('brands').select('slug,name').order('name');
    return data||[];
  }
  const { data: rel } = await supabase.from('brands_vendors').select('brand_slug').eq('user_id', user.id);
  if(rel?.length){
    const slugs = rel.map(r=>r.brand_slug);
    const { data } = await supabase.from('brands').select('slug,name').in('slug', slugs).order('name');
    return data||[];
  }
  return [];
}

export default function VendedorCatalogo(){
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [brands, setBrands] = useState([]);
  const [slug, setSlug] = useState('');
  const [items, setItems] = useState([]);
  const [edit, setEdit] = useState(null);
  const [toast, setToast] = useState('');

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>setSession(data.session||null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e,s)=>setSession(s));
    return ()=>sub.subscription.unsubscribe();
  }, []);

  useEffect(()=>{ if(!session) return; let on=true; (async ()=>{
    const { user, role } = await getRole();
    if(!on) return;
    setRole(role);
    const b = await getBrands({ user, role });
    if(!on) return;
    setBrands(b);
    if(!slug && b?.[0]?.slug) setSlug(b[0].slug);
  })(); return ()=>{ on=false; }; }, [session]);

  useEffect(()=>{ if(!slug) return setItems([]); let on=true; (async ()=>{
    const { data } = await supabase.from('products').select('id,name,price,stock,description,image_url,created_at').eq('brand_slug', slug).order('created_at',{ascending:false});
    if(!on) return;
    setItems(data||[]);
  })(); return ()=>{ on=false; }; }, [slug]);

  if(!session || !(role==='admin' || role==='vendor')) return <div>No tenés permiso para ver Vendedor.</div>;

  async function createProduct(){
    const name = prompt('Nombre del producto');
    if(!name) return;
    const { data, error } = await supabase.from('products').insert({ brand_slug: slug, name, price: 0, stock: 1 }).select().single();
    if(error) return alert(error.message);
    setItems(it=>[data,...it]);
    setToast('Producto creado');
  }

  async function updateProduct(id, patch){
    const { error } = await supabase.from('products').update(patch).eq('id', id);
    if(error) return alert(error.message);
    setItems(it=>it.map(p=>p.id===id?{...p, ...patch}:p));
    setToast('Guardado');
  }
  async function deleteProduct(id){
    if(!confirm('¿Eliminar producto?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if(error) return alert(error.message);
    setItems(it=>it.filter(p=>p.id!==id));
    setToast('Eliminado');
  }

  async function onMainImage(urls){
    if(!edit || !urls?.length) return;
    await updateProduct(edit.id, { image_url: urls[0] });
  }
  async function onGallery(urls){
    if(!edit || !urls?.length) return;
    for(const u of urls){
      const { error } = await supabase.from('product_images').insert({ product_id: edit.id, url: u, position: 999 });
      if(error) { alert(error.message); return; }
    }
    setToast('Imágenes agregadas');
  }

  return (
    <section>
      <h1>Vendedor — Catálogo</h1>

      <div className="card">
        <label className="lbl">Marca</label>
        <select value={slug} onChange={e=>setSlug(e.target.value)}>
          {brands.map(b=>(<option key={b.slug} value={b.slug}>{b.name}</option>))}
        </select>
      </div>

      <div className="card">
        <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
          <strong>Productos ({items.length})</strong>
          <button className="btn" onClick={createProduct}>+ Nuevo producto</button>
        </div>
        <div className="list">
          {items.map(p=>(
            <div key={p.id} className="row item">
              <div className="left">
                <img src={p.image_url || '/logo.png'} alt="" className="thumb" onClick={()=>setEdit(p)}/>
                <div>
                  <input className="in" defaultValue={p.name} onBlur={(e)=>updateProduct(p.id,{name:e.target.value})}/>
                  <div className="row" style={{gap:8}}>
                    <input className="in sm" type="number" defaultValue={p.price} onBlur={(e)=>updateProduct(p.id,{price:Number(e.target.value||0)})} placeholder="Precio"/>
                    <input className="in sm" type="number" defaultValue={p.stock??1} onBlur={(e)=>updateProduct(p.id,{stock:Math.max(1,Number(e.target.value||1))})} placeholder="Stock"/>
                  </div>
                </div>
              </div>
              <div className="row" style={{gap:8}}>
                <button className="btn-ghost" onClick={()=>setEdit(p)}>Editar</button>
                <button className="btn-ghost" onClick={()=>deleteProduct(p.id)}>Eliminar</button>
              </div>
            </div>
          ))}
          {items.length===0 && <div className="small">No hay productos</div>}
        </div>
      </div>

      {edit && (
        <div className="modal" onClick={()=>setEdit(null)}>
          <div className="box" onClick={e=>e.stopPropagation()}>
            <h3>Editar: {edit.name}</h3>
            <div className="row gap">
              <div style={{width:220}}>
                <div className="lbl">Imagen principal</div>
                <img src={edit.image_url || '/logo.png'} className="big" alt=""/>
                <ImageUploader folder={`brands/${slug}/products/${edit.id}`} onUploaded={onMainImage} />
              </div>
              <div style={{flex:1}}>
                <div className="lbl">Descripción</div>
                <textarea className="in" rows={5} defaultValue={edit.description||''} onBlur={(e)=>updateProduct(edit.id,{description:e.target.value})}/>
                <div className="lbl">Galería (máx 5, se recomienda 1:1)</div>
                <ImageUploader folder={`brands/${slug}/products/${edit.id}/gallery`} multiple onUploaded={onGallery}/>
              </div>
            </div>
            <div className="row" style={{justifyContent:'flex-end', marginTop:10}}>
              <button className="btn" onClick={()=>setEdit(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      <Toast msg={toast} onDone={()=>setToast('')} />

      <style jsx>{`
        .lbl{ display:block; margin:8px 0 6px; font-weight:600; }
        .card{ border:1px solid var(--line); border-radius:12px; padding:14px; background:#0e0f16; margin-bottom:12px; }
        select, input.in, textarea.in{ background:#0f1118; border:1px solid var(--line); color:var(--text); border-radius:10px; padding:8px; }
        .list{ display:flex; flex-direction:column; gap:10px; }
        .item{ border:1px solid var(--line); border-radius:10px; padding:10px; justify-content:space-between; align-items:center; }
        .row{ display:flex; align-items:center; }
        .left{ display:flex; gap:10px; align-items:center; }
        .thumb{ width:60px; height:60px; object-fit:cover; border-radius:8px; border:1px solid var(--line); cursor:pointer; }
        .in.sm{ width:120px; }
        .btn{ padding:8px 12px; background:#7c3aed; color:#fff; border:0; border-radius:10px; cursor:pointer; }
        .btn-ghost{ padding:6px 10px; border-radius:8px; background:none; border:1px solid var(--line); color:var(--text); cursor:pointer; }
        /* Modal */
        .modal{ position:fixed; inset:0; background:rgba(0,0,0,.5); display:flex; align-items:center; justify-content:center; z-index:9999; }
        .box{ width:min(920px, 96vw); background:#0e0f16; border:1px solid var(--line); border-radius:14px; padding:14px; }
        .big{ width:100%; height:180px; object-fit:cover; border:1px solid var(--line); border-radius:12px; margin-bottom:8px; }
      `}</style>
    </section>
  );
}
