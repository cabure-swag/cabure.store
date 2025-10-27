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

  // Carga sesión inicial + suscripción a cambios de auth
  useEffect(() => {
    let sub;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      if (session?.user) { await loadRoles(session.user); }

      sub = supabase.auth.onAuthStateChange(async (_evt, sess) => {
        const u = sess?.user || null;
        setUser(u);
        if (u) await loadRoles(u);
        else { setIsAdmin(false); setHasVendor(false); }
      });
    })();
    return () => { sub?.data?.subscription?.unsubscribe?.(); };
  }, []);

  async function loadRoles(u){
    const [{ data: a }, { data: vb }] = await Promise.all([
      supabase.from('admin_emails').select('email').eq('email', u.email),
      supabase.from('vendor_brands').select('brand_slug').eq('user_id', u.id),
    ]);
    setIsAdmin((a||[]).length>0);
    setHasVendor((vb||[]).length>0 || (a||[]).length>0);
  }

  // Cerrar al click externo
  useEffect(() => {
    const onClick = (e) => {
      if (!dropRef.current) return;
      if (!dropRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  // Login rápido con Google (si no tenés /login)
  async function signInGoogle(){
    try{
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined }
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
          <Link className="btn-ghost" href="/">Inicio</Link>
          <Link className="btn-ghost" href="/compras">Mis compras</Link>
          <Link className="btn-ghost" href="/soporte">Soporte</Link>

          <div className="dropdown" ref={dropRef}>
            <button
              className={`profile-btn ${open ? 'open' : ''}`}
              onClick={() => setOpen(v => !v)}
              aria-haspopup="menu"
              aria-expanded={open ? 'true' : 'false'}
              title={user ? (user.email || 'Cuenta') : 'Iniciar sesión'}
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
                {!user && (
                  <>
                    {/* Si TENÉS /login, podés usar el Link: <Link role="menuitem" href="/login">Iniciar sesión</Link> */}
                    <button role="menuitem" onClick={signInGoogle}>Iniciar sesión (Google)</button>
                  </>
                )}
                {user && (
                  <>
                    {hasVendor && <Link role="menuitem" href="/vendedor">Vendedor</Link>}
                    {isAdmin && <Link role="menuitem" href="/admin">Admin</Link>}
                    <button role="menuitem" onClick={() => supabase.auth.signOut().then(()=>location.href='/')}>
                      Cerrar sesión
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Estilos globales — hover animado, avatar grande, chevrón, menú */}
      <style jsx global>{`
        .nav {
          position: sticky;
          top: 0;
          z-index: 50;
          background: #0b0d14;
          border-bottom: 1px solid var(--line);
        }
        .nav-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        /* Marca: SIN animación por defecto.
           SOLO al pasar el mouse aplica el gradiente animado */
        .brand.cab-hover{
          font-weight: 900;
          letter-spacing: .2px;
          text-decoration: none;
          color: var(--text);
          display: inline-block;
          transition: color .12s ease;
        }
        .brand.cab-hover:hover{
          background: linear-gradient(90deg, #7c3aed, #60a5fa, #7c3aed);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent; /* visible el gradient */
          animation: cabGradientMove 8s linear infinite;
        }
        @keyframes cabGradientMove {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }

        .menu{
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btn-ghost{
          border: 1px solid var(--line);
          background: #0f1118;
          color: var(--text);
          padding: 8px 12px;
          border-radius: 10px;
          text-decoration: none;
          transition: transform .12s ease, box-shadow .12s ease, background .12s ease;
        }
        .btn-ghost:hover{ transform: translateY(-1px); box-shadow: 0 6px 18px rgba(124,58,237,.16); }

        /* Botón del menú del perfil (avatar + chevrón) */
        .profile-btn{
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px 6px 6px;
          border: 1px solid var(--line);
          background: #0f1118;
          border-radius: 12px;
          cursor: pointer;
          transition: transform .12s ease, box-shadow .12s ease, background .12s ease;
        }
        .profile-btn:hover{ transform: translateY(-1px); box-shadow: 0 6px 18px rgba(124,58,237,.16); }
        .profile-btn.open .chev{ transform: rotate(180deg); }

        .avatar-lg{
          width: 52px !important;
          height: 52px !important;
          border-radius: 999px;
          border: 1px solid var(--line);
          object-fit: cover;
          display: block;
        }
        .avatar-placeholder{
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 52px; height: 52px;
          border-radius: 999px;
          border: 1px solid var(--line);
          background: #10121a;
          font-size: 18px;
        }
        .chev{
          color: var(--muted);
          transition: transform .15s ease;
        }

        .dropdown{ position: relative; }
        .dropdown-menu{
          position: absolute;
          right: 0;
          top: calc(100% + 8px);
          min-width: 220px;
          background: #0f1118;
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          z-index: 9999;
          box-shadow: 0 14px 36px rgba(5,7,12,.35);
        }
        .dropdown-menu a,
        .dropdown-menu button{
          text-align: left;
          border: 1px solid transparent;
          background: transparent;
          color: var(--text);
          padding: 8px 10px;
          border-radius: 10px;
          text-decoration: none;
          cursor: pointer;
        }
        .dropdown-menu a:hover,
        .dropdown-menu button:hover{
          background: #141a2a;
          border-color: rgba(124,58,237,.25);
        }

        @media (max-width: 720px){
          .nav-inner{ padding: 8px 10px; }
          .btn-ghost{ padding: 7px 10px; }
        }
      `}</style>
    </header>
  );
}
