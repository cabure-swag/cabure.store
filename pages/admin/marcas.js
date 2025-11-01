// pages/admin/marcas.js
setLoading(true)
const { data, error } = await supabase.from('brands').select('*').order('created_at',{ascending:false})
if (error) setError(error.message)
setBrands(data||[])
setLoading(false)
}


useEffect(()=>{ load() },[])


async function createBrand(e){
e.preventDefault()
const form = new FormData(e.currentTarget)
let name = String(form.get('name')||'').trim()
let slug = String(form.get('slug')||'').trim() || slugify(name)
const description = String(form.get('description')||'').trim()
const instagram = String(form.get('instagram')||'').trim()
const transfer_alias = String(form.get('transfer_alias')||'').trim()
const transfer_titular = String(form.get('transfer_titular')||'').trim()


const insert = { name, slug, description, instagram, transfer_alias, transfer_titular }
const { error } = await supabase.from('brands').insert(insert)
if (error) return alert(error.message)
e.currentTarget.reset()
await load()
}


async function removeBrand(id){
if(!confirm('¿Eliminar la marca?')) return
const { error } = await supabase.from('brands').delete().eq('id', id)
if (error) return alert(error.message)
await load()
}


return (
<main className="container" style={{padding:'24px',maxWidth:980,margin:'0 auto'}}>
<h1>Admin · Marcas</h1>
{loading && <p>Cargando…</p>}
{error && <p style={{color:'#f88'}}>Error: {error}</p>}


<form onSubmit={createBrand} className="card" style={{display:'grid',gap:12,padding:16,marginTop:12}}>
<div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12}}>
<div><label>Nombre</label><input className="input" name="name" required /></div>
<div><label>Slug (opcional)</label><input className="input" name="slug" placeholder="auto" /></div>
</div>
<div>
<label>Descripción</label>
<textarea name="description" className="input" rows="3" />
</div>
<div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12}}>
<div><label>Instagram</label><input className="input" name="instagram" placeholder="https://instagram.com/mi-marca" /></div>
<div><label>Alias/CBU</label><input className="input" name="transfer_alias" /></div>
</div>
<div>
<label>Titular</label>
<input className="input" name="transfer_titular" />
</div>
<div><button className="btn">Crear marca</button></div>
</form>


<section style={{marginTop:24,display:'grid',gap:12}}>
{brands.map(b => (
<div key={b.id} className="card" style={{padding:12,display:'grid',gridTemplateColumns:'1fr auto',alignItems:'center',gap:8}}>
<div>
<div style={{fontWeight:600}}>{b.name} <span style={{opacity:.7}}>(/{b.slug})</span></div>
<div className="small">{b.description||'Sin descripción'}</div>
{b.instagram && <div className="small">IG: {b.instagram}</div>}
</div>
<div style={{display:'flex',gap:8}}>
<button className="btn-ghost" onClick={()=>removeBrand(b.id)}>Eliminar</button>
</div>
</div>
))}
{(!loading && !brands.length) && <p>No hay marcas.</p>}
</section>


<style jsx>{`
.card{border:1px solid #222;border-radius:12px;background:#0b1220}
.input{width:100%;background:#0b1220;border:1px solid #222;border-radius:10px;padding:8px;color:#fff}
.btn{background:#1f2937;border:1px solid #374151;border-radius:10px;padding:8px 12px;color:#fff}
.btn-ghost{background:transparent;border:1px solid #374151;border-radius:10px;padding:8px 12px;color:#fff}
.small{opacity:.8}
`}</style>
</main>
)
}


export async function getServerSideProps(ctx){
const gate = await requireAdmin(ctx)
if (gate.redirect) return gate
return { props: {} }
}
