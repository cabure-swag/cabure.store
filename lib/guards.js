// lib/guards.js
import { getSupabaseServerClient } from './supabaseServer'


/** Exige usuario autenticado. Si no hay, redirige a Inicio con ?login=1 */
export async function requireAuth(ctx) {
const supabase = getSupabaseServerClient(ctx)
const { data: { user } } = await supabase.auth.getUser()
if (!user) {
return { redirect: { destination: '/?login=1', permanent: false } }
}
return { supabase, user }
}


/** Devuelve roles (isAdmin/isVendor) y marcas del vendedor (brand_slug[]) */
export async function getRolesAndBrands(supabase, user) {
// ¿Es admin?
const { data: admins, error: e1 } = await supabase
.from('admin_emails')
.select('email')
.eq('email', user.email)


const isAdmin = !!admins?.length


// ¿Es vendedor? (marcas asociadas)
const { data: vbrands, error: e2 } = await supabase
.from('vendor_brands')
.select('brand_slug')
.eq('user_id', user.id)


const vendorBrands = (vbrands || []).map(v => v.brand_slug)
const isVendor = vendorBrands.length > 0


return { isAdmin, isVendor, vendorBrands }
}


/** Solo Admin (para /admin/*) */
export async function requireAdmin(ctx) {
const base = await requireAuth(ctx)
if (base.redirect) return base
const { supabase, user } = base
const roles = await getRolesAndBrands(supabase, user)
if (!roles.isAdmin) {
return { redirect: { destination: '/?unauthorized=admin', permanent: false } }
}
return { supabase, user, ...roles }
}


/** Admin o Vendor (para /vendedor/*) */
export async function requireVendorOrAdmin(ctx) {
const base = await requireAuth(ctx)
if (base.redirect) return base
const { supabase, user } = base
const roles = await getRolesAndBrands(supabase, user)
if (!roles.isAdmin && !roles.isVendor) {
return { redirect: { destination: '/?unauthorized=vendor', permanent: false } }
}
return { supabase, user, ...roles }
}
