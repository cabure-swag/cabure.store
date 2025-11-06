// pages/api/mp/webhook.js
import { getSupaAdmin } from '../../../lib/supabaseAdmin';

/**
 * Mercado Pago envía:
 * - topic/type: "payment"
 * - data.id    : payment id
 */
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(200).json({ ok: true, ping: true });
    }

    const admin = getSupaAdmin();
    if (!admin) {
      // Respondemos 200 para que MP no reintente, pero log lógico
      return res.status(200).json({ ok: false, reason: 'missing_admin_env' });
    }

    const brandSlug = String(req.query.brand || '').trim();
    const body = req.body || {};
    const topic = body?.type || body?.topic || '';
    const paymentId = body?.data?.id || body?.id || null;

    if (!paymentId || (topic && topic !== 'payment')) {
      return res.status(200).json({ ok: false, reason: 'not_payment' });
    }

    // Busco token de la marca
    const { data: brand, error: eBrand } = await admin
      .from('brands')
      .select('slug,name,mp_access_token')
      .eq('slug', brandSlug)
      .single();

    if (eBrand || !brand?.mp_access_token) {
      return res.status(200).json({ ok: false, reason: 'brand_or_token_missing' });
    }

    // Traigo el pago desde MP
    const pResp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${brand.mp_access_token}` },
    });
    const pRaw = await pResp.text();
    let payment = null;
    try { payment = pRaw ? JSON.parse(pRaw) : null; } catch {}

    if (!pResp.ok || !payment) {
      return res.status(200).json({ ok: false, reason: 'mp_fetch_failed', detail: pRaw?.slice?.(0, 200) || 'no_raw' });
    }

    // Sólo atendemos pagos aprobados
    if (payment.status !== 'approved') {
      return res.status(200).json({ ok: true, ignored_status: payment.status });
    }

    // Leímos el external_reference que armamos en create-preference
    let ext = null;
    try { ext = payment.external_reference ? JSON.parse(payment.external_reference) : null; } catch {}
    const orderDraft = ext?.order_draft || null;
    const buyer_id = ext?.buyer_id || null;

    if (!orderDraft || !buyer_id) {
      // No tenemos datos para crear el pedido; evitamos duplicados
      return res.status(200).json({ ok: false, reason: 'missing_order_draft_or_buyer' });
    }

    // Armamos payload de orden (status=paid)
    const nowIso = new Date().toISOString();
    const orderPayload = {
      user_id: buyer_id,
      brand_slug: brandSlug,
      shipping: orderDraft.shipping || null,  // 'domicilio' | 'sucursal'
      pay: 'mp',
      ship_name: orderDraft.ship_name || null,
      buyer_email: orderDraft.buyer_email || null,
      ship_dni: null, // no se requiere en MP
      // domicilio
      ship_street: orderDraft.ship_street || null,
      ship_number: orderDraft.ship_number || null,
      ship_floor: orderDraft.ship_floor || null,
      ship_apartment: orderDraft.ship_apartment || null,
      ship_city: orderDraft.ship_city || null,
      ship_state: orderDraft.ship_state || null,
      ship_zip: orderDraft.ship_zip || null,
      // sucursal
      branch_id: orderDraft.branch_id || null,
      branch_name: orderDraft.branch_name || null,
      branch_address: orderDraft.branch_address || null,
      branch_city: orderDraft.branch_city || null,
      branch_state: orderDraft.branch_state || null,
      branch_zip: orderDraft.branch_zip || null,
      // totales
      subtotal: Number(orderDraft.subtotal) || 0,
      mp_fee_pct: Number(orderDraft.mp_fee_pct) || 0,
      total: Number(orderDraft.total) || 0,
      // estado pago
      status: 'paid',
      mp_payment_id: String(paymentId),
      paid_at: nowIso,
    };

    // Creamos orden
    const { data: order, error: eOrder } = await admin
      .from('orders')
      .insert(orderPayload)
      .select('*')
      .single();

    if (eOrder) {
      return res.status(200).json({ ok: false, reason: 'order_insert_failed', detail: eOrder.message || String(eOrder) });
    }

    // Ítems
    const itemsRows = (orderDraft.items || []).map((c) => ({
      order_id: order.id,
      product_id: c.id ?? null,
      name: String(c.name ?? c.title ?? 'Item'),
      price: Number(c.unit_price) || Number(c.price) || 0,
      qty: Number(c.quantity ?? c.qty ?? 1) || 1,
    }));

    if (itemsRows.length) {
      const { error: eItems } = await admin.from('order_items').insert(itemsRows);
      if (eItems) {
        // No abortamos el webhook, pero dejamos detalle
        // (podés auditarlo luego)
      }
    }

    // Crear chat del pedido (opcional, si existe tabla). Intentamos y si falla, seguimos.
    try {
      // Opción A: tabla `order_chats`
      const { error: eChat } = await admin
        .from('order_chats')
        .insert({ order_id: order.id })
        .select('id')
        .single();

      if (eChat) {
        // Opción B: tabla `chats` con tipo
        await admin.from('chats').insert({
          order_id: order.id,
          kind: 'order',
          created_at: nowIso
        });
      }
    } catch (_) {}

    return res.status(200).json({ ok: true, order_id: order.id });
  } catch (err) {
    return res.status(200).json({ ok: false, reason: 'exception', error: String(err?.message || err) });
  }
}
