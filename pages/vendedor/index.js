import VendorShell from '../../components/VendorShell';
export default function VendorHome(){
  return (
    <VendorShell active="dashboard">
      <h1>Panel del Vendedor</h1>
      <div className="card">Usá el menú lateral para gestionar tu marca.</div>
      <style jsx>{`.card{ border:1px solid var(--line); border-radius:12px; padding:14px; background:#0e0f16; }`}</style>
    </VendorShell>
  );
}
