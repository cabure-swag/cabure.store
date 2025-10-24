
export default function LogoTicker({logos=[]}){
  const N=16;
  const filled = logos.filter(Boolean).slice(0,N);
  const placeholders = Array.from({length:Math.max(0,N - filled.length)}, ()=>null);
  const interleaved=[]; const maxLen=Math.max(filled.length,placeholders.length);
  for(let i=0;i<maxLen;i++){ if(i<filled.length) interleaved.push(filled[i]); if(i<placeholders.length) interleaved.push(null); }
  const items=[...interleaved,...interleaved,...interleaved];
  return (<div className='ticker'><div className='track' style={{width:'300%'}}>
    {items.map((src,i)=>(src?<a key={i} href='/'><img src={src} alt='logo'/></a>:<span key={i} className='slot'></span>))}
  </div></div>);
}
