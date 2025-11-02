// lib/requireRole.js
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Decodifica Base64URL de forma segura */
function base64UrlDecode(str) {
  try {
    const pad = (s) => s + '='.repeat((4 - (s.length % 4)) % 4);
    const b64 = pad(str.replace(/-/g, '+').replace(/_/g, '/'));
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(b64, 'base64').toString('utf8');
    }
    // fallback browser
    return decodeURIComponent(
      atob(b64).split('').map(c => '%' + ('00'+c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
  } catch {
    return '';
  }
}

/** Extrae { sub, email } del JWT sin verificar firma (solo para SSR gating) */
function decodeJwt(token) {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return {};
    const payload = JSON.parse(base64UrlDecode(parts[1]) || '{}');
    return { sub: payload.sub, email: payload.email };
  } catch {
    return {};
  }
}

function redirectToLogin(ctx) {
  const next = encodeURIComponent(ctx.resolvedUrl || ctx.req?.url || '/');
  return { redirect: { destination: `/?next=${next}`, permanent: false } };
}

/** Crea cliente SSR con header Authorization: Bearer <token> para que RLS use ese JWT */
function createSsrClient(accessToken) {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  return createClient(url, anon, { global: { headers } });
}

/** Gate: requiere admin */
export function withAdmin() {
  return async function getServerSideProps(ctx) {
    try {
      const token = ctx.req.cookies?.sb || '';
      if (!token) return redirectToLogin(ctx);

      const { email } = decodeJwt(token);
      if (!email) return redirectToLogin(ctx);

      const supabase = createSsrClient(token);

      // ¿Es admin? admin_emails.email == email (RLS debe permitir select con auth.uid())
      const { data: admins, error } = await supabase
        .from('admin_emails')
        .select('email')
        .eq('email', email)
        .limit(1);

      if (error) {
        // Si RLS no permite o hay error, mejor no revelar: pedir login otra vez
        return redirectToLogin(ctx);
      }

      const isAdmin = (admins || []).length > 0;
      if (!isAdmin) return { notFound: true };

      return { props: {} };
    } catch {
      return redirectToLogin(ctx);
    }
  };
}

/** Gate: requiere vendor o admin */
export function withVendor() {
  return async function getServerSideProps(ctx) {
    try {
      const token = ctx.req.cookies?.sb || '';
      if (!token) return redirectToLogin(ctx);

      const { sub: userId, email } = decodeJwt(token);
      if (!userId || !email) return redirectToLogin(ctx);

      const supabase = createSsrClient(token);

      // Admin pasa también
      const { data: admins } = await supabase
        .from('admin_emails')
        .select('email')
        .eq('email', email)
        .limit(1);
      if ((admins || []).length > 0) return { props: {} };

      // Vendor si tiene al menos una marca asignada
      const { data: vb, error } = await supabase
        .from('vendor_brands')
        .select('brand_slug')
        .eq('user_id', userId)
        .limit(1);

      if (error) return redirectToLogin(ctx);

      const isVendor = (vb || []).length > 0;
      if (!isVendor) return { notFound: true };

      return { props: {} };
    } catch {
      return redirectToLogin(ctx);
    }
  };
}
