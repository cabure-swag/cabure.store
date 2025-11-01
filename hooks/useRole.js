// hooks/useRole.js
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function useRole() {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      const { data: s } = await supabase.auth.getSession();
      const user = s?.session?.user;
      if (!user) { active && setRole(null); setLoading(false); return; }

      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (!active) return;
      if (error) { setRole(null); setLoading(false); return; }
      setRole(data?.role || 'user');
      setLoading(false);
    }

    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => { active = false; sub?.subscription?.unsubscribe?.(); };
  }, []);

  return { role, loading };
}
