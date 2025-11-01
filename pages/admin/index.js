// pages/admin/index.js
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

export default function AdminPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState('marcas'); // 'marcas' | 'metricas' | 'soporte'

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

      if (data?.role === 'admin') setAllowed(true);
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
        <h1 style={{marginBottom:12}}>Panel de Administración</h1>

        {/* Tabs */}
        <div className="tabs">
          <button className={`tab ${tab==='marcas'?'on':''}`} onClick={()=>setTab('marcas')}>Marcas</button>
          <button className={`tab ${tab==='metricas'?'on':''}`} onClick={()=>setTab('metricas')}>Métricas</button>
          <button className={`tab ${tab==='soporte'?'on':''}`} onClick={()=>setTab('soporte')}>Soporte</button>
        </div>

        {/* Contenido por tab */}
        {tab==='marcas' && (
          <section className="grid">
            <div className="card">
              <h3>Crear marca</h3>
              <p className="muted">Dar de alta una nueva marca (logo, portada, IG, MP tokens, alias, etc.).</p>
              <Link href="/admin/marcas" className="btn">Ir a Marcas</Link>
            </div>
            <div className="card">
              <h3>Asignar vendedores</h3>
              <p className="muted">Vincular cuentas a marcas existentes (si tenés /admin/marcas ya lo hacés ahí).</p>
              <Link href="/admin/marcas" className="btn-ghost">Abrir gestión</Link>
            </div>
          </section>
        )}

        {tab==='metricas' && (
          <section className="grid">
            <div className="card">
              <h3>Métricas del sitio</h3>
              <p className="muted">Resumen global: ventas por mes, pedidos por estado, conversión.</p>
              <Link href="/admin/metricas" className="btn">Ver métricas</Link>
            </div>
            <div className="card">
              <h3>Exportar/descargar</h3>
              <p className="muted">Exportá CSV/JSON de pedidos, items y chats (si la página existe).</p>
              <Link href="/admin/metricas" className="btn-ghost">Abrir</Link>
            </div>
          </section>
        )}

        {tab==='soporte' && (
          <section className="grid">
            <div className="card">
              <h3>Tickets de soporte</h3>
              <p className="muted">Responder, cerrar o eliminar tickets. Los cerrados se borran a los 30 días.</p>
              <Link href="/admin/soporte" className="btn">Ir a Soporte</Link>
            </div>
            <div className="card">
              <h3>Políticas y moderación</h3>
              <p className="muted">Configuraciones avanzadas (si tenés la página).</p>
              <Link href="/admin/soporte" className="btn-ghost">Abrir</Link>
            </div>
          </section>
        )}
      </div>

      <style jsx>{`
        .tabs{ display:flex; gap:8px; margin-bottom:16px; }
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
        .btn-ghost{
          display:inline-block; padding:8px 12px; border-radius:10px; border:1px solid var(--line);
          color:var(--text); text-decoration:none;
        }
      `}</style>
    </main>
  );
}
