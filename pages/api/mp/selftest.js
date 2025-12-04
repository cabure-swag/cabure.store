// pages/api/mp/selftest.js
import { supaAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  try {
    const brandSlug = String(req.query.brand || '').trim();
    if (!brandSlug) {
      return res.status(400).json({ ok: false, step: 'input', error: 'Falta ?brand=slug en la query' });
    }

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
    const env = {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      NEXT_PUBLIC_SITE_URL: siteUrl || null,
    };

    const steps = [];

    // ─────────────────────────────────────────────────────────────────────────
    // Paso 1: validar envs mínimas
    // ─────────────────────────────────────────────────────────────────────────
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      steps.push('FALTAN: SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
      return res.status(200).json({ ok: false, step: 'env_admin', env, steps });
    } else {
      steps.push('SUPABASE ADMIN OK');
    }

    if (!siteUrl) {
      steps.push('FALTA: NEXT_PUBLIC_SITE_URL');
      return res.status(200).json({ ok: false, step: 'env_site', env, steps });
    } else {
      steps.push(`SITE_URL OK: ${siteUrl}`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Paso 2: leer marca (token y fee)
    // ─────────────────────────────────────────────────────────────────────────
    const { data: b, error: eBrand } = await supaAdmin
      .from('brands')
      .select('slug,name,mp_fee,mp_access_token')
      .eq('slug', brandSlug)
      .single();

    if (eBrand || !b) {
      steps.push(`No encontré la marca "${brandSlug}"`);
      return res.status(200).json({
        ok: false,
        step: 'fetch_brand',
        env,
        steps,
        detail: eBrand?.message || 'Marca no encontrada',
      });
    }

    if (!b.mp_access_token) {
      steps.push(`La marca "${b.name}" no tiene mp_access_token`);
      return res.status(200).json({
        ok: false,
        step: 'brand_token_missing',
        env,
        brand: { slug: b.slug, name: b.name, mp_fee: b.mp_fee },
        steps,
      });
    } else {
      steps.push('mp_access_token OK (existe)');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Paso 3: crear preferencia mínima contra MP para validar credenciales
    // Incluye back_urls y notification_url (webhook) con ?brand=...
    // ─────────────────────────────────────────────────────────────────────────
    const prefBody = {
      items: [{ title: 'SelfTest CABURE', quantity: 1, unit_price: 1, currency_id: 'ARS' }],
      back_urls: {
        success: `${siteUrl}/checkout/result?status=success`,
        failure: `${siteUrl}/checkout/result?status=failure`,
        pending: `${siteUrl}/checkout/result?status=pending`,
      },
      auto_return: 'approved',
      notification_url: `${siteUrl}/api/mp/webhook?brand=${encodeURIComponent(brandSlug)}`,
      external_reference: JSON.stringify({ brand_slug: brandSlug, selftest: true }),
    };

    const resp = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${b.mp_access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(prefBody),
    });

    const raw = await resp.text();
    let data = null;
    try { data = raw ? JSON.parse(raw) : null; } catch {}

    if (!resp.ok) {
      // Errores comunes y mensaje claro
      const mpMsg = data?.message || data?.error || data?.cause?.[0]?.description || raw || 'sin_detalle';
      steps.push(`MP ERROR: ${mpMsg}`);
      // 401 → token inválido o perteneciente a otra cuenta/ambiente
      // 400 con "attribute ..." → algún campo incompatible
      return res.status(200).json({
        ok: false,
        step: 'mp_create_preference',
        status: resp.status,
        env,
        brand: { slug: b.slug, name: b.name, mp_fee: b.mp_fee },
        steps,
        mp_message: mpMsg,
      });
    }

    steps.push('MP PREFERENCE OK (credenciales válidas y URLs correctas)');
    return res.status(200).json({
      ok: true,
      step: 'done',
      env,
      brand: { slug: b.slug, name: b.name, mp_fee: b.mp_fee },
      steps,
      sample_init_point: data?.init_point || data?.sandbox_init_point || null,
    });
  } catch (err) {
    return res.status(200).json({ ok: false, step: 'exception', error: String(err?.message || err) });
  }
}
