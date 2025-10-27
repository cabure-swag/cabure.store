// pages/marcas/[slug].js
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

function useBrand(slug){
  const [brand, setBrand] = useState(null);
  useEffect(() => {
    if(!slug) return;
    supabase.from('brands')
      .select('slug,name,description,instagram,logo_url,ship_domicilio,ship_sucursal,ship_free_from,mp_fee,mp_access_token')
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
      const { data: prods } = await supabase.from('products').select('*').eq('brand_slug', slug).order('name');
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
  const [cart, setCart] = useState([]); // [{id,name,price,qty}]
  const [shipping, setShipping] = useState(null); // 'domicilio' | 'sucursal' | null
  const [pay, setPay] = useState('transferencia'); // 'transferencia' | 'mp'

  function add(p){
    setCart(cs => {
      const i = cs.findIndex(x => x.id === p.id);
      if(i>=0){
        const c = [...cs]; c[i] = {...c[i], qty: c[i].qty+1}; return c;
      }
      return [...cs, { id: p.id, name: p.name, price: p.price, qty: 1 }];
    });
  }
  function dec(id){
    setCart(cs => cs.map(c => c.id===id? {...c, qty: Math.max(1, c.qty-1)}:c));
  }
  function rm(id){
    setCart(cs => cs.filter(c => c.id !== id));
  }

  const subtotal = useMemo(() => cart.reduce((s,c)=>s+c.price*c.qty,0), [cart]);
  const mpFee = useMemo(() => {
    const fee = brand?.mp_fee ?? 10; // si null → 10
    return pay === 'mp' ? Math.round(subtotal * fee / 100) : 0;
  }, [pay, subtotal, brand]);
  const shipCost = useMemo(() => {
    if(!shipping) return 0;
    const cost = shipping==='domicilio' ? brand?.ship_domicilio : brand?.ship_sucursal;
    if(!cost && cost!==0) return 0; // desactivado
    if(brand?.ship_free_from && subtotal >= brand.ship_free_from) return 0;
    return Number(cost || 0);
  }, [shipping, subtotal, brand]);

  const total = subtotal + mpFee + shipCost;

  async function checkout(){
    const { data: sess } = await supabase.auth.getSession();
    const u = sess?.session?.user;
    if(!u) return alert('Iniciá sesión con Google para comprar');

    if(!shipping) return alert('Elegí un método de envío');
    if(cart.length===0) return alert('Agregá productos');

    // Crear order
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        user_id: u.id,
        brand_slug: brand.slug,
        shipping,
        pay,
        mp_fee: brand?.mp_fee ?? 10,
        ship_cost: shipCost,
        subtotal,
        total,
      })
      .select('*')
      .single();
    if(error) return alert(error.message);

    // Items
    const rows = cart.map(c => ({
      order_id: order.id,
      product_id: c.id,
      name: c.name,
      price: c.price,
      qty: c.qty,
    }));
    const { error: e2 } = await supabase.from('order_items').insert(rows);
    if(e2) return alert(e2.message);

    if(pay==='mp'){
      // Crear preferencia en tu API (ya la tenés en /api/mp/create-preference)
      const res = await fetch('/api/mp/create-preference', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ order_id: order.id })
      });
      const data = await res.json();
      if(data?.init_point){ window.location.href = data.init_point; return; }
      alert('No se pudo iniciar pago Mercado Pago');
    }else{
      alert('Pedido creado. Seguí las instrucciones de transferencia.');
      router.push('/compras');
    }
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
                <div className="small">{brand.description}</div>
              </div>
            </div>
            <a className="badge" href="/">CABURE.STORE</a>
          </div>

          <div className="grid" style={{ gridTemplateColumns:'2fr 1fr', gap:20 }}>
            {/* Productos */}
            <div className="grid" style={{ gridTemplateColumns:'repeat(auto-fill, minmax(220px,1fr))' }}>
              {products.map(p => (
                <div className="card" key={p.id} style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  <div style={{ position:'relative', height:200, background:'#0e0f16', borderRadius:12, overflow:'hidden' }}>
                    {/* Carrusel simple hasta 5 fotos */}
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
                      <div className="small">Stock: {p.stock}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div>${p.price}</div>
                      <button className="btn" onClick={()=>add(p)}>Agregar</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Carrito (aquí, en la página de la marca) */}
            <div className="card" style={{ position:'sticky', top:90, alignSelf:'start' }}>
              <strong>Tu pedido</strong>
              <div className="mt" style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {cart.length===0 ? <div className="small">Todavía no agregaste productos.</div> : cart.map(c=>(
                  <div key={c.id} className="row" style={{ alignItems:'center' }}>
                    <div>
                      <div>{c.name}</div>
                      <div className="small">${c.price} × {c.qty}</div>
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      <button className="btn-ghost" onClick={()=>dec(c.id)}>-</button>
                      <button className="btn-ghost" onClick={()=>rm(c.id)}>Quitar</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt">
                <label>Envío</label>
                <div className="row">
                  <select value={shipping || ''} onChange={e=>setShipping(e.target.value || null)} className="input">
                    <option value="">Elegí envío</option>
                    {brand?.ship_domicilio!=null && <option value="domicilio">Domicilio (${brand.ship_domicilio})</option>}
                    {brand?.ship_sucursal!=null && <option value="sucursal">Sucursal (${brand.ship_sucursal})</option>}
                  </select>
                  {brand?.ship_free_from ? <div className="badge">Gratis desde ${brand.ship_free_from}</div> : null}
                </div>
              </div>

              <div className="mt">
                <label>Pago</label>
                <div className="row">
                  <select value={pay} onChange={e=>setPay(e.target.value)} className="input">
                    <option value="transferencia">Transferencia</option>
                    <option value="mp">Mercado Pago</option>
                  </select>
                  {pay==='mp' && <div className="badge">% MP {brand?.mp_fee ?? 10}</div>}
                </div>
              </div>

              <div className="mt">
                <div className="row"><span>Subtotal</span><span>${subtotal}</span></div>
                <div className="row"><span>Envío</span><span>${shipCost}</span></div>
                {pay==='mp' && <div className="row"><span>Recargo MP</span><span>${mpFee}</span></div>}
                <div className="row" style={{ fontWeight:900 }}><span>Total</span><span>${total}</span></div>
              </div>

              <div className="mt"><button className="btn" onClick={checkout}>Confirmar pedido</button></div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
