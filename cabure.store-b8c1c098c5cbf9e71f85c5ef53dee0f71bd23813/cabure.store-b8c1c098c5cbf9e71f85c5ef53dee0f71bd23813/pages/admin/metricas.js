
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { money } from '../../utils/money';

function ym(date){const d=new Date(date);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;}
function startEnd(ymStr){const [y,m]=ymStr.split('-').map(n=>parseInt(n));const start=new Date(y,m-1,1);const end=new Date(y,m,1);return {start,end};}
export default function AdminMetrics(){
  const [role,setRole]=useState(null);
  const [month,setMonth]=useState(ym(new Date()));
  const [orders,setOrders]=useState([]);

  useEffect(()=>{(async()=>{
    const {data:s}=await supabase.auth.getSession();
    const u=s?.session?.user;if(!u){setRole('guest');return}
    const {data:me}=await supabase.from('profiles').select('role').eq('id',u.id).single();
    setRole(me?.role||'user');
  })()},[]);

  useEffect(()=>{(async()=>{
    const {start,end}=startEnd(month);
    const {data}=await supabase.from('orders').select('id,brand_slug,total,pay,created_at,shipping').gte('created_at',start.toISOString()).lt('created_at',end.toISOString());
    setOrders(data||[]);
  })()},[month]);

  if(role!=='admin') return <main className='container'><h1 className='h1'>403</h1><p className='small'>Solo Admin.</p></main>;

  const total=(orders||[]).reduce((s,o)=>s+o.total,0);
  const count=(orders||[]).length;
  const aov=count?Math.round(total/count):0;
  const byBrand={}; for(const o of orders){byBrand[o.brand_slug]=(byBrand[o.brand_slug]||0)+o.total}

  async function del(id){
    if(!confirm('Eliminar pedido?')) return;
    const {error}=await supabase.from('orders').delete().eq('id',id);
    if(error) return alert(error.message);
    setOrders(orders.filter(o=>o.id!==id));
  }

  return (<main className='container'>
    <h1 className='h1'>Métricas — Admin</h1>
    <div className='row'>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <label>Mes</label>
        <input className='input' type='month' value={month} onChange={e=>setMonth(e.target.value)}/>
      </div>
      <div className='badge'>{orders.length} pedidos</div>
    </div>

    <div className='grid' style={{gridTemplateColumns:'repeat(3,1fr)', marginTop:12}}>
      <div className='kpi'><span className='small'>Ventas</span><span className='big'>{money(total)}</span></div>
      <div className='kpi'><span className='small'>Pedidos</span><span className='big'>{count}</span></div>
      <div className='kpi'><span className='small'>Ticket promedio</span><span className='big'>{money(aov)}</span></div>
    </div>

    <div className='card mt'>
      <strong>Ventas por marca</strong>
      <table className='table'><thead><tr><th>Marca</th><th>Ventas</th></tr></thead><tbody>
        {Object.entries(byBrand).map(([k,v])=> <tr key={k}><td>{k}</td><td>{money(v)}</td></tr>)}
      </tbody></table>
    </div>

    <div className='grid' style={{gridTemplateColumns:'repeat(auto-fill, minmax(360px, 1fr))', marginTop:12}}>
      {orders.map(o=>(<div className='card' key={o.id}>
        <div className='row'><strong>#{o.id.slice(0,8)}</strong><span className='small'>{new Date(o.created_at).toLocaleString('es-AR')}</span></div>
        <div className='small'>Marca: {o.brand_slug}</div>
        <div className='small'>Pago: {o.pay} — {o.shipping}</div>
        <div className='row'><span></span><strong>{money(o.total)}</strong></div>
        <div className='row'><button className='btn-ghost' onClick={()=>del(o.id)}>Eliminar</button></div>
      </div>))}
    </div>
  </main>);
}
