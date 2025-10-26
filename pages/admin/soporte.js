// pages/admin/soporte.js
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function AdminSoporte() {
  const [ok, setOk] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [profilesMap, setProfilesMap] = useState({});
  const [active, setActive] = useState(null);
  const [msgs, setMsgs] = useState([]);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const u = sess?.session?.user;
      if (!u) return setOk(false);
      const { data: a } = await supabase.from('admin_emails').select('email').eq('email', u.email);
      const admin = Array.isArray(a) && a.length > 0;
      setOk(admin);
      if (!admin) return;

      const { data: ts } = await supabase
        .from('support_tickets')
        .select('id, user_id, subject, status, created_at')
        .order('created_at', { ascending: false });

      setTickets(ts || []);

      // Cargar perfiles asociados para mostrar email/avatar
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

  async function reply(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const message = f.get('message');
    if (!message) return;
    const { error } = await supabase
      .from('support_messages')
      .insert({ ticket_id: active.id, message, from_admin: true });
    if (error) return alert(`No se pudo enviar: ${error.message}`);
    e.currentTarget.reset();
    // refrescar
    const { data: ms } = await supabase
      .from('support_messages')
      .select('id, ticket_id, message, from_admin, created_at')
      .eq('ticket_id', active.id)
      .order('created_at', { ascending: true });
    setMsgs(ms || []);
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
                <button
                  key={t.id}
                  className="btn-ghost"
                  style={{ width: '100%', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}
                  onClick={() => setActive(t)}
                >
                  <img
                    src={p?.avatar_url || '/logo.png'}
                    alt="avatar"
                    style={{ width: 28, height: 28, borderRadius: 999, objectFit: 'cover', border: '1px solid var(--line)' }}
                  />
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
                  <div className="small">
                    Cliente: {profilesMap[active.user_id]?.email || active.user_id}
                  </div>
                </div>
                <span className="badge">{active.status}</span>
              </div>

              <div style={{ marginTop: 12, maxHeight: '50vh', overflow: 'auto', paddingRight: 8 }}>
                {(msgs || []).map(m => (
                  <div key={m.id} style={{
                    display: 'flex',
                    justifyContent: m.from_admin ? 'flex-end' : 'flex-start',
                    marginBottom: 10
                  }}>
                    <div className="card" style={{
                      maxWidth: '70%',
                      background: m.from_admin ? '#10162a' : '#121219',
                      borderColor: m.from_admin ? '#233' : 'var(--line)'
                    }}>
                      <div className="small" style={{ opacity: .7, marginBottom: 4 }}>
                        {m.from_admin ? 'Admin' : 'Cliente'}
                      </div>
                      <div>{m.message}</div>
                      <div className="small" style={{ opacity: .6, marginTop: 6 }}>{new Date(m.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={reply} className="row" style={{ marginTop: 12 }}>
                <input className="input" name="message" placeholder="Escribí una respuesta..." />
                <button className="btn">Enviar</button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
