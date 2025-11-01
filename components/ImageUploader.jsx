import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
function uid(){ return (globalThis?.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)); }
export default function ImageUploader({ folder, multiple=false, onUploaded }){
  const [loading, setLoading] = useState(false);
  async function onChange(e){
    const files = Array.from(e.target.files || []);
    if(!files.length) return;
    setLoading(true);
    const urls = [];
    for(const file of files){
      const ext = (file.name.split('.').pop()||'jpg').toLowerCase();
      const path = `${folder.replace(/\/$/,'')}/${uid()}.${ext}`;
      const { error } = await supabase.storage.from('media').upload(path, file, { upsert:false, cacheControl:'3600' });
      if(error){ console.error(error.message); continue; }
      const { data } = supabase.storage.from('media').getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    setLoading(false);
    onUploaded && onUploaded(urls);
    e.target.value='';
  }
  return (<label className="uploader">
    <input type="file" accept="image/*" hidden multiple={multiple} disabled={loading} onChange={onChange}/>
    <span>{loading? 'Subiendo…' : (multiple? 'Subir imágenes' : 'Subir imagen')}</span>
    <style jsx>{`
      .uploader{ display:inline-flex; align-items:center; gap:8px; cursor:pointer;
        border:1px solid var(--line); background:#0e0f16; color:var(--text);
        padding:8px 10px; border-radius:10px;}
      .uploader:hover{ filter:brightness(1.05); }
    `}</style>
  </label>);
}
