// pages/api/mp/create-preference.js
import { supaAdmin } from '../../../lib/supabaseAdmin';

export const config = { api: { bodyParser: true } };

/**
 * Body esperado:
 * {
 *   brand_slug: string,
 *   items: [{ id, title, unit_price, quantity }],
 *   buyer_id?: string (opcional),
 *   payer?: { email?, name? },
 *   back_urls?: { success?, failure?, pending? }
 * }
 */
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const {
      brand_slug,
      items = [],
      payer = {},
      back_urls = {},
      buyer_id = null
    } = req.body || {};

    if (!brand_slug || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Faltan brand_slug o items' });
    }

    // Traer token y fee de la marca
    const { data: brand, error: eBrand } = await supaAdmin
      .from('brands')
      .select('slug,name,mp_fee,mp_access_token')
      .eq('slug', brand_slug)
      .single();
    if (eBrand || !brand) return res.status(400).json({ error: 'Marca inválida' });
    if (!brand.mp_access_token) {
      return res.status(400).json({ error: 'La marca no tiene configurado su MP access token' });
    }

    const mpFee = Number(brand.mp_fee) || 0;

    // Aplicar recargo server-side
    const normItems = items.map((it) => {
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

    // Preferencia usando el token de la MARCA
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
        // también guardamos los items brutos (sin fee) por claridad
        original_items: items
      }),
      notification_url: notificationUrl
    };

    // Llamada REST directa a MP (sdk-less) con el token de la marca
    const resp = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${brand.mp_access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(prefBody)
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error('MP pref error:', err);
      return res.status(resp.status).json({ error: 'MP preference error' });
    }
    const pref = await resp.json();

    // (Opcional) podés guardar un registro de intención de pago si querés
    // await supaAdmin.from('payment_intents').insert({...})

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
