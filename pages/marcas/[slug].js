// pages/marcas/[slug].js
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

function useBrand(slug){
  const [brand, setBrand] = useState(null);
  useEffect(() => {
    if(!slug) return;
    supabase.from('brands')
      .select('slug,name,description,instagram,logo_url,cover_url,ship_domicilio,ship_sucursal,ship_free_from')
      .eq('slug', slug).maybeSingle()
      .then(({data}) => setBrand(data || null));
  }, [slug]);
  return brand;
}
function useCats(slug){
  const [cats, setCats] = useState([]);
  useEffect(() => {
    if(!slug) return;
    supabase.from('categories').select('id,name').eq('brand_slug', slug).order('name')
      .then(({data}) => setCats(data || []));
  }, [slug]);
  return cats;
}
function useProducts(slug){
  const [items, setItems] = useState([]);
  useEffect(() => {
    if(!slug) return;
    (async () => {
      const { data: prods } = await supabase
        .from('products')
        .select('id,brand_slug,name,price,stock,image_url,description,created_at')
        .eq('brand_slug', slug)
        .order('created_at', { ascending: false });

      const ids = (prods || []).map(p => p.id);

      let images = [];
      if(ids.length){
        const { data: imgs } = await supabase
          .from('product_images')
          .select('id,product_id,url,position')
          .in('product_id', ids)
          .order('position');
        images = imgs || [];
      }

      let pc = [];
      if(ids.length){
        const { data: rel } = await supabase
          .from('product_categories')
          .select('product_id,category_id')
          .in('product_id', ids);
        pc = rel || [];
      }

      const grouped = (prods || []).map(p => ({
        ...p,
        stock: Math.max(1, p.stock ?? 1),
        images: images.filter(i => i.product_id === p.id).sort((a,b)=>a.position-b.position).slice(0,5),
        category_ids: pc.filter(r=>r.product_id===p.id).map(r=>r.category_id)
      }));
      setItems(grouped);
    })();
  }, [slug]);
  return items;
}

