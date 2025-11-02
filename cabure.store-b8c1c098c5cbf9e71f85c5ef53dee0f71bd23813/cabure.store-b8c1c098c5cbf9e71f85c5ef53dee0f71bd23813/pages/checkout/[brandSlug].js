// pages/checkout/[brandSlug].js
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

export default function Checkout() {
  const router = useRouter();
  const slug = router.query.brandSlug;
  const [brand, setBrand] = useState(null);
  const [cart, setCart] = useState([]);
  const [shipping, setShipping] = useState(null);
  const [pay, setPay] = useState('transferencia');

  useEffect(() => {
    if (!slug) return;
    const saved = localStorage.getItem(`cart:${slug}`);
    setCart(saved ? JSON.parse(saved) : []);
    supabase.from('brands')
      .select('slug,name,ship_domicilio,ship_sucursal,ship_free_from,mp_fee,mp_access_token')
      .eq('slug', slug).maybeSingle().then(({data}) => setBrand(data || null));
  }, [slug]);

  const subtotal = useMemo(()=> cart.reduce((s,c)=>s+c.price*c.qty,0), [cart]);

  const shipCost = useMemo(()=>{
    if(!shipping) return 0;
    const cost = shipping==='domicilio' ? brand?.ship_domicilio : brand?.ship_sucursal;
    if(cost==null) return 0;
    if(brand?.ship_free_from && subtotal >= brand.ship_free_from) return 0;
    return Number(cost || 0);
  }, [shipping, subtotal, brand]);

  const mpFee = useMemo(()=>{
    const fee = brand?.mp_fee ?? 10;
    return pay==='mp' ? Math.round(subtotal * fee / 100) : 0;
  }, [pay, subtotal, brand]);

  const total = subtotal + shipCost + mpFee;

  async function confirm(){
    const { data: sess } = await supabase.auth.getSession();
    const u = sess?.session?.user;
    if(!u) return alert('Iniciá sesión con Google');

    if(!shipping) return alert('Elegí el envío');
    if(cart.length===0) return alert('Tu carrito está vacío');

    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        user_id: u.id,
        brand_slug: slug,
        shipping,
        pay,
        mp_fee: brand?.mp_fee ?? 10,
        ship_cost: shipCost,
        subtotal,
        total,
      })
      .select('*').single();
    if(error) return alert(error.message);

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
      const res = await fetch('/api/mp/create-preference', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ order_id: order.id })
      });
      const data = await res.json();
      if(data?.init_point){ window.location.href = data.init_point; return; }
      alert('No se pudo iniciar MP');
    } else {
      alert('Pedido creado. Instrucciones de transferencia a continuación.');
      router.push('/compras');
    }
  }

  return (
    <main className="container">
      <h1 className="h1">Checkout</h1>
      {!brand ? <div className="small">Cargando…</div> : (
        <div className="grid" style={{ gridTemplateColumns:'1.8fr 1fr', gap:20 }}>
          <div className="card">
            <strong>{brand.name}</strong>
            <div className="mt">
              <label>Método de envío</label>
              <select className="input" value={shipping || ''} onChange={e=>setShipping(e.target.value || null)}>
                <option value="">Elegí envío</option>
                {brand.ship_domicilio!=null && <option value="domicilio">Domicilio (${brand.ship_domicilio})</option>}
                {brand.ship_sucursal!=null && <option value="sucursal">Sucursal (${brand.ship_sucursal})</option>}
              </select>
              {brand.ship_free_from ? <div className="small" style={{ color:'var(--muted)', marginTop:6 }}>Gratis desde ${brand.ship_free_from}</div> : null}
            </div>

            <div className="mt">
              <label>Método de pago</label>
              <select className="input" value={pay} onChange={e=>setPay(e.target.value)}>
                <option value="transferencia">Transferencia</option>
                <option value="mp">Mercado Pago</option>
              </select>
              {pay==='mp' && <div className="small" style={{ color:'var(--muted)', marginTop:6 }}>Recargo MP: {brand.mp_fee ?? 10}%</div>}
            </div>
          </div>

          <div className="card">
            <strong>Resumen</strong>
            <div className="mt" style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {cart.length===0 ? <div className="small">Carrito vacío.</div> : cart.map(c=>(
                <div key={c.id} className="row">
                  <div>{c.name} × {c.qty}</div>
                  <div>${c.price * c.qty}</div>
                </div>
              ))}
            </div>
            <div className="mt">
              <div className="row"><span>Subtotal</span><span>${subtotal}</span></div>
              <div className="row"><span>Envío</span><span>${shipCost}</span></div>
              {pay==='mp' && <div className="row"><span>Recargo MP</span><span>${mpFee}</span></div>}
              <div className="row" style={{ fontWeight:900 }}><span>Total</span><span>${total}</span></div>
            </div>
            <div className="mt"><button className="btn" onClick={confirm} disabled={cart.length===0 || !shipping}>Confirmar</button></div>
          </div>
        </div>
      )}
    </main>
  );
}
