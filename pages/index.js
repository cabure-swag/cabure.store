
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import LogoTicker from '../ui/LogoTicker';

export default function Home(){
  const [brands,setBrands]=useState([]);
  useEffect(()=>{supabase.from('brands').select('slug,name,logo_url,description').then(({data})=>setBrands(data||[]))},[]);
  return (<main>
    <LogoTicker logos={(brands||[]).map(b=>b.logo_url).filter(Boolean)} />
    <div className="container">
      <div className="grid" style={{gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))'}}>
        {(brands||[]).map(b=>(
          <a key={b.slug} className="card" href={`/marcas/${b.slug}`}>
            <div className="row">
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <img src={b.logo_url||'/logo.png'} alt={b.name} style={{width:48,height:48,objectFit:'contain',borderRadius:12,background:'#0d0f16',border:'1px solid var(--line)'}}/>
                <div>
                  <div style={{fontWeight:900}}>{b.name}</div>
                  <div className="small">{b.description}</div>
                </div>
              </div>
              <div className="badge">Ver</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  </main>);
}
