
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
function useOutside(ref,onClose){useEffect(()=>{const h=e=>{if(ref.current && !ref.current.contains(e.target)) onClose()};document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h)},[ref,onClose])}
export default function Navbar(){const [user,setUser]=useState(null);const [role,setRole]=useState(null);const [open,setOpen]=useState(false);const dd=useRef(null);useOutside(dd,()=>setOpen(false));
useEffect(()=>{(async()=>{const {data}=await supabase.auth.getSession();const u=data?.session?.user||null;setUser(u);if(u){const {data:prof}=await supabase.from('profiles').select('role,avatar_url,email').eq('id',u.id).single();setRole(prof?.role||'user');if(prof?.avatar_url){u.user_metadata={...(u.user_metadata||{}),picture:prof.avatar_url};setUser({...u});}}})();const {data:sub}=supabase.auth.onAuthStateChange((_e,s)=>setUser(s?.user||null));return()=>sub?.subscription?.unsubscribe()},[]);
const signIn=async()=>{await supabase.auth.signInWithOAuth({provider:'google', options:{redirectTo:typeof window!=='undefined'?window.location.origin:undefined}})};const signOut=async()=>{await supabase.auth.signOut();window.location.href='/'};
const pic=user?.user_metadata?.picture;
return(<header className='nav'><div className='nav-inner'>
  <a href='/' className='brand'>CABURE.STORE</a>
  <nav className='menu'>
    {(role==='vendor'||role==='admin')&&<a className='badge' href='/vendedor'>Vendedor</a>}
    {role==='admin'&&<a className='badge' href='/admin'>Admin</a>}
    {!user?<button className='btn-ghost' onClick={signIn}>Iniciar sesión (Google)</button>:<div className={`dropdown ${open?'open':''}`} ref={dd}><button className='btn-ghost' onClick={()=>setOpen(v=>!v)}>{pic?<img className='avatar' src={pic} alt='avatar'/>:<span className='badge'>Cuenta</span>}</button><div className='dropdown-menu'>
      <div className='small' style={{padding:'6px 10px'}}>Hola, {user.email}</div>
      <a href='/compras'>Mis Compras</a>
      <a href='/soporte'>Soporte</a>
      {(role==='vendor'||role==='admin')&&<a href='/vendedor/metricas'>Métricas vendedor</a>}
      {role==='admin'&&<a href='/admin/metricas'>Métricas admin</a>}
      <hr style={{border:'none',borderTop:'1px solid var(--line)',margin:'8px 0'}}/>
      <button onClick={signOut}>Cerrar sesión</button>
    </div></div>}
  </nav>
</div></header>)}
