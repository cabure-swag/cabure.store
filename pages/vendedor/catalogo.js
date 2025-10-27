// pages/vendedor/catalogo.js
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function VendedorCatalogo(){
  const [ok, setOk] = useState(false);
  const [brands, setBrands] = useState([]);
  const [brand, setBrand] = useState(null);
  const [products, setProducts] = useState([]);
  const [cats, setCats] = useState([]);
  const catChannelRef = useRef(null);

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

  async function loadProducts(slug){
    const { data: ps } = await supabase
      .from('products')
      .select('id,brand_slug,name,price,stock,image_url,description,created_at')
      .eq('brand_slug', slug).order('created_at',{ascending:false});
    const ids = (ps||[]).map(p=>p.id);

    let imgs = [];
    if(ids.length){
      const { data: im } = await supabase
        .from('product_images')
        .select('id,product_id,url,position')
        .in('product_id', ids).order('position');
      imgs = im || [];
    }

    // categorías asignadas por producto
    let pc = [];
    if(ids.length){
      const { data: rel } = await supabase
        .from('product_categories')
        .select('product_id, category_id')
        .in('product_id', ids);
      pc = rel || [];
    }

    const merged = (ps||[]).map(p => ({
      ...p,
      stock: Math.max(1,p.stock??1),
      images: imgs.filter(i=>i.product_id===p.id).slice(0,5),
      category_ids: pc.filter(r=>r.product_id===p.id).map(r=>r.category_id)
    }));
    setProducts(merged);
  }

  async function loadCats(slug){
    const { data: cs } = await supabase.from('categories').select('id,name').eq('brand_slug', slug).order('name');
    setCats(cs || []);
  }

  useEffect(() => {
    if(!brand) return;
    loadProducts(brand);
    loadCats(brand);

    // suscripción realtime de categorías
    if (catChannelRef.current) supabase.removeChannel(catChannelRef.current);
    const ch = supabase
      .channel(`cats_${brand}`)
      .on('postgres_changes', { event:'*', schema:'public', table:'categories', filter:`brand_slug=eq.${brand}` },
        () => loadCats(brand)
      )
      .subscribe();
    catChannelRef.current = ch;
    return () => { if (catChannelRef.current) supabase.removeChannel(catChannelRef.current); };
  }, [brand]);

  async function createCategory(e){
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = f.get('name');
    const { error } = await supabase.from('categories').insert({ brand_slug: brand, name });
    if (error) return alert(error.message);
    e.currentTarget.reset();
    // loadCats llega por realtime
  }

  async function deleteCategory(id){
    if(!confirm('Eliminar categoría?')) return;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) return alert(error.message);
  }

  async function createProduct(e){
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = f.get('name');
    const price = Number(f.get('price') || 0);
    const stock = Math.max(1, Number(f.get('stock') || 1));
    const description = f.get('description') || null;
    const mainFile = f.get('image'); // opcional
    const extraFiles = Array.from(f.getAll('images_multi') || []).filter(Boolean).slice(0,5);
    const category_ids = (f.getAll('category_ids') || []).map(x => Number(x));

    let image_url = null;
    if (mainFile && mainFile.size > 0) {
      const path = `products/${brand}/${Date.now()}_${mainFile.name}`;
      const up = await supabase.storage.from('media').upload(path, mainFile);
      if (up.error) return alert(up.error.message);
      const { data: pub } = await supabase.storage.from('media').getPublicUrl(path);
      image_url = pub?.publicUrl || null;
    }

    const { data: prod, error } = await supabase
      .from('products')
      .insert({ brand_slug: brand, name, price, stock, image_url, description })
      .select('*').single();
    if (error) return alert(error.message);

    // imágenes adicionales
    let count = 0;
    for (const file of extraFiles) {
      const path = `products/${brand}/${prod.id}/${Date.now()}_${file.name}`;
      const up = await supabase.storage.from('media').upload(path, file);
      if (up.error) { alert(up.error.message); break; }
      const { data: pub } = await supabase.storage.from('media').getPublicUrl(path);
      const url = pub?.publicUrl || null;
      await supabase.from('product_images').insert({ product_id: prod.id, url, position: count });
      count++;
      if (count >= 5) break;
    }

    if (category_ids.length){
      const rows = category_ids.map(id => ({ product_id: prod.id, category_id: id }));
      const { error: e2 } = await supabase.from('product_categories').insert(rows);
      if (e2) return alert(e2.message);
    }

    e.currentTarget.reset();
    loadProducts(brand);
  }

  async function addPhoto(pid, file){
    const p = products.find(x => x.id===pid);
    const existing = p?.images?.length || 0;
    if (existing >= 5) return alert('Máximo 5 fotos');
    const path = `products/${brand}/${pid}/${Date.now()}_${file.name}`;
    const up = await supabase.storage.from('media').upload(path, file);
    if (up.error) return alert(up.error.message);
    const { data: pub } = await supabase.storage.from('media').getPublicUrl(path);
    const url = pub?.publicUrl || null;
    const { error } = await supabase.from('product_images').insert({ product_id: pid, url, position: existing });
    if (error) return alert(error.message);
    loadProducts(brand);
  }

  async function deletePhoto(imgId){
    const { error } = await supabase.from('product_images').delete().eq('id', imgId);
    if (error) return alert(error.message);
    loadProducts(brand);
  }

  async function updateProduct(e, pid){
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = f.get('name');
    const price = Number(f.get('price') || 0);
    const stock = Math.max(1, Number(f.get('stock') || 1));
    const description = f.get('description') || null;
    const catIds = (f.getAll('category_ids') || []).map(x => Number(x));

    const { error } = await supabase.from('products').update({ name, price, stock, description }).eq('id', pid);
    if (error) return alert(error.message);

    // Sync categorías: borramos y reinsertamos (simple y seguro)
    await supabase.from('product_categories').delete().eq('product_id', pid);
    if (catIds.length){
      const rows = catIds.map(id => ({ product_id: pid, category_id: id }));
      const { error: e2 } = await supabase.from('product_categories').insert(rows);
      if (e2) return alert(e2.message);
    }

    alert('Guardado');
    loadProducts(brand);
  }

  async function deleteProduct(pid){
    if(!confirm('Eliminar producto?')) return;
    const { error } = await supabase.from('products').delete().eq('id', pid);
    if (error) return alert(error.message);
    loadProducts(brand);
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
                  <label>Imágenes adicionales (hasta 5)</label>
                  <input className="input" type="file" name="images_multi" accept="image/*" multiple />
                </div>

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
              <strong>Categorías (tiempo real)</strong>
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
                {cats.length===0 && <div className="small">No hay categorías aún.</div>}
              </div>
            </div>
          </div>

          <div className="grid" style={{ gridTemplateColumns:'repeat(auto-fill, minmax(380px, 1fr))', marginTop:16, gap:16 }}>
            {products.map(p => (
              <div className="card" key={p.id}>
                <div className="row">
                  <strong>{p.name}</strong>
                  <div className="small">${p.price} · stock {p.stock}</div>
                </div>
                {p.description && <div className="small" style={{ marginTop:6 }}>{p.description}</div>}

                {/* Imágenes actuales */}
                <div className="row" style={{ gap:8, flexWrap:'wrap', marginTop:10 }}>
                  {(p.images || []).map(im => (
                    <div key={im.id} style={{ position:'relative' }}>
                      <img src={im.url} alt="" style={{ width:96, height:96, objectFit:'cover', borderRadius:8, border:'1px solid var(--line)' }} />
                      <button className="btn-ghost" style={{ position:'absolute', top:2, right:2 }} onClick={()=>deletePhoto(im.id)}>×</button>
                    </div>
                  ))}
                  {(p.images?.length || 0) < 5 && (
                    <label className="btn-ghost" style={{ width:96, height:96, display:'inline-flex', alignItems:'center', justifyContent:'center', borderRadius:8, border:'1px dashed var(--line)', cursor:'pointer' }}>
                      + Foto
                      <input type="file" accept="image/*" style={{ display:'none' }} onChange={(e)=>{ const file=e.target.files?.[0]; if(file) addPhoto(p.id, file); e.target.value=''; }} />
                    </label>
                  )}
                </div>

                {/* Editar datos + categorías */}
                <form onSubmit={(e)=>updateProduct(e, p.id)} className="grid" style={{ gridTemplateColumns:'repeat(4, 1fr)', marginTop:10 }}>
                  <div><label>Nombre</label><input className="input" name="name" defaultValue={p.name} required /></div>
                  <div><label>Precio</label><input className="input" name="price" type="number" defaultValue={p.price} required /></div>
                  <div><label>Stock</label><input className="input" name="stock" type="number" min="1" defaultValue={p.stock} required /></div>
                  <div style={{ gridColumn:'1/-1' }}><label>Descripción</label><textarea className="input" name="description" rows="2" defaultValue={p.description || ''} /></div>

                  <div style={{ gridColumn:'1/-1' }}>
                    <label>Categorías</label>
                    <div className="row" style={{ flexWrap:'wrap', gap:8 }}>
                      {cats.map(c => (
                        <label key={c.id} className="btn-ghost" style={{ padding:'6px 10px', borderRadius:10 }}>
                          <input
                            type="checkbox"
                            name="category_ids"
                            value={c.id}
                            defaultChecked={p.category_ids?.includes(c.id)}
                            style={{ marginRight:8 }}
                          />
                          {c.name}
                        </label>
                      ))}
                      {cats.length===0 && <div className="small">No hay categorías aún.</div>}
                    </div>
                  </div>

                  <div style={{ gridColumn:'1/-1' }} className="row">
                    <button className="btn">Guardar</button>
                    <button type="button" className="btn-ghost" onClick={()=>deleteProduct(p.id)}>Eliminar</button>
                  </div>
                </form>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
