// components/NavBar.jsx
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'


export default function NavBar(){
const [open, setOpen] = useState(false)
const [roles, setRoles] = useState({ isAuth:false, isAdmin:false, isVendor:false })
const dropRef = useRef(null)


useEffect(() => {
let mounted = true
;(async ()=>{
try {
const r = await fetch('/api/auth/roles')
const json = await r.json()
if (mounted) setRoles(json)
} catch {}
})()
return () => { mounted = false }
}, [])


// Cerrar dropdown si clic afuera
useEffect(() => {
function onDocClick(e){ if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false) }
document.addEventListener('click', onDocClick)
return () => document.removeEventListener('click', onDocClick)
}, [])


return (
<header className="nav">
<div className="left">
<Link href="/">Caburé</Link>
</div>
<nav className="right" ref={dropRef}>
<button onClick={()=>setOpen(o=>!o)} aria-expanded={open}>Menú</button>
{open && (
<div className="dropdown">
<Link href="/">Inicio</Link>
{roles.isAdmin && <Link href="/admin">Admin</Link>}
{(roles.isAdmin || roles.isVendor) && <Link href="/vendedor">Vendedor</Link>}
</div>
)}
</nav>


<style jsx>{`
.nav{display:flex;justify-content:space-between;align-items:center;padding:10px 16px;border-bottom:1px solid #222}
.dropdown{position:absolute;right:16px;top:56px;background:#0b1220;border:1px solid #222;border-radius:12px;padding:8px;display:flex;flex-direction:column;gap:6px;z-index:40}
.dropdown a{color:#fff;text-decoration:none;padding:8px 10px;border-radius:8px}
.dropdown a:hover{background:#141a2a}
button{color:#fff;background:#1f2937;border:1px solid #374151;border-radius:8px;padding:6px 10px}
`}</style>
</header>
)
}
