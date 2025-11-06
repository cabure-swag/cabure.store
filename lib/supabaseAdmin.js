// lib/supabaseAdmin.js
import { createClient } from '@supabase/supabase-js';

let cached = null;

/**
 * Devuelve un cliente admin de Supabase o null si faltan envs.
 * NO tira throw en import-time (evita 500 HTML en Vercel).
 */
export function getSupaAdmin() {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return null; // devolvemos null para que el caller maneje el error con JSON limpio
  }

  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
