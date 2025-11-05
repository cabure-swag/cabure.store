import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

const BUCKET = 'support-media';
function pathFor(ticketId, filename) {
  const safe = filename.replace(/[^a-zA-Z0-9._-]+/g, '_');
  return `tickets/${ticketId}/${Date.now()}_${safe}`;
}

export default function SoporteTicket() {
  const router = useRouter();
  const { id } = router.query;
  const [ticket, setTicket] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!id) return;
    supabase.from('support_tickets').select('id,subject,created_at').eq('id', id).maybeSingle().then(({ data }) => setTicket(data || null));
    supabase.from('support_messages').select('*').eq('ticket_id', id).order('created_at', { ascending: true }).then(({ data }) => setMsgs(data || []));
    const ch = supabase.channel(`sup-messages-${id}`).on('postgres_changes', {
      event: '*', schema: 'public', table: 'support_messages', filter: `ticket_id=eq.${id}`,
    }, (payload) => { if (payload.eventType === 'INSERT') setMsgs(m => [...m, payload.new]); }).subscribe();
    channelRef.current = ch;
    return () => { ch && supabase.removeChannel(ch); };
  }, [id]);

  async function sendMessage(e){
    e?.preventDefault?.();
    if (!id || !text.trim()) return;
    setBusy(true);
    try {
      const { error } = await supabase.from('support_messages').insert({ ticket_id: id, message: text.trim(), from_admin: false });
      if (error) throw error;
      setText('');
    } catch (e) { alert(e?.message || String(e)); } finally { setBusy(false); }
  }

  async function sendImage(e){
    const file = e?.target?.files?.[0];
    if (!file || !id) return;
    setBusy(true);
    try {
      const path = pathFor(id, file.name);
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false, cacheControl: '3600' });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const image_url = pub?.publicUrl || null;
      const { error: msgErr } = await supabase.from('support_messages').insert({ ticket_id: id, message: '📷 Imagen', image_url, from_admin: false });
      if (msgErr) throw msgErr;
      if (fileRef.current) fileRef.current.value = '';
    } catch (e) { alert(e?.message || String(e)); } finally { setBusy(false); }
  }

  return (
    <main className="container">
      <h1 className="h1">Soporte</h1>
      {ticket ? <div className="small">Ticket #{String(ticket.id).slice(0,8)} — {new Date(ticket.created_at).toLocaleString()}</div> : null}

      <div className="card" style={{ marginTop: 12, padding: 12, maxHeight: '60vh', overflow: 'auto' }}>
        {(msgs || []).map(m => (
          <div key={m.id} style={{ display: 'flex', justifyContent: m.from_admin ? 'flex-start' : 'flex-end', marginBottom: 10 }}>
            <div className="card" style={{ maxWidth: '70%', background: m.from_admin ? '#121219' : '#10162a', border: '1px solid var(--line)', padding: 10 }}>
              {m.image_url ? <img src={m.image_url} alt="adjunto" style={{ maxWidth: '100%', borderRadius: 8, marginBottom: 6 }} /> : null}
              <div style={{ whiteSpace: 'pre-wrap' }}>{m.message}</div>
              <div className="small" style={{ opacity: .7, marginTop: 4 }}>{new Date(m.created_at).toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="row" style={{ gap:8, marginTop:12 }}>
        <input type="file" accept="image/*" ref={fileRef} onChange={sendImage} />
      </div>

      <form onSubmit={sendMessage} className="row" style={{ gap: 8, marginTop: 12 }}>
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Escribí tu mensaje…" className="input" style={{ flex: 1 }} />
        <button disabled={busy} className="btn">{busy ? 'Enviando…' : 'Enviar'}</button>
      </form>
    </main>
  );
}
