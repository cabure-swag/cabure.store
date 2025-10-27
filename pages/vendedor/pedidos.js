// pages/vendedor/pedidos.js
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function VendedorPedidos(){
  const [brands, setBrands] = useState([]);
  const [brand, setBrand] = useState(null);
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const chRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      const u = s?.session?.user;
      if (!u) return;
      const { data: admins } = await supabase.from('admin_emails').select('email').eq('email', u.email);
      setIsAdmin((admins||[]).length>0);

      let bs = [];
      if ((admins||[]).length>0) {
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

  async function loadOrders(slug){
    const { data } = await supabase
      .from('orders')
      .select('id, user_id, buyer_name, buyer_email, status, total, created_at, brand_slug')
      .eq('brand_slug', slug)
      .order('created_at', { ascending: false })
      .limit(200);
    setOrders(data || []);
  }

  useEffect(() => { if(brand) loadOrders(brand); }, [brand]);

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
      .channel(`chat_${orderId}`)
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
      order_id: selected, author_role: 'vendor', author_name: u?.email || 'Vendedor', text
    });
    inputRef.current.value = '';
  }

  async function setStatus(orderId, status){
    const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
    if (error) return alert(error.message);
    await loadOrders(brand);
  }

  async function deleteOrder(orderId){
    if(!isAdmin) return;
    if(!confirm('Eliminar pedido? (solo admin)')) return;
    const { error } = await supabase.from('orders').delete().eq('id', orderId);
    if (error) return alert(error.message);
    await loadOrders(brand);
    if (selected === orderId) { setSelected(null); setMsgs([]); }
  }

  return (
    <main className="container">
      <h1 className="h1">Vendedor — Pedidos & Chats</h1>

      <div className="card">
        <label>Marca</label>
        <select className="input" value={brand || ''} onChange={e=>setBrand(e.target.value || null)}>
          <option value="">Elegí una marca</option>
          {brands.map(b => <option key={b.slug} value={b.slug}>{b.name}</option>)}
        </select>
      </div>

      <div className="grid" style={{ gridTemplateColumns:'1.2fr .8fr', gap:16 }}>
        <div className="card">
          <strong>Pedidos</strong>
          <table className="table" style={{ marginTop:10 }}>
            <thead><tr><th>ID</th><th>Cliente</th><th>Estado</th><th>Total</th><th>Acciones</th></tr></thead>
            <tbody>
              {orders.map(o=>(
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td>{o.buyer_name || o.buyer_email || 'Cliente'}</td>
                  <td>{o.status}</td>
                  <td>${o.total}</td>
                  <td style={{ display:'flex', gap:6 }}>
                    <button className="btn-ghost" onClick={()=>openChat(o.id)}>Chat</button>
                    <button className="btn-ghost" onClick={()=>setStatus(o.id, 'cancelled')}>Cancelar</button>
                    <button className="btn-ghost" onClick={()=>setStatus(o.id, 'completed')}>Completado</button>
                    {isAdmin && <button className="btn-ghost" onClick={()=>deleteOrder(o.id)}>Eliminar</button>}
                  </td>
                </tr>
              ))}
              {orders.length===0 && <tr><td colSpan="5" className="small">Sin pedidos aún.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="card">
          <strong>Chat del pedido {selected || ''}</strong>
          <div style={{ height: 300, overflowY:'auto', border:'1px solid var(--line)', borderRadius:12, padding:10, background:'#0e0f16', marginTop:8 }}>
            {msgs.map(m => (
              <div key={m.id} style={{ marginBottom:10, display:'flex', justifyContent: m.author_role==='vendor'?'flex-end':'flex-start' }}>
                <div className="card" style={{ maxWidth: '80%', padding:'8px 12px', background: m.author_role==='vendor'?'#151a2a':'#12131c' }}>
                  <div className="small" style={{ color:'var(--muted)' }}>
                    {m.author_role==='vendor' ? 'Vendedor' : (m.author_name || 'Cliente')}
                    {' '}· {new Date(m.created_at).toLocaleString()}
                  </div>
                  <div>{m.text}</div>
                </div>
              </div>
            ))}
            {msgs.length===0 && <div className="small">Seleccioná un pedido para chatear.</div>}
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
