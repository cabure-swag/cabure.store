// pages/compras/index.js
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function MisCompras(){
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const chRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      const u = s?.session?.user;
      if(!u) return;

      // Comprador ve sus pedidos (por user_id)
      const { data } = await supabase
        .from('orders')
        .select('id, brand_slug, status, total, created_at')
        .eq('user_id', u.id)
        .order('created_at', { ascending:false })
        .limit(200);
      setOrders(data || []);
    })();
  }, []);

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
      .channel(`chat_user_${orderId}`)
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
      order_id: selected,
      author_role: 'user',
      author_name: u?.email || 'Usuario',
      text
    });
    inputRef.current.value = '';
  }

  return (
    <main className="container">
      <h1 className="h1">Mis compras</h1>

      <div className="grid" style={{ gridTemplateColumns:'1.2fr .8fr', gap:16 }}>
        <div className="card">
          <strong>Pedidos</strong>
          <table className="table" style={{ marginTop:10 }}>
            <thead><tr><th>ID</th><th>Marca</th><th>Estado</th><th>Total</th><th></th></tr></thead>
            <tbody>
              {orders.map(o=>(
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td>{o.brand_slug || '-'}</td>
                  <td>{o.status}</td>
                  <td>${o.total}</td>
                  <td><button className="btn-ghost" onClick={()=>openChat(o.id)}>Chat</button></td>
                </tr>
              ))}
              {orders.length===0 && <tr><td colSpan="5" className="small">Aún no realizaste pedidos.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="card">
          <strong>Chat del pedido {selected || ''}</strong>
          <div style={{ height: 300, overflowY:'auto', border:'1px solid var(--line)', borderRadius:12, padding:10, background:'#0e0f16', marginTop:8 }}>
            {msgs.map(m => (
              <div key={m.id} style={{ marginBottom:10, display:'flex', justifyContent: m.author_role==='user'?'flex-end':'flex-start' }}>
                <div className="card" style={{ maxWidth: '80%', padding:'8px 12px', background: m.author_role==='user'?'#151a2a':'#12131c' }}>
                  <div className="small" style={{ color:'var(--muted)' }}>
                    {m.author_role.toUpperCase()} · {m.author_name || ''} · {new Date(m.created_at).toLocaleString()}
                  </div>
                  <div>{m.text}</div>
                </div>
              </div>
            ))}
            {msgs.length===0 && <div className="small">Elegí un pedido para chatear con el vendedor.</div>}
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
