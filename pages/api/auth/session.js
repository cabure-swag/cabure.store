// pages/api/auth/session.js

function isSecure(req) {
  // En producción (o cuando el request llega por https/behind proxy) usamos Secure
  const proto = req.headers['x-forwarded-proto'] || '';
  const host = req.headers.host || '';
  const isLocalhost = host.includes('localhost') || host.startsWith('127.') || host.startsWith('0.0.0.0');
  return !isLocalhost && (proto === 'https' || process.env.NODE_ENV === 'production');
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    res.setHeader('Allow', 'POST,DELETE');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    if (req.method === 'DELETE') {
      res.setHeader(
        'Set-Cookie',
        `sb=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; ${isSecure(req) ? 'Secure' : ''}`
      );
      return res.status(200).json({ ok: true, cleared: true });
    }

    // POST
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const access_token = body?.access_token || '';

    if (!access_token) {
      // limpiar si viene vacío
      res.setHeader(
        'Set-Cookie',
        `sb=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; ${isSecure(req) ? 'Secure' : ''}`
      );
      return res.status(200).json({ ok: true, cleared: true });
    }

    const maxAge = 60 * 60 * 24 * 7; // 7 días
    res.setHeader(
      'Set-Cookie',
      `sb=${access_token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax; ${isSecure(req) ? 'Secure' : ''}`
    );
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(400).json({ ok: false, error: 'bad_request' });
  }
}
