// pages/admin/soporte.js
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { requireAdmin } from '../../lib/guards'


export default function AdminSoporte(){
const [tickets,setTickets] = useState([])
const [loading,setLoading] = useState(true)
const [error,setError] = useState(null)


async function load(){
setLoading(true)
const { data, error } = await supabase
.from('support_tickets')
.select('id, created_at, title, status')
.order('created_at',{ascending:false}).limit(300)
if (error) setError(error.message)
setTickets(data||[])
setLoading(false)
}


useEffect(()=>{ load() },[])


return (
<main className="container" style={{padding:'24px',maxWidth:980,margin:'0 auto'}}>
<h1>Admin · Soporte</h1>
{loading && <p>Cargando…</p>}
{error && <p style={{color:'#f88'}}>Error: {error}</p>}


<div className="list" style={{display:'grid',gap:8,marginTop:12}}>
{tickets.map(t => (
<div key={t.id} className="card" style={{padding:12,display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:12,alignItems:'center'}}>
<div><strong>#{String(t.id).slice(0,8)}</strong></div>
<div>{t.title || 'Sin título'}</div>
<div style={{textAlign:'right'}}>{t.status||'abierto'}</div>
</div>
))}
{(!loading && !tickets.length) && <p>No hay tickets.</p>}
</div>


<style jsx>{`
.card{border:1px solid #222;border-radius:12px;background:#0b1220}
`}</style>
</main>
)
}


export async function getServerSideProps(ctx){
const gate = await requireAdmin(ctx)
if (gate.redirect) return gate
return { props: {} }
}
