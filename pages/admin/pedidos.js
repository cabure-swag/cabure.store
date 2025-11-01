import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';

export default function AdminPedidos(){
  const router = useRouter();
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{ (async () => {
    const { data: s } = await supabase.auth.getSession();
    const user = s?.session?.user;
    if (!user) { router.replace('/'); return; }
    const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (data?.role === 'admin') setOk(true); else router.replace('/');
    setLoading(false);
  })(); }, [router]);

  if (loading) return <main><Topbar/><div className="container">Verificando…</div></main>;
  if (!ok) return null;

  return (
    <main>
      <Topbar/>
      <div className="layout">
        <Sidebar kind="admin"/>
        <section className="content">
          <h1>Admin — Pedidos</h1>
          <div className="card">Construiremos esta sección con tus métricas y lógica actual.</div>
        </section>
      </div>
      <style jsx>{`
        .layout{ display:flex; }
        .content{ flex:1; padding:16px; }
        .card{ border:1px solid var(--line); border-radius:12px; padding:14px; background:#0e0f16; }
      `}</style>
    </main>
  );
}
