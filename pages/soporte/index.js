
import { useEffect,useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
export default function Soporte(){
  const [user,setUser]=useState(null);
  const [tickets,setTickets]=useState([]);
  useEffect(()=>{(async()=>{
    const {data:s}=await supabase.auth.getSession();
    const u=s?.session?.user||null; setUser(u);
    if(u){
      const {data}=await supabase.from('support_tickets').select('id,subject,status,created_at').order('created_at',{ascending:false});
      setTickets(data||[]);
    }
  })()},[]);
  async function createTicket(e){
    e.preventDefault();
    const f=new FormData(e.currentTarget);
    const subject=f.get('subject');
    const message=f.get('message');
    const {data:s}=await supabase.auth.getSession();
    const u=s?.session?.user; if(!u) return alert('Iniciá sesión');
    const {data:t,error}=await supabase.from('support_tickets').insert({subject,user_id:u.id}).select('*').single();
    if(error)return alert(error.message);
    const {error:e2}=await supabase.from('support_messages').insert({ticket_id:t.id,message,from_admin:false});
    if(e2)return alert(e2.message);
    alert('Ticket creado'); window.location.reload();
  }
  return(<main className='container'><h1 className='h1'>Soporte</h1>{!user?<p className='small'>Iniciá sesión para crear y ver tus tickets.</p>:(<div className='grid' style={{gridTemplateColumns:'1fr 1fr'}}><div className='card'><strong>Nuevo ticket</strong><form onSubmit={createTicket}><div><label>Asunto</label><input name='subject' className='input' required/></div><div className='mt'><label>Mensaje</label><textarea name='message' className='input' rows='5' required/></div><div className='mt'><button className='btn'>Crear</button></div></form></div><div className='card'><strong>Mis tickets</strong><ul>{tickets.map(t=>(<li key={t.id}><a href={`/soporte/${t.id}`}>{t.subject} — {t.status}</a></li>))}</ul></div></div>)}</main>)}
