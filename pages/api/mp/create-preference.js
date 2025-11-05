import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res){
  const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
  if(!MP_TOKEN) return res.status(500).json({ error: 'MP_ACCESS_TOKEN missing' });

  try{
    if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
    const { order_id, brand_slug, items=[], shipping=0, fee_pct } = req.body || {};
    if(!order_id || !brand_slug) return res.status(400).json({ error:'Bad payload' });

    const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth:{ persistSession:false } });
    const { data: brand } = await supa.from('brands').select('slug,name,mp_fee').eq('slug', brand_slug).maybeSingle();

    // validar precios contra DB si viene product_id
    const ids = items.map(i=>i.product_id).filter(Boolean);
    const { data: prods } = ids.length ? await supa.from('products').select('id,price,name').in('id', ids) : { data: [] };
    const map = Object.fromEntries((prods||[]).map(p=>[p.id, p]));

    let subtotal = 0;
    const mpItems = items.map((it, i) => {
      const qty = Math.max(1, Number(it.quantity)||1);
      const unit = map[it.product_id]?.price ?? Number(it.unit_price)||0;
      const title = map[it.product_id]?.name || it.title || `Item ${i+1}`;
      subtotal += qty*unit;
      return { title, quantity: qty, unit_price: Math.round(unit) };
    });

    const shipCost = Math.round(Number(shipping)||0);
    const pct = Number.isFinite(Number(fee_pct)) ? Number(fee_pct) : (Number(brand?.mp_fee)||10);
    const mpFee = Math.round(subtotal * (pct/100));
    const total = subtotal + shipCost + mpFee;

    await supa.from('orders').update({ ship_cost: shipCost, mp_fee: mpFee, subtotal, total }).eq('id', order_id);

    const r = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method:'POST',
      headers:{ 'Authorization':`Bearer ${MP_TOKEN}`, 'Content-Type':'application/json' },
      body: JSON.stringify({
        items: mpItems.length ? mpItems : [{ title: brand?.name||brand_slug, quantity: 1, unit_price: total }],
        auto_return: 'approved'
      })
    });
    const data = await r.json();
    if(!r.ok) return res.status(r.status).json(data);
    return res.status(200).json({ preference_id: data.id, init_point: data.init_point, sandbox_init_point: data.sandbox_init_point });
  }catch(e){
    return res.status(500).json({error:e.message});
  }
}
