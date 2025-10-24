
import { useEffect,useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function VOrders(){
  const [role,setRole]=useState(null);
  const [brands,setBrands]=useState([]);
  const [sel,setSel]=useState('');
  const [orders,setOrders]=useState([]);
  const [active,setActive]=useState(null);
  const [msgs,setMsgs]=useState([]);

  useEffect(()=>{(async()=>{
    const {data:s}=await supabase.auth.getSession();const u=s?.session?.user;if(!u)return;
    const {data:me}=await supabase.from('profiles').select('role').eq('id',u.id).single();setRole(me?.role||'user');
    if(me?.role==='admin'){const {data:bs}=await supabase.from('brands').select('slug');setBrands((bs||[]).map(x=>x.slug));}
    else{const {data:vb}=await supabase.from('vendor_brands').select('brand_slug').eq('user_id',u.id);setBrands((vb||[]).map(x=>x.brand_slug));}
  })()},[]);

  useEffect(()=>{(async()=>{
    if(!sel) return setOrders([]);
    const {data}=await supabase.from('orders').select('id,created_at,total,pay,shipping').eq('brand_slug',sel).order('created_at',{ascending:false});
    setOrders(data||[]);
  })()},[sel]);

  useEffect(()=>{(async()=>{
    if(!active) return setMsgs([]);
    const {data}=await supabase.from('order_messages').select('*').eq('order_id',active).order('created_at',{ascending:true});
    setMsgs(data||[]);
  })()},[active]);

  if(role!=='vendor'&&role!=='admin') return <main className='container'><h1 className='h1'>403</h1></main>;

  async function send(e){
    e.preventDefault();
    const f=new FormData(e.currentTarget);
    const text=f.get('message');
    const {error}=await supabase.from('order_messages').insert({order_id:active,message:text,from_vendor:true});
    if(error) return alert(error.message);
    e.currentTarget.reset();
    const {data}=await supabase.from('order_messages').select('*').eq('order_id',active).order('created_at',{ascending:true});
    setMsgs(data||[]);
  }

  return (<main className='container'>
    <h1 className='h1'>Pedidos & Chats</h1>
    <div className='row'><label>Marca</label><select value={sel} onChange={e=>setSel(e.target.value)}><option value='' disabled>Elegí...</option>{brands.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
    <div className='grid' style={{gridTemplateColumns:'320px 1fr', marginTop:12}}>
      <div className='card'><strong>Pedidos</strong><ul>{orders.map(o=>(<li key={o.id}><button className='btn-ghost' onClick={()=>setActive(o.id)}>#{o.id.slice(0,8)} — ${o.total}</button></li>))}</ul></div>
      <div className='card'>{!active?<div className='small'>Elegí un pedido…</div>:(<div>{msgs.map((m,i)=>(<div key={i} className='small' style={{marginBottom:8}}><strong>{m.from_vendor?'Vendedor':'Cliente'}:</strong> {m.message}</div>))}<form onSubmit={send} className='row' style={{marginTop:12}}><input className='input' name='message' placeholder='Escribí un mensaje…' required/><button className='btn'>Enviar</button></form></div>)}</div>
    </div>
  </main>);
}
