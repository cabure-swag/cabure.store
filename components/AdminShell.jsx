import Link from 'next/link';
export default function AdminShell({ children, active='' }){
  return (
    <div className="wrap">
      <aside>
        <div className="brand">ADMIN</div>
        <nav>
          <Link href="/admin"><a className={active==='dashboard'?'on':''}>Dashboard</a></Link>
          <Link href="/admin/marcas"><a className={active==='marcas'?'on':''}>Marcas</a></Link>
          <Link href="/admin/usuarios"><a className={active==='usuarios'?'on':''}>Usuarios</a></Link>
          <Link href="/admin/pedidos"><a className={active==='pedidos'?'on':''}>Pedidos</a></Link>
          <Link href="/admin/metricas"><a className={active==='metricas'?'on':''}>Métricas</a></Link>
          <Link href="/admin/soporte"><a className={active==='soporte'?'on':''}>Soporte</a></Link>
        </nav>
      </aside>
      <main>{children}</main>
      <style jsx>{`
        .wrap{ display:grid; grid-template-columns: 240px 1fr; gap:16px; }
        aside{ border:1px solid var(--line); background:#0f1118; border-radius:12px; padding:12px; height:calc(100vh - 160px); position:sticky; top:80px; }
        .brand{ font-weight:800; letter-spacing:.08em; opacity:.9; margin:6px 2px 12px; }
        nav{ display:flex; flex-direction:column; gap:6px; }
        a{ padding:10px 12px; border-radius:10px; border:1px solid var(--line); background:#0e0f16; }
        a.on{ outline:1px solid rgba(124,58,237,.5); }
      `}</style>
    </div>
  );
}
