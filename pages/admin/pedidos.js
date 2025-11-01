// pages/admin/pedidos.js
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { requireAdmin } from '../../lib/guards'


function money(n){
const v = Number(n||0)
return v.toLocaleString('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0})
}


export default function AdminPedidos(){
const [orders,setOrders] = useState([])
const [loading,setLoading] = useState(true)
const [error,setError] = useState(null)


async function load(){
setLoading(true)
const { data, error } = await supabase
.from('orders')
.select('id,created_at,brand_slug,total,pay,shipping,status')
.order('created_at',{ascending:false}).limit(300)
if (error) setError(error.message)
setOrders(data||[])
setLoading(false)
}


useEffect(()=>{ load() },[])


async function remove(id){
if(!confirm('¿Eliminar pedido?')) return
const { error } = await supabase.from('orders').delete().eq('id',id)
if (error) return alert(error.message)
await load()
}


return (
<main className="container" style={{padding:'24px',maxWidth:980,margin:'0 auto'}}>
<h1>Admin · Pedidos</h1>
{loading && <p>Cargando…</p>}
{error && <p style={{color:'#f88'}}>Error: {error}</p>}


<div className="list" style={{display:'grid',gap:8,marginTop:12}}>
{orders.map(o => (
<div key={o.id} className="card" style={{padding:12,display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr auto',gap:12,alignItems:'center'}}>
<div><strong>#{String(o.id).slice(0,8)}</strong></div>
<div>{new Date(o.created_at).toLocaleString('es-AR')}</div>
<div>{o.brand_slug}</div>
<div style={{textAlign:'right'}}>{money(o.total)}</div>
<div style={{display:'flex',gap:8,justifyContent:'end'}}>
<button className="btn-ghost" onClick={()=>remove(o.id)}>Eliminar</button>
</div>
</div>
))}
{(!loading && !orders.length) && <p>No hay pedidos.</p>}
</div>


<style jsx>{`
.card{border:1px solid #222;border-radius:12px;background:#0b1220}
.btn-ghost{background:transparent;border:1px solid #374151;border-radius:10px;padding:8px 12px;color:#fff}
`}</style>
</main>
)
}


export async function getServerSideProps(ctx){
const gate = await requireAdmin(ctx)
if (gate.redirect) return gate
return { props: {} }
}
