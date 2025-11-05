// components/NavBar.jsx
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function NavBar(){
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasVendor, setHasVendor] = useState(false);
  const dropRef = useRef(null);

  // Carga sesión + escucha cambios de auth + aplica ?next= tras login
  useEffect(() => {
    let sub;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const u = session?.user || null;
      setUser(u);
      if (u) await loadRoles(u);

      // Si ya estamos logueados y hay ?next= en la URL, redirigimos
      if (u) {
        const next = readNextFromURL();
        if (next) safeRedirect(next);
      }

      sub = supabase.auth.onAuthStateChange(async (_evt, sess) => {
        const uu = sess?.user || null;
        setUser(uu);
        if (uu) {
          await loadRoles(uu);
          const next = readNextFromURL();
          if (next) safeRedirect(next);
        } else {
          setIsAdmin(false);
          setHasVendor(false);
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
    const admin = Array.isArray(a) && a.length > 0;
    setIsAdmin(admin);
    setHasVendor((Array.isArray(vb) && vb.length > 0) || admin);
  }

  // Lee ?next= de la URL actual
  function readNextFromURL(){
    if (typeof window === 'undefined') return null;
    try {
      const url = new URL(window.location.href);
      const next = url.searchParams.get('next');
      return next && typeof next === 'string' ? next : null;
    } catch { return null; }
  }

  // Sanitiza y redirige internamente
  function safeRedirect(nextRaw){
    if (typeof window === 'undefined' || !nextRaw) return;
    // Solo rutas internas que empiecen con "/"
    const next = String(nextRaw);
    if (!next.startsWith('/')) return;
    // Evitar inyecciones tipo "//evil.com"
    if (next.startsWith('//')) return;
    // Redirigir y limpiar ?next de la URL actual
    window.location.replace(next);
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

  // Sign-in Google preservando ?next=
  async function signInGoogle(){
    try{
      const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
      let next = '';
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        next = url.searchParams.get('next') || window.location.pathname || '/';
      }
      const redirectTo = origin ? `${origin}?next=${encodeURIComponent(next)}` : undefined;

      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo }
      });
    }catch(err){
      alert('No se pudo iniciar sesión: ' + (err?.message || err));
    }
  }

  return (
    <header className="nav">
      <div className="nav-inner">
        <Link href="/" className="brand cab-hover" aria-label="Ir al inicio">
          CABURE.STORE
        </Link>

        <nav className="menu">
          {/* Antes de iniciar sesión: botón de login */}
          {!user && (
            <button className="btn" onClick={signInGoogle}>Iniciar sesión con Google</button>
          )}

          {/* Después de iniciar sesión: avatar + menú */}
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
                  <button role="menuitem" onClick={() => supabase.auth.signOut().then(()=>location.href='/')}>
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          )}
        </nav>
      </div>

      {/* Estilos (se mantienen las clases existentes para no cambiar el diseño) */}
      <style jsx global>{`
        .nav {
          position: sticky; top: 0; z-index: 40;
          background: rgba(9,11,16,.85); backdrop-filter: blur(6px);
          border-bottom: 1px solid var(--line);
        }
        .nav-inner{
          display: flex; align-items: center; justify-content: space-between;
          height: 64px; padding: 0 16px; max-width: 1200px; margin: 0 auto;
        }
        .brand{ font-weight: 800; letter-spacing: .05em; color: var(--text); text-decoration: none; }
        .cab-hover:hover{ opacity: .9; }

        .menu{ display: flex; align-items: center; gap: 12px; }
        .btn{
          font-weight: 600; padding: 8px 12px; border-radius: 10px;
          background: #1b1f2e; border: 1px solid var(--line); color: var(--text);
        }
        .btn:hover{ background: #21263a; }

        .dropdown{ position: relative; }
        .profile-btn{
          display: inline-flex; align-items: center; gap: 8px;
          background: transparent; border: 1px solid var(--line);
          padding: 4px 6px; border-radius: 999px; cursor: pointer;
        }
        .profile-btn.open .chev{ transform: rotate(180deg); }
        .avatar-lg{
          width: 52px; height: 52px; border-radius: 999px; object-fit: cover;
          display: block;
        }
        .avatar-placeholder{
          display: inline-flex; align-items: center; justify-content: center;
          width: 52px; height: 52px; border-radius: 999px;
          border: 1px solid var(--line); background: #10121a; font-size: 18px;
        }
        .chev{ color: var(--muted); transition: transform .15s ease; }

        .dropdown-menu{
          position: absolute; right: 0; top: calc(100% + 8px);
          min-width: 220px; background: #0f1118; border: 1px solid var(--line);
          border-radius: 12px; padding: 8px; display: flex; flex-direction: column; gap: 6px;
          z-index: 9999; box-shadow: 0 14px 36px rgba(5,7,12,.35);
        }
        .dropdown-menu a, .dropdown-menu button{
          text-align: left; border: 1px solid transparent; background: transparent;
          color: var(--text); padding: 8px 10px; border-radius: 10px; text-decoration: none; cursor: pointer;
        }
        .dropdown-menu a:hover, .dropdown-menu button:hover{
          background: #141a2a; border-color: rgba(124,58,237,.25);
        }
      `}</style>
    </header>
  );
}
