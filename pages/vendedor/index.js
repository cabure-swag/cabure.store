// pages/vendedor/index.js
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

export default function VendedorPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState('perfil'); // 'perfil' | 'catalogo' | 'pedidos' | 'metricas'

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      const user = s?.session?.user;
      if (!user) { router.replace('/'); return; }

      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (!active) return;

      if (data?.role === 'vendor' || data?.role === 'admin') setAllowed(true);
      else router.replace('/');
      setChecking(false);
    })();

    return () => { active = false; };
  }, [router]);

  if (checking) return <main><div className="container">Verificando permiso…</div></main>;
  if (!allowed) return null;

  return (
    <main>
      <div className="container">
        <h1 style={{marginBottom:12}}>Panel del Vendedor</h1>

        {/* Tabs */}
        <div className="tabs">
          <button className={`tab ${tab==='perfil'?'on':''}`} onClick={()=>setTab('perfil')}>Perfil & Portadas</button>
          <button className={`tab ${tab==='catalogo'?'on':''}`} onClick={()=>setTab('catalogo')}>Catálogo</button>
          <button className={`tab ${tab==='pedidos'?'on':''}`} onClick={()=>setTab('pedidos')}>Pedidos & Chats</button>
          <button className={`tab ${tab==='metricas'?'on':''}`} onClick={()=>setTab('metricas')}>Métricas</button>
        </div>

        {tab==='perfil' && (
          <section className="grid">
            <div className="card">
              <h3>Editar Perfil de Marca</h3>
              <p className="muted">Logo, portadas (múltiples), Instagram, descripción.</p>
              <Link href="/vendedor/perfil" className="btn">Abrir Perfil</Link>
            </div>
          </section>
        )}

        {tab==='catalogo' && (
          <section className="grid">
            <div className="card">
              <h3>Catálogo</h3>
              <p className="muted">Crear/editar productos, fotos (hasta 5), stock, precio y categorías.</p>
              <Link href="/vendedor/catalogo" className="btn">Ir al Catálogo</Link>
            </div>
          </section>
        )}

        {tab==='pedidos' && (
          <section className="grid">
            <div className="card">
              <h3>Pedidos & Chats</h3>
              <p className="muted">Conversaciones por pedido, estados, marcarlos como completados.</p>
              <Link href="/vendedor/pedidos" className="btn">Revisar pedidos</Link>
            </div>
          </section>
        )}

        {tab==='metricas' && (
          <section className="grid">
            <div className="card">
              <h3>Métricas de mis marcas</h3>
              <p className="muted">Ventas por mes, items más vendidos, visitas (si se trackea).</p>
              <Link href="/vendedor/metricas" className="btn">Ver métricas</Link>
            </div>
          </section>
        )}
      </div>

      <style jsx>{`
        .tabs{ display:flex; flex-wrap:wrap; gap:8px; margin-bottom:16px; }
        .tab{
          background:#0f1118; border:1px solid var(--line); color:var(--text);
          padding:8px 12px; border-radius:10px; cursor:pointer;
        }
        .tab.on{ box-shadow:0 0 0 1px rgba(124,58,237,.4) inset; background:#141a2a; }

        .grid{
          display:grid; gap:16px;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        }
        .card{
          border:1px solid var(--line); border-radius:12px; padding:14px; background:#0e0f16;
        }
        h3{ margin:6px 0 8px; font-size:1.05rem; }
        .muted{ color:var(--muted); font-size:.95rem; margin-bottom:12px; }
        .btn{
          display:inline-block; padding:8px 12px; border-radius:10px; background:var(--primary);
          color:#fff; text-decoration:none; border:0;
        }
      `}</style>
    </main>
  );
}
