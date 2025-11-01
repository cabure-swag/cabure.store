// CONTENT-ONLY: sin Topbar/Layout (usa tu layout global)
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function VendedorHomeContent(){
  const [ok, setOk] = useState(false);
  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      const user = s?.session?.user;
      if (!user) return;
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (data?.role === 'vendor' || data?.role === 'admin') setOk(true);
    })();
  }, []);

  if (!ok) return <div>No tenés permiso para ver Vendedor.</div>;

  return (
    <section>
      <h1>Vendedor — Dashboard</h1>
      <div className="card">Seleccioná una opción en la barra lateral.</div>
      <style jsx>{`
        .card{ border:1px solid var(--line); border-radius:12px; padding:14px; background:#0e0f16; }
      `}</style>
    </section>
  );
}
