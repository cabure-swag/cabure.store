// ui/Navbar.jsx
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

function useOutside(ref, onClose) {
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, onClose]);
}

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isVendor, setIsVendor] = useState(false);
  const [open, setOpen] = useState(false);
  const dd = useRef(null);
  useOutside(dd, () => setOpen(false));

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const u = data?.session?.user || null;
      setUser(u);

      if (!u) { setIsAdmin(false); setIsVendor(false); return; }

      // Foto desde profiles o Google
      const { data: prof } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', u.id)
        .maybeSingle();
      if (prof?.avatar_url) {
        u.user_metadata = { ...(u.user_metadata || {}), picture: prof.avatar_url };
        setUser({ ...u });
      }

      // Admin por admin_emails
      const { data: admins } = await supabase
        .from('admin_emails')
        .select('email')
        .eq('email', u.email);
      const admin = Array.isArray(admins) && admins.length > 0;

      // Vendor si tiene asignaciones o sos admin
      let vendor = admin;
      if (!vendor) {
        const { count } = await supabase
          .from('vendor_brands')
          .select('brand_slug', { count: 'exact', head: true })
          .eq('user_id', u.id);
        vendor = (count ?? 0) > 0;
      }

      setIsAdmin(admin);
      setIsVendor(vendor);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setUser(s?.user || null)
    );
    return () => sub?.subscription?.unsubscribe();
  }, []);

  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined },
    });
  };
  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const pic = user?.user_metadata?.picture;

  return (
    <header className="nav">
      <div className="nav-inner">
        <a href="/" className="brand">CABURE.STORE</a>
        <nav className="menu">
          {!user ? (
            <button className="btn-ghost" onClick={signIn}>Iniciar sesión (Google)</button>
          ) : (
            <div className={`dropdown ${open ? 'open' : ''}`} ref={dd}>
              <button className="btn-ghost" onClick={() => setOpen(v => !v)}>
                {pic ? <img className="avatar" src={pic} alt="avatar" /> : <span className="badge">Cuenta</span>}
              </button>
              <div className="dropdown-menu">
                <div className="small" style={{ padding: '6px 10px' }}>Hola, {user.email}</div>

                {/* Links del panel de cuenta */}
                <a href="/compras">Mis Compras</a>
                <a href="/soporte">Soporte</a>

                {/* Accesos a Vendedor/Admin dentro del dropdown */}
                {isVendor && <a href="/vendedor">Vendedor</a>}
                {isAdmin && <a href="/admin">Admin</a>}

                <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '8px 0' }} />
                <button onClick={signOut}>Cerrar sesión</button>
              </div>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
