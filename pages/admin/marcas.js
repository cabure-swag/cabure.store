
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function AdminBrands(){
  const [role,setRole]=useState(null);
  const [brands,setBrands]=useState([]);

  useEffect(()=>{(async()=>{
    const {data:s}=await supabase.auth.getSession();
    const u=s?.session?.user;if(!u){setRole('guest');return}
    const {data:me}=await supabase.from('profiles').select('role').eq('id',u.id).single();
    setRole(me?.role||'user'); refresh();
  })()},[]);

  async function refresh(){const {data}=await supabase.from('brands').select('*').order('slug');setBrands(data||[])}

  if(role!=='admin') return <main className='container'><h1 className='h1'>403</h1><p className='small'>Solo Admin.</p></main>;

  async function onCreateBrand(e){
    e.preventDefault();
    const f=new FormData(e.currentTarget);
    const slug=f.get('slug'); const name=f.get('name'); const description=f.get('description'); const instagram=f.get('instagram');
    // upload logo file
    let logo_url=null; const file=f.get('logo_file');
    if(file && file.size>0){
      const path=`brands/${slug}/${Date.now()}_${file.name}`;
      const {error:e1}=await supabase.storage.from('media').upload(path,file);
      if(e1) return alert(e1.message);
      const {data:pub}=await supabase.storage.from('media').getPublicUrl(path);
      logo_url=pub?.publicUrl||null;
    }
    const payload={slug,name,description,instagram,logo_url,
      mp_access_token:f.get('mp_access_token')||null,
      mp_public_key:f.get('mp_public_key')||null,
      transfer_alias:f.get('transfer_alias')||null
    };
    const {error}=await supabase.from('brands').insert(payload);
    if(error) return alert(error.message);
    alert('Marca creada'); e.currentTarget.reset(); refresh();
  }

  async function onUpdateShipping(e){
    e.preventDefault();
    const f=new FormData(e.currentTarget);
    const slug=f.get('slug');
    const patch={
      ship_domicilio: f.get('ship_domicilio')?Number(f.get('ship_domicilio')):null,
      ship_sucursal:  f.get('ship_sucursal')?Number(f.get('ship_sucursal')):null,
      ship_free_from: Number(f.get('ship_free_from')||0),
      mp_fee: f.get('mp_fee')?Number(f.get('mp_fee')):null
    };
    const {error}=await supabase.from('brands').update(patch).eq('slug',slug);
    if(error) return alert(error.message);
    alert('Actualizado');
  }

  return (<main className='container'>
    <h1 className='h1'>Admin · Marcas</h1>

    <div className='card'>
      <strong>Crear marca</strong>
      <form onSubmit={onCreateBrand} className='grid' style={{gridTemplateColumns:'repeat(2,1fr)'}}>
        <div><label>Slug</label><input className='input' name='slug' required/></div>
        <div><label>Nombre</label><input className='input' name='name' required/></div>
        <div><label>Descripción</label><input className='input' name='description'/></div>
        <div><label>Instagram</label><input className='input' name='instagram' placeholder='https://instagram.com/...'/></div>
        <div><label>Logo (archivo)</label><input className='input' name='logo_file' type='file' accept='image/*' required/></div>
        <div><label>MP Access Token</label><input className='input' name='mp_access_token' placeholder='token secreto MP (opcional)'/></div>
        <div><label>MP Public Key</label><input className='input' name='mp_public_key' placeholder='(opcional)'/></div>
        <div><label>Alias/CBU (transferencia)</label><input className='input' name='transfer_alias' placeholder='(opcional)'/></div>
        <div style={{gridColumn:'1/-1'}}><button className='btn'>Crear</button></div>
      </form>
    </div>

    <h2 className='h2'>Editar marcas</h2>
    <div className='grid' style={{gridTemplateColumns:'repeat(auto-fill, minmax(360px, 1fr))'}}>
      {brands.map(b=>(
        <div className='card' key={b.slug}>
          <div className='row'>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <img src={b.logo_url||'/logo.png'} alt={b.name} style={{width:42,height:42,objectFit:'cover',borderRadius:21,background:'#0d0f16',border:'1px solid var(--line)'}}/>
              <strong>{b.name}</strong>
            </div>
            <a className='badge' href={`/marcas/${b.slug}`}>Ver</a>
          </div>
          <form onSubmit={onUpdateShipping} className='mt'>
            <input type='hidden' name='slug' value={b.slug}/>
            <div className='grid' style={{gridTemplateColumns:'1fr 1fr'}}>
              <div><label>Envío domicilio</label><input className='input' name='ship_domicilio' type='number' min='0' defaultValue={b.ship_domicilio??''} placeholder='vacío = desactivar'/></div>
              <div><label>Envío sucursal</label><input className='input' name='ship_sucursal' type='number' min='0' defaultValue={b.ship_sucursal??''} placeholder='vacío = desactivar'/></div>
            </div>
            <div className='grid' style={{gridTemplateColumns:'1fr 1fr'}}>
              <div><label>Gratis desde</label><input className='input' name='ship_free_from' type='number' min='0' defaultValue={b.ship_free_from||0}/></div>
              <div><label>% MP (vacío = global 10%)</label><input className='input' name='mp_fee' type='number' min='0' defaultValue={b.mp_fee??''}/></div>
            </div>
            <div className='mt'><button className='btn'>Guardar</button></div>
          </form>
        </div>
      ))}
    </div>
  </main>);
}
