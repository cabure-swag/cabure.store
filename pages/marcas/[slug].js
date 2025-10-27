// pages/marcas/[slug].js
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

function useBrand(slug){
  const [brand, setBrand] = useState(null);
  useEffect(() => {
    if(!slug) return;
    supabase.from('brands')
      .select('slug,name,description,instagram,logo_url,ship_domicilio,ship_sucursal,ship_free_from,mp_fee')
      .eq('slug', slug).maybeSingle()
      .then(({data}) => setBrand(data || null));
  }, [slug]);
  return brand;
}

function useProducts(slug){
  const [items, setItems] = useState([]);
  useEffect(() => {
    if(!slug) return;
    (async () => {
      const { data: prods } = await supabase.from('products').select('*').eq('brand_slug', slug).order('created_at', { ascending: false });
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
      const grouped = (prods || []).map(p => ({
        ...p,
        images: images.filter(i => i.product_id === p.id).sort((a,b)=>a.position-b.position).slice(0,5),
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
  const products = useProducts(slug);

  const [cart, setCart] = useState([]); // {id,name,price,qty,stock}

  function add(p){
    setCart(cs => {
      const i = cs.findIndex(x => x.id === p.id);
      if(i>=0){
        const item = cs[i];
        if (item.qty >= p.stock) return cs; // no pasar stock
        const c = [...cs]; c[i] = {...item, qty: item.qty + 1}; return c;
      }
      return [...cs, { id: p.id, name: p.name, price: p.price, qty: 1, stock: p.stock }];
    });
  }
  function dec(id){
    setCart(cs => cs.map(c => c.id===id? {...c, qty: Math.max(1, c.qty-1)}:c));
  }
  function inc(id){
    setCart(cs => cs.map(c => c.id===id? {...c, qty: Math.min(c.stock, c.qty+1)}:c));
  }
  function rm(id){ setCart(cs => cs.filter(c => c.id !== id)); }

  const subtotal = useMemo(() => cart.reduce((s,c)=>s+c.price*c.qty,0), [cart]);

  function goCheckout(){
    // guardamos carrito de esta marca
    localStorage.setItem(`cart:${slug}`, JSON.stringify(cart));
    router.push(`/checkout/${slug}`);
  }

  return (
    <main className="container">
      {!brand ? <div className="small">Cargando…</div> : (
        <>
          <div className="row mb">
            <div style={{ display:'flex', gap:12, alignItems:'center' }}>
              <img src={brand.logo_url || '/logo.png'} alt={brand.name} style={{ width:56,height:56,borderRadius:28,objectFit:'cover',border:'1px solid var(--line)' }} />
              <div>
                <div className="h2" style={{ margin:0 }}>{brand.name}</div>
                <div className="small" style={{ color:'var(--muted)' }}>{brand.description}</div>
                {/* Info de envíos (chica y gris) */}
                <div className="small" style={{ color:'var(--muted)', marginTop:6 }}>
                  {brand.ship_domicilio!=null && <>Envío a domicilio: ${brand.ship_domicilio} · </>}
                  {brand.ship_sucursal!=null && <>Sucursal: ${brand.ship_sucursal} · </>}
                  Gratis desde: ${brand.ship_free_from || 0}
                </div>
              </div>
            </div>
          </div>

          <div className="grid" style={{ gridTemplateColumns:'2fr 1fr', gap:20 }}>
            <div className="grid" style={{ gridTemplateColumns:'repeat(auto-fill, minmax(240px,1fr))' }}>
              {products.map(p => (
                <div className="card" key={p.id} style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  <div style={{ position:'relative', height:220, background:'#0e0f16', borderRadius:12, overflow:'hidden' }}>
                    <div style={{ display:'flex', width:'100%', height:'100%', overflowX:'auto', scrollSnapType:'x mandatory' }}>
                      {(p.images.length ? p.images : [{ url: p.image_url }]).slice(0,5).map((im,idx)=>(
                        <img key={idx} src={im?.url || p.image_url || '/logo.png'} alt={p.name}
                          style={{ width:'100%', height:'100%', objectFit:'cover', flex:'0 0 100%', scrollSnapAlign:'center' }}/>
                      ))}
                    </div>
                  </div>
                  <div className="row">
                    <div>
                      <strong>{p.name}</strong>
                      <div className="small">Stock: {Math.max(1, p.stock ?? 1)}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div>${p.price}</div>
                      <button className="btn" onClick={()=>add({...p, stock: Math.max(1, p.stock ?? 1)})}>Agregar</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Carrito */}
            <div className="card" style={{ position:'sticky', top:90, alignSelf:'start' }}>
              <strong>Tu pedido</strong>
              <div className="mt" style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {cart.length===0 ? <div className="small">Todavía no agregaste productos.</div> : cart.map(c=>(
                  <div key={c.id} className="row" style={{ alignItems:'center' }}>
                    <div>
                      <div>{c.name}</div>
                      <div className="small">${c.price} · stock {c.stock}</div>
                    </div>
                    <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                      <button className="btn-ghost" onClick={()=>dec(c.id)}>-</button>
                      {/* selector rápido (sin teclado) */}
                      <div className="badge">{c.qty}</div>
                      <button className="btn-ghost" onClick={()=>inc(c.id)}>+</button>
                      <button className="btn-ghost" onClick={()=>rm(c.id)}>Quitar</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt">
                <div className="row"><span>Subtotal</span><span>${subtotal}</span></div>
              </div>

              <div className="mt"><button className="btn" onClick={goCheckout} disabled={cart.length===0}>Ir al checkout</button></div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
