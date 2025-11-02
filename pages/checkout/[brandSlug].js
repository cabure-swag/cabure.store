// pages/checkout/[brandSlug].js
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

export default function Checkout() {
  const router = useRouter();
  const slug = router.query.brandSlug;

  const [brand, setBrand] = useState(null);
  const [cart, setCart] = useState([]);
  const [shipping, setShipping] = useState(null);        // 'domicilio' | 'sucursal'
  const [pay, setPay] = useState('transferencia');       // 'transferencia' | 'mp'

  useEffect(() => {
    if (!slug) return;

    // Cargar carrito por marca
    const saved = localStorage.getItem(`cart:${slug}`);
    try {
      const arr = saved ? JSON.parse(saved) : [];
      const list = Array.isArray(arr) ? arr : [];
      setCart(list.filter(x => x && typeof x === 'object' && x.qty > 0));
    } catch {
      setCart([]);
    }

    // Cargar datos de la marca (costos/envío/fee)
    supabase.from('brands')
      .select('name, slug, ship_domicilio, ship_sucursal, ship_free_from, mp_fee')
      .eq('slug', slug)
      .single()
      .then(({ data }) => setBrand(data || null));
  }, [slug]);

  const subtotal = useMemo(() => cart.reduce((a, c) => a + (Number(c.price || 0) * Number(c.qty || 0)), 0), [cart]);

  const shipCost = useMemo(() => {
    if (!brand) return 0;
    const base = shipping === 'domicilio'
      ? (brand.ship_domicilio ?? 0)
      : shipping === 'sucursal'
      ? (brand.ship_sucursal ?? 0)
      : 0;
    const freeFrom = Number(brand.ship_free_from || 0);
    if (freeFrom > 0 && subtotal >= freeFrom) return 0;
    return Number(base || 0);
  }, [brand, shipping, subtotal]);

  const mpFee = useMemo(() => {
    if (!brand || pay !== 'mp') return 0;
    const pct = Number(brand.mp_fee ?? 10);
    return Math.round(subtotal * (pct / 100));
  }, [brand, pay, subtotal]);

  const total = subtotal + shipCost + mpFee;

  async function confirmOrder() {
    // Validaciones mínimas
    if (!shipping) return alert('Elegí el envío');
    if (cart.length === 0) return alert('Tu carrito está vacío');

    // Sesión
    const { data: { session } } = await supabase.auth.getSession();
    const u = session?.user;
    if (!u) {
      // Volverá a esta misma página
      location.href = `/?next=${encodeURIComponent(router.asPath)}`;
      return;
    }

    // Insertar orden (mantiene tu schema actual)
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        user_id: u.id,
        brand_slug: slug,
        shipping,                 // 'domicilio' | 'sucursal'
        pay,                      // 'transferencia' | 'mp'
        mp_fee: brand?.mp_fee ?? 10,
        ship_cost: shipCost,
        subtotal,
        total,
      })
      .select('*')
      .single();

    if (error) return alert(error.message);

    // Ítems
    const rows = cart.map(c => ({
      order_id: order.id,
      product_id: c.id,
      name: c.name,
      price: c.price,
      qty: c.qty,
    }));
    const { error: e2 } = await supabase.from('order_items').insert(rows);
    if (e2) return alert(e2.message);

    // Flujo de pago
    if (pay === 'mp') {
      const r = await fetch('/api/mp/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: order.id,
          brand_slug: slug,
          items: cart.map(c => ({
            title: c.name,
            quantity: c.qty,
            unit_price: c.price,
          })),
          shipping: shipCost,
          fee_pct: brand?.mp_fee ?? 10,
          subtotal,
          total,
        }),
      });
      const j = await r.json();
      if (!r.ok) return alert(j?.error || 'No se pudo crear la preferencia de MP');
      const initPoint = j?.init_point || j?.sandbox_init_point;
      if (!initPoint) return alert('MP no devolvió init_point');

      try { localStorage.removeItem(`cart:${slug}`); } catch {}
      location.href = initPoint;
      return;
    }

    try { localStorage.removeItem(`cart:${slug}`); } catch {}
    router.replace('/compras');
  }

  return (
    <main className="container" style={{ padding: '24px 16px' }}>
      {/* Encabezado con acento sutil para confirmar visual en deploy */}
      <div
        className="card"
        style={{
          padding: 14,
          borderColor: 'var(--line)',
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
        }}
      >
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <h1 className="brand" style={{ fontSize: 22, letterSpacing: '.02em' }}>Finalizar compra</h1>
          {brand && (
            <span className="badge">{brand.name}</span>
          )}
        </div>
      </div>

      {/* Contenido */}
      {brand && (
        <div
          className="mt"
          style={{
            display: 'grid',
            gap: 16,
            gridTemplateColumns: '1fr 360px',
          }}
        >
          {/* Columna izquierda (Formulario) */}
          <div
            className="card"
            style={{
              padding: 16,
              background: 'rgba(17,18,26,0.92)',
              borderColor: 'var(--line)',
              transition: 'transform .2s ease, box-shadow .2s ease',
            }}
          >
            <strong>Datos de envío</strong>

            <div className="mt">
              <label>Método de envío</label>
              <select
                className="input"
                value={shipping || ''}
                onChange={(e) => setShipping(e.target.value || null)}
              >
                <option value="">Elegí envío</option>
                {brand.ship_domicilio != null && (
                  <option value="domicilio">
                    Domicilio (${brand.ship_domicilio})
                  </option>
                )}
                {brand.ship_sucursal != null && (
                  <option value="sucursal">
                    Sucursal (${brand.ship_sucursal})
                  </option>
                )}
              </select>
              {brand.ship_free_from ? (
                <div className="small" style={{ color: 'var(--muted)', marginTop: 6 }}>
                  Envío gratis desde ${brand.ship_free_from}
                </div>
              ) : null}
            </div>

            <div className="mt">
              <label>Método de pago</label>
              <select
                className="input"
                value={pay}
                onChange={(e) => setPay(e.target.value)}
              >
                <option value="transferencia">Transferencia</option>
                <option value="mp">Mercado Pago</option>
              </select>
              {pay === 'mp' && (
                <div className="small" style={{ color: 'var(--muted)', marginTop: 6 }}>
                  Recargo MP: {brand.mp_fee ?? 10}%
                </div>
              )}
            </div>

            <div className="mt">
              <button
                className="btn"
                onClick={confirmOrder}
                disabled={cart.length === 0 || !shipping}
                style={{
                  width: '100%',
                  transition: 'transform .2s ease, opacity .2s ease',
                }}
              >
                Confirmar
              </button>
              {cart.length === 0 && (
                <div className="small" style={{ color: 'var(--muted)', marginTop: 8 }}>
                  Tu carrito está vacío.
                </div>
              )}
            </div>
          </div>

          {/* Columna derecha (Resumen) */}
          <div
            className="card"
            style={{
              padding: 16,
              background: 'rgba(17,18,26,0.92)',
              borderColor: 'var(--line)',
              position: 'sticky',
              top: 16,
              alignSelf: 'start',
            }}
          >
            <strong>Resumen</strong>

            <div className="mt" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cart.length === 0 ? (
                <div className="small">Carrito vacío.</div>
              ) : (
                cart.map((c) => (
                  <div key={c.id} className="row">
                    <div>{c.name} × {c.qty}</div>
                    <div>${c.price * c.qty}</div>
                  </div>
                ))
              )}
            </div>

            <div className="mt">
              <div className="row">
                <span>Subtotal</span>
                <span>${subtotal}</span>
              </div>
              <div className="row">
                <span>Envío</span>
                <span>${shipCost}</span>
              </div>
              {pay === 'mp' && (
                <div className="row">
                  <span>Recargo MP</span>
                  <span>${mpFee}</span>
                </div>
              )}
              <div className="row" style={{ fontWeight: 900 }}>
                <span>Total</span>
                <span>${total}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
