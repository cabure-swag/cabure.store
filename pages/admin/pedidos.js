import AdminShell from '../../components/AdminShell';
export default function Page(){
  return (<AdminShell active="pedidos">
    <h1>Pedidos (Admin)</h1>
    <div className="card">Contenido funcional se integra con tus tablas existentes.</div>
    <style jsx>{`
      .card{ border:1px solid var(--line); border-radius:12px; padding:14px; background:#0e0f16; }
    `}</style>
  </AdminShell>);
}
