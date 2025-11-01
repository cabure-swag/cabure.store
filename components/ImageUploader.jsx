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
      const { error } = await supabase.storage.from('media').upload(path, file, { upsert:false, cacheControl: '3600' });
      if(error){ console.error(error); continue; }
      const { data } = supabase.storage.from('media').getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    setLoading(false);
    onUploaded && onUploaded(urls);
    e.target.value='';
  }

  return (
    <label className="uploader">
      <input type="file" accept="image/*" onChange={onChange} multiple={multiple} disabled={loading} hidden />
      <span>{loading ? 'Subiendo…' : (multiple ? 'Subir imágenes' : 'Subir imagen')}</span>
      <style jsx>{`
        .uploader{
          display:inline-flex; align-items:center; justify-content:center;
          border:1px solid var(--line); background:#0f1118; color:var(--text);
          border-radius:10px; padding:8px 10px; cursor:pointer;
        }
        .uploader:hover{ filter:brightness(1.05); }
      `}</style>
    </label>
  );
}
