import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminShell from '../../components/AdminShell';

export default function AdminDashboard(){
  const [ok, setOk] = useState(false);
  const [counts, setCounts] = useState({ orders:0, revenue:0, products:0 });

  useEffect(()=>{ (async()=>{
    const { data: s } = await supabase.auth.getSession();
    const user = s?.session?.user;
    if(!user) return;
    const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if(data?.role==='admin') setOk(true);
  })(); }, []);

  useEffect(()=>{ if(!ok) return; (async()=>{
    try{
      const { data: po } = await supabase.from('products').select('id', { count:'exact', head:true });
      const products = po?.length ?? 0;
      let orders = 0, revenue = 0;
      const q = await supabase.from('orders').select('id,total_amount,status');
      if(q.data){ orders = q.data.length; revenue = q.data.filter(o=>o.status==='paid').reduce((s,o)=>s+Number(o.total_amount||0),0); }
      setCounts({ orders, revenue, products });
    }catch(e){ console.log(e); }
  })(); }, [ok]);

  if(!ok) return <div>No tenés permiso para ver Admin.</div>;

  return (
    <AdminShell active="dashboard">
      <h1>Panel de Administración</h1>
      <div className="grid">
        <div className="card"><div className="k">Pedidos</div><div className="v">{counts.orders}</div></div>
        <div className="card"><div className="k">Ventas</div><div className="v">${counts.revenue}</div></div>
        <div className="card"><div className="k">Productos</div><div className="v">{counts.products}</div></div>
      </div>
      <style jsx>{`
        .grid{ display:grid; gap:12px; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
        .card{ border:1px solid var(--line); background:#0e0f16; border-radius:12px; padding:14px; }
        .k{ opacity:.8; margin-bottom:6px; } .v{ font-size:1.6rem; font-weight:800; }
      `}</style>
    </AdminShell>
  );
}
