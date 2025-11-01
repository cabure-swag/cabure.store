import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';

export default function AdminHome(){
  const router = useRouter();
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ orders:0, sales:0, products:0 });

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      const user = s?.session?.user;
      if (!user) { router.replace('/'); return; }
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (!active) return;
      if (data?.role === 'admin') setOk(true); else router.replace('/');
      setLoading(false);
    })();
    return () => { active = false; };
  }, [router]);

  useEffect(()=>{
    if(!ok) return;
    (async () => {
      // Optional RPC; si no existe no rompe
      try {
        const { data: a } = await supabase.rpc('admin_dashboard_counts');
        if (a) setStats(a);
      } catch(_){}
    })();
  }, [ok]);

  if (loading) return <main><Topbar/><div className="container">Verificando…</div></main>;
  if (!ok) return null;

  return (
    <main>
      <Topbar/>
      <div className="layout">
        <Sidebar kind="admin"/>
        <section className="content">
          <h1>Admin — Dashboard</h1>
          <div className="grid">
            <div className="card"><div className="kpi">{stats.orders}</div><div className="muted">Pedidos</div></div>
            <div className="card"><div className="kpi">${stats.sales}</div><div className="muted">Ventas</div></div>
            <div className="card"><div className="kpi">{stats.products}</div><div className="muted">Productos</div></div>
          </div>
        </section>
      </div>
      <style jsx>{`
        .layout{ display:flex; }
        .content{ flex:1; padding:16px; }
        .grid{ display:grid; gap:12px; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
        .card{ border:1px solid var(--line); border-radius:12px; padding:14px; background:#0e0f16; }
        .kpi{ font-size:1.6rem; font-weight:800; }
        .muted{ color:var(--muted); }
      `}</style>
    </main>
  );
}
