// pages/vendedor/catalogo.js


async function loadBrands(){
let q = supabase.from('brands').select('slug,name').order('name')
if (!isAdmin) q = q.in('slug', vendorBrands||[])
const { data, error } = await q
if (error) return setError(error.message)
setBrands(data||[])
if (data?.length) setSelBrand(prev => prev || data[0].slug)
}


async function loadProducts(slug){
if (!slug) return setProducts([])
const { data, error } = await supabase
.from('products')
.select('*')
.eq('brand_slug', slug)
.order('created_at',{ascending:false})
.limit(300)
if (error) setError(error.message)
setProducts(data||[])
}


useEffect(()=>{ (async()=>{ setLoading(true); await loadBrands(); setLoading(false) })() },[])
useEffect(()=>{ loadProducts(selBrand) },[selBrand])


async function addProduct(e){
e.preventDefault()
const form = new FormData(e.currentTarget)
const name = String(form.get('name')||'').trim()
const price = Number(form.get('price')||0)
const stock = Number(form.get('stock')||0)
const slug = slugify(name)
const ins = { name, price, stock, slug, brand_slug: selBrand }
const { error } = await supabase.from('products').insert(ins)
if (error) return alert(error.message)
e.currentTarget.reset()
await loadProducts(selBrand)
}


async function removeProduct(id){
if(!confirm('¿Eliminar producto?')) return
const { error } = await supabase.from('products').delete().eq('id',id)
if (error) return alert(error.message)
await loadProducts(selBrand)
}


return (
<main className="container" style={{padding:'24px',maxWidth:980,margin:'0 auto'}}>
<h1>Vendedor · Catálogo {isAdmin ? '(todas las marcas)' : ''}</h1>
{loading && <p>Cargando…</p>}
{error && <p style={{color:'#f88'}}>Error: {error}</p>}


<section className="card" style={{padding:16,marginTop:12}}>
<label>Marca</label>
<select className="input" value={selBrand} onChange={e=>setSelBrand(e.target.value)}>
<option value="">Seleccionar…</option>
{brands.map(b => <option key={b.slug} value={b.slug}>{b.name} ({b.slug})</option>)}
</select>
</section>


{!!selBrand && (
<form onSubmit={addProduct} className="card" style={{padding:16,marginTop:12,display:'grid',gap:12,gridTemplateColumns:'2fr 1fr 1fr auto'}}>
<input className="input" name="name" placeholder="Nombre" required />
<input className="input" name="price" type="number" placeholder="Precio" required />
<input className="input" name="stock" type="number" placeholder="Stock" defaultValue={0} />
<button className="btn">Agregar</button>
</form>
)}


<section style={{marginTop:12,display:'grid',gap:8}}>
{products.map(p => (
<div key={p.id} className="card" style={{padding:12,display:'grid',gridTemplateColumns:'1fr 1fr 1fr auto',gap:12,alignItems:'center'}}>
<div style={{fontWeight:600}}>{p.name}</div>
<div>Precio: ${p.price}</div>
<div>Stock: {p.stock}</div>
<div style={{textAlign:'right'}}>
<button className="btn-ghost" onClick={()=>removeProduct(p.id)}>Eliminar</button>
</div>
</div>
))}
{(!products.length && !!selBrand) && <p>No hay productos para esta marca.</p>}
</section>


<style jsx>{`
.card{border:1px solid #222;border-radius:12px;background:#0b1220}
.input{width:100%;background:#0b1220;border:1px solid #222;border-radius:10px;padding:8px;color:#fff}
.btn{background:#1f2937;border:1px solid #374151;border-radius:10px;padding:8px 12px;color:#fff}
.btn-ghost{background:transparent;border:1px solid #374151;border-radius:10px;padding:8px 12px;color:#fff}
`}</style>
</main>
)
}


export async function getServerSideProps(ctx){
const gate = await requireVendorOrAdmin(ctx)
if (gate.redirect) return gate
const { isAdmin, vendorBrands } = gate
return { props: { isAdmin, vendorBrands } }
}
