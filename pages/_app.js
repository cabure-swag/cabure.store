// pages/_app.js
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

// Utilidad: decodificar con tolerancia
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

function MyApp({ Component, pageProps }){
  const router = useRouter();
  const readyRef = useRef(false);

  useEffect(() => {
    let sub;
    (async () => {
      // 1) Leer sesión actual y sincronizar cookie SSR
      const { data: { session } } = await supabase.auth.getSession();
      await syncSsrCookie(session || null);

      // 2) Ejecutar guard inicial cuando el router está listo
      if (router.isReady){
        applyGuards(router, !!session);
        readyRef.current = true;
      }

      // 3) Suscripción a cambios de auth (login/logout)
      sub = supabase.auth.onAuthStateChange(async (_evt, sess) => {
        await syncSsrCookie(sess || null);
        // Re-evaluar navegación después de login/logout
        applyGuards(router, !!sess?.user);
      });
    })();

    return () => { sub?.data?.subscription?.unsubscribe?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.asPath]);

  return <Component {...pageProps} />;
}

/**
 * Reglas de navegación globales:
 * - Si se visita /admin o /vendedor sin sesión -> redirigir a /?next=/admin (o /vendedor).
 * - Si se visita /?next=... y HAY sesión -> redirigir inmediatamente a ese destino.
 * - Decodificar `next` si viene con %2F.
 */
function applyGuards(router, hasSession){
  const asPath = router.asPath || '/';
  // Ej: "/?next=%2Fadmin"
  const url = typeof window !== 'undefined' ? new URL(window.location.href) : null;
  const rawNext = url?.searchParams.get('next') || null;
  const nextTo = rawNext ? safeDecode(rawNext) : null;

  // Normalizar path actual sin query ni hash
  const currentPath = asPath.split('?')[0];

  const isAdmin = currentPath === '/admin' || currentPath.startsWith('/admin/');
  const isVendor = currentPath === '/vendedor' || currentPath.startsWith('/vendedor/');

  // 1) Si estoy en /admin o /vendedor y NO tengo sesión -> mandar a home con ?next=...
  if (!hasSession && (isAdmin || isVendor)){
    const target = isAdmin ? '/admin' : '/vendedor';
    const dest = `/?next=${encodeURIComponent(target)}`;
    if (asPath !== dest){
      router.replace(dest);
    }
    return;
  }

  // 2) Si estoy en home con ?next=... y SÍ tengo sesión -> ir al destino
  const isHome = currentPath === '/' || currentPath === '';
  if (isHome && nextTo && hasSession){
    if (nextTo !== currentPath){
      router.replace(nextTo);
    }
    return;
  }

  // 3) Si no hay `next` pero guardamos returnTo (flujo login manual), respetarlo
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

export default MyApp;
