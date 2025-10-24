
import { useEffect,useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { money } from '../../utils/money';
function uniq(a){return [...new Set(a)]}
export default function Vendedor(){
  const [role,setRole]=useState(null);
  const [brands,setBrands]=useState([]);
  const [sel,setSel]=useState('');
  const [orders,setOrders]=useState([]);

  useEffect(()=>{(async()=>{
    const {data:s}=await supabase.auth.getSession();
    const u=s?.session?.user;if(!u)return;
    const {data:me}=await supabase.from('profiles').select('role').eq('id',u.id).single();
    const r=me?.role||'user'; setRole(r);
    let slugs=[];
    if(r==='admin'){ const {data:bs}=await supabase.from('brands').select('slug'); slugs=(bs||[]).map(x=>x.slug); }
    else { const {data:vb}=await supabase.from('vendor_brands').select('brand_slug').eq('user_id',u.id); slugs=(vb||[]).map(x=>x.brand_slug); }
    slugs=uniq(slugs); setBrands(slugs); setSel(slugs[0]||'');
  })()},[]);

  useEffect(()=>{(async()=>{
    if(!sel) return setOrders([]);
    const {data}=await supabase.from('orders').select('id,brand_slug,total,created_at,pay,shipping').eq('brand_slug',sel).order('created_at',{ascending:false});
    setOrders(data||[]);
  })()},[sel]);

  if(role!=='vendor'&&role!=='admin') return <main className='container'><h1 className='h1'>403</h1><p className='small'>No tenés acceso a Vendedor.</p></main>;

  const total = (orders||[]).reduce((s,o)=>s+o.total,0);
  const count = (orders||[]).length;
  const aov = count?Math.round(total/count):0;

  return (<main className='container'>
    <h1 className='h1'>Panel Vendedor</h1>
    <div className='row'>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <label>Marca</label>
        <select value={sel} onChange={e=>setSel(e.target.value)}>
          <option value="" disabled>Elegí una marca…</option>
          {brands.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className='badge'>Asignadas: {brands.length}</div>
    </div>

    <div className='grid' style={{gridTemplateColumns:'repeat(3,1fr)', marginTop:12}}>
      <div className='kpi'><span className='small'>Ventas</span><span className='big'>{money(total)}</span></div>
      <div className='kpi'><span className='small'>Pedidos</span><span className='big'>{count}</span></div>
      <div className='kpi'><span className='small'>Ticket promedio</span><span className='big'>{money(aov)}</span></div>
    </div>

    <div className='grid' style={{gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', marginTop:12}}>
      {orders.map(o=>(<div className='card' key={o.id}>
        <div className='row'><strong>Pedido #{o.id.slice(0,8)}</strong><span className='small'>{new Date(o.created_at).toLocaleString('es-AR')}</span></div>
        <div className='small'>Pago: {o.pay} — {o.shipping}</div>
        <div className='row'><span></span><strong>{money(o.total)}</strong></div>
      </div>))}
    </div>
  </main>);
}
