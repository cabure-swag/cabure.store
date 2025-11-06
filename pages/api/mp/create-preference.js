// pages/api/mp/create-preference.js
import { supaAdmin } from '../../../lib/supabaseAdmin';

export const config = { api: { bodyParser: true } };

/**
 * Body esperado:
 * {
 *   brand_slug: string,
 *   items: [{ id, title, unit_price, quantity }],
 *   shipping?: number,               // opcional: si lo mandan aparte, lo convertimos en item
 *   payer?: { email?, name? },
 *   buyer_id?: string,
 *   back_urls?: { success?, failure?, pending? }
 * }
 */
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const {
      brand_slug,
      items = [],
      shipping = 0,
      payer = {},
      back_urls = {},
      buyer_id = null
    } = req.body || {};

    if (!brand_slug || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Faltan brand_slug o items' });
    }
    if (items.length === 0 && !shipping) {
      return res.status(400).json({ error: 'No hay ítems ni envío' });
    }

    // Marca (token + fee)
    const { data: brand, error: eBrand } = await supaAdmin
      .from('brands')
      .select('slug,name,mp_fee,mp_access_token')
      .eq('slug', brand_slug)
      .single();
    if (eBrand || !brand) return res.status(400).json({ error: 'Marca inválida' });
    if (!brand.mp_access_token) return res.status(400).json({ error: 'La marca no tiene configurado su MP access token' });

    const mpFee = Number(brand.mp_fee) || 0;

    // Si mandaron shipping separado, lo agregamos como ítem
    const mergedItems = [...items];
    const shipNum = Number(shipping) || 0;
    if (shipNum > 0) {
      mergedItems.push({
        id: 'shipping',
        title: 'Envío',
        quantity: 1,
        unit_price: shipNum
      });
    }

    // Aplicar recargo a TODOS los ítems (incluye Envío)
    const normItems = mergedItems.map((it) => {
      const price = Number(it.unit_price) || 0;
      const qty = Math.max(1, Number(it.quantity) || 1);
      const priceWithFee = mpFee > 0 ? +(price * (1 + mpFee / 100)).toFixed(2) : price;
      return {
        id: String(it.id ?? ''),
        title: String(it.title ?? 'Item'),
        quantity: qty,
        unit_price: priceWithFee,
        currency_id: 'ARS'
      };
    });

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
    const notificationUrl = `${siteUrl}/api/mp/webhook?brand=${encodeURIComponent(brand_slug)}`;

    const prefBody = {
      items: normItems,
      payer: {
        email: payer?.email || undefined,
        name: payer?.name || undefined,
      },
      statement_descriptor: brand.name?.slice(0, 22) || 'CABURE',
      back_urls: {
        success: back_urls?.success || `${siteUrl}/checkout/result?status=success`,
        failure: back_urls?.failure || `${siteUrl}/checkout/result?status=failure`,
        pending: back_urls?.pending || `${siteUrl}/checkout/result?status=pending`,
      },
      auto_return: 'approved',
      external_reference: JSON.stringify({
        brand_slug,
        buyer_id,
        mp_fee: mpFee,
        original_items: items
      }),
      notification_url: notificationUrl
    };

    const resp = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${brand.mp_access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(prefBody)
    });

    const raw = await resp.text();
    let pref = null;
    try { pref = raw ? JSON.parse(raw) : null; } catch {}

    if (!resp.ok) {
      const msg = (pref && (pref.error || pref.message)) || raw || 'MP preference error';
      return res.status(resp.status).json({ error: msg });
    }

    return res.status(200).json({
      id: pref.id,
      init_point: pref.init_point,
      sandbox_init_point: pref.sandbox_init_point,
      items: normItems,
      mp_fee: mpFee
    });
  } catch (err) {
    console.error('create-preference error', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}
