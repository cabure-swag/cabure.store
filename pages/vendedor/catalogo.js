import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function VendedorCatalogo(){
  const [ok, setOk] = useState(false);
  const [brands, setBrands] = useState([]);
  const [brand, setBrand] = useState(null);
  const [products, setProducts] = useState([]);
  const [cats, setCats] = useState([]);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const u = sess?.session?.user;
      if (!u) return setOk(false);
      const { data: admins } = await supabase.from('admin_emails').select('email').eq('email', u.email);
      const admin = Array.isArray(admins) && admins.length>0;
      let bs = [];
      if (admin) {
        const { data } = await supabase.from('brands').select('slug,name').order('name');
        bs = data || [];
      } else {
        const { data } = await supabase
          .from('vendor_brands')
          .select('brand_slug, brands!inner(name)')
          .eq('user_id', u.id);
        bs = (data || []).map(x => ({ slug: x.brand_slug, name: x.brands.name }));
      }
      setBrands(bs);
      setOk((bs||[]).length>0 || admin);
    })();
  }, []);

  async function loadData(slug){
    const { data: ps } = await supabase
      .from('products')
      .select('id,brand_slug,name,price,stock,image_url,description,created_at')
      .eq('brand_slug', slug)
      .order('created_at',{ascending:false});
    setProducts(ps || []);

    const { data: cs } = await supabase
      .from('categories')
      .select('id,name')
      .eq('brand_slug', slug)
      .order('name');
    setCats(cs || []);
  }

  useEffect(() => { if(brand) loadData(brand); }, [brand]);

  async function createCategory(e){
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = f.get('name');
    const { error } = await supabase.from('categories').insert({ brand_slug: brand, name });
    if (error) return alert(error.message);
    e.currentTarget.reset();
    loadData(brand);
  }
  async function deleteCategory(id){
    if(!confirm('Eliminar categoría?')) return;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) return alert(error.message);
    loadData(brand);
  }

  async function createProduct(e){
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = f.get('name');
    const price = Number(f.get('price') || 0);
    const stock = Math.max(1, Number(f.get('stock') || 1)); // base 1
    const description = f.get('description') || null;
    const file = f.get('image');
    const category_ids = (f.getAll('category_ids') || []).map(x => Number(x));

    let image_url = null;
    if (file && file.size > 0) {
      const path = `products/${brand}/${Date.now()}_${file.name}`;
      const up = await supabase.storage.from('media').upload(path, file);
      if (up.error) return alert(up.error.message);
      const { data: pub } = await supabase.storage.from('media').getPublicUrl(path);
      image_url = pub?.publicUrl || null;
    }

    const { data: prod, error } = await supabase
      .from('products')
      .insert({ brand_slug: brand, name, price, stock, image_url, description })
      .select('*').single();
    if (error) return alert(error.message);

    if (category_ids.length){
      const rows = category_ids.map(id => ({ product_id: prod.id, category_id: id }));
      const { error: e2 } = await supabase.from('product_categories').insert(rows);
      if (e2) return alert(e2.message);
    }

    e.currentTarget.reset();
    loadData(brand);
  }

  if(!ok) return <main className="container"><h1 className="h1">Vendedor — Catálogo</h1><p className="small">Necesitás una marca asignada o ser admin.</p></main>;

  return (
    <main className="container">
      <h1 className="h1">Vendedor — Catálogo</h1>

      <div className="card">
        <label>Marca</label>
        <select className="input" value={brand || ''} onChange={e=>setBrand(e.target.value || null)}>
          <option value="">Elegí una marca</option>
          {brands.map(b => <option key={b.slug} value={b.slug}>{b.name}</option>)}
        </select>
      </div>

      {brand && (
        <>
          <div className="grid" style={{ gridTemplateColumns:'1.2fr .8fr', gap:16 }}>
            <div className="card">
              <strong>Crear producto</strong>
              <form onSubmit={createProduct} className="grid" style={{ gridTemplateColumns:'repeat(4, 1fr)' }}>
                <div><label>Nombre</label><input className="input" name="name" required /></div>
                <div><label>Precio</label><input className="input" type="number" name="price" min="0" required /></div>
                <div><label>Stock</label><input className="input" type="number" name="stock" min="1" defaultValue="1" /></div>
                <div><label>Imagen principal</label><input className="input" type="file" name="image" accept="image/*" /></div>
                <div style={{ gridColumn:'1/-1' }}><label>Descripción</label><textarea className="input" name="description" rows="3" /></div>

                <div style={{ gridColumn:'1/-1' }}>
                  <label>Categorías</label>
                  <div className="row" style={{ flexWrap:'wrap', gap:8 }}>
                    {cats.map(c => (
                      <label key={c.id} className="btn-ghost" style={{ padding:'6px 10px', borderRadius:10 }}>
                        <input type="checkbox" name="category_ids" value={c.id} style={{ marginRight:8 }} />
                        {c.name}
                      </label>
                    ))}
                    {cats.length===0 && <div className="small">No hay categorías aún.</div>}
                  </div>
                </div>

                <div style={{ gridColumn:'1/-1' }}><button className="btn">Crear</button></div>
              </form>
            </div>

            <div className="card">
              <strong>Categorías</strong>
              <form onSubmit={createCategory} className="row" style={{ marginTop:8 }}>
                <input className="input" name="name" placeholder="Nueva categoría" required />
                <button className="btn">Agregar</button>
              </form>
              <div className="mt">
                {cats.map(c => (
                  <div key={c.id} className="row" style={{ marginBottom:6 }}>
                    <div>{c.name}</div>
                    <button className="btn-ghost" onClick={()=>deleteCategory(c.id)}>Eliminar</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid" style={{ gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', marginTop:16 }}>
            {products.map(p => (
              <div className="card" key={p.id}>
                <div className="row">
                  <strong>{p.name}</strong>
                  <div className="small">${p.price} · stock {Math.max(1, p.stock ?? 1)}</div>
                </div>
                {p.description && <div className="small" style={{ marginTop:6 }}>{p.description}</div>}
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
