// pages/soporte/index.js
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function SoporteCliente() {
  const [user, setUser] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [active, setActive] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [sending, setSending] = useState(false);
  const newTicketForm = useRef(null);
  const inputRef = useRef(null);
  const channelRef = useRef(null);

  // sesión
  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      const u = s?.session?.user || null;
      setUser(u);

      if (u) {
        const { data } = await supabase
          .from('support_tickets')
          .select('id,subject,status,created_at')
          .order('created_at', { ascending: false });
        setTickets(data || []);
      }
    })();
  }, []);

  // cargar mensajes del ticket activo
  useEffect(() => {
    (async () => {
      if (!active) { setMsgs([]); return; }
      const { data: ms } = await supabase
        .from('support_messages')
        .select('id,ticket_id,message,from_admin,created_at')
        .eq('ticket_id', active.id)
        .order('created_at', { ascending: true });
      setMsgs(ms || []);
    })();
  }, [active]);

  // suscripción realtime al ticket activo
  useEffect(() => {
    if (!active) return;
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const ch = supabase
      .channel(`support_messages_client_${active.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'support_messages',
        filter: `ticket_id=eq.${active.id}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setMsgs(m => [...m, payload.new]);
        }
      })
      .subscribe();

    channelRef.current = ch;
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [active]);

  async function createTicket(e) {
    e.preventDefault();
    if (!user) return alert('Iniciá sesión con Google');
    const form = e.currentTarget;
    const f = new FormData(form);
    const subject = f.get('subject');
    const message = f.get('message');

    const { data: t, error } = await supabase
      .from('support_tickets')
      .insert({ subject, user_id: user.id })
      .select('*')
      .single();

    if (error) return alert(error.message);

    // primer mensaje
    const { error: e2 } = await supabase
      .from('support_messages')
      .insert({ ticket_id: t.id, message, from_admin: false });

    if (e2) return alert(e2.message);

    form.reset();
    setTickets(prev => [t, ...prev]);
    setActive(t);
  }

  async function send(e) {
    e.preventDefault();
    if (sending || !active) return;
    const val = inputRef.current?.value?.trim();
    if (!val) return;
    setSending(true);

    // optimista
    const optimistic = {
      id: `tmp_${Date.now()}`,
      ticket_id: active.id,
      message: val,
      from_admin: false,
      created_at: new Date().toISOString(),
    };
    setMsgs(m => [...m, optimistic]);
    inputRef.current.value = '';

    const { error } = await supabase
      .from('support_messages')
      .insert({ ticket_id: active.id, message: val, from_admin: false });

    if (error) {
      alert(error.message);
      setMsgs(m => m.filter(x => x.id !== optimistic.id)); // revertir
    }
    setSending(false);
  }

  return (
    <main className="container">
      <h1 className="h1">Soporte</h1>
      {!user ? (
        <p className="small">Iniciá sesión para crear y ver tus tickets.</p>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: '320px 1fr' }}>
          <div className="card" style={{ maxHeight: '70vh', overflow: 'auto' }}>
            <strong>Mis tickets</strong>

            <form ref={newTicketForm} onSubmit={createTicket} className="mt">
              <div><label>Asunto</label><input name="subject" className="input" required /></div>
              <div className="mt"><label>Mensaje</label><textarea name="message" className="input" rows="4" required /></div>
              <div className="mt"><button className="btn">Crear ticket</button></div>
            </form>

            <div className="mt">
              {(tickets || []).map(t => (
                <button
                  key={t.id}
                  className="btn-ghost"
                  style={{ width: '100%', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}
                  onClick={() => setActive(t)}
                >
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700 }}>{t.subject}</div>
                    <div className="small">{new Date(t.created_at).toLocaleString()}</div>
                  </div>
                  <span className="badge" style={{ marginLeft: 'auto' }}>{t.status}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="card" style={{ minHeight: 400 }}>
            {!active ? (
              <div className="small">Elegí un ticket para ver el chat.</div>
            ) : (
              <>
                <div className="row">
                  <strong>{active.subject}</strong>
                  <span className="badge">{active.status}</span>
                </div>

                <div style={{ marginTop: 12, maxHeight: '50vh', overflow: 'auto', paddingRight: 8 }}>
                  {(msgs || []).map(m => (
                    <div key={m.id} style={{
                      display: 'flex',
                      justifyContent: m.from_admin ? 'flex-start' : 'flex-end', /* admin izq, cliente der */
                      marginBottom: 10
                    }}>
                      <div className="card" style={{
                        maxWidth: '70%',
                        background: m.from_admin ? '#121219' : '#10162a',
                        borderColor: m.from_admin ? 'var(--line)' : '#233'
                      }}>
                        <div className="small" style={{ opacity: .7, marginBottom: 4 }}>
                          {m.from_admin ? 'Admin' : 'Yo'}
                        </div>
                        <div>{m.message}</div>
                        <div className="small" style={{ opacity: .6, marginTop: 6 }}>
                          {new Date(m.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={send} className="row" style={{ marginTop: 12 }}>
                  <input className="input" ref={inputRef} placeholder="Escribí tu mensaje..." />
                  <button className="btn" disabled={sending}>{sending ? 'Enviando…' : 'Enviar'}</button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
