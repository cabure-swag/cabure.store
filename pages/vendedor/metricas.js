import VendorShell from '../../components/VendorShell';
export default function Page(){ return <VendorShell active="metricas"><div className="card">metricas del vendedor (base para integrar realtime y filtros por marca).</div>
<style jsx>{`.card{ border:1px solid var(--line); border-radius:12px; padding:14px; background:#0e0f16; }`}</style>
</VendorShell>; }
