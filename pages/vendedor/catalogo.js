// pages/vendedor/catalogo.js
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import ImageUploader from '../../components/ImageUploader';

export default function VendedorCatalogo(){
  const [brands, setBrands] = useState([]);
  const [selBrand, setSelBrand] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState(1);
  const [desc, setDesc] = useState('');
  const [imgs, setImgs] = useState([]); // [{url}]
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState([]);

  // Cargar marcas donde soy vendor
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const u = session?.user;
      if(!u) return;

      const { data: vb } = await supabase
        .from('vendor_brands')
        .select('brand_slug')
        .eq('user_id', u.id);

      const slugs = (vb || []).map(v => v.brand_slug);
      if(!slugs.length) return;

      const { data: bs } = await supabase
        .from('brands')
        .select('slug,name')
        .in('slug', slugs)
        .order('name', { ascending:true });

      setBrands(bs || []);
      if (bs?.length && !selBrand) setSelBrand(bs[0].slug);
    })();
  }, []);

  // Cargar productos de la marca seleccionada
  useEffect(() => {
    (async () => {
      if(!selBrand) { setProducts([]); return; }
      const { data: prods } = await supabase
        .from('products')
        .select('id, name, price, stock, image_url, created_at')
        .eq('brand_slug', selBrand)
        .order('created_at', { ascending:false });
      setProducts(prods || []);
    })();
  }, [selBrand]);

  const valid = useMemo(() => {
    return selBrand && name.trim().length>0 && Number(price) > 0 && Number(stock) >= 1 && imgs.length>=1;
  }, [selBrand, name, price, stock, imgs]);

  async function crearProducto(e){
    e.preventDefault();
    if (!valid) { alert('Completá todos los campos y subí al menos 1 imagen.'); return; }
    try{
      setSaving(true);
      // 1) Crear product base (principal = imgs[0])
      const { data: ins, error } = await supabase.from('products').insert({
        brand_slug: selBrand,
        name: name.trim(),
        description: (desc || '').trim() || null,
        price: Number(price),
        stock: Number(stock),
        image_url: imgs[0]?.url || null, // compatibilidad para la “principal”
      }).select('id').single();
      if (error) throw error;

      // 2) Guardar hasta 5 imágenes en product_images
      const rows = imgs.slice(0,5).map((im,idx)=>({
        product_id: ins.id,
        url: im.url,
        position: idx
      }));
      if (rows.length){
        const { error: e2 } = await supabase.from('product_images').insert(rows);
        if (e2) throw e2;
      }

      // 3) Reset + recarga lista
      setName(''); setPrice(''); setStock(1); setDesc(''); setImgs([]);
      const { data: prods } = await supabase
        .from('products')
        .select('id, name, price, stock, image_url, created_at')
        .eq('brand_slug', selBrand)
        .order('created_at', { ascending:false });
      setProducts(prods || []);
      alert('Producto creado');
    }catch(err){
      alert('Error creando producto: ' + (err?.message || err));
    }finally{
      setSaving(false);
    }
  }

  return (
    <main className="container">
      <h1 className="h1">Vendedor · Catálogo</h1>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row" style={{ alignItems:'center', gap:10 }}>
          <div className="small">Marca</div>
          <select className="input" value={selBrand} onChange={e=>setSelBrand(e.target.value)} style={{ maxWidth: 260 }}>
            <option value="">Elegí tu marca…</option>
            {brands.map(b => <option key={b.slug} value={b.slug}>{b.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns:'1.1fr .9fr', gap: 16 }}>
        <div className="card">
          <strong>Crear producto</strong>
          <form onSubmit={crearProducto} className="col" style={{ gap: 10, marginTop:10 }}>
            <label className="col">
              <span>Nombre</span>
              <input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="Ej. Remera Oversize" />
            </label>

            <div className="row" style={{ gap:10 }}>
              <label className="col">
                <span>Precio</span>
                <input className="input" value={price} onChange={e=>setPrice(e.target.value)} inputMode="decimal" placeholder="Ej. 19999" />
              </label>
              <label className="col" style={{ maxWidth: 160 }}>
                <span>Stock</span>
                <input className="input" value={stock} onChange={e=>setStock(e.target.value)} inputMode="numeric" placeholder="Ej. 1" />
              </label>
            </div>

            <label className="col">
              <span>Descripción</span>
              <textarea className="input" value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Detalles, talles, materiales…" rows={3} />
            </label>

            <div className="col" style={{ gap:6 }}>
              <span>Imágenes (arrastrá o hacé click) — máx 5 · la primera queda como principal</span>
              <ImageUploader
                brandSlug={selBrand || 'sin-marca'}
                productId={'tmp-'+Date.now()}
                initial={[]}
                max={5}
                onChange={setImgs}
              />
            </div>

            <div><button className="btn" disabled={!valid || saving}>{saving ? 'Guardando…' : 'Crear producto'}</button></div>
          </form>
        </div>

        <div className="card">
          <strong>Productos existentes</strong>
          <div style={{ marginTop: 10 }}>
            {products.map(p => (
              <div key={p.id} className="row" style={{ alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid var(--line)', padding:'8px 0' }}>
                <div className="row" style={{ gap:10, alignItems:'center' }}>
                  <img src={p.image_url || '/logo.png'} alt={p.name} style={{ width:48, height:48, objectFit:'cover', borderRadius:8, border:'1px solid var(--line)' }} />
                  <div>
                    <div>{p.name}</div>
                    <div className="small" style={{ color:'var(--muted)' }}>${p.price} · stock {p.stock}</div>
                  </div>
                </div>
                <a className="btn-ghost" href={`/vendedor/producto/${p.id}`}>Editar</a>
              </div>
            ))}
            {products.length===0 && <div className="small">Aún no cargaste productos.</div>}
          </div>
        </div>
      </div>
    </main>
  );
}
