import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/router';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';

export default function AdminUsuarios(){
  const router = useRouter();
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);

  useEffect(()=>{ (async () => {
    const { data: s } = await supabase.auth.getSession();
    const user = s?.session?.user;
    if (!user) { router.replace('/'); return; }
    const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (data?.role === 'admin') setOk(true); else router.replace('/');
    setLoading(false);
  })(); }, [router]);

  useEffect(()=>{
    if(!ok) return;
    (async ()=>{
      const { data } = await supabase.from('profiles').select('id,email,role').order('email');
      setUsers(data || []);
    })();
  }, [ok]);

  async function setRole(id, role){
    const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
    if (error) return alert(error.message);
    setUsers(us => us.map(u => u.id===id ? { ...u, role } : u));
  }

  if (loading) return <main><Topbar/><div className="container">Verificando…</div></main>;
  if (!ok) return null;

  return (
    <main>
      <Topbar/>
      <div className="layout">
        <Sidebar kind="admin"/>
        <section className="content">
          <h1>Admin — Usuarios</h1>
          <div className="list">
            {users.map(u => (
              <div key={u.id} className="row item">
                <div>{u.email}</div>
                <div className="row" style={{gap:8}}>
                  <span className="badge">{u.role || 'user'}</span>
                  <button className="btn-ghost" onClick={()=>setRole(u.id, 'user')}>User</button>
                  <button className="btn-ghost" onClick={()=>setRole(u.id, 'vendor')}>Vendor</button>
                  <button className="btn-ghost" onClick={()=>setRole(u.id, 'admin')}>Admin</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <style jsx>{`
        .layout{ display:flex; }
        .content{ flex:1; padding:16px; }
        .list{ display:flex; flex-direction:column; gap:8px; }
        .item{ border:1px solid var(--line); border-radius:12px; padding:10px; background:#0e0f16; align-items:center; justify-content:space-between; }
        .btn-ghost{ padding:6px 10px; border-radius:8px; background:none; border:1px solid var(--line); color:var(--text); cursor:pointer; }
        .badge{ background:#141a2a; border:1px solid var(--line); border-radius:999px; padding:4px 8px; }
      `}</style>
    </main>
  );
}
