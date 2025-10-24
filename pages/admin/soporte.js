
import { useEffect,useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function AdminSupport(){
  const [role,setRole]=useState(null);
  const [tickets,setTickets]=useState([]);
  const [active,setActive]=useState(null);
  const [msgs,setMsgs]=useState([]);

  useEffect(()=>{(async()=>{
    const {data:s}=await supabase.auth.getSession();
    const u=s?.session?.user;if(!u){setRole('guest');return}
    const {data:me}=await supabase.from('profiles').select('role').eq('id',u.id).single();
    setRole(me?.role||'user');
    const {data:t}=await supabase.from('support_tickets').select('id,subject,status,created_at').order('created_at',{ascending:false});
    setTickets(t||[]);
  })()},[]);

  useEffect(()=>{(async()=>{
    if(!active) return;
    const {data:m}=await supabase.from('support_messages').select('*').eq('ticket_id',active).order('created_at',{ascending:true});
    setMsgs(m||[]);
  })()},[active]);

  if(role!=='admin') return <main className='container'><h1 className='h1'>403</h1><p className='small'>Solo Admin.</p></main>;

  async function reply(e){
    e.preventDefault();
    const f=new FormData(e.currentTarget);
    const message=f.get('message');
    const {error}=await supabase.from('support_messages').insert({ticket_id:active,message,from_admin:true});
    if(error) return alert(error.message);
    e.currentTarget.reset();
    const {data:m}=await supabase.from('support_messages').select('*').eq('ticket_id',active).order('created_at',{ascending:true});
    setMsgs(m||[]);
  }

  return (<main className='container'>
    <h1 className='h1'>Soporte — Admin</h1>
    <div className='grid' style={{gridTemplateColumns:'300px 1fr'}}>
      <div className='card'>
        <strong>Tickets</strong>
        <ul>{tickets.map(t=>(<li key={t.id}><button className='btn-ghost' onClick={()=>setActive(t.id)}>{t.subject} — {t.status}</button></li>))}</ul>
      </div>
      <div className='card'>
        {!active?<div className='small'>Elegí un ticket…</div>:(<div>
          {msgs.map((m,i)=>(<div key={i} className='small' style={{marginBottom:8}}><strong>{m.from_admin?'Soporte':'Cliente'}:</strong> {m.message}</div>))}
          <form onSubmit={reply} className='row' style={{marginTop:12}}>
            <input className='input' name='message' placeholder='Responder…' required/>
            <button className='btn'>Enviar</button>
          </form>
        </div>)}
      </div>
    </div>
  </main>);
}
