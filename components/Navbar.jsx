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

  // Cargar sesión + roles
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const u = session?.user || null;
      setUser(u || null);
      if (!u) return;
      const { data: a } = await supabase.from('admin_emails').select('email').eq('email', u.email);
      setIsAdmin((a||[]).length>0);
      const { data: vb } = await supabase.from('vendor_brands').select('brand_slug').eq('user_id', u.id);
      setHasVendor((vb||[]).length>0 || (a||[]).length>0);
    })();
  }, []);

  // Cerrar al clickear fuera
  useEffect(() => {
    const onClick = (e) => {
      if (!dropRef.current) return;
      if (!dropRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return (
    <header className="nav">
      <div className="nav-inner">
        <Link href="/" className="brand cab-anim" aria-label="Ir al inicio">
          cabure.store
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
                <img
                  className="avatar-lg"
                  src={user.user_metadata.avatar_url}
                  alt="Cuenta"
                />
              ) : (
                <span className="avatar-placeholder">👤</span>
              )}
              <svg
                className="chev"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"
              >
                <path d="M7 10l5 5 5-5" fill="currentColor" />
              </svg>
            </button>

            {open && (
              <div className="dropdown-menu" role="menu">
                {!user && <Link role="menuitem" href="/login">Iniciar sesión</Link>}
                {user && (
                  <>
                    {hasVendor && <Link role="menuitem" href="/vendedor">Vendedor</Link>}
                    {isAdmin && <Link role="menuitem" href="/admin">Admin</Link>}
                    <button
                      role="menuitem"
                      onClick={() => supabase.auth.signOut().then(()=>location.href='/')}
                    >
                      Cerrar sesión
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Estilos globales para asegurar animación y tamaños (no los pisa nada) */}
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

        /* Marca animada: gradiente en movimiento, forzado */
        .brand.cab-anim{
          font-weight: 900;
          letter-spacing: .2px;
          text-decoration: none;
          background: linear-gradient(90deg, #7c3aed, #60a5fa, #7c3aed);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent !important;
          animation: cabGradientMove 8s linear infinite;
          display: inline-block;
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

        /* Botón de perfil (avatar + chevrón) */
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
          min-width: 200px;
          background: #0f1118;
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          z-index: 60;
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
