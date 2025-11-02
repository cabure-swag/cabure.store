// pages/api/auth/session.js
export default async function handler(req, res){
  if (req.method === 'POST'){
    try{
      const { access_token } = JSON.parse(req.body || '{}');
      if(!access_token){
        // Limpiar cookie si viene vacío
        res.setHeader('Set-Cookie', `sb=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure`);
        return res.status(200).json({ ok: true, cleared: true });
      }
      // Seteamos cookie por 7 días
      const maxAge = 60*60*24*7;
      res.setHeader('Set-Cookie', `sb=${access_token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax; Secure`);
      return res.status(200).json({ ok: true });
    }catch(e){
      return res.status(400).json({ ok:false });
    }
  }
  if (req.method === 'DELETE'){
    res.setHeader('Set-Cookie', `sb=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure`);
    return res.status(200).json({ ok: true, cleared: true });
  }
  res.setHeader('Allow', 'POST,DELETE');
  return res.status(405).end('Method Not Allowed');
}
