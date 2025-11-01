// CONTENT-ONLY: sin Topbar/Layout (usa tu layout global)
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function AdminHomeContent(){
  const [ok, setOk] = useState(false);
  const [stats, setStats] = useState({ orders:0, sales:0, products:0 });

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      const user = s?.session?.user;
      if (!user) return;
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (data?.role === 'admin') setOk(true);
    })();
  }, []);

  useEffect(()=>{
    if(!ok) return;
    // Intentá llamar tu RPC si existe; sino, mostrá 0s
    (async () => {
      try {
        const { data } = await supabase.rpc('admin_dashboard_counts');
        if (data) setStats(data);
      } catch(_) {}
    })();
  }, [ok]);

  if (!ok) return <div>No tenés permiso para ver Admin.</div>;

  return (
    <section>
      <h1>Admin — Dashboard</h1>
      <div className="grid">
        <div className="card"><div className="kpi">{stats.orders}</div><div className="muted">Pedidos</div></div>
        <div className="card"><div className="kpi">${stats.sales}</div><div className="muted">Ventas</div></div>
        <div className="card"><div className="kpi">{stats.products}</div><div className="muted">Productos</div></div>
      </div>
      <style jsx>{`
        .grid{ display:grid; gap:12px; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
        .card{ border:1px solid var(--line); border-radius:12px; padding:14px; background:#0e0f16; }
        .kpi{ font-size:1.6rem; font-weight:800; }
        .muted{ color:var(--muted); }
      `}</style>
    </section>
  );
}
