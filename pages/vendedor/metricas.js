// pages/vendedor/metricas.js
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function VendedorMetricas(){
  const [brands, setBrands] = useState([]);
  const [brand, setBrand] = useState(null);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      const u = s?.session?.user;
      if (!u) return;

      const { data: admins } = await supabase.from('admin_emails').select('email').eq('email', u.email);
      const isAdmin = (admins||[]).length>0;
      let bs = [];
      if (isAdmin) {
        const { data } = await supabase.from('brands').select('slug,name').order('name');
        bs = data || [];
      } else {
        const { data } = await supabase
          .from('vendor_brands')
          .select('brand_slug, brands!inner(name)')
          .eq('user_id', u.id);
        bs = (data || []).map(x => ({ slug: x.brand_slug, name: x.brands.name }));
      }
      setBrands(bs);
      if (bs.length) setBrand(bs[0].slug);
    })();
  }, []);

  useEffect(() => {
    if(!brand) return;
    (async () => {
      const { data } = await supabase
        .from('orders')
        .select('id, brand_slug, total, status, created_at')
        .eq('brand_slug', brand)
        .order('created_at', { ascending: false })
        .limit(200);
      setOrders(data || []);
    })();
  }, [brand]);

  const kpi = useMemo(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const ofMonth = orders.filter(o => o.created_at?.startsWith(ym) && o.status === 'paid');
    const totalMonth = ofMonth.reduce((s,o)=>s+(o.total||0),0);
    const totalAll = orders.filter(o=>o.status==='paid').reduce((s,o)=>s+(o.total||0),0);
    const countPaid = orders.filter(o=>o.status==='paid').length;
    const avg = countPaid ? Math.round(totalAll / countPaid) : 0;
    return { totalMonth, totalAll, avg, countPaid };
  }, [orders]);

  return (
    <main className="container">
      <h1 className="h1">Vendedor — Métricas</h1>

      <div className="card">
        <label>Marca</label>
        <select className="input" value={brand || ''} onChange={e=>setBrand(e.target.value || null)}>
          <option value="">Elegí una marca</option>
          {brands.map(b => <option key={b.slug} value={b.slug}>{b.name}</option>)}
        </select>
      </div>

      <div className="grid" style={{ gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:12 }}>
        <div className="kpi"><div className="small">Ventas del mes</div><div className="big">${kpi.totalMonth}</div></div>
        <div className="kpi"><div className="small">Ventas históricas</div><div className="big">${kpi.totalAll}</div></div>
        <div className="kpi"><div className="small">Pedidos pagados</div><div className="big">{kpi.countPaid}</div></div>
        <div className="kpi"><div className="small">Ticket promedio</div><div className="big">${kpi.avg}</div></div>
      </div>

      <div className="card" style={{ marginTop:14 }}>
        <strong>Últimos pedidos</strong>
        <table className="table" style={{ marginTop:10 }}>
          <thead><tr><th>ID</th><th>Fecha</th><th>Estado</th><th>Total</th></tr></thead>
          <tbody>
            {orders.map(o=>(
              <tr key={o.id}>
                <td>{o.id}</td>
                <td>{new Date(o.created_at).toLocaleString()}</td>
                <td>{o.status}</td>
                <td>${o.total}</td>
              </tr>
            ))}
            {orders.length===0 && <tr><td colSpan="4" className="small">Sin pedidos todavía.</td></tr>}
          </tbody>
        </table>
      </div>
    </main>
  );
}
