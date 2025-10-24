
import React from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { lines, total, clear } from '../../utils/cart';
import { money } from '../../utils/money';

export default function Checkout(){
  const router=useRouter(); const {brandSlug}=router.query;
  const [brand,setBrand]=React.useState(null);
  const [shipping,setShipping]=React.useState('');
  const [pay,setPay]=React.useState('mp');
  const [busy,setBusy]=React.useState(false);
  const [error,setError]=React.useState('');
  React.useEffect(()=>{if(!brandSlug)return;supabase.from('brands').select('*').eq('slug',brandSlug).single().then(({data})=>setBrand(data||null));},[brandSlug]);
  if(!brandSlug)return null; if(!brand)return <main className="container"><h1>Marca no encontrada</h1></main>;
  const cartLines=typeof window!=='undefined'?lines(brandSlug):[];
  const subtotal=typeof window!=='undefined'?total(brandSlug):0;
  const hasD=Number.isFinite(brand?.ship_domicilio);
  const hasS=Number.isFinite(brand?.ship_sucursal);
  const freeFrom=Number(brand?.ship_free_from||0);
  const shipPrice=shipping==='domicilio'?(brand?.ship_domicilio||0):shipping==='sucursal'?(brand?.ship_sucursal||0):0;
  const shipCost=(freeFrom>0&&subtotal>=freeFrom)?0:shipPrice;
  const mpPercent=Number.isFinite(brand?.mp_fee)?brand.mp_fee:10;
  const mpFee=pay==='mp'?Math.round(subtotal*(mpPercent/100)):0;
  const totalFinal=subtotal+shipCost+mpFee;
  async function confirm(e){e.preventDefault();setError('');if(!shipping){setError('Elegí un método de envío.');return}setBusy(true);try{const {data:sess}=await supabase.auth.getSession();const user=sess?.session?.user;if(!user){setError('Iniciá sesión con Google.');setBusy(false);return}const orderPayload={user_id:user.id,brand_slug:brandSlug,shipping,pay,mp_fee:mpPercent,ship_cost:shipCost,subtotal,total:totalFinal};const {data:order,error:e1}=await supabase.from('orders').insert(orderPayload).select('*').single();if(e1)throw e1;const itemsPayload=cartLines.map(l=>({order_id:order.id,product_id:l.id,name:l.name,price:l.price,qty:l.qty}));const {error:e2}=await supabase.from('order_items').insert(itemsPayload);if(e2)throw e2;if(pay==='mp'){const res=await fetch('/api/mp/create-preference',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({orderId:order.id,brandSlug,items:cartLines.map(l=>({title:l.name,quantity:l.qty,unit_price:l.price}))})});const data=await res.json();if(!res.ok)throw new Error(data?.error||'Error al crear preferencia');clear(brandSlug);window.location.href=data.init_point;}else{clear(brandSlug);alert('Pedido confirmado: '+order.id);window.location.href='/compras';}}catch(err){setError(err?.message||String(err));}finally{setBusy(false);}}
  return(<main className="container"><h1 className="h1">Checkout — {brand.name}</h1><div className="grid" style={{gridTemplateColumns:'1fr 1fr'}}><form className="card" onSubmit={confirm}><div className="mb"><label>Método de envío</label><select value={shipping} onChange={e=>setShipping(e.target.value)}><option value="">Elegí uno…</option>{hasD&&<option value="domicilio">Correo Argentino a domicilio {freeFrom>0&&subtotal>=freeFrom?'(GRATIS)':''}</option>}{hasS&&<option value="sucursal">Correo Argentino a sucursal {freeFrom>0&&subtotal>=freeFrom?'(GRATIS)':''}</option>}</select></div><div className="mb"><label>Pago</label><select value={pay} onChange={e=>setPay(e.target.value)}><option value="mp">Mercado Pago (+{mpPercent}%)</option><option value="transferencia">Transferencia</option></select></div>{error&&<p className="small" style={{color:'#ef4444'}}>{error}</p>}<button className="btn" disabled={cartLines.length===0||(!hasD&&!hasS)||busy}>{busy?'Confirmando…':'Confirmar pedido'}</button></form><div className="card"><strong>Resumen</strong><table className="table mt"><thead><tr><th>Item</th><th>Cant</th><th>Precio</th></tr></thead><tbody>{cartLines.map(l=><tr key={l.id}><td>{l.name}</td><td>{l.qty}</td><td>{money(l.price*l.qty)}</td></tr>)}</tbody></table><div className="row mt"><span>Subtotal</span><span>{money(subtotal)}</span></div><div className="row"><span>Envío</span><span>{money(shipCost)}</span></div>{pay==='mp'&&<div className="row"><span>Recargo MP</span><span>{money(mpFee)}</span></div>}<div className="row"><strong>Total</strong><strong>{money(totalFinal)}</strong></div></div></div></main>)}
