// pages/auth/bridge.js
import { useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

function safeDecode(v) { try { return decodeURIComponent(v); } catch { return v; } }

export default function AuthBridge() {
  useEffect(() => {
    let unsub;
    const go = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        unsub = supabase.auth.onAuthStateChange((_e, s) => {
          if (s?.user) proceed();
        });
      } else {
        proceed();
      }
    };
    const proceed = () => {
      const url = typeof window !== 'undefined' ? new URL(window.location.href) : null;
      const rawNext = url?.searchParams.get('next');
      const fromQuery = rawNext ? safeDecode(rawNext) : null;

      const stored = typeof window !== 'undefined' ? window.sessionStorage.getItem('returnTo') : null;
      const fromStorage = stored ? safeDecode(stored) : null;
      if (stored) window.sessionStorage.removeItem('returnTo');

      const dest = fromQuery || fromStorage || '/';
      window.location.replace(dest);
    };
    go();
    return () => { unsub?.data?.subscription?.unsubscribe?.(); };
  }, []);
  return null; // Página puente invisible (sin UI)
}
