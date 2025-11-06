// pages/checkout/[brandSlug].js
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

const toNumber = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

export default function Checkout() {
  const router = useRouter();
  const slug = router.query.brandSlug;

  const [brand, setBrand] = useState(null);
  const [loadingBrand, setLoadingBrand] = useState(true);
  const [cart, setCart] = useState([]);

  const [shipping, setShipping] = useState('');
  const [pay, setPay] = useState('transferencia');

  const [shipName, setShipName] = useState('');

  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [floor, setFloor] = useState('');
  const [apartment, setApartment] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');

  const [branchId, setBranchId] = useState('');
  const [branchName, setBranchName] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchCity, setBranchCity] = useState('');
  const [branchState, setBranchState] = useState('');
  const [branchZip, setBranchZip] = useState('');

  const [shipDni, setShipDni] = useState('');

  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!slug) return;

    try {
      const raw = localStorage.getItem(`cart:${slug}`);
      const arr = raw ? JSON.parse(raw) : [];
      const list = Array.isArray(arr) ? arr : [];
      setCart(list.filter(it => it && typeof it === 'object' && toNumber(it.qty, 0) > 0));
    } catch { setCart([]); }

    setLoadingBrand(true);
    supabase.from('brands')
      .select('name, slug, ship_domicilio, ship_sucursal, ship_free_from, mp_fee')
      .eq('slug', slug)
      .single()
      .then(({ data }) => {
        setBrand(data || null);
        setLoadingBrand(false);
      });
  }, [slug]);

  const subtotal = useMemo(
    () => cart.reduce((a, c) => a + (toNumber(c.price) * toNumber(c.qty, 1)), 0),
    [cart]
  );

  const shipCost = useMemo(() => {
    if (!brand) return 0;
    const base = shipping === 'domicilio'
      ? toNumber(brand.ship_domicilio)
      : shipping === 'sucursal'
      ? toNumber(brand.ship_sucursal)
      : 0;
    const freeFrom = toNumber(brand.ship_free_from);
    if (freeFrom > 0 && subtotal >= freeFrom) return 0;
    return base;
  }, [brand, shipping, subtotal]);

  const mpPct = useMemo(() => {
    if (!brand) return 0;
    const pct = toNumber(brand.mp_fee, 0);
    return pct < 0 ? 0 : pct;
  }, [brand]);

  // aplica sobre (subtotal + envío)
  const mpFee = useMemo(() => {
    if (pay !== 'mp') return 0;
    const base = subtotal + shipCost;
    return Math.round(base * (mpPct / 100));
  }, [pay, subtotal, shipCost, mpPct]);

  const total = subtotal + shipCost + (pay === 'mp' ? mpFee : 0);

  function validate() {
    if (cart.length === 0) return 'Tu carrito está vacío.';
    if (!shipName.trim()) return 'Ingresá tu nombre.';
    if (!shipping) return 'Elegí el tipo de envío.';

    if (shipping === 'domicilio') {
      if (!street.trim()) return 'Ingresá la calle.';
      if (!number.trim()) return 'Ingresá la altura.';
      if (!city.trim()) return 'Ingresá la ciudad.';
      if (!state.trim()) return 'Ingresá la provincia.';
      if (!zip.trim()) return 'Ingresá el código postal.';
    }

    if (shipping === 'sucursal') {
      if (!branchId.trim()) return 'Ingresá el ID de la sucursal.';
      if (!branchName.trim()) return 'Ingresá el nombre de la sucursal.';
      if (!branchCity.trim()) return 'Ingresá la ciudad de la sucursal.';
      if (!branchState.trim()) return 'Ingresá la provincia de la sucursal.';
    }

    if (pay === 'transferencia' && !shipDni.trim()) {
      return 'Para transferencia, el DNI es obligatorio.';
    }
    return null;
  }

  async function confirmOrder() {
    setErr('');
    const why = validate();
    if (why) { setErr(why); return; }

    try {
      setBusy(true);
      const { data: { session} } = await supabase.auth.getSession();
      const u = session?.user;
      if (!u) {
        location.href = `/?next=${encodeURIComponent(router.asPath)}`;
        return;
      }

      const buyerEmail = u.email || null;

      if (pay === 'mp') {
        const mpItems = cart.map(c => ({
          id: String(c.id ?? ''),
          title: String(c.name ?? 'Item'),
          quantity: toNumber(c.qty, 1),
          unit_price: toNumber(c.price)
        }));
        if (shipCost > 0) {
          mpItems.push({ id: 'shipping', title: 'Envío', quantity: 1, unit_price: toNumber(shipCost) });
        }

        const resp = await fetch('/api/mp/create-preference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brand_slug: slug,
            items: mpItems,
            payer: { email: buyerEmail, name: shipName },
            buyer_id: u.id
          })
        });

        // 👇️ si hay texto plano o JSON, lo mostramos igual
        const raw = await resp.text();
        let data = null;
        try { data = raw ? JSON.parse(raw) : null; } catch {}
        if (!resp.ok) {
          const msg = (data && (data.error || data.message)) || raw || 'Error al crear preferencia de MP.';
          throw new Error(msg);
        }
        if (!data || (!data.init_point && !data.sandbox_init_point)) {
          throw new Error('Respuesta inválida de Mercado Pago (sin init_point).');
        }

        try { localStorage.removeItem(`cart:${slug}`); } catch {}
        location.href = data.init_point || data.sandbox_init_point;
        return;
      }

      // Transferencia: mismo flujo de antes
      const payload = {
        user_id: u.id,
        brand_slug: slug,
        shipping,
        pay,
        ship_name: shipName,
        buyer_email: buyerEmail,
        ship_dni: shipDni || null,
        subtotal,
        mp_fee_pct: mpPct,
        total,
        status: 'pending',
      };

      if (shipping === 'domicilio') {
        Object.assign(payload, {
          ship_street: street,
          ship_number: number,
          ship_floor: floor || null,
          ship_apartment: apartment || null,
          ship_city: city,
          ship_state: state,
          ship_zip: zip,
        });
      } else if (shipping === 'sucursal') {
        Object.assign(payload, {
          branch_id: branchId,
          branch_name: branchName || null,
          branch_address: branchAddress || null,
          branch_city: branchCity || null,
          branch_state: branchState || null,
          branch_zip: branchZip || null,
        });
      }

      const { data: order, error } = await supabase.from('orders').insert(payload).select('*').single();
      if (error) throw error;

      const rows = cart.map(c => ({
        order_id: order.id,
        product_id: c.id,
        name: c.name,
        price: toNumber(c.price),
        qty: toNumber(c.qty, 1),
      }));
      const { error: e2 } = await supabase.from('order_items').insert(rows);
      if (e2) throw e2;

      try { localStorage.removeItem(`cart:${slug}`); } catch {}
      router.replace('/compras');
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container" style={{ padding: '24px 16px' }}>
      <div className="card" style={{ padding: 14, borderColor: 'var(--line)', background:'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)' }}>
        <div className="row" style={{ alignItems: 'flex-end', gap: 8, justifyContent: 'space-between' }}>
          <h1 className="brand" style={{ fontSize: 22, letterSpacing: '.02em' }}>Finalizar compra</h1>
          {!loadingBrand && brand && <span className="badge">{brand.name}</span>}
        </div>
      </div>

      {err && (
        <div className="card" style={{ marginTop: 12, padding: 12, borderColor: 'rgba(239,68,68,0.25)', background:'rgba(239,68,68,0.08)', color:'#fecaca', fontSize: 14 }}>
          {err}
        </div>
      )}

      {brand && (
        <div className="mt" style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 360px' }}>
          {/* Formulario */}
          <div className="card" style={{ padding: 16, background: 'rgba(17,18,26,0.92)', borderColor: 'var(--line)' }}>
            <strong>Datos del comprador</strong>
            <div className="mt">
              <label className="small">Nombre y apellido</label>
              <input className="input" placeholder="Tu nombre" value={shipName} onChange={(e)=>setShipName(e.target.value)} autoComplete="name" />
            </div>

            <div className="mt">
              <strong>Envío</strong>
              <div className="row" style={{ gap: 12, marginTop: 8 }}>
                <div style={{ flex: 1 }}>
                  <label className="small">Método de envío</label>
                  <select
                    className="input"
                    value={shipping || ''}
                    onChange={(e) => {
                      const v = e.target.value || '';
                      setShipping(v);
                      if (v !== 'sucursal') {
                        setBranchId(''); setBranchName(''); setBranchAddress('');
                        setBranchCity(''); setBranchState(''); setBranchZip('');
                      }
                    }}
                  >
                    <option value="">Elegí envío</option>
                    {brand.ship_domicilio != null && (
                      <option value="domicilio">
                        Domicilio ({brand.ship_domicilio ? `$${brand.ship_domicilio}` : 'sin cargo'})
                      </option>
                    )}
                    {brand.ship_sucursal != null && (
                      <option value="sucursal">
                        Sucursal ({brand.ship_sucursal ? `$${brand.ship_sucursal}` : 'sin cargo'})
                      </option>
                    )}
                  </select>
                  {brand.ship_free_from ? (
                    <div className="small" style={{ color: 'var(--muted)', marginTop: 6 }}>
                      Envío gratis desde ${brand.ship_free_from}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Domicilio */}
              <div style={{ overflow: 'hidden', maxHeight: shipping === 'domicilio' ? 800 : 0, opacity: shipping === 'domicilio' ? 1 : 0, transition: 'all .25s ease' }}>
                <div className="mt row" style={{ gap: 12 }}>
                  <div style={{ flex: 2 }}>
                    <label className="small">Calle</label>
                    <input className="input" value={street} onChange={e=>setStreet(e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="small">Altura</label>
                    <input className="input" value={number} onChange={e=>setNumber(e.target.value)} />
                  </div>
                </div>
                <div className="mt row" style={{ gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label className="small">Piso (opcional)</label>
                    <input className="input" value={floor} onChange={e=>setFloor(e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="small">Depto (opcional)</label>
                    <input className="input" value={apartment} onChange={e=>setApartment(e.target.value)} />
                  </div>
                </div>
                <div className="mt row" style={{ gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label className="small">Ciudad</label>
                    <input className="input" value={city} onChange={e=>setCity(e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="small">Provincia</label>
                    <input className="input" value={state} onChange={e=>setState(e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="small">CP</label>
                    <input className="input" value={zip} onChange={e=>setZip(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Sucursal */}
              <div style={{ overflow: 'hidden', maxHeight: shipping === 'sucursal' ? 900 : 0, opacity: shipping === 'sucursal' ? 1 : 0, transition: 'all .25s ease' }}>
                <div className="mt"><strong>Datos de la sucursal (completá a mano)</strong></div>
                <div className="mt row" style={{ gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label className="small">ID de sucursal</label>
                    <input className="input" placeholder="Ej: CA-0001" value={branchId} onChange={(e)=>setBranchId(e.target.value)} />
                  </div>
                  <div style={{ flex: 2 }}>
                    <label className="small">Nombre de la sucursal</label>
                    <input className="input" placeholder="Ej: Sucursal Centro" value={branchName} onChange={(e)=>setBranchName(e.target.value)} />
                  </div>
                </div>
                <div className="mt">
                  <label className="small">Dirección (opcional)</label>
                  <input className="input" placeholder="Calle y altura" value={branchAddress} onChange={(e)=>setBranchAddress(e.target.value)} />
                </div>
                <div className="mt row" style={{ gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label className="small">Ciudad</label>
                    <input className="input" value={branchCity} onChange={(e)=>setBranchCity(e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="small">Provincia</label>
                    <input className="input" value={branchState} onChange={(e)=>setBranchState(e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="small">CP (opcional)</label>
                    <input className="input" value={branchZip} onChange={(e)=>setBranchZip(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            {/* Pago */}
            <div className="mt">
              <strong>Pago</strong>
              <div className="row" style={{ gap: 12, marginTop: 8 }}>
                <div style={{ flex: 1 }}>
                  <label className="small">Método de pago</label>
                  <select className="input" value={pay} onChange={(e) => setPay(e.target.value)}>
                    <option value="transferencia">Transferencia</option>
                    <option value="mp">Mercado Pago</option>
                  </select>
                  {pay === 'mp' && (
                    <div className="small" style={{ color: 'var(--muted)', marginTop: 6 }}>
                      Recargo MP: {mpPct}%
                    </div>
                  )}
                </div>
              </div>

              <div style={{ overflow: 'hidden', maxHeight: pay === 'transferencia' ? 160 : 0, opacity: pay === 'transferencia' ? 1 : 0, transition: 'all .25s ease' }}>
                <div className="mt">
                  <label className="small">DNI del ordenante (obligatorio)</label>
                  <input className="input" placeholder="30123456" value={shipDni} onChange={(e)=>setShipDni(e.target.value)} />
                  <div className="small" style={{ color: 'var(--muted)', marginTop: 6 }}>
                    Luego de confirmar, subí el comprobante en el chat del pedido.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt">
              <button className="btn" onClick={confirmOrder} disabled={busy || cart.length === 0 || !shipping} style={{ width: '100%', transition: 'transform .2s ease, opacity .2s ease' }}>
                {busy ? 'Procesando…' : 'Confirmar pedido'}
              </button>
              {cart.length === 0 && <div className="small" style={{ color: 'var(--muted)', marginTop: 8 }}>Tu carrito está vacío.</div>}
            </div>
          </div>

          {/* Resumen */}
          <div className="card" style={{ padding: 16, background: 'rgba(17,18,26,0.92)', borderColor: 'var(--line)', position: 'sticky', top: 16, alignSelf: 'start' }}>
            <strong>Resumen</strong>
            <div className="mt" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cart.length === 0 ? (
                <div className="small">Carrito vacío.</div>
              ) : (
                cart.map((c) => (
                  <div key={c.id} className="row">
                    <div>{c.name} × {toNumber(c.qty, 1)}</div>
                    <div>${toNumber(c.price) * toNumber(c.qty, 1)}</div>
                  </div>
                ))
              )}
            </div>

            <div className="mt">
              <div className="row"><span>Subtotal</span><span>${subtotal}</span></div>
              <div className="row"><span>Envío</span><span>${shipCost}</span></div>
              {pay === 'mp' && <div className="row"><span>Recargo MP</span><span>${mpFee}</span></div>}
              <div className="row" style={{ fontWeight: 900 }}>
                <span>Total</span><span>${total}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
