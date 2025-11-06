// pages/api/mp/create-preference.js
import { getSupaAdmin } from '../../../lib/supabaseAdmin';

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // ── Chequeo de envs mínimas ───────────────────────────────────────────────
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
    const admin = getSupaAdmin();
    if (!admin) {
      return res.status(500).json({
        error: 'Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en las env vars del deploy.',
      });
    }
    if (!siteUrl) {
      return res.status(500).json({
        error: 'Falta NEXT_PUBLIC_SITE_URL en las env vars del deploy.',
      });
    }

    // ── Body ──────────────────────────────────────────────────────────────────
    const {
      brand_slug,
      items = [],
      shipping = 0,
      payer = {},
      buyer_id = null,
      back_urls = {},
      debug = false, // opcional: si mandás debug:true, te devuelvo más detalle en errores
    } = req.body || {};

    if (!brand_slug || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Faltan brand_slug o items' });
    }
    if (items.length === 0 && !shipping) {
      return res.status(400).json({ error: 'No hay ítems ni envío' });
    }

    // ── Marca (token y fee) ───────────────────────────────────────────────────
    const { data: brand, error: eBrand } = await admin
      .from('brands')
      .select('slug,name,mp_fee,mp_access_token')
      .eq('slug', brand_slug)
      .single();

    if (eBrand) {
      return res.status(400).json({
        error: `Error leyendo marca: ${eBrand.message || String(eBrand)}`,
      });
    }
    if (!brand) {
      return res.status(400).json({ error: 'Marca inválida' });
    }
    if (!brand.mp_access_token) {
      return res.status(400).json({ error: 'La marca no tiene configurado su MP access token' });
    }

    // ── Ítems + envío + recargo ───────────────────────────────────────────────
    const mpFeePct = Number(brand.mp_fee) || 0;

    const merged = [...items];
    const shipNum = Number(shipping) || 0;
    if (shipNum > 0) merged.push({ id: 'shipping', title: 'Envío', quantity: 1, unit_price: shipNum });

    const normItems = merged.map((it) => {
      const price = Number(it.unit_price) || 0;
      const qty = Math.max(1, Number(it.quantity) || 1);
      const priceWithFee = mpFeePct > 0 ? +(price * (1 + mpFeePct / 100)).toFixed(2) : price;
      return {
        id: String(it.id ?? ''),
        title: String(it.title ?? 'Item'),
        quantity: qty,
        unit_price: priceWithFee,
        currency_id: 'ARS',
      };
    });

    // ── Preferencia MP ────────────────────────────────────────────────────────
    const prefBody = {
      items: normItems,
      payer: {
        email: payer?.email || undefined,
        name: payer?.name || undefined,
      },
      statement_descriptor: (brand.name || 'CABURE').slice(0, 22),
      back_urls: {
        success: back_urls?.success || `${siteUrl}/checkout/result?status=success`,
        failure: back_urls?.failure || `${siteUrl}/checkout/result?status=failure`,
        pending: back_urls?.pending || `${siteUrl}/checkout/result?status=pending`,
      },
      auto_return: 'approved',
      external_reference: JSON.stringify({
        brand_slug,
        buyer_id,
        mp_fee: mpFeePct,
      }),
      notification_url: `${siteUrl}/api/mp/webhook?brand=${encodeURIComponent(brand_slug)}`,
    };

    const resp = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${brand.mp_access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(prefBody),
    });

    const raw = await resp.text();
    let pref = null;
    try { pref = raw ? JSON.parse(raw) : null; } catch {}

    if (!resp.ok) {
      const msg =
        (pref && (pref.message || pref.error || pref.cause?.[0]?.description)) ||
        raw ||
        'MP preference error';
      return res.status(resp.status).json({
        error: msg,
        ...(debug ? { debug: { status: resp.status, siteUrl, hasToken: !!brand.mp_access_token } } : {}),
      });
    }

    return res.status(200).json({
      id: pref.id,
      init_point: pref.init_point,
      sandbox_init_point: pref.sandbox_init_point,
      mp_fee_applied_pct: mpFeePct,
      items: normItems,
    });
  } catch (err) {
    // Pase lo que pase, devolvemos JSON
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
