// pages/_app.js
// ✅ Importar estilos globales para restaurar el diseño original
import '../styles/globals.css';

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

// Decodifica con tolerancia
function safeDecode(v){
  try{ return decodeURIComponent(v); }catch(_e){ return v; }
}

// Sincroniza cookie SSR para que los gates server-side funcionen
async function syncSsrCookie(session){
  try{
    const tok = session?.access_token || null;
    await fetch('/api/auth/session', {
      method: tok ? 'POST' : 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: tok ? JSON.stringify({ access_token: tok }) : undefined,
    });
  }catch(_e){}
}

/**
 * Reglas de navegación globales:
 * - Si se visita /admin o /vendedor sin sesión -> redirigir a /?next=/admin (o /vendedor).
 * - Si se visita /?next=... y HAY sesión -> redirigir inmediatamente a ese destino.
 * - Si no hay `next` pero existe returnTo (flujo login manual), respetarlo.
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

  // 1) Estoy en /admin o /vendedor y NO hay sesión → home con ?next=...
  if (!hasSession && (isAdmin || isVendor)){
    const target = isAdmin ? '/admin' : '/vendedor';
    const dest = `/?next=${encodeURIComponent(target)}`;
    if (asPath !== dest){
      router.replace(dest);
    }
    return;
  }

  // 2) Estoy en home con ?next=... y SÍ hay sesión → ir al destino
  if (isHome && nextTo && hasSession){
    if (nextTo !== currentPath){
      router.replace(nextTo);
    }
    return;
  }

  // 3) Sin `next`, pero con returnTo (flux login manual) → respetarlo
  if (isHome && !rawNext && hasSession && typeof window !== 'undefined'){
    const stored = window.sessionStorage.getItem('returnTo');
    if (stored){
      window.sessionStorage.removeItem('returnTo');
      const decoded = safeDecode(stored);
      if (decoded && decoded !== currentPath){
        router.replace(decoded);
      }
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

      // Guard inicial
      applyGuards(router, !!session?.user);

      // Reaccionar a login/logout
      sub = supabase.auth.onAuthStateChange(async (_evt, sess) => {
        await syncSsrCookie(sess || null);
        applyGuards(router, !!sess?.user);
      });
    })();

    return () => { sub?.data?.subscription?.unsubscribe?.(); };
    // Dependemos de la ruta actual para re-evaluar el guard cuando cambia
  }, [router.asPath]);

  return <Component {...pageProps} />;
}

export default MyApp;
