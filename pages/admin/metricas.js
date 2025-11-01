// pages/admin/metricas.js
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { requireAdmin } from '../../lib/guards'


function money(n){
const v = Number(n||0)
return v.toLocaleString('es-AR', { style:'currency', currency:'ARS', maximumFractionDigits:0 })
}


export default function AdminMetrics(){
const [orders, setOrders] = useState([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState(null)


useEffect(() => {
(async () => {
try {
setLoading(true)
const { data, error } = await supabase
.from('orders')
.select('*')
.order('created_at', { ascending: false })
.limit(200)
if (error) throw error
setOrders(data || [])
} catch (e) {
setError(e.message)
} finally {
setLoading(false)
}
})()
}, [])


const kpis = useMemo(() => {
const total = orders.reduce((acc,o)=> acc + Number(o.total||0), 0)
const count = orders.length
const avg = count ? total / count : 0
return { total, count, avg }
}, [orders])


return (
<main className="container" style={{padding:'24px',maxWidth:980,margin:'0 auto'}}>
<h1>Admin · Métricas</h1>
{loading && <p>Cargando…</p>}
{error && <p style={{color:'#f88'}}>Error: {error}</p>}


<section className="grid" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginTop:12}}>
<div className="card"><div className="h2">Ventas</div><div className="big">{money(kpis.total)}</div></div>
<div className="card"><div className="h2">Pedidos</div><div className="big">{kpis.count}</div></div>
<div className="card"><div className="h2">Ticket prom.</div><div className="big">{money(kpis.avg)}</div></div>
</section>


<section style={{marginTop:24}}>
<h2>Últimos pedidos</h2>
<div className="list" style={{display:'grid',gap:8}}>
{orders.map(o => (
<div key={o.id} className="row card" style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:12,padding:12}}>
<div><strong>#{String(o.id).slice(0,8)}</strong></div>
<div>{new Date(o.created_at).toLocaleString('es-AR')}</div>
<div>{o.brand_slug}</div>
<div style={{textAlign:'right'}}>{money(o.total)}</div>
</div>
))}
{(!loading && !orders.length) && <p>No hay pedidos.</p>}
</div>
</section>


<style jsx>{`
.card{border:1px solid #222;border-radius:12px;background:#0b1220}
.h2{font-weight:600;margin-bottom:6px}
.big{font-size:22px}
`}</style>
</main>
)
}


export async function getServerSideProps(ctx) {
const gate = await requireAdmin(ctx)
if (gate.redirect) return gate
return { props: {} }
}
