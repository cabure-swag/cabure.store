// pages/vendedor/index.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

export default function VendedorPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      const user = s?.session?.user;
      if (!user) { router.replace('/'); return; }

      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (!active) return;

      if (data?.role === 'vendor' || data?.role === 'admin') setAllowed(true);
      else router.replace('/');
      setChecking(false);
    })();

    return () => { active = false; };
  }, [router]);

  if (checking) return <main><div className="container">Verificando permiso…</div></main>;
  if (!allowed) return null;

  return (
    <main>
      <div className="container">
        <h1>Panel del Vendedor</h1>
        <p>Gestiona tus productos y pedidos.</p>
      </div>
    </main>
  );
}
