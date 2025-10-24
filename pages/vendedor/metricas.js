
import { useEffect,useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { money } from '../../utils/money';
function ym(date){const d=new Date(date);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;}
function startEnd(ymStr){const [y,m]=ymStr.split('-').map(n=>parseInt(n));const start=new Date(y,m-1,1);const end=new Date(y,m,1);return {start,end};}
export default function VMetrics(){
  const [role,setRole]=useState(null);
  const [brands,setBrands]=useState([]);
  const [sel,setSel]=useState('');
  const [month,setMonth]=useState(ym(new Date()));
  const [orders,setOrders]=useState([]);

  useEffect(()=>{(async()=>{
    const {data:s}=await supabase.auth.getSession();const u=s?.session?.user;if(!u)return;
    const {data:me}=await supabase.from('profiles').select('role').eq('id',u.id).single();setRole(me?.role||'user');
    if(me?.role==='admin'){const {data:bs}=await supabase.from('brands').select('slug');const sl=(bs||[]).map(x=>x.slug);setBrands(sl);setSel(sl[0]||'');}
    else{const {data:vb}=await supabase.from('vendor_brands').select('brand_slug').eq('user_id',u.id);const sl=(vb||[]).map(x=>x.brand_slug);setBrands(sl);setSel(sl[0]||'');}
  })()},[]);

  useEffect(()=>{(async()=>{
    if(!sel) return setOrders([]);
    const {start,end}=startEnd(month);
    const {data}=await supabase.from('orders').select('id,total,created_at,pay,shipping').eq('brand_slug',sel).gte('created_at',start.toISOString()).lt('created_at',end.toISOString());
    setOrders(data||[]);
  })()},[sel,month]);

  if(role!=='vendor'&&role!=='admin') return <main className='container'><h1 className='h1'>403</h1></main>;

  const total=(orders||[]).reduce((s,o)=>s+o.total,0);
  const count=(orders||[]).length;
  const aov=count?Math.round(total/count):0;

  return (<main className='container'>
    <h1 className='h1'>Métricas — Vendedor</h1>
    <div className='row'><div style={{display:'flex',alignItems:'center',gap:8}}><label>Marca</label><select value={sel} onChange={e=>setSel(e.target.value)}><option value='' disabled>Elegí...</option>{brands.map(s=><option key={s} value={s}>{s}</option>)}</select></div><div><label>Mes</label><input className='input' type='month' value={month} onChange={e=>setMonth(e.target.value)}/></div></div>
    <div className='grid' style={{gridTemplateColumns:'repeat(3,1fr)', marginTop:12}}>
      <div className='kpi'><span className='small'>Ventas</span><span className='big'>{money(total)}</span></div>
      <div className='kpi'><span className='small'>Pedidos</span><span className='big'>{count}</span></div>
      <div className='kpi'><span className='small'>Ticket promedio</span><span className='big'>{money(aov)}</span></div>
    </div>
  </main>);
}
