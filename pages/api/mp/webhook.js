// pages/api/mp/webhook.js
import { supaAdmin } from '../../../lib/supabaseAdmin';

export const config = { api: { bodyParser: true } };

/**
 * Recibe notificaciones de MP. Confirmamos solo con status 'approved' y
 * recién ahí creamos:
 * - order (status: 'paid')
 * - chat vinculado al order
 *
 * Importante: usamos el token de LA MARCA, que obtenemos por query (?brand=slug)
 * y validamos con la info del pago.
 */
export default async function handler(req, res) {
  try {
    // MP manda GET (verificación) y POST (evento)
    if (req.method === 'GET') {
      return res.status(200).send('OK');
    }
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const brandSlug = String(req.query?.brand || '');
    if (!brandSlug) {
      // sin marca no podemos consultar el pago
      return res.status(200).json({ received: true });
    }

    // Token de la marca
    const { data: brand, error: eBrand } = await supaAdmin
      .from('brands')
      .select('slug,mp_access_token')
      .eq('slug', brandSlug)
      .single();
    if (eBrand || !brand || !brand.mp_access_token) {
      return res.status(200).json({ received: true });
    }

    // MP manda distintos formatos; contemplamos ambos
    const topic = req.query?.type || req.query?.topic || req.body?.type;
    const paymentId =
      req.body?.data?.id || req.query?.id || req.query?.['data.id'] || null;

    if (!paymentId || (topic !== 'payment' && topic !== 'payments')) {
      return res.status(200).json({ received: true });
    }

    // Consultar el pago con el token de la marca
    const pr = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${brand.mp_access_token}` }
    });
    if (!pr.ok) {
      const txt = await pr.text();
      console.error('MP payment fetch error:', txt);
      return res.status(200).json({ received: true });
    }
    const pay = await pr.json();

    // Solo confirmamos pagos aprobados
    if (pay.status !== 'approved') {
      return res.status(200).json({ received: true });
    }

    // Idempotencia: ¿ya tenemos una orden con este payment?
    const { data: existing } = await supaAdmin
      .from('orders')
      .select('id')
      .eq('mp_payment_id', String(paymentId))
      .maybeSingle();

    if (existing?.id) {
      // ya procesado
      return res.status(200).json({ received: true });
    }

    // External reference: lo pusimos como JSON
    let ext = {};
    try { ext = JSON.parse(pay.external_reference || '{}'); } catch {}

    // Items cobrados: vienen en pay.additional_info.items con los montos finales
    const items = Array.isArray(pay.additional_info?.items)
      ? pay.additional_info.items.map(it => ({
          id: it.id,
          title: it.title,
          quantity: it.quantity,
          unit_price: Number(it.unit_price)
        }))
      : [];

    // Total
    const total = Number(pay.transaction_details?.total_paid_amount) || 0;

    // Crear order (paid)
    const insertOrder = {
      brand_slug: brandSlug,
      buyer_id: ext.buyer_id || null,
      status: 'paid',
      items,
      mp_payment_id: String(paymentId),
      mp_preference_id: String(pay.order?.id || pay.metadata?.preference_id || ''),
      total,
      currency: (pay.currency_id || 'ARS')
    };

    const { data: order, error: eOrder } = await supaAdmin
      .from('orders')
      .insert(insertOrder)
      .select('*')
      .single();

    if (eOrder) {
      console.error('insert order error', eOrder);
      return res.status(200).json({ received: true });
    }

    // Crear chat para el pedido
    const { error: eChat } = await supaAdmin
      .from('chats')
      .insert({ order_id: order.id, brand_slug: brandSlug });

    if (eChat) {
      console.error('insert chat error', eChat);
      // no cortamos: el pedido quedó registrado
    }

    return res.status(200).json({ received: true });
  } catch (e) {
    console.error('webhook error', e);
    return res.status(200).json({ received: true }); // MP solo necesita 200
  }
}
