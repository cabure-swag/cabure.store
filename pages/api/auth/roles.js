// pages/api/auth/roles.js
import { getSupabaseServerClient } from '../../../lib/supabaseServer'
import { getRolesAndBrands } from '../../../lib/guards'


export default async function handler(req, res) {
try {
const supabase = getSupabaseServerClient({ req, res })
const { data: { user } } = await supabase.auth.getUser()


if (!user) {
return res.status(200).json({ isAuth: false, isAdmin: false, isVendor: false, vendorBrands: [] })
}


const roles = await getRolesAndBrands(supabase, user)
return res.status(200).json({ isAuth: true, ...roles })
} catch (e) {
return res.status(200).json({ isAuth: false, isAdmin: false, isVendor: false, vendorBrands: [], error: e.message })
}
}
