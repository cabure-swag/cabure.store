
import { useEffect,useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function VCat(){
  const [role,setRole]=useState(null);
  const [brands,setBrands]=useState([]);
  const [sel,setSel]=useState('');
  const [products,setProducts]=useState([]);

  useEffect(()=>{(async()=>{
    const {data:s}=await supabase.auth.getSession();const u=s?.session?.user;if(!u)return;
    const {data:me}=await supabase.from('profiles').select('role').eq('id',u.id).single();setRole(me?.role||'user');
    if(me?.role==='admin'){const {data:bs}=await supabase.from('brands').select('slug');setBrands((bs||[]).map(x=>x.slug));}
    else{const {data:vb}=await supabase.from('vendor_brands').select('brand_slug').eq('user_id',u.id);setBrands((vb||[]).map(x=>x.brand_slug));}
  })()},[]);

  useEffect(()=>{(async()=>{if(!sel)return;const {data}=await supabase.from('products').select('*').eq('brand_slug',sel).order('name');setProducts(data||[])})()},[sel]);

  async function add(e){
    e.preventDefault();const f=new FormData(e.currentTarget);
    const file=f.get('image'); let image_url=null;
    if(file && file.size>0){const path=`products/${sel}/${Date.now()}_${file.name}`;const {error:e1}=await supabase.storage.from('media').upload(path,file);if(e1)return alert(e1.message);const {data:pub}=await supabase.storage.from('media').getPublicUrl(path);image_url=pub?.publicUrl||null}
    const payload={brand_slug:sel,name:f.get('name'),price:Number(f.get('price')||0),stock:Number(f.get('stock')||0),image_url};
    const {error}=await supabase.from('products').insert(payload);if(error)return alert(error.message);e.currentTarget.reset();const {data}=await supabase.from('products').select('*').eq('brand_slug',sel).order('name');setProducts(data||[]);
  }

  if(role!=='vendor'&&role!=='admin') return <main className='container'><h1 className='h1'>403</h1></main>;
  return (<main className='container'>
    <h1 className='h1'>Catálogo & Perfil</h1>
    <div className='row'><label>Marca</label><select value={sel} onChange={e=>setSel(e.target.value)}><option value='' disabled>Elegí...</option>{brands.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
    {sel && (<>
      <div className='card mt'><strong>Agregar producto</strong><form onSubmit={add} className='grid' style={{gridTemplateColumns:'repeat(2,1fr)'}}><div><label>Nombre</label><input className='input' name='name' required/></div><div><label>Precio</label><input className='input' name='price' type='number' min='0' required/></div><div><label>Stock</label><input className='input' name='stock' type='number' min='0' required/></div><div><label>Imagen (archivo)</label><input className='input' name='image' type='file' accept='image/*'/></div><div style={{gridColumn:'1/-1'}}><button className='btn'>Crear</button></div></form></div>
      <div className='grid mt' style={{gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))'}}>{products.map(p=>(<div key={p.id} className='card'><img src={p.image_url||'/logo.png'} alt={p.name} style={{width:'100%',height:140,objectFit:'cover',borderRadius:10,marginBottom:8,border:'1px solid var(--line)'}}/><div className='row'><strong>{p.name}</strong><span>${p.price}</span></div></div>))}</div>
    </>)}
  </main>);
}
