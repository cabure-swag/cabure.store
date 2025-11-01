import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Sidebar({ kind='admin' }){
  const r = useRouter();
  const base = kind === 'admin' ? '/admin' : '/vendedor';
  const items = kind === 'admin' ? [
    { href: `${base}`, label:'Dashboard' },
    { href: `${base}/marcas`, label:'Marcas' },
    { href: `${base}/usuarios`, label:'Usuarios' },
    { href: `${base}/pedidos`, label:'Pedidos' },
    { href: `${base}/metricas`, label:'Métricas' },
    { href: `${base}/soporte`, label:'Soporte' },
  ] : [
    { href: `${base}`, label:'Dashboard' },
    { href: `${base}/perfil`, label:'Perfil & Portadas' },
    { href: `${base}/catalogo`, label:'Catálogo' },
    { href: `${base}/pedidos`, label:'Pedidos & Chats' },
    { href: `${base}/metricas`, label:'Métricas' },
  ];
  return (
    <aside className="sidebar">
      {items.map(it => (
        <Link key={it.href} href={it.href} className={`nav ${r.pathname===it.href?'on':''}`}>{it.label}</Link>
      ))}
      <style jsx>{`
        .sidebar{ width:240px; border-right:1px solid var(--line); padding:12px; position:sticky; top:52px; height:calc(100vh - 52px); background:#0e0f16; }
        .nav{ display:block; color:var(--text); text-decoration:none; padding:8px 10px; border-radius:8px; }
        .nav.on, .nav:hover{ background:#141a2a; }
      `}</style>
    </aside>
  );
}
