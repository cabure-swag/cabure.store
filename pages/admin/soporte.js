// pages/admin/soporte.js
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function AdminSoporte() {
  const [ok, setOk] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [profilesMap, setProfilesMap] = useState({});
  const [active, setActive] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);
  const channelRef = useRef(null);

  async function loadTickets() {
    const { data: ts } = await supabase
      .from('support_tickets')
      .select('id, user_id, subject, status, created_at, closed_at')
      .order('created_at', { ascending: false });
    setTickets(ts || []);

    const uids = Array.from(new Set((ts || []).map(t => t.user_id))).filter(Boolean);
    if (uids.length) {
      const { data: ps } = await supabase
        .from('profiles')
        .select('id, email, avatar_url')
        .in('id', uids);
      const map = {};
      (ps || []).forEach(p => { map[p.id] = p; });
      setProfilesMap(map);
    }
  }

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const u = sess?.session?.user;
      if (!u) return setOk(false);
      const { data: a } = await supabase.from('admin_emails').select('email').eq('email', u.email);
      const admin = Array.isArray(a) && a.length > 0;
      setOk(admin);
      if (!admin) return;
      await loadTickets();
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!active) return setMsgs([]);
      const { data: ms } = await supabase
        .from('support_messages')
        .select('id, ticket_id, message, from_admin, created_at')
        .eq('ticket_id', active.id)
        .order('created_at', { ascending: true });
      setMsgs(ms || []);
    })();
  }, [active]);

  useEffect(() => {
    if (!active) return;
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const ch = supabase
      .channel(`support_messages_${active.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages', filter: `ticket_id=eq.${active.id}` },
        (payload) => { if (payload.eventType === 'INSERT') setMsgs(m => [...m, payload.new]); }
      )
      .subscribe();
    channelRef.current = ch;
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [active]);

  async function reply(e) {
    e.preventDefault();
    if (sending || !active) return;
    const message = inputRef.current?.value?.trim();
    if (!message) return;
    setSending(true);
    const optimistic = { id: `tmp_${Date.now()}`, ticket_id: active.id, message, from_admin: true, created_at: new Date().toISOString() };
    setMsgs(m => [...m, optimistic]); inputRef.current.value = '';

    const { error } = await supabase.from('support_messages').insert({ ticket_id: active.id, message, from_admin: true });
    if (error) { alert(`No se pudo enviar: ${error.message}`); setMsgs(m => m.filter(x => x.id !== optimistic.id)); }
    setSending(false);
  }

  async function closeTicket() {
    if (!active) return;
    const { error } = await supabase.from('support_tickets').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', active.id);
    if (error) return alert(error.message);
    await loadTickets();
  }

  async function deleteTicket() {
    if (!active) return;
    if (!confirm('¿Eliminar ticket y sus mensajes?')) return;
    // Mensajes se borran por cascade
    const { error } = await supabase.from('support_tickets').delete().eq('id', active.id);
    if (error) return alert(error.message);
    setActive(null);
    await loadTickets();
  }

  if (!ok) return <main className="container"><h1 className="h1">Admin — Soporte</h1><p className="small">Necesitás cuenta admin.</p></main>;

  return (
    <main className="container">
      <h1 className="h1">Admin — Soporte</h1>
      <div className="grid" style={{ gridTemplateColumns: '320px 1fr' }}>
        <div className="card" style={{ maxHeight: '70vh', overflow: 'auto' }}>
          <strong>Tickets</strong>
          <div className="mt">
            {(tickets || []).map(t => {
              const p = profilesMap[t.user_id];
              return (
                <button key={t.id} className="btn-ghost" style={{ width: '100%', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}
                  onClick={() => setActive(t)}>
                  <img src={p?.avatar_url || '/logo.png'} alt="avatar"
                    style={{ width: 28, height: 28, borderRadius: 999, objectFit: 'cover', border: '1px solid var(--line)' }} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700 }}>{t.subject}</div>
                    <div className="small">{p?.email || t.user_id}</div>
                  </div>
                  <span className="badge" style={{ marginLeft: 'auto' }}>{t.status}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="card" style={{ minHeight: 400 }}>
          {!active ? (
            <div className="small">Elegí un ticket para ver el chat.</div>
          ) : (
            <>
              <div className="row">
                <div>
                  <strong>{active.subject}</strong>
                  <div className="small">Cliente: {profilesMap[active.user_id]?.email || active.user_id}</div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  {active.status !== 'closed' && <button className="btn-ghost" onClick={closeTicket}>Cerrar</button>}
                  <button className="btn-ghost" onClick={deleteTicket}>Eliminar</button>
                  <span className="badge">{active.status}</span>
                </div>
              </div>

              <div style={{ marginTop: 12, maxHeight: '50vh', overflow: 'auto', paddingRight: 8 }}>
                {(msgs || []).map(m => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: m.from_admin ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
                    <div className="card" style={{ maxWidth: '70%', background: m.from_admin ? '#10162a' : '#121219', borderColor: m.from_admin ? '#233' : 'var(--line)' }}>
                      <div className="small" style={{ opacity: .7, marginBottom: 4 }}>{m.from_admin ? 'Admin' : 'Cliente'}</div>
                      <div>{m.message}</div>
                      <div className="small" style={{ opacity: .6, marginTop: 6 }}>{new Date(m.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={reply} className="row" style={{ marginTop: 12 }}>
                <input className="input" ref={inputRef} placeholder="Escribí una respuesta..." />
                <button className="btn" disabled={sending}>{sending ? 'Enviando…' : 'Enviar'}</button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
