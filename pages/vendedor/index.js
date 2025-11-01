// pages/vendedor/index.js
import { requireVendorOrAdmin } from '../../lib/guards'
import Link from 'next/link'


export default function VendedorHome(){
return (
<main className="container" style={{padding:'24px'}}>
<h1>Panel de Vendedor</h1>
<ul style={{marginTop:12,lineHeight:1.8}}>
<li><Link href="/vendedor/metricas">Métricas</Link></li>
<li><Link href="/vendedor/catalogo">Catálogo</Link></li>
<li><Link href="/vendedor/pedidos">Pedidos</Link></li>
<li><Link href="/vendedor/perfil">Perfil</Link></li>
</ul>
</main>
)
}


export async function getServerSideProps(ctx){
const gate = await requireVendorOrAdmin(ctx)
if (gate.redirect) return gate
return { props: {} }
}
