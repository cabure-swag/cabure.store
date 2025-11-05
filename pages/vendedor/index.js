// pages/vendedor/index.js
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function VendedorHome(){
  const [ready, setReady] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const u = session?.user || null;
      if (!u) {
        // No logueado: respetar next
        location.replace('/?next=' + encodeURIComponent('/vendedor'));
        return;
      }
      const [{ data: a }, { data: vb }] = await Promise.all([
        supabase.from('admin_emails').select('email').eq('email', u.email),
        supabase.from('vendor_brands').select('brand_slug').eq('user_id', u.id),
      ]);
      const isAdmin = Array.isArray(a) && a.length > 0;
      const isVendor = Array.isArray(vb) && vb.length > 0;
      if (!isAdmin && !isVendor) {
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
      <h1 className="h1">Vendedor</h1>

      <div className="grid" style={{ gridTemplateColumns:'repeat(auto-fit, minmax(260px,1fr))', gap:16 }}>
        <Link href="/vendedor/perfil" className="card" style={{ textDecoration:'none' }}>
          <div className="h2">Perfil de marca</div>
          <p className="small">Editá logo, portada, descripción y envíos.</p>
        </Link>

        <Link href="/vendedor/catalogo" className="card" style={{ textDecoration:'none' }}>
          <div className="h2">Catálogo</div>
          <p className="small">Cargá y editá productos de la marca.</p>
        </Link>

        <Link href="/vendedor/metricas" className="card" style={{ textDecoration:'none' }}>
          <div className="h2">Métricas</div>
          <p className="small">Ventas por mes, ticket promedio, conversión.</p>
        </Link>

        <Link href="/vendedor/pedidos" className="card" style={{ textDecoration:'none' }}>
          <div className="h2">Pedidos & Chats</div>
          <p className="small">Listado de pedidos y chat con clientes (realtime).</p>
        </Link>
      </div>
    </main>
  );
}
