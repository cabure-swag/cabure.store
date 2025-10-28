// components/ImageUploader.jsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ImageUploader({
  brandSlug,
  productId,              // si es nuevo, podemos generar un tmp id y luego renombrar (aquí lo usamos tal cual)
  initial = [],           // [{url}, ...]
  onChange,               // (filesArray: {url}[]) => void
  max = 5,
}) {
  const [items, setItems] = useState((initial || []).slice(0, max));
  const [busy, setBusy]   = useState(false);
  const dragIndex = useRef(null);

  useEffect(() => { onChange?.(items); }, [items]); // notificar cambios

  const onDrop = useCallback(async (ev) => {
    ev.preventDefault();
    const files = ev.dataTransfer?.files ? Array.from(ev.dataTransfer.files) : [];
    if (!files.length) return;
    await uploadFiles(files);
  }, [items, brandSlug, productId]);

  const onPick = async (e) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;
    await uploadFiles(files);
    e.target.value = '';
  };

  async function uploadFiles(files){
    try {
      setBusy(true);
      const left = Math.max(0, max - items.length);
      const take = files.slice(0, left);

      const ups = [];
      for (const file of take){
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const safe = Date.now() + '_' + file.name.replace(/[^\w.\-]/g, '_');
        const path = `products/${brandSlug}/${productId}/${safe}`;

        const { error } = await supabase.storage.from('media').upload(path, file, {
          upsert: false, cacheControl: '3600', contentType: file.type || 'image/jpeg'
        });
        if (error) throw error;

        const { data: pub } = supabase.storage.from('media').getPublicUrl(path);
        ups.push({ url: pub.publicUrl });
      }

      const next = [...items, ...ups].slice(0, max);
      setItems(next);
    } catch (err) {
      alert('Error al subir imagen: ' + (err?.message || err));
    } finally {
      setBusy(false);
    }
  }

  function onDragStart(idx){ dragIndex.current = idx; }
  function onDragOver(e){ e.preventDefault(); }
  function onDropReorder(idx){
    const from = dragIndex.current;
    if (from === null || from === idx) return;
    const arr = items.slice();
    const [m] = arr.splice(from, 1);
    arr.splice(idx, 0, m);
    dragIndex.current = null;
    setItems(arr);
  }

  function removeAt(i){
    const arr = items.slice(); arr.splice(i,1); setItems(arr);
  }

  return (
    <div>
      <div
        onDrop={onDrop}
        onDragOver={(e)=>e.preventDefault()}
        className="uploader"
      >
        <input type="file" accept="image/*" multiple onChange={onPick} disabled={busy || items.length>=max} />
        <span>{busy ? 'Subiendo...' : `Arrastrá o hacé click para subir (máx ${max})`}</span>
      </div>

      <div className="grid">
        {items.map((it, i) => (
          <div
            key={i}
            className="slot"
            draggable
            onDragStart={()=>onDragStart(i)}
            onDragOver={onDragOver}
            onDrop={()=>onDropReorder(i)}
            title={i===0 ? 'Imagen principal' : `Imagen ${i+1}`}
          >
            <img src={it.url} alt={`img-${i}`} />
            <div className="tag">{i===0 ? 'Principal' : `#${i+1}`}</div>
            <button className="rm" onClick={()=>removeAt(i)}>✕</button>
          </div>
        ))}
      </div>

      <style jsx>{`
        .uploader{
          border: 1px dashed var(--line);
          background:#0f1118;
          padding: 14px;
          border-radius: 12px;
          display:flex; align-items:center; gap:10px;
          margin-bottom: 10px;
        }
        .uploader input[type="file"]{ cursor:pointer; }
        .grid{
          display:grid; gap:10px;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        }
        .slot{
          position:relative; border:1px solid var(--line); border-radius:12px; overflow:hidden;
          background:#0b0d14;
        }
        .slot img{ width:100%; height:160px; object-fit:cover; display:block; }
        .tag{
          position:absolute; top:8px; left:8px; font-size:12px; opacity:.9;
          background: #141a2a; border: 1px solid var(--line); padding: 2px 6px; border-radius: 8px;
        }
        .rm{
          position:absolute; top:8px; right:8px; background:#1a1010; border:1px solid #3a2a2a;
          color:#f6b3b3; border-radius:8px; cursor:pointer; padding: 2px 6px;
        }
      `}</style>
    </div>
  );
}
