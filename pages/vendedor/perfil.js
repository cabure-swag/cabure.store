// CONTENT-ONLY
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import ImageUploader from '../../components/ImageUploader';
import Toast from '../../components/Toast';

function isAdmin(role){ return role==='admin'; }

async function getRole(){
  const { data: s } = await supabase.auth.getSession();
  const user = s?.session?.user;
  if(!user) return { user:null, role:null };
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  return { user, role: data?.role || 'user' };
}
async function getBrands({ user, role }){
  if(isAdmin(role)){
    const { data } = await supabase.from('brands').select('*').order('name');
    return data||[];
  }
  const { data: rel } = await supabase.from('brands_vendors').select('brand_slug').eq('user_id', user.id);
  if(rel?.length){
    const slugs = rel.map(r=>r.brand_slug);
    const { data } = await supabase.from('brands').select('*').in('slug', slugs).order('name');
    return data||[];
  }
  return [];
}

export default function VendedorPerfil(){
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [list, setList] = useState([]);
  const [slug, setSlug] = useState('');
  const [brand, setBrand] = useState(null);
  const [toast, setToast] = useState('');

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>setSession(data.session||null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e,s)=>setSession(s));
    return ()=>sub.subscription.unsubscribe();
  }, []);

  useEffect(()=>{ if(!session) return; let on = true; (async ()=>{
    const { user, role } = await getRole();
    if(!on) return;
    setRole(role);
    const b = await getBrands({ user, role });
    if(!on) return;
    setList(b);
    if(!slug && b?.[0]?.slug) setSlug(b[0].slug);
  })(); return ()=>{ on=false; }; }, [session]);

  useEffect(()=>{ if(!slug) return setBrand(null); let on = true; (async ()=>{
    const { data } = await supabase.from('brands').select('*').eq('slug', slug).maybeSingle();
    if(!on) return;
    setBrand(data||null);
  })(); return ()=>{ on=false; }; }, [slug]);

  if(!session || !(role==='admin' || role==='vendor')) return <div>No tenés permiso para ver Vendedor.</div>;

  async function upd(field, value){
    const { error } = await supabase.from('brands').update({ [field]: value }).eq('slug', brand.slug);
    if(error) return alert(error.message);
    setBrand(b=>({...b,[field]:value}));
    setToast('Guardado');
  }

  return (
    <section>
      <h1>Vendedor — Perfil & Portadas</h1>

      <div className="card">
        <label className="lbl">Marca</label>
        <select value={slug} onChange={e=>setSlug(e.target.value)}>
          {list.map(b=>(<option key={b.slug} value={b.slug}>{b.name}</option>))}
        </select>
      </div>

      {brand && (
        <div className="card">
          <div className="row gap">
            <div style={{width:180}}>
              <div className="lbl">Logo</div>
              <img src={brand.logo_url || '/logo.png'} className="logo" alt=""/>
              <ImageUploader folder={`brands/${brand.slug}`} onUploaded={(urls)=>upd('logo_url', urls[0])} />
            </div>
            <div style={{flex:1}}>
              <div className="lbl">Descripción</div>
              <textarea defaultValue={brand.description||''} rows={3} onBlur={(e)=>upd('description', e.target.value)}/>
              <div className="row gap">
                <div style={{flex:1}}>
                  <div className="lbl">Instagram</div>
                  <input defaultValue={brand.instagram||''} onBlur={(e)=>upd('instagram', e.target.value)} placeholder="@usuario o url"/>
                </div>
              </div>
              <div className="row gap">
                <div>
                  <div className="lbl">Envío a domicilio (ARS)</div>
                  <input type="number" defaultValue={brand.ship_domicilio ?? ''} onBlur={(e)=>upd('ship_domicilio', e.target.value===''? null : Number(e.target.value))}/>
                </div>
                <div>
                  <div className="lbl">Envío a sucursal (ARS)</div>
                  <input type="number" defaultValue={brand.ship_sucursal ?? ''} onBlur={(e)=>upd('ship_sucursal', e.target.value===''? null : Number(e.target.value))}/>
                </div>
                <div>
                  <div className="lbl">Envío gratis desde (ARS)</div>
                  <input type="number" defaultValue={brand.ship_free_from ?? 0} onBlur={(e)=>upd('ship_free_from', Number(e.target.value||0))}/>
                </div>
              </div>
            </div>
          </div>

          <div className="lbl" style={{marginTop:10}}>Portadas (múltiples)</div>
          <div className="thumbs">
            {(brand.cover_urls||[]).map((u,i)=>(<img key={i} src={u} alt=""/>))}
          </div>
          <ImageUploader folder={`brands/${brand.slug}/covers`} multiple onUploaded={(urls)=>upd('cover_urls', [...(brand.cover_urls||[]), ...urls])} />
        </div>
      )}

      <Toast msg={toast} onDone={()=>setToast('')} />

      <style jsx>{`
        .lbl{ display:block; margin:8px 0 6px; font-weight:600; }
        .row{ display:flex; }
        .gap{ gap:12px; }
        .card{ border:1px solid var(--line); border-radius:12px; padding:14px; background:#0e0f16; margin-bottom:12px; }
        select, input, textarea{ width:100%; background:#0f1118; border:1px solid var(--line); color:var(--text); border-radius:10px; padding:8px; }
        .logo{ width:100%; height:140px; object-fit:cover; border-radius:12px; border:1px solid var(--line); margin-bottom:8px; }
        .thumbs{ display:flex; gap:8px; flex-wrap:wrap; margin-bottom:8px; }
        .thumbs img{ width:120px; height:76px; object-fit:cover; border-radius:8px; border:1px solid var(--line); }
      `}</style>
    </section>
  );
}
