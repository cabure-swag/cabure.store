// CONTENT-ONLY
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function AdminUsuarios(){
  const [ok, setOk] = useState(false);
  const [users, setUsers] = useState([]);

  useEffect(()=>{ (async ()=>{
    const { data: s } = await supabase.auth.getSession();
    const user = s?.session?.user;
    if(!user) return;
    const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if(data?.role==='admin') setOk(true);
  })(); }, []);

  useEffect(()=>{ if(!ok) return; (async ()=>{
    const { data } = await supabase.from('profiles').select('id,email,role').order('email');
    setUsers(data||[]);
  })(); }, [ok]);

  async function setRole(id, role){
    const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
    if(error) return alert(error.message);
    setUsers(us=>us.map(u=>u.id===id?{...u,role}:u));
  }

  if(!ok) return <div>No tenés permiso para ver Admin.</div>;

  return (
    <section>
      <h1>Admin — Usuarios</h1>
      <div className="list">
        {users.map(u=>(
          <div key={u.id} className="row item">
            <div>{u.email}</div>
            <div className="row" style={{gap:8}}>
              <span className="badge">{u.role||'user'}</span>
              <button className="btn-ghost" onClick={()=>setRole(u.id,'user')}>User</button>
              <button className="btn-ghost" onClick={()=>setRole(u.id,'vendor')}>Vendor</button>
              <button className="btn-ghost" onClick={()=>setRole(u.id,'admin')}>Admin</button>
            </div>
          </div>
        ))}
      </div>
      <style jsx>{`
        .row{ display:flex; align-items:center; justify-content:space-between; }
        .list{ display:flex; flex-direction:column; gap:8px; }
        .item{ border:1px solid var(--line); border-radius:12px; padding:10px; background:#0e0f16; }
        .btn-ghost{ padding:6px 10px; border-radius:8px; background:none; border:1px solid var(--line); color:var(--text); cursor:pointer; }
        .badge{ background:#141a2a; border:1px solid var(--line); border-radius:999px; padding:4px 8px; }
      `}</style>
    </section>
  );
}