export default function BrandPage(){
  const router = useRouter();
  const slug = router.query.slug;
  const brand = useBrand(slug);
  const cats = useCats(slug);
  const products = useProducts(slug);

  const [selectedCats, setSelectedCats] = useState([]);
  const [cart, setCart] = useState([]);
  const [carouselIndex, setCarouselIndex] = useState({}); // {productId: idx}

  const filtered = useMemo(() => {
    if (!selectedCats.length) return products;
    const set = new Set(selectedCats);
    return products.filter(p => (p.category_ids || []).some(id => set.has(id)));
  }, [products, selectedCats]);

  function toggleCat(id){ setSelectedCats(arr => arr.includes(id) ? arr.filter(x => x!==id) : [...arr, id]); }
  function add(p){
    setCart(cs => {
      const idx = cs.findIndex(x => x.id === p.id);
      if(idx>=0){
        const it = cs[idx];
        if (it.qty >= p.stock) return cs;
        const c = [...cs]; c[idx] = {...it, qty: it.qty + 1}; return c;
      }
      return [...cs, { id: p.id, name: p.name, price: p.price, qty: 1, stock: p.stock }];
    });
  }
  function dec(id){ setCart(cs => cs.map(c => c.id===id? {...c, qty: Math.max(1, c.qty-1)}:c)); }
  function inc(id){ setCart(cs => cs.map(c => c.id===id? {...c, qty: Math.min(c.stock, c.qty+1)}:c)); }
  function rm(id){ setCart(cs => cs.filter(c => c.id !== id)); }
  const subtotal = useMemo(() => cart.reduce((s,c)=>s+c.price*c.qty,0), [cart]);
  function goCheckout(){ localStorage.setItem(`cart:${slug}`, JSON.stringify(cart)); router.push(`/checkout/${slug}`); }

  function imgsOf(p){
    const arr = (p.images.length ? p.images : [{ url: p.image_url }]).slice(0,5);
    return arr;
  }
  function prevImg(pid){ setCarouselIndex(m => ({...m, [pid]: Math.max(0, (m[pid]||0)-1)})); }
  function nextImg(pid, len){ setCarouselIndex(m => ({...m, [pid]: Math.min(len-1, (m[pid]||0)+1)})); }
  function setIdx(pid, idx){ setCarouselIndex(m => ({...m, [pid]: idx})); }

  return (
    <main>
      {!brand ? (
        <div className="container"><div className="small">Cargando…</div></div>
      ) : (
        <>
          {/* portada */}
          <div style={{ position:'relative', height: 300, background:'#0e0f16' }}>
            <img src={brand.cover_url || brand.logo_url || '/logo.png'} alt={brand.name}
                 style={{ width:'100%', height:'100%', objectFit:'cover', filter:'brightness(.82)' }}/>
          </div>

          {/* cabecera + carrito */}
          <div className="container" style={{ marginTop: -72 }}>
            <div className="brand-layout">
              <div className="brand-header card">
                <img src={brand.logo_url || '/logo.png'} alt={brand.name}
                     style={{ width:110, height:110, borderRadius:55, objectFit:'cover', border:'2px solid var(--line)' }}/>
                <div className="brand-header-info">
                  <div className="h1" style={{ margin:0 }}>{brand.name}</div>
                  <div className="small" style={{ color:'var(--muted)' }}>{brand.description}</div>
                  <div className="small" style={{ color:'var(--muted)', marginTop:6 }}>
                    {brand.ship_domicilio!=null && <>Envío a domicilio: ${brand.ship_domicilio} · </>}
                    {brand.ship_sucursal!=null && <>Envío a sucursal: ${brand.ship_sucursal} · </>}
                    {(brand.ship_free_from||0) > 0 && <>Envío gratis desde: ${brand.ship_free_from}</>}
                  </div>
                </div>
                {brand.instagram && (
                  <a className="btn-ghost"
                     href={brand.instagram.startsWith('http')? brand.instagram : `https://instagram.com/${brand.instagram.replace('@','')}`}
                     target="_blank" rel="noreferrer" style={{ alignSelf:'flex-start' }}>
                    IG ↗
                  </a>
                )}
              </div>

              <div className="cart card">
                <strong>Tu pedido</strong>
                <div className="mt" style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {cart.length===0 ? <div className="small">Todavía no agregaste productos.</div> : cart.map(c=>(
                    <div key={c.id} className="row" style={{ alignItems:'center' }}>
                      <div>
                        <div>{c.name}</div>
                        <div className="small">${c.price} · stock {c.stock}</div>
                      </div>
                      <div style={{ display:'flex', gap:6, alignItems:'center', marginLeft:'auto' }}>
                        <button className="btn-ghost" onClick={()=>dec(c.id)}>-</button>
                        <div className="badge">{c.qty}</div>
                        <button className="btn-ghost" onClick={()=>inc(c.id)}>+</button>
                        <button className="btn-ghost" onClick={()=>rm(c.id)}>Quitar</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt row"><span>Subtotal</span><span>${subtotal}</span></div>
                <div className="mt"><button className="btn" onClick={goCheckout} disabled={cart.length===0}>Ir al checkout</button></div>
              </div>
            </div>
          </div>

          {/* Filtros (chips) */}
          <div className="container" style={{ marginTop: 12 }}>
            {cats.length > 0 && (
              <div className="filters">
                <div className="chips">
                  {cats.map(c => (
                    <button key={c.id}
                      className={`chip ${selectedCats.includes(c.id)?'on':''}`}
                      onClick={()=>toggleCat(c.id)}>
                      {c.name}
                    </button>
                  ))}
                  {selectedCats.length>0 && (
                    <button className="chip clear" onClick={()=>setSelectedCats([])}>Limpiar</button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* productos */}
          <div className="container" style={{ marginTop: 10 }}>
            <div className="grid-products">
              {filtered.map(p => {
                const arr = imgsOf(p);
                const idx = carouselIndex[p.id] || 0;
                return (
                  <div className="card" key={p.id} style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    <div className="carousel2">
                      <img src={arr[idx]?.url || p.image_url || '/logo.png'} alt={p.name}/>
                      {arr.length>1 && (
                        <>
                          <button className="nav prev" onClick={()=>prevImg(p.id)} aria-label="Anterior">‹</button>
                          <button className="nav next" onClick={()=>nextImg(p.id, arr.length)} aria-label="Siguiente">›</button>
                          <div className="dots">
                            {arr.map((_,i)=>(
                              <button key={i} className={`dot ${i===idx?'on':''}`} onClick={()=>setIdx(p.id, i)} />
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    <div>
                      <strong>{p.name}</strong>
                      {p.description && <div className="small" style={{ marginTop:6 }}>{p.description}</div>}
                    </div>

                    <div className="row">
                      <div className="small">Stock: {p.stock}</div>
                      <div style={{ fontWeight:700 }}>${p.price}</div>
                    </div>

                    <div className="row" style={{ justifyContent:'flex-end' }}>
                      <button className="btn" onClick={()=>add(p)}>Agregar</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <style jsx>{`
            .brand-layout{
              display:grid;
              grid-template-columns: minmax(0, 3fr) minmax(280px, 1fr);
              gap: 20px;
            }
            @media (max-width: 980px){
              .brand-layout{ grid-template-columns: 1fr; }
              .cart { position: static !important; }
            }
            .brand-header{
              display:flex; gap:16px; align-items:center;
              background: rgba(17,18,26,.6); backdrop-filter: blur(8px);
            }
            .brand-header-info{ flex:1; min-width: 0; }
            .cart{ position: sticky; top: 90px; align-self: start; }

            .filters{ display:flex; align-items:center; }
            .chips{ display:flex; flex-wrap:wrap; gap:8px; }
            .chip{
              border:1px solid var(--line); background:#0f1118; color:var(--text);
              padding:6px 10px; border-radius:10px; cursor:pointer;
              transition: transform .12s ease, box-shadow .12s ease, background .12s ease;
            }
            .chip.on{ background:#141a2a; box-shadow:0 0 0 1px rgba(124,58,237,.35) inset; }
            .chip.clear{ opacity:.8 }
            .chip:hover{ transform:translateY(-1px); }

            .grid-products{
              display:grid; gap:16px;
              grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            }

            /* Carrusel controlado (una imagen a la vez, flechas + dots) */
            .carousel2{
              position:relative; height:340px; border-radius:12px; overflow:hidden; background:#0e0f16;
              display:flex; align-items:center; justify-content:center;
            }
            .carousel2 img{ width:100%; height:100%; object-fit:cover; display:block; }
            .nav{
              position:absolute; top:50%; transform:translateY(-50%);
              width:36px; height:36px; border-radius:10px; border:1px solid var(--line);
              background:rgba(15,17,24,.75); backdrop-filter:blur(6px);
              color:var(--text); cursor:pointer;
            }
            .nav.prev{ left:10px; }
            .nav.next{ right:10px; }
            .dots{
              position:absolute; bottom:10px; left:0; right:0; display:flex; gap:6px; justify-content:center;
            }
            .dot{
              width:8px; height:8px; border-radius:999px; border:1px solid var(--line); background:#0f1118; cursor:pointer;
            }
            .dot.on{ background:#7c3aed; border-color:#7c3aed; }
          `}</style>
        </>
      )}
    </main>
  );
}
