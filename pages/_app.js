// pages/_app.js
// ✅ Restaurar estilos globales y tu cabecera original
import '../styles/globals.css';

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import NavBar from '../components/NavBar';          // ✅ Montamos tu NavBar
import { supabase } from '../lib/supabaseClient';

// Utilidad para decodificar parámetros
function safeDecode(v){
  try{ return decodeURIComponent(v); }catch{ return v; }
}

// Sincroniza cookie SSR para gates server-side
async function syncSsrCookie(session){
  try{
    const tok = session?.access_token || null;
    await fetch('/api/auth/session', {
      method: tok ? 'POST' : 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: tok ? JSON.stringify({ access_token: tok }) : undefined,
    });
  }catch{}
}

/**
 * Guard suave (no bloqueante): se ejecuta después de renderizar,
 * para no afectar el diseño ni la cabecera.
 */
function applyGuards(router, hasSession){
  const asPath = router.asPath || '/';
  const url = typeof window !== 'undefined' ? new URL(window.location.href) : null;
  const rawNext = url?.searchParams.get('next') || null;
  const nextTo = rawNext ? safeDecode(rawNext) : null;

  const currentPath = asPath.split('?')[0];
  const isAdmin = currentPath === '/admin' || currentPath.startsWith('/admin/');
  const isVendor = currentPath === '/vendedor' || currentPath.startsWith('/vendedor/');
  const isHome = currentPath === '/' || currentPath === '';

  // 1) Si entro a /admin o /vendedor sin sesión → home con ?next
  if (!hasSession && (isAdmin || isVendor)){
    const target = isAdmin ? '/admin' : '/vendedor';
    const dest = `/?next=${encodeURIComponent(target)}`;
    if (asPath !== dest) router.replace(dest);
    return;
  }

  // 2) Si estoy en home con ?next y SÍ tengo sesión → ir al destino
  if (isHome && nextTo && hasSession){
    if (nextTo !== currentPath) router.replace(nextTo);
    return;
  }

  // 3) Si no hay ?next pero guardamos returnTo (login manual), respetarlo
  if (isHome && !rawNext && hasSession && typeof window !== 'undefined'){
    const stored = window.sessionStorage.getItem('returnTo');
    if (stored){
      window.sessionStorage.removeItem('returnTo');
      const decoded = safeDecode(stored);
      if (decoded && decoded !== currentPath) router.replace(decoded);
    }
  }
}

function MyApp({ Component, pageProps }){
  const router = useRouter();

  useEffect(() => {
    let sub;
    (async () => {
      // Sesión actual + cookie SSR
      const { data: { session } } = await supabase.auth.getSession();
      await syncSsrCookie(session || null);

      // Guard no bloqueante
      applyGuards(router, !!session?.user);

      // Reaccionar a login/logout
      sub = supabase.auth.onAuthStateChange(async (_evt, sess) => {
        await syncSsrCookie(sess || null);
        applyGuards(router, !!sess?.user);
      });
    })();

    return () => { sub?.data?.subscription?.unsubscribe?.(); };
  }, [router.asPath]);

  // ✅ Render normal de tu app con NavBar arriba (sin cambiar su diseño)
  return (
    <>
      <NavBar />
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
