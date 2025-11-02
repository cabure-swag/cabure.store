// components/NavBar.jsx
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function NavBar(){
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasVendor, setHasVendor] = useState(false);
  const dropRef = useRef(null);
  const router = useRouter();

  // Sincroniza cookie SSR con el access_token actual (para gating server-side)
  async function syncSsrCookie(sess){
    try{
      const tok = sess?.access_token || null;
      await fetch('/api/auth/session', {
        method: tok ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: tok ? JSON.stringify({ access_token: tok }) : undefined,
      });
    }catch(_e){}
  }

  // Aplica retorno a la página actual luego del login
  function applyReturnTo(){
    const url = new URL(window.location.href);
    const nextParam = url.searchParams.get('next');
    const stored = window.sessionStorage.getItem('returnTo');
    const returnTo = nextParam || stored;
    if (returnTo){
      window.sessionStorage.removeItem('returnTo');
      // Evitar loops
      if (returnTo !== window.location.pathname){
        router.replace(returnTo);
      }
    }
  }

  // Carga sesión + escucha cambios de auth
  useEffect(() => {
    let sub;
    (async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data?.session?.user || null);
      await syncSsrCookie(data?.session || null);
      if (data?.session?.user) await loadRoles(data.session.user);

      sub = supabase.auth.onAuthStateChange(async (_evt, sess) => {
        const uu = sess?.user || null;
        setUser(uu);
        await syncSsrCookie(sess || null);
        if (uu) {
          await loadRoles(uu);
          applyReturnTo();
        } else {
          setIsAdmin(false); setHasVendor(false);
        }
      });
    })();
    return () => { sub?.data?.subscription?.unsubscribe?.(); };
  }, []);

  async function loadRoles(u){
    const [{ data: a }, { data: vb }] = await Promise.all([
      supabase.from('admin_emails').select('email').eq('email', u.email),
      supabase.from('vendor_brands').select('brand_slug').eq('user_id', u.id),
    ]);
    const admin = (a||[]).length>0;
    setIsAdmin(admin);
    setHasVendor(admin || (vb||[]).length>0);
  }

  // Cerrar dropdown al click fuera
  useEffect(() => {
    const onClick = (e) => {
      if (!dropRef.current) return;
      if (!dropRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  async function signInGoogle(){
    // Guardamos returnTo actual si no viene ?next
    if (!new URL(window.location.href).searchParams.get('next')){
      window.sessionStorage.setItem('returnTo', window.location.pathname + window.location.search);
    }
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) alert('Error al iniciar sesión');
  }

  return (
    <header className="site-header">
      <div className="container">
        <nav className="nav">
          <Link href="/" className="brand">Caburé.Store</Link>
          <div className="spacer" />
          {!user && (
            <button className="btn" onClick={signInGoogle}>Iniciar sesión con Google</button>
          )}
          {user && (
            <div className="dropdown" ref={dropRef}>
              <button
                className={`profile-btn ${open ? 'open' : ''}`}
                onClick={() => setOpen(v => !v)}
                aria-haspopup="menu"
                aria-expanded={open ? 'true' : 'false'}
                title={user.email || 'Cuenta'}
              >
                {user?.user_metadata?.avatar_url ? (
                  <img className="avatar-lg" src={user.user_metadata.avatar_url} alt="Cuenta" />
                ) : (
                  <span className="avatar-placeholder">👤</span>
                )}
                <svg className="chev" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path d="M7 10l5 5 5-5" fill="currentColor" />
                </svg>
              </button>

              {open && (
                <div className="dropdown-menu" role="menu">
                  <Link role="menuitem" href="/compras">Mis compras</Link>
                  <Link role="menuitem" href="/soporte">Soporte</Link>
                  {hasVendor && <Link role="menuitem" href="/vendedor">Vendedor</Link>}
                  {isAdmin && <Link role="menuitem" href="/admin">Admin</Link>}
                  <button
                    role="menuitem"
                    onClick={() => supabase.auth.signOut().then(()=>fetch('/api/auth/session',{method:'DELETE'})).then(()=>location.href='/')}
                  >
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          )}
        </nav>
      </div>

      <style jsx>{`
        .site-header{ position: sticky; top:0; z-index:50; backdrop-filter: blur(6px); background: rgba(15,17,24,.66); border-bottom: 1px solid var(--line); }
        .container{ max-width: 1200px; margin: 0 auto; padding: 10px 16px; }
        .nav{ display:flex; align-items:center; gap: 12px; }
        .spacer{ flex:1; }
        .brand{ font-weight:700; font-size:18px; color: #fff; text-decoration:none }
        .btn{
          background: #6d28d9; color: #fff; border: none;
          padding: 8px 12px; border-radius: 10px; cursor:pointer;
        }
        .profile-btn{
          display:inline-flex; align-items:center; gap:8px; padding:6px 8px 6px 6px;
          border:1px solid var(--line); background:#0f1118; border-radius:12px;
        }
        .avatar-lg{ width:28px; height:28px; border-radius:50%; object-fit:cover; }
        .avatar-placeholder{ width:28px; height:28px; display:inline-grid; place-items:center; }
        .dropdown-menu{
          position:absolute; margin-top:8px; right:16px; padding:8px;
          background:#0f1118; border:1px solid var(--line); border-radius:12px;
          display:grid; gap:6px; min-width: 200px;
        }
        .dropdown-menu a, .dropdown-menu button{
          text-align:left; background:transparent; border:none; color:#fff; text-decoration:none; padding:8px; border-radius:10px;
        }
        .dropdown-menu a:hover, .dropdown-menu button:hover{
          background: rgba(255,255,255,.06);
        }
      `}</style>
    </header>
  );
}
