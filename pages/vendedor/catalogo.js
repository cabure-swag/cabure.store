// pages/vendedor/catalogo.js
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function VendedorCatalogo(){
  const [ok, setOk] = useState(false);
  const [brands, setBrands] = useState([]);
  const [brand, setBrand] = useState(null);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const u = sess?.session?.user;
      if (!u) return setOk(false);
      // marcas asignadas o admin
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

  useEffect(() => {
    (async () => {
      if(!brand) return setProducts([]);
      const { data: ps } = await supabase.from('products').select('*').eq('brand_slug', brand).order('created_at',{ascending:false});
      const ids = (ps||[]).map(p=>p.id);
      let imgs = [];
      if(ids.length){
        const { data: im } = await supabase.from('product_images').select('id,product_id,url,position').in('product_id', ids).order('position');
        imgs = im || [];
      }
      const merged = (ps||[]).map(p => ({ ...p, images: imgs.filter(i=>i.product_id===p.id).sort((a,b)=>a.position-b.position).slice(0,5) }));
      setProducts(merged);
    })();
  }, [brand]);

  async function createProduct(e){
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = f.get('name');
    const price = Number(f.get('price') || 0);
    const stock = Number(f.get('stock') || 0);
    const file = f.get('image');
    let image_url = null;

    if (file && file.size > 0) {
      const path = `products/${brand}/${Date.now()}_${file.name}`;
      const up = await supabase.storage.from('media').upload(path, file);
      if (up.error) return alert(up.error.message);
      const { data: pub } = supabase.storage.from('media').getPublicUrl(path);
      image_url = pub?.publicUrl || null;
    }

    const { error } = await supabase.from('products').insert({ brand_slug: brand, name, price, stock, image_url });
    if (error) return alert(error.message);
    e.currentTarget.reset();
    // recargar
    const { data: ps } = await supabase.from('products').select('*').eq('brand_slug', brand).order('created_at',{ascending:false});
    setProducts(ps||[]);
  }

  async function addPhoto(pid, file){
    // limitar a 5
    const existing = products.find(p => p.id===pid)?.images || [];
    if (existing.length >= 5) return alert('Máximo 5 fotos');
    const path = `products/${brand}/${pid}/${Date.now()}_${file.name}`;
    const up = await supabase.storage.from('media').upload(path, file);
    if (up.error) return alert(up.error.message);
    const { data: pub } = supabase.storage.from('media').getPublicUrl(path);
    const url = pub?.publicUrl || null;
    const { error } = await supabase.from('product_images').insert({ product_id: pid, url, position: existing.length });
    if (error) return alert(error.message);
    // refresh
    const { data: im } = await supabase.from('product_images').select('id,product_id,url,position').eq('product_id', pid).order('position');
    setProducts(ps => ps.map(p => p.id===pid ? { ...p, images: (im||[]).slice(0,5) } : p));
  }

  async function deletePhoto(imgId, pid){
    const { error } = await supabase.from('product_images').delete().eq('id', imgId);
    if (error) return alert(error.message);
    const { data: im } = await supabase.from('product_images').select('id,product_id,url,position').eq('product_id', pid).order('position');
    setProducts(ps => ps.map(p => p.id===pid ? { ...p, images: (im||[]).slice(0,5) } : p));
  }

  async function updateProduct(e, pid){
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = f.get('name');
    const price = Number(f.get('price') || 0);
    const stock = Number(f.get('stock') || 0);
    const { error } = await supabase.from('products').update({ name, price, stock }).eq('id', pid);
    if (error) return alert(error.message);
    alert('Guardado');
  }

  async function deleteProduct(pid){
    if(!confirm('Eliminar producto?')) return;
    const { error } = await supabase.from('products').delete().eq('id', pid);
    if (error) return alert(error.message);
    setProducts(ps => ps.filter(p => p.id !== pid));
  }

  if(!ok) return <main className="container"><h1 className="h1">Vendedor — Catálogo</h1><p className="small">Necesitás tener una marca asignada o ser admin.</p></main>;

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
          <div className="card">
            <strong>Crear producto</strong>
            <form onSubmit={createProduct} className="grid" style={{ gridTemplateColumns:'repeat(4, 1fr)' }}>
              <div><label>Nombre</label><input className="input" name="name" required /></div>
              <div><label>Precio</label><input className="input" type="number" name="price" min="0" required /></div>
              <div><label>Stock</label><input className="input" type="number" name="stock" min="0" required /></div>
              <div><label>Imagen principal</label><input className="input" type="file" name="image" accept="image/*" /></div>
              <div style={{ gridColumn:'1/-1' }}><button className="btn">Crear</button></div>
            </form>
          </div>

          <div className="grid" style={{ gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', marginTop:16 }}>
            {products.map(p => (
              <div className="card" key={p.id}>
                <div className="row">
                  <strong>{p.name}</strong>
                  <div style={{ display:'flex', gap:8 }}>
                    <button className="btn-ghost" onClick={()=>deleteProduct(p.id)}>Eliminar</button>
                  </div>
                </div>

                <form onSubmit={(e)=>updateProduct(e, p.id)} className="grid" style={{ gridTemplateColumns:'1fr 1fr 1fr' }}>
                  <div><label>Nombre</label><input className="input" name="name" defaultValue={p.name} required /></div>
                  <div><label>Precio</label><input className="input" name="price" type="number" defaultValue={p.price} required /></div>
                  <div><label>Stock</label><input className="input" name="stock" type="number" defaultValue={p.stock} required /></div>
                  <div style={{ gridColumn:'1/-1' }}><button className="btn">Guardar</button></div>
                </form>

                <div className="mt">
                  <strong>Fotos (máx 5)</strong>
                  <div className="row" style={{ gap:8, flexWrap:'wrap', marginTop:8 }}>
                    {(p.images || []).map(im => (
                      <div key={im.id} style={{ position:'relative' }}>
                        <img src={im.url} alt="" style={{ width:96, height:96, objectFit:'cover', borderRadius:8, border:'1px solid var(--line)' }} />
                        <button className="btn-ghost" style={{ position:'absolute', top:2, right:2 }} onClick={()=>deletePhoto(im.id, p.id)}>×</button>
                      </div>
                    ))}
                    {(p.images?.length || 0) < 5 && (
                      <label className="btn-ghost" style={{ width:96, height:96, display:'inline-flex', alignItems:'center', justifyContent:'center', borderRadius:8, border:'1px dashed var(--line)', cursor:'pointer' }}>
                        + Foto
                        <input type="file" accept="image/*" style={{ display:'none' }} onChange={(e)=>{ const file=e.target.files?.[0]; if(file) addPhoto(p.id, file); e.target.value=''; }} />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
