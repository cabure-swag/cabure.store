// pages/admin/index.js
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function AdminHome(){
  const [ready, setReady] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const u = session?.user || null;
      if (!u) {
        // No logueado: respetar next
        location.replace('/?next=' + encodeURIComponent('/admin'));
        return;
      }
      const { data: a } = await supabase.from('admin_emails').select('email').eq('email', u.email);
      const isAdmin = Array.isArray(a) && a.length > 0;
      if (!isAdmin) {
        // Logueado pero no admin → fuera
        location.replace('/');
        return;
      }
      setOk(true);
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return (
      <main className="container">
        <div className="card" style={{padding:16}}>Verificando acceso…</div>
      </main>
    );
  }

  if (!ok) return null;

  return (
    <main className="container">
      <h1 className="h1">Admin</h1>

      <div className="grid" style={{ gridTemplateColumns:'repeat(auto-fit, minmax(260px,1fr))', gap:16 }}>
        <Link href="/admin/marcas" className="card" style={{ textDecoration:'none' }}>
          <div className="h2">Marcas</div>
          <p className="small">Crear/editar marcas, asignar vendors, MP, Alias/CBU/CVU.</p>
        </Link>

        <Link href="/admin/metricas" className="card" style={{ textDecoration:'none' }}>
          <div className="h2">Métricas</div>
          <p className="small">Analíticas globales (ventas, conversión, top marcas).</p>
        </Link>

        <Link href="/admin/soporte" className="card" style={{ textDecoration:'none' }}>
          <div className="h2">Soporte</div>
          <p className="small">Tickets de usuarios; cerrar/borrar (admin).</p>
        </Link>

        <Link href="/admin/pedidos" className="card" style={{ textDecoration:'none' }}>
          <div className="h2">Pedidos</div>
          <p className="small">Revisión global de pedidos y estados.</p>
        </Link>
      </div>
    </main>
  );
}
