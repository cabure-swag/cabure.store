
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { money } from '../../utils/money';

function sum(arr,f){return(arr||[]).reduce((s,x)=>s+f(x),0)}
function fmt(d){return new Date(d).toLocaleDateString('es-AR')}

export default function Admin(){
  const [role,setRole]=useState(null);
  const [brands,setBrands]=useState([]);
  const [orders,setOrders]=useState([]);
  const [byDay,setByDay]=useState({});

  useEffect(()=>{(async()=>{
    const {data:s}=await supabase.auth.getSession();
    const u=s?.session?.user;if(!u){setRole('guest');return}
    const {data:me}=await supabase.from('profiles').select('role').eq('id',u.id).single();
    setRole(me?.role||'user');
    refresh();
    // analytics
    const {data:o}=await supabase.from('orders').select('id,total,created_at,brand_slug,pay');
    const since=new Date(); since.setDate(since.getDate()-30);
    const rec=(o||[]).filter(x=>new Date(x.created_at)>=since);
    setOrders(rec);
    const g={}; for(const it of rec){const k=fmt(it.created_at); g[k]=(g[k]||0)+it.total;} setByDay(g);
  })()},[]);

  async function refresh(){const {data}=await supabase.from('brands').select('*').order('slug');setBrands(data||[])}

  if(role!=='admin') return <main className='container'><h1 className='h1'>403</h1><p className='small'>Solo Admin.</p></main>;

  async function onCreateBrand(e){
    e.preventDefault();
    const f=new FormData(e.currentTarget);
    let logo_url=f.get('logo_url')||null;
    const file=f.get('logo_file');
    if(file&&file.size>0){
      const path=`brands/${f.get('slug')}/${Date.now()}_${file.name}`;
      const {error:e1}=await supabase.storage.from('media').upload(path,file);
      if(e1) return alert(e1.message);
      const {data:pub}=await supabase.storage.from('media').getPublicUrl(path);
      logo_url=pub?.publicUrl||null;
    }
    const payload={slug:f.get('slug'),name:f.get('name'),description:f.get('description'),instagram:f.get('instagram'),mp_fee:f.get('mp_fee')?Number(f.get('mp_fee')):null,logo_url,ship_domicilio:f.get('ship_domicilio')?Number(f.get('ship_domicilio')):null,ship_sucursal:f.get('ship_sucursal')?Number(f.get('ship_sucursal')):null,ship_free_from:Number(f.get('ship_free_from')||0)};
    const {error}=await supabase.from('brands').insert(payload);
    if(error) return alert(error.message);
    alert('Marca creada'); e.currentTarget.reset(); refresh();
  }

  async function onAssignVendor(e){
    e.preventDefault();
    const f=new FormData(e.currentTarget);
    const email=f.get('email'); const brand_slug=f.get('brand_slug');
    const {data:prof}=await supabase.from('profiles').select('id').eq('email',email).single();
    if(!prof) return alert('Ese email no tiene perfil. Que se loguee una vez.');
    const {error}=await supabase.from('vendor_brands').insert({user_id:prof.id,brand_slug});
    if(error) return alert(error.message);
    alert('Vendor asignado');
  }

  async function onSaveSecrets(e){
    e.preventDefault();
    const f=new FormData(e.currentTarget);
    const slug=f.get('slug');
    const patch={mp_access_token:f.get('mp_access_token')||null,mp_public_key:f.get('mp_public_key')||null,transfer_alias:f.get('transfer_alias')||null,transfer_titular:f.get('transfer_titular')||null};
    const {error}=await supabase.from('brands').update(patch).eq('slug',slug);
    if(error) return alert(error.message);
    alert('Actualizado'); refresh();
  }

  // analytics quick KPIs
  const total=sum(orders,o=>o.total);
  const count=(orders||[]).length;
  const aov=count?Math.round(total/count):0;
  const mp=sum(orders.filter(o=>o.pay==='mp'),o=>o.total);
  const tr=total-mp;
  const byBrand={}; for(const o of orders){byBrand[o.brand_slug]=(byBrand[o.brand_slug]||0)+o.total}

  return (<main className='container'>
    <h1 className='h1'>Admin</h1>

    <div className='grid' style={{gridTemplateColumns:'repeat(4,1fr)'}}>
      <div className='kpi'><span className='small'>Ventas (30d)</span><span className='big'>{money(total)}</span></div>
      <div className='kpi'><span className='small'>Pedidos (30d)</span><span className='big'>{count}</span></div>
      <div className='kpi'><span className='small'>Ticket promedio</span><span className='big'>{money(aov)}</span></div>
      <div className='kpi'><span className='small'>MP / Transfer</span><span className='big'>{money(mp)} / {money(tr)}</span></div>
    </div>

    <div className='card' style={{marginTop:16}}>
      <strong>Crear marca</strong>
      <form onSubmit={onCreateBrand} className='grid' style={{gridTemplateColumns:'repeat(2,1fr)'}}>
        <div><label>Slug</label><input className='input' name='slug' required/></div>
        <div><label>Nombre</label><input className='input' name='name' required/></div>
        <div><label>Descripción</label><input className='input' name='description'/></div>
        <div><label>Instagram</label><input className='input' name='instagram' placeholder='https://instagram.com/...'/></div>
        <div><label>% MP</label><input className='input' name='mp_fee' type='number' min='0' placeholder='(vacío = global 10%)'/></div>
        <div><label>Logo (archivo)</label><input className='input' name='logo_file' type='file' accept='image/*'/></div>
        <div><label>o Logo (URL)</label><input className='input' name='logo_url' placeholder='https://...'/></div>
        <div><label>Envío domicilio</label><input className='input' name='ship_domicilio' type='number' min='0' placeholder='(vacío = desactivar)'/></div>
        <div><label>Envío sucursal</label><input className='input' name='ship_sucursal' type='number' min='0' placeholder='(vacío = desactivar)'/></div>
        <div><label>Envío gratis desde</label><input className='input' name='ship_free_from' type='number' min='0' defaultValue='0'/></div>
        <div style={{gridColumn:'1/-1'}}><button className='btn'>Crear</button></div>
      </form>
    </div>

    <h2 className='h2'>Marcas</h2>
    <div className='grid' style={{gridTemplateColumns:'repeat(auto-fill, minmax(360px, 1fr))'}}>
      {brands.map(b=>(
        <div className='card' key={b.slug}>
          <div className='row'>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <img src={b.logo_url||'/logo.png'} alt={b.name} style={{width:42,height:42,objectFit:'contain',borderRadius:10,background:'#0d0f16',border:'1px solid var(--line)'}}/>
              <strong>{b.name}</strong>
            </div>
            <a className='badge' href={`/marcas/${b.slug}`}>Ver</a>
          </div>
          <div className='small'>IG: <a href={b.instagram} target='_blank' rel='noreferrer'>{b.instagram}</a></div>
          <div className='small'>MP %: {b.mp_fee??'global 10%'}</div>
          <div className='small'>Envíos: {b.ship_domicilio?`Dom $${b.ship_domicilio}`:'Dom off'} · {b.ship_sucursal?`Suc $${b.ship_sucursal}`:'Suc off'} · Free ${b.ship_free_from||0}</div>
          <form onSubmit={onAssignVendor} className='mt'>
            <strong>Asignar vendor</strong>
            <div className='grid' style={{gridTemplateColumns:'2fr 1fr'}}>
              <div><label>Email del vendor</label><input className='input' name='email' type='email' required/></div>
              <input type='hidden' name='brand_slug' value={b.slug}/>
              <div><button className='btn'>Asignar</button></div>
            </div>
          </form>
          <form onSubmit={onSaveSecrets} className='mt'>
            <strong>Conf. sensible</strong>
            <input type='hidden' name='slug' value={b.slug}/>
            <div><label>MP Access Token</label><input className='input' name='mp_access_token' defaultValue={b.mp_access_token||''} placeholder='token secreto'/></div>
            <div><label>MP Public Key</label><input className='input' name='mp_public_key' defaultValue={b.mp_public_key||''}/></div>
            <div><label>Transferencia alias/CBU</label><input className='input' name='transfer_alias' defaultValue={b.transfer_alias||''}/></div>
            <div><label>Titular</label><input className='input' name='transfer_titular' defaultValue={b.transfer_titular||''}/></div>
            <div className='mt'><button className='btn'>Guardar</button></div>
          </form>
        </div>
      ))}
    </div>

    <div className='card' style={{marginTop:16}}>
      <strong>Ventas por día (30d)</strong>
      <table className='table'><thead><tr><th>Día</th><th>Ventas</th></tr></thead><tbody>
        {Object.entries(byDay).map(([d,amt])=> <tr key={d}><td>{d}</td><td>{money(amt)}</td></tr>)}
      </tbody></table>
    </div>
  </main>);
}
