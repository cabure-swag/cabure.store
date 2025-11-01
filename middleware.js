// middleware.js
import { NextResponse } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'


export async function middleware(req) {
const res = NextResponse.next()
const supabase = createMiddlewareClient({ req, res })


const { data: { user } } = await supabase.auth.getUser()
const url = req.nextUrl


const isAdminRoute = url.pathname.startsWith('/admin')
const isVendorRoute = url.pathname.startsWith('/vendedor')


// Si no es ruta protegida, seguimos
if (!isAdminRoute && !isVendorRoute) return res


// Exige login
if (!user) return NextResponse.redirect(new URL('/?login=1', url))


// Roles
const { data: admins } = await supabase
.from('admin_emails')
.select('email')
.eq('email', user.email)
const isAdmin = !!admins?.length


if (isAdminRoute && !isAdmin) {
return NextResponse.redirect(new URL('/?unauthorized=admin', url))
}


if (isVendorRoute && !isAdmin) {
const { data: vb } = await supabase
.from('vendor_brands')
.select('brand_slug')
.eq('user_id', user.id)
if (!vb?.length) {
return NextResponse.redirect(new URL('/?unauthorized=vendor', url))
}
}


return res
}


export const config = {
matcher: ['/admin/:path*', '/vendedor/:path*'],
}
