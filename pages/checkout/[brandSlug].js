// pages/checkout/[brandSlug].js
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

function parseCart(slug) {
  try {
    const raw = localStorage.getItem(`cart:${slug}`);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    // Normalizar: cada item debería tener {id, name, price, qty}
    return arr
      .filter(x => x && typeof x === 'object')
      .map(x => ({
        id: x.id ?? x.product_id ?? x.sku ?? String(Math.random()),
        name: x.name ?? x.title ?? 'Item',
        price: Number(x.price ?? x.unit_price ?? 0) || 0,
        qty: Number(x.qty ?? x.quantity ?? 1) || 1,
      }))
      .filter(x => x.qty > 0 && x.price >= 0);
  } catch {
    return [];
  }
}

function money(n) {
  try { return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }); }
  catch { return `$${n}`; }
}

export default function Checkout() {
  const router = useRouter();
  const slug = router.query.brandSlug;

  const [brand, setBrand] = useState(null);
  const [cart, setCart] = useState([]);

  // estados de forma
  const [shipping, setShipping] = useState(''); // 'domicilio' | 'sucursal'
  const [pay, setPay] = useState('mp');        // 'mp' | 'transferencia'

  // datos comunes
  const [shipName, setShipName] = useState('');
  const [shipDni, setShipDni] = useState('');
  const [shipPhone, setShipPhone] = useState('');

  // domicilio
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [floor, setFloor] = useState('');
  const [apartment, setApartment] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');

  // sucursal
  const [branchId, setBranchId] = useState('');
  const [branchName, setBranchName] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchCity, setBranchCity] = useState('');
  const [branchState, setBranchState] = useState('');
  const [branchZip, setBranchZip] = useState('');

  // ui
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!slug) return;
    // cargar marca
    supabase.from('brands')
      .select('slug, name, ship_domicilio, ship_sucursal, ship_free_from, mp_fee')
      .eq('slug', slug)
      .single()
      .then(({ data, error }) => {
        if (error) return setErr('No se pudo cargar la marca');
        setBrand(data || null);
      });

    // cargar carrito
    setCart(parseCart(slug));
  }, [slug]);

  const subtotal = useMemo(() => {
    return cart.reduce((acc, it) => acc + (it.price * it.qty), 0);
  }, [cart]);

  const mpPercent = Number.isFinite(brand?.mp_fee) ? Number(brand.mp_fee) : 10;
  const canDomicilio = Number.isFinite(brand?.ship_domicilio);
  const canSucursal = Number.isFinite(brand?.ship_sucursal);
  const shipPrice = shipping === 'domicilio'
    ? (brand?.ship_domicilio || 0)
    : shipping === 'sucursal'
    ? (brand?.ship_sucursal || 0)
    : 0;

  const shipFreeFrom = Number(brand?.ship_free_from || 0);
  const shipCost = (shipFreeFrom > 0 && subtotal >= shipFreeFrom) ? 0 : shipPrice;
  const mpFee = pay === 'mp' ? Math.round(subtotal * (mpPercent / 100)) : 0;
  const total = subtotal + shipCost + mpFee;

  function validate() {
    if (cart.length === 0) return 'Tu carrito está vacío';
    if (!shipping) return 'Elegí el tipo de envío';

    if (!shipName?.trim()) return 'Ingresá tu nombre';
    if (!shipDni?.trim()) return 'Ingresá tu DNI';
    if (!shipPhone?.trim()) return 'Ingresá un teléfono de contacto';

    if (shipping === 'domicilio') {
      if (!street?.trim()) return 'Ingresá la calle';
      if (!number?.trim()) return 'Ingresá la altura';
      if (!city?.trim()) return 'Ingresá la ciudad';
      if (!state?.trim()) return 'Ingresá la provincia';
      if (!zip?.trim()) return 'Ingresá el código postal';
    }
    if (shipping === 'sucursal') {
      if (!branchId?.trim()) return 'Elegí una sucursal (ID)';
      if (!branchName?.trim()) return 'Ingresá el nombre de la sucursal';
      if (!branchAddress?.trim()) return 'Ingresá la dirección de la sucursal';
      if (!branchCity?.trim()) return 'Ingresá la ciudad de la sucursal';
      if (!branchState?.trim()) return 'Ingresá la provincia de la sucursal';
      if (!branchZip?.trim()) return 'Ingresá el CP de la sucursal';
    }

    if (pay === 'transferencia') {
      if (!shipDni?.trim()) return 'Para transferencia, el DNI es obligatorio';
    }

    return null;
  }

  async function onConfirm() {
    setErr('');
    const why = validate();
    if (why) { setErr(why); return; }

    try {
      setBusy(true);
      // usuario actual
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        // si no hay sesión, volver a home con next
        location.href = `/?next=${encodeURIComponent(router.asPath)}`;
        return;
      }

      // payload base
      const payload = {
        user_id: user.id,
        brand_slug: slug,
        shipping,
        pay,
        ship_name: shipName,
        ship_dni: shipDni,
        ship_phone: shipPhone,
        subtotal,
        mp_fee_pct: mpPercent,
        total,
        status: pay === 'mp' ? 'created' : 'pending',
      };

      if (shipping === 'domicilio') {
        Object.assign(payload, {
          ship_street: street,
          ship_number: number,
          ship_floor: floor,
          ship_apartment: apartment,
          ship_city: city,
          ship_state: state,
          ship_zip: zip,
        });
      } else if (shipping === 'sucursal') {
        Object.assign(payload, {
          branch_id: branchId,
          branch_name: branchName,
          branch_address: branchAddress,
          branch_city: branchCity,
          branch_state: branchState,
          branch_zip: branchZip,
        });
      }

      // crear orden
      const { data: order, error: e1 } = await supabase
        .from('orders')
        .insert(payload)
        .select('*')
        .single();

      if (e1) throw e1;

      // TODO: opcional – persistir líneas del carrito en otra tabla si corresponde (no la tocamos en esta iteración)

      // si es MP, crear preferencia y redirigir
      if (pay === 'mp') {
        const r = await fetch('/api/mp/create-preference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_id: order.id,
            brand_slug: slug,
            items: cart.map(it => ({
              title: it.name,
              quantity: it.qty,
              unit_price: it.price,
            })),
            shipping: shipCost,
            fee_pct: mpPercent,
            subtotal,
            total,
          }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || 'No se pudo crear la preferencia de MP');
        const initPoint = j?.init_point || j?.sandbox_init_point;
        if (!initPoint) throw new Error('MP no devolvió init_point');
        // limpiar carrito solo cuando redirijamos
        try { localStorage.removeItem(`cart:${slug}`); } catch {}
        location.href = initPoint;
        return;
      }

      // transferencia: dejamos en pending y llevamos a compras
      try { localStorage.removeItem(`cart:${slug}`); } catch {}
      router.replace('/compras');
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!slug) return null;

  return (
    <main className="container" style={{ maxWidth: 1000, margin: '0 auto', padding: 16 }}>
      <h1 className="h1">Checkout</h1>

      {!brand && <p>Cargando marca…</p>}
      {brand && (
        <div className="grid" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24 }}>
          {/* Columna izquierda: formulario */}
          <div>
            <section className="card" style={{ padding: 16, border: '1px solid var(--line)', borderRadius: 12 }}>
              <h2 className="h2">Datos de envío</h2>

              <div className="mt">
                <label className="lbl">Nombre y apellido</label>
                <input className="inp" value={shipName} onChange={e=>setShipName(e.target.value)} placeholder="Tu nombre" />
              </div>

              <div className="row2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="mt">
                  <label className="lbl">DNI</label>
                  <input className="inp" value={shipDni} onChange={e=>setShipDni(e.target.value)} placeholder="Ej: 30123456" />
                </div>
                <div className="mt">
                  <label className="lbl">Teléfono</label>
                  <input className="inp" value={shipPhone} onChange={e=>setShipPhone(e.target.value)} placeholder="Ej: +54 9 388 ..." />
                </div>
              </div>

              <div className="mt">
                <div className="lbl">Tipo de envío</div>
                <div className="row" style={{ display:'flex', gap:12 }}>
                  {canDomicilio && (
                    <label className="radio">
                      <input type="radio" name="shipping" value="domicilio"
                             checked={shipping==='domicilio'}
                             onChange={()=>setShipping('domicilio')} />
                      <span>Correo Argentino a domicilio {brand?.ship_domicilio>0?`(+ ${brand.ship_domicilio})`:''}</span>
                    </label>
                  )}
                  {canSucursal && (
                    <label className="radio">
                      <input type="radio" name="shipping" value="sucursal"
                             checked={shipping==='sucursal'}
                             onChange={()=>setShipping('sucursal')} />
                      <span>Retiro en sucursal {brand?.ship_sucursal>0?`(+ ${brand.ship_sucursal})`:''}</span>
                    </label>
                  )}
                </div>
                {shipFreeFrom>0 && (
                  <p className="muted">Envío gratis desde {money(shipFreeFrom)}.</p>
                )}
              </div>

              {shipping === 'domicilio' && (
                <div className="mt">
                  <div className="row2" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                    <div>
                      <label className="lbl">Calle</label>
                      <input className="inp" value={street} onChange={e=>setStreet(e.target.value)} placeholder="Calle" />
                    </div>
                    <div>
                      <label className="lbl">Altura</label>
                      <input className="inp" value={number} onChange={e=>setNumber(e.target.value)} placeholder="Altura" />
                    </div>
                  </div>
                  <div className="row2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                    <div>
                      <label className="lbl">Piso</label>
                      <input className="inp" value={floor} onChange={e=>setFloor(e.target.value)} placeholder="Piso (opcional)" />
                    </div>
                    <div>
                      <label className="lbl">Depto</label>
                      <input className="inp" value={apartment} onChange={e=>setApartment(e.target.value)} placeholder="Depto (opcional)" />
                    </div>
                  </div>
                  <div className="row2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                    <div>
                      <label className="lbl">Ciudad</label>
                      <input className="inp" value={city} onChange={e=>setCity(e.target.value)} placeholder="Ciudad" />
                    </div>
                    <div>
                      <label className="lbl">Provincia</label>
                      <input className="inp" value={state} onChange={e=>setState(e.target.value)} placeholder="Provincia" />
                    </div>
                  </div>
                  <div className="mt">
                    <label className="lbl">Código postal</label>
                    <input className="inp" value={zip} onChange={e=>setZip(e.target.value)} placeholder="CP" />
                  </div>
                </div>
              )}

              {shipping === 'sucursal' && (
                <div className="mt">
                  <div className="row2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label className="lbl">ID sucursal</label>
                      <input className="inp" value={branchId} onChange={e=>setBranchId(e.target.value)} placeholder="Ej: CA-1234" />
                    </div>
                    <div>
                      <label className="lbl">Nombre de sucursal</label>
                      <input className="inp" value={branchName} onChange={e=>setBranchName(e.target.value)} placeholder="Sucursal Centro" />
                    </div>
                  </div>
                  <div className="mt">
                    <label className="lbl">Dirección</label>
                    <input className="inp" value={branchAddress} onChange={e=>setBranchAddress(e.target.value)} placeholder="Dirección de la sucursal" />
                  </div>
                  <div className="row2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                    <div>
                      <label className="lbl">Ciudad</label>
                      <input className="inp" value={branchCity} onChange={e=>setBranchCity(e.target.value)} placeholder="Ciudad" />
                    </div>
                    <div>
                      <label className="lbl">Provincia</label>
                      <input className="inp" value={branchState} onChange={e=>setBranchState(e.target.value)} placeholder="Provincia" />
                    </div>
                  </div>
                  <div className="mt">
                    <label className="lbl">Código postal</label>
                    <input className="inp" value={branchZip} onChange={e=>setBranchZip(e.target.value)} placeholder="CP" />
                  </div>
                </div>
              )}
            </section>

            <section className="card" style={{ padding: 16, border: '1px solid var(--line)', borderRadius: 12, marginTop: 16 }}>
              <h2 className="h2">Pago</h2>
              <div className="row" style={{ display:'flex', gap:12 }}>
                <label className="radio">
                  <input type="radio" name="pay" value="mp" checked={pay==='mp'} onChange={()=>setPay('mp')} />
                  <span>Mercado Pago</span>
                </label>
                <label className="radio">
                  <input type="radio" name="pay" value="transferencia" checked={pay==='transferencia'} onChange={()=>setPay('transferencia')} />
                  <span>Transferencia bancaria (DNI obligatorio)</span>
                </label>
              </div>
              {pay==='mp' && <p className="muted">Recargo MP: {mpPercent}% sobre el subtotal.</p>}
            </section>

            {err && <p style={{ color:'#ff8484', marginTop:12 }}>{err}</p>}
          </div>

          {/* Columna derecha: resumen */}
          <div>
            <section className="card" style={{ padding: 16, border: '1px solid var(--line)', borderRadius: 12 }}>
              <h2 className="h2">Resumen</h2>
              <div className="list">
                {cart.length===0 && <div className="row" style={{ color:'var(--muted)' }}>Tu carrito está vacío</div>}
                {cart.map((it, i) => (
                  <div key={i} className="row" style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
                    <div>{it.name} × {it.qty}</div>
                    <div>{money(it.price * it.qty)}</div>
                  </div>
                ))}
              </div>

              <div className="mt">
                <div className="row" style={{ display:'flex', justifyContent:'space-between' }}>
                  <span>Subtotal</span>
                  <span>{money(subtotal)}</span>
                </div>
                <div className="row" style={{ display:'flex', justifyContent:'space-between' }}>
                  <span>Envío</span>
                  <span>{money(shipCost)}</span>
                </div>
                {pay==='mp' && (
                  <div className="row" style={{ display:'flex', justifyContent:'space-between' }}>
                    <span>Recargo MP</span>
                    <span>{money(mpFee)}</span>
                  </div>
                )}
                <div className="row" style={{ display:'flex', justifyContent:'space-between', fontWeight:900 }}>
                  <span>Total</span>
                  <span>{money(total)}</span>
                </div>
              </div>

              <div className="mt">
                <button className="btn" disabled={busy || cart.length===0 || !shipping} onClick={onConfirm}>
                  {busy ? 'Procesando…' : 'Confirmar pedido'}
                </button>
              </div>
            </section>
          </div>
        </div>
      )}
    </main>
  );
}
