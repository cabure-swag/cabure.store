import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import useRole from '../hooks/useRole';

export default function Topbar(){
  const [user, setUser] = useState(null);
  const { role } = useRole();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data?.session?.user || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user || null));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <div className="topbar">
      <Link href="/" className="logo" title="CABURÉ.STORE">CABURÉ.STORE</Link>
      <div style={{marginLeft:'auto', position:'relative'}}>
        {user ? (
          <button className="avatar-btn" onClick={()=>setOpen(!open)} aria-haspopup="menu" aria-expanded={open}>
            <img src={user.user_metadata?.avatar_url || '/logo.png'} alt="avatar" />
            <span className="caret">▾</span>
          </button>
        ) : (
          <button className="btn" onClick={()=>supabase.auth.signInWithOAuth({ provider: 'google' })}>Iniciar sesión</button>
        )}

        {open && user && (
          <div className="menu">
            <Link href="/compras" onClick={()=>setOpen(false)}>Mis compras</Link>
            <Link href="/soporte" onClick={()=>setOpen(false)}>Soporte</Link>
            {(role==='vendor' || role==='admin') && <Link href="/vendedor" onClick={()=>setOpen(false)}>Vendedor</Link>}
            {role==='admin' && <Link href="/admin" onClick={()=>setOpen(false)}>Admin</Link>}
            <button className="logout" onClick={()=>{ supabase.auth.signOut(); setOpen(false); }}>Cerrar sesión</button>
          </div>
        )}
      </div>
      <style jsx>{`
        .topbar{ display:flex; align-items:center; gap:12px; padding:10px 16px; border-bottom:1px solid var(--line); background:#0e0f16; position:sticky; top:0; z-index:50;}
        .logo{ font-weight:800; color:var(--text); text-decoration:none; letter-spacing:.5px; }
        .avatar-btn{ display:flex; align-items:center; gap:6px; background:none; border:1px solid var(--line); padding:4px 6px; border-radius:999px; cursor:pointer; }
        .avatar-btn img{ width:28px; height:28px; border-radius:999px; object-fit:cover; }
        .caret{ opacity:.7; font-size:.9rem; }
        .menu{ position:absolute; right:0; top:42px; background:#0f1118; border:1px solid var(--line); border-radius:12px; padding:8px; min-width:180px; display:flex; flex-direction:column; gap:6px; }
        .menu a{ color:var(--text); text-decoration:none; padding:6px 8px; border-radius:8px; }
        .menu a:hover{ background:#141a2a; }
        .logout{ text-align:left; background:none; border:1px solid var(--line); color:var(--text); padding:6px 8px; border-radius:8px; cursor:pointer; }
        .btn{ padding:6px 12px; border-radius:10px; background:#7c3aed; color:#fff; border:0; cursor:pointer; }
      `}</style>
    </div>
  );
}
