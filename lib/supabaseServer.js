// lib/supabaseServer.js
import { createServerClient } from '@supabase/auth-helpers-nextjs'


/**
* Devuelve un cliente de Supabase para SSR (getServerSideProps) usando cookies.
* ctx: { req, res }
*/
export function getSupabaseServerClient(ctx) {
const { req, res } = ctx
return createServerClient(
process.env.NEXT_PUBLIC_SUPABASE_URL,
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
{
cookies: {
get(name) {
return req.cookies?.[name]
},
set(name, value, options) {
// Set-Cookie para actualizar tokens si hace falta (refresh)
const serialized = `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Secure`
const prev = res.getHeader('Set-Cookie')
if (!prev) res.setHeader('Set-Cookie', serialized)
else res.setHeader('Set-Cookie', Array.isArray(prev) ? [...prev, serialized] : [prev, serialized])
},
remove(name, options) {
const serialized = `${name}=; Path=/; Max-Age=0`
const prev = res.getHeader('Set-Cookie')
if (!prev) res.setHeader('Set-Cookie', serialized)
else res.setHeader('Set-Cookie', Array.isArray(prev) ? [...prev, serialized] : [prev, serialized])
},
},
}
)
}
