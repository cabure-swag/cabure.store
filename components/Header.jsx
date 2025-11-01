// components/Header.jsx
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { useEffect, useState } from 'react';
import useRole from '../hooks/useRole';

export default function Header() {
  const { role, loading } = useRole();
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data?.session?.user || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user || null));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header className="header">
      <Link href="/" className="logo">CABURÉ.STORE</Link>

      <div className="menu">
        {user ? (
          <>
            <Link href="/compras">Mis compras</Link>
            <Link href="/soporte">Soporte</Link>

            {/* Mostrar "Vendedor" si el rol es vendor o admin */}
            {role && (role === 'vendor' || role === 'admin') && (
              <Link href="/vendedor">Vendedor</Link>
            )}

            {/* Mostrar "Admin" solo si el rol es admin */}
            {role === 'admin' && <Link href="/admin">Admin</Link>}

            <button
              onClick={() => supabase.auth.signOut()}
              className="btn-ghost"
            >Cerrar sesión</button>
          </>
        ) : (
          <button
            className="btn"
            onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })}
          >
            Iniciar sesión
          </button>
        )}
      </div>

      <style jsx>{`
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 24px;
          background: #0e0f16;
          border-bottom: 1px solid var(--line);
        }
        .logo {
          font-weight: 800;
          letter-spacing: 1px;
          font-size: 1.3rem;
          text-decoration: none;
          color: var(--text);
        }
        .menu {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .btn {
          padding: 6px 14px;
          border-radius: 10px;
          background: var(--primary);
          color: white;
          border: none;
          cursor: pointer;
        }
        .btn-ghost {
          background: none;
          border: 1px solid var(--line);
          padding: 6px 10px;
          border-radius: 8px;
          cursor: pointer;
          color: var(--text);
        }
      `}</style>
    </header>
  );
}
