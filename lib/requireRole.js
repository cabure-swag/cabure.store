// lib/requireRole.js
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Crea un cliente de Supabase para SSR usando el access token de cookie.
 */
function createSsrClient(accessToken){
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  return createClient(url, anon, { global: { headers } });
}

function redirectToLogin(ctx){
  const next = encodeURIComponent(ctx.resolvedUrl || ctx.req?.url || '/');
  return {
    redirect: { destination: `/?next=${next}`, permanent: false },
  };
}

/**
 * Devuelve getServerSideProps que exige rol 'admin'.
 */
export function withAdmin(){
  return async function getServerSideProps(ctx){
    try{
      const token = ctx.req.cookies?.sb || '';
      if(!token){ return redirectToLogin(ctx); }

      const supabase = createSsrClient(token);
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if(userErr || !user){ return redirectToLogin(ctx); }

      // Verificamos admin por email en admin_emails (con RLS).
      const { data: rows } = await supabase
        .from('admin_emails')
        .select('email')
        .eq('email', user.email);

      const isAdmin = (rows || []).length > 0;
      if(!isAdmin){ return { notFound: true }; }

      return { props: {} };
    }catch(e){
      return redirectToLogin(ctx);
    }
  }
}

/**
 * Devuelve getServerSideProps que exige ser vendor (o admin).
 */
export function withVendor(){
  return async function getServerSideProps(ctx){
    try{
      const token = ctx.req.cookies?.sb || '';
      if(!token){ return redirectToLogin(ctx); }

      const supabase = createSsrClient(token);
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if(userErr || !user){ return redirectToLogin(ctx); }

      // Admin también puede pasar a vendor.
      const { data: admins } = await supabase
        .from('admin_emails')
        .select('email')
        .eq('email', user.email);

      if ((admins || []).length > 0) {
        return { props: {} };
      }

      // Vendor si tiene al menos una marca asignada
      const { data: vb } = await supabase
        .from('vendor_brands')
        .select('brand_slug')
        .eq('user_id', user.id)
        .limit(1);

      const isVendor = (vb || []).length > 0;
      if(!isVendor){ return { notFound: true }; }

      return { props: {} };
    }catch(_e){
      return redirectToLogin(ctx);
    }
  }
}
