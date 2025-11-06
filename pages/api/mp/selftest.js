// pages/api/mp/selftest.js
import { supaAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  try {
    const brand = String(req.query.brand || '').trim();
    if (!brand) {
      return res.status(400).json({ ok: false, error: 'Falta ?brand=slug en la query' });
    }

    const env = {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || null,
    };

    // lee la marca
    const { data: b, error: eBrand } = await supaAdmin
      .from('brands')
      .select('slug,name,mp_fee,mp_access_token')
      .eq('slug', brand)
      .single();

    if (eBrand || !b) {
      return res.status(200).json({
        ok: false,
        step: 'fetch_brand',
        env,
        detail: eBrand?.message || 'Marca no encontrada',
      });
    }

    const checks = {
      has_token: !!b.mp_access_token,
      has_site_url: !!env.NEXT_PUBLIC_SITE_URL,
    };

    // Si falta algo, avisamos antes de pegarle a MP
    const problems = [];
    if (!checks.has_token) problems.push('La marca no tiene mp_access_token');
    if (!checks.has_site_url) problems.push('Falta NEXT_PUBLIC_SITE_URL');

    if (problems.length) {
      return res.status(200).json({
        ok: false,
        step: 'preflight',
        env,
        brand: { slug: b.slug, name: b.name, mp_fee: b.mp_fee },
        problems,
      });
    }

    // Intento de preferencia mínima (sin exponer token)
    const prefBody = {
      items: [{ title: 'SelfTest', quantity: 1, unit_price: 1, currency_id: 'ARS' }],
      back_urls: {
        success: `${env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')}/checkout/result?status=success`,
        failure: `${env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')}/checkout/result?status=failure`,
        pending: `${env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')}/checkout/result?status=pending`,
      },
      auto_return: 'approved',
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
      return res.status(200).json({
        ok: false,
        step: 'mp_create_preference',
        status: resp.status,
        mp_message: data?.message || data?.error || data?.cause?.[0]?.description || raw || 'sin_detalle',
      });
    }

    return res.status(200).json({
      ok: true,
      step: 'done',
      sample_init_point: data?.init_point || data?.sandbox_init_point || null,
    });
  } catch (err) {
    return res.status(200).json({ ok: false, step: 'exception', error: String(err?.message || err) });
  }
}
