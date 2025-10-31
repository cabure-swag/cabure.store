// pages/marcas/[slug].js
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import LightboxZoom from '../../components/LightboxZoom';

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

  // Lightbox (modal centrado, clic afuera cierra)
  const [lbOpen, setLbOpen]   = useState(false);
  const [lbImages, setLbImages] = useState([]); // [{url}]
  const [lbIndex, setLbIndex] = useState(0);
  const [lbRect, setLbRect]   = useState(null); // DOMRect de la miniatura

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

  // Abrir modal de zoom desde la imagen visible
  function openLightboxFromThumb(e, p){
    const imgEl = e.currentTarget.querySelector('img');
    const rect = imgEl?.getBoundingClientRect?.();
    const arr = imgsOf(p).map(x => ({ url: x.url || x }));
    setLbImages(arr);
    setLbIndex(carouselIndex[p.id] || 0);
    setLbRect(rect);
    setLbOpen(true);
  }

  return (
    <main>
      {!brand ? (
        <div className="container"><div className="small">Cargando…</div></div>
      ) : (
        <>
          {/* HERO (cover) */}
          <div className="hero">
            <img
              src={brand.cover_url || brand.logo_url || '/logo.png'}
              alt={brand.name}
              className="hero-img"
              loading="eager"
            />
          </div>

          {/* CONTENIDO bajo el cover */}
          <div className="container">
            {/* Fila 1: Header superpuesto (solo el header se “sube”) + Carrito normal */}
            <div className="brand-layout">
              <div className="brand-header card header-float">
                <img
                  src={brand.logo_url || '/logo.png'}
                  alt={brand.name}
                  style={{ width:110, height:110, borderRadius:55, objectFit:'cover', border:'2px solid var(--line)' }}
                  loading="lazy"
                />
                <div className="brand-header-info">
                  <div className="h1" style={{ margin:0 }}>{brand.name}</div>
                  <div className="small" style={{ color:'var(--muted)' }}>{brand.description}</div>
                  <div className="small" style={{ color:'var(--muted)', marginTop:6 }}>
                    {brand.ship_domicilio!=null && <>Envío a domicilio: ${brand.ship_domicilio} · </>}
                    {brand.ship_sucursal!=null && <>Envío a sucursal: ${brand.ship_sucursal} · </>}
                    {(brand.ship_free_from||0) > 0 && <>Envío gratis desde: ${brand.ship_free_from}</>}
                  </div>
                </div>

                {/* Instagram (misma ubicación y tamaño) */}
                {brand.instagram && (
                  <a
                    href={
                      brand.instagram.startsWith('http')
                        ? brand.instagram
                        : `https://instagram.com/${brand.instagram.replace('@', '')}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Instagram"
                    className="igbtn"
                    style={{ alignSelf:'flex-start' }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                      fill="currentColor" width="22" height="22" aria-hidden="true">
                      <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2zm0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5A4.25 4.25 0 0 0 7.75 20.5h8.5A4.25 4.25 0 0 0 20.5 16.25v-8.5A4.25 4.25 0 0 0 16.25 3.5h-8.5zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 1.5A3.5 3.5 0 1 0 12 15a3.5 3.5 0 0 0 0-7zm4.75-.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5z"/>
                    </svg>
                  </a>
                )}
              </div>

              {/* Carrito: ya no queda debajo del cover */}
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

            {/* Toolbar de categorías (integrada) */}
            {cats.length > 0 && (
              <div className="toolbar card">
                <div className="toolbar-left">
                  <strong>Categorías</strong>
                </div>
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

            {/* Productos */}
            <div style={{ marginTop: 12 }}>
              <div className="grid-products">
                {filtered.map(p => {
                  const arr = imgsOf(p);
                  const idx = carouselIndex[p.id] || 0;
                  return (
                    <div className="card" key={p.id} style={{ display:'flex', flexDirection:'column', gap:10 }}>
                      <div className="carousel2">
                        <button
                          className="thumbBtn"
                          onClick={(e)=>openLightboxFromThumb(e, p)}
                          aria-label="Ver imagen en grande"
                        >
                          <img
                            src={arr[idx]?.url || p.image_url || '/logo.png'}
                            alt={p.name}
                            loading="lazy"
                          />
                        </button>

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
          </div>

          {/* Lightbox (modal centrado) */}
          {lbOpen && (
            <LightboxZoom
              images={lbImages}
              index={lbIndex}
              thumbRect={lbRect}
              onClose={()=>setLbOpen(false)}
              onPrev={()=>setLbIndex(i => Math.max(0, i-1))}
              onNext={()=>setLbIndex(i => Math.min(lbImages.length-1, i+1))}
            />
          )}

          <style jsx>{`
            /* HERO */
            .hero{
              position: relative;
              height: 300px;
              background: #0e0f16;
              z-index: 0;
            }
            .hero-img{
              width:100%; height:100%; object-fit:cover; filter:brightness(.82);
              display:block;
            }

            /* Layout principal */
            .brand-layout{
              display:grid;
              grid-template-columns: minmax(0, 3fr) minmax(280px, 1fr);
              gap: 20px;
              margin-top: 0; /* ya no usamos margen negativo */
              position: relative;
              z-index: 1; /* sobre el cover */
            }
            @media (max-width: 980px){
              .brand-layout{ grid-template-columns: 1fr; }
              .cart { position: static !important; }
            }

            /* Header superpuesto con glass (solo el header se “sube”) */
            .brand-header{
              display:flex; gap:16px; align-items:center;
              background: rgba(17,18,26,.6); backdrop-filter: blur(8px);
            }
            .header-float{
              transform: translateY(-72px); /* subimos SOLO el header */
              z-index: 2; /* por encima del cover */
            }
            .brand-header-info{ flex:1; min-width: 0; }

            /* Botón IG con footprint igual al anterior */
            .igbtn{
              display:inline-flex; align-items:center; justify-content:center;
              width:38px; height:38px; border-radius:12px;
              border:1px solid var(--line);
              background: rgba(17,18,26,.6);
              color:#fff;
              transition: transform .15s ease, background .15s ease;
              text-decoration:none;
            }
            .igbtn:hover{ background: rgba(255,255,255,0.1); transform: translateY(-1px); }

            /* Carrito */
            .cart{
              position: sticky; top: 90px; align-self: start;
              z-index: 1; /* mantiene prioridad sobre contenido debajo */
            }

            /* Toolbar de categorías integrada */
            .toolbar{
              margin-top: -52px; /* subimos un poco para pegarla al header */
              background: rgba(17,18,26,.6);
              backdrop-filter: blur(8px);
              display:flex; align-items:center; justify-content:space-between;
              gap: 16px; padding: 10px 12px;
              border-radius: 12px;
            }
            @media (max-width: 980px){
              .toolbar{ margin-top: 8px; flex-direction: column; align-items:flex-start; }
            }
            .chips{ display:flex; flex-wrap:wrap; gap:8px; }
            .chip{
              border:1px solid var(--line); background:#0f1118; color:var(--text);
              padding:6px 10px; border-radius:10px; cursor:pointer;
              transition: transform .12s ease, box-shadow .12s ease, background .12s ease;
            }
            .chip.on{ background:#141a2a; box-shadow:0 0 0 1px rgba(124,58,237,.35) inset; }
            .chip.clear{ opacity:.85 }
            .chip:hover{ transform:translateY(-1px); }

            /* Grilla de productos */
            .grid-products{
              display:grid; gap:16px;
              grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            }

            /* Carrusel */
            .carousel2{
              position:relative; height:340px; border-radius:12px; overflow:hidden; background:#0e0f16;
              display:flex; align-items:center; justify-content:center;
            }
            .carousel2 img{ width:100%; height:100%; object-fit:cover; display:block; }
            .thumbBtn{
              display:block; width:100%; height:100%;
              padding:0; margin:0; border:0; background:transparent; cursor: zoom-in;
            }
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
