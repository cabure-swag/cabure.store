import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

async function fetchRole() {
  const { data: s } = await supabase.auth.getSession();
  const user = s?.session?.user;
  if (!user) return { user: null, role: null };
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  return { user, role: data?.role || 'user' };
}
async function fetchBrandsForUser({ user, role }) {
  if (role === 'admin') {
    const { data } = await supabase.from('brands').select('slug,name').order('name');
    return data || [];
  }
  const { data: assigned, error: eAssign } = await supabase.from('brands_vendors').select('brand_slug').eq('user_id', user.id);
  if (!eAssign && Array.isArray(assigned) && assigned.length){
    const slugs = assigned.map(x=>x.brand_slug);
    const { data } = await supabase.from('brands').select('slug,name').in('slug', slugs).order('name');
    return data || [];
  }
  const { data } = await supabase.from('brands').select('slug,name').order('name');
  return data || [];
}

export default function VendedorCatalogo(){
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [myBrands, setMyBrands] = useState([]);
  const [slug, setSlug] = useState('');
  const [products, setProducts] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    let active = true;
    (async () => {
      const { user, role } = await fetchRole();
      if (!active) return;
      setRole(role);
      const list = await fetchBrandsForUser({ user, role });
      if (!active) return;
      setMyBrands(list);
      if (!slug && list?.[0]?.slug) setSlug(list[0].slug);
    })();
    return () => { active = false; };
  }, [session]);

  useEffect(() => {
    if (!slug) { setProducts([]); return; }
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id,name,price,stock')
        .eq('brand_slug', slug)
        .order('created_at', { ascending: false });
      if (!active) return;
      if (error) { setProducts([]); return; }
      setProducts(data || []);
    })();
    return () => { active = false; };
  }, [slug]);

  return (
    <main>
      <div className="container">
        <h1>Vendedor — Catálogo</h1>
        {!session ? (
          <div className="card">Iniciá sesión con Google.</div>
        ) : (
          <>
            <div className="card">
              <label className="lbl">Marca</label>
              <select value={slug} onChange={e=>setSlug(e.target.value)}>
                {(myBrands||[]).map(b => <option key={b.slug} value={b.slug}>{b.name}</option>)}
              </select>
            </div>

            <div className="card">
              <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
                <strong>Productos ({products.length})</strong>
                <button className="btn">+ Nuevo producto</button>
              </div>
              <div className="mt list">
                {products.map(p => (
                  <div key={p.id} className="row item">
                    <div>
                      <div>{p.name}</div>
                      <div className="small" style={{opacity:.8}}>Stock: {p.stock} · ${p.price}</div>
                    </div>
                    <div className="row" style={{gap:8}}>
                      <button className="btn-ghost">Editar</button>
                      <button className="btn-ghost">Eliminar</button>
                    </div>
                  </div>
                ))}
                {products.length===0 && <div className="small">No hay productos aún.</div>}
              </div>
            </div>
          </>
        )}
      </div>
      <style jsx>{`
        .lbl{ display:block; margin-bottom:6px; font-weight:600; }
        select{ background:#0f1118; border:1px solid var(--line); border-radius:10px; padding:8px 10px; color:var(--text); }
        .list{ display:flex; flex-direction:column; gap:10px; }
        .item{
          border:1px solid var(--line);
          border-radius:10px; padding:10px;
          display:flex; align-items:center; justify-content:space-between;
          background:#0e0f16;
        }
        .btn{
          padding:6px 12px; border-radius:10px; background:#7c3aed;
          color:#fff; border:0; cursor:pointer;
        }
        .btn-ghost{
          padding:6px 10px; border-radius:8px; background:none;
          border:1px solid var(--line); color:var(--text); cursor:pointer;
        }
      `}</style>
    </main>
  );
}
