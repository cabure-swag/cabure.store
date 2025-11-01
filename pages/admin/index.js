// pages/admin/index.js
import { requireAdmin } from '../../lib/guards'
import Link from 'next/link'


export default function AdminHome(){
return (
<main className="container" style={{padding:'24px'}}>
<h1>Panel de Administración</h1>
<ul style={{marginTop:12,lineHeight:1.8}}>
<li><Link href="/admin/metricas">Métricas</Link></li>
<li><Link href="/admin/marcas">Marcas</Link></li>
<li><Link href="/admin/pedidos">Pedidos</Link></li>
<li><Link href="/admin/soporte">Soporte</Link></li>
</ul>
</main>
)
}


export async function getServerSideProps(ctx){
const gate = await requireAdmin(ctx)
if (gate.redirect) return gate
return { props: {} }
}
