// components/NavBar.jsx
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function NavBar(){
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasVendor, setHasVendor] = useState(false);

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

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="brand brand-anim">cabure.store</Link>
        <div className="menu">
          <Link className="btn-ghost" href="/">Inicio</Link>
          <Link className="btn-ghost" href="/compras">Mis compras</Link>
          <Link className="btn-ghost" href="/soporte">Soporte</Link>
          <div className={`dropdown ${open?'open':''}`}>
            <button className="btn-ghost" onClick={()=>setOpen(v=>!v)}>
              {user?.user_metadata?.avatar_url
                ? <img className="avatar big" src={user.user_metadata.avatar_url} alt="yo" />
                : <span>Perfil</span>}
            </button>
            <div className="dropdown-menu">
              {!user && <Link href="/login">Iniciar sesión</Link>}
              {user && (
                <>
                  {hasVendor && <Link href="/vendedor">Vendedor</Link>}
                  {isAdmin && <Link href="/admin">Admin</Link>}
                  <button onClick={() => supabase.auth.signOut().then(()=>location.href='/')}>Cerrar sesión</button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CSS local para asegurar tamaños/animación */}
      <style jsx>{`
        .brand-anim{
          background: linear-gradient(90deg, #7c3aed, #60a5fa, #e5e7eb);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          font-weight: 900;
          animation: hue 8s linear infinite;
        }
        @keyframes hue { 0%{filter:hue-rotate(0deg)} 100%{filter:hue-rotate(360deg)} }
        :global(.avatar.big){ width:44px; height:44px; border-radius:999px; border:1px solid var(--line); }
      `}</style>
    </nav>
  );
}
