// pages/admin/index.js
export default function AdminHome(){
  return (
    <main className="container">
      <h1 className="h1">Panel Admin</h1>
      <div className="grid" style={{gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))'}}>
        <a className="card" href="/admin/marcas"><strong>Marcas</strong><div className="small">Crear/editar marcas, envíos, %MP y medios</div></a>
        <a className="card" href="/admin/metricas"><strong>Métricas</strong><div className="small">KPIs por mes / global</div></a>
        <a className="card" href="/admin/soporte"><strong>Soporte</strong><div className="small">Tickets y respuestas</div></a>
      </div>
    </main>
  );
}
