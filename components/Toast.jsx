import { useEffect, useState } from 'react';
export default function Toast({ msg, onDone }){
  const [show, setShow] = useState(!!msg);
  useEffect(()=>{
    if(!msg) return;
    setShow(true);
    const t = setTimeout(()=>{ setShow(false); onDone && onDone(); }, 1600);
    return ()=>clearTimeout(t);
  }, [msg]);
  if(!show) return null;
  return <div className="toast">{msg}
    <style jsx>{`
      .toast{ position:fixed; right:16px; bottom:16px; z-index:9999;
        background:#0f1118; color:var(--text); border:1px solid var(--line);
        border-radius:12px; padding:10px 12px; box-shadow:0 8px 24px rgba(0,0,0,.5);}
    `}</style>
  </div>;
}
