// pages/admin/pedidos.js
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function AdminPedidos(){
  const [orders, setOrders] = useState([]);
  const [brands, setBrands] = useState([]);
  const [brand, setBrand] = useState('all');
  const [selected, setSelected] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const chRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    (async () => {
      // solo admin
      const { data: s } = await supabase.auth.getSession();
      const u = s?.session?.user;
      if (!u) return;
      const { data: a } = await supabase.from('admin_emails').select('email').eq('email', u.email);
      if (!a || !a.length) return alert('Solo Admin');

      const { data: bs } = await supabase.from('brands').select('slug,name').order('name');
      setBrands([{ slug:'all', name:'Todas' }, ...(bs || [])]);
      await loadOrders('all');
    })();
  }, []);

  async function loadOrders(slug){
    let q = supabase.from('orders').select('id, brand_slug, buyer_name, buyer_email, status, total, created_at').order('created_at', { ascending:false }).limit(300);
    if (slug && slug !== 'all') q = q.eq('brand_slug', slug);
    const { data } = await q;
    setOrders(data || []);
  }

  async function openChat(orderId){
    setSelected(orderId);
    const { data } = await supabase
      .from('order_messages')
      .select('id, order_id, author_role, author_name, text, created_at')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });
    setMsgs(data || []);
    if (chRef.current) supabase.removeChannel(chRef.current);
    const ch = supabase
      .channel(`chat_admin_${orderId}`)
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'order_messages', filter:`order_id=eq.${orderId}` },
        payload => setMsgs(m => [...m, payload.new])
      ).subscribe();
    chRef.current = ch;
  }

  async function sendMsg(e){
    e.preventDefault();
    const text = inputRef.current?.value?.trim();
    if (!text || !selected) return;
    const { data: s } = await supabase.auth.getSession();
    const u = s?.session?.user;
    await supabase.from('order_messages').insert({
      order_id: selected, author_role: 'admin', author_name: u?.email || 'Admin', text
    });
    inputRef.current.value = '';
  }

  async function setStatus(orderId, status){
    const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
    if (error) return alert(error.message);
    await loadOrders(brand);
  }

  async function deleteOrder(orderId){
    if(!confirm('Eliminar pedido definitivamente?')) return;
    const { error } = await supabase.from('orders').delete().eq('id', orderId);
    if (error) return alert(error.message);
    await loadOrders(brand);
    if (selected === orderId) { setSelected(null); setMsgs([]); }
  }

  return (
    <main className="container">
      <h1 className="h1">Admin — Pedidos</h1>

      <div className="card">
        <label>Marca</label>
        <select className="input" value={brand} onChange={e => { setBrand(e.target.value); loadOrders(e.target.value); }}>
          {brands.map(b => <option key={b.slug} value={b.slug}>{b.name}</option>)}
        </select>
      </div>

      <div className="grid" style={{ gridTemplateColumns:'1.2fr .8fr', gap:16 }}>
        <div className="card">
          <strong>Pedidos</strong>
          <table className="table" style={{ marginTop:10 }}>
            <thead><tr><th>ID</th><th>Marca</th><th>Cliente</th><th>Estado</th><th>Total</th><th>Acciones</th></tr></thead>
            <tbody>
              {orders.map(o=>(
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td>{o.brand_slug}</td>
                  <td>{o.buyer_name || o.buyer_email || 'Cliente'}</td>
                  <td>{o.status}</td>
                  <td>${o.total}</td>
                  <td style={{ display:'flex', gap:6 }}>
                    <button className="btn-ghost" onClick={()=>openChat(o.id)}>Chat</button>
                    <button className="btn-ghost" onClick={()=>setStatus(o.id, 'cancelled')}>Cancelar</button>
                    <button className="btn-ghost" onClick={()=>setStatus(o.id, 'completed')}>Completado</button>
                    <button className="btn-ghost" onClick={()=>deleteOrder(o.id)}>Eliminar</button>
                  </td>
                </tr>
              ))}
              {orders.length===0 && <tr><td colSpan="6" className="small">Sin pedidos.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="card">
          <strong>Chat del pedido {selected || ''}</strong>
          <div style={{ height: 300, overflowY:'auto', border:'1px solid var(--line)', borderRadius:12, padding:10, background:'#0e0f16', marginTop:8 }}>
            {msgs.map(m => (
              <div key={m.id} style={{ marginBottom:10, display:'flex', justifyContent: m.author_role!=='user'?'flex-end':'flex-start' }}>
                <div className="card" style={{ maxWidth: '80%', padding:'8px 12px', background: m.author_role!=='user'?'#151a2a':'#12131c' }}>
                  <div className="small" style={{ color:'var(--muted)' }}>
                    {m.author_role.toUpperCase()} · {m.author_name || ''} · {new Date(m.created_at).toLocaleString()}
                  </div>
                  <div>{m.text}</div>
                </div>
              </div>
            ))}
            {msgs.length===0 && <div className="small">Seleccioná un pedido.</div>}
          </div>

          <form onSubmit={sendMsg} className="row" style={{ marginTop:8 }}>
            <input ref={inputRef} className="input" placeholder="Escribí un mensaje..." />
            <button className="btn" disabled={!selected}>Enviar</button>
          </form>
        </div>
      </div>
    </main>
  );
}
