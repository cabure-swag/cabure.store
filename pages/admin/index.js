// pages/admin/index.js
import Link from 'next/link';

export default function AdminHome(){
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
