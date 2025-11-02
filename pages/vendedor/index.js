// pages/vendedor/index.js
import Link from 'next/link';

export default function VendedorHome(){
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
          <p className="small">Creá/edita productos, categorías y fotos (hasta 5).</p>
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
