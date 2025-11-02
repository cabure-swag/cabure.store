// pages/checkout/[brandSlug].js
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

// Utilidades
const money = (n) => {
  try { return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }); }
  catch { return `$${n}`; }
};

function parseCart(slug) {
  try {
    const raw = localStorage.getItem(`cart:${slug}`);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
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

export default function Checkout() {
  const router = useRouter();
  const slug = router.query.brandSlug;

  // Datos de marca para costos
  const [brand, setBrand] = useState(null);
  const [loadingBrand, setLoadingBrand] = useState(true);
  const [err, setErr] = useState('');

  // Carrito
  const [cart, setCart] = useState([]);

  // Selecciones
  const [shipping, setShipping] = useState('');   // 'domicilio' | 'sucursal'
  const [pay, setPay] = useState('mp');          // 'mp' | 'transferencia'

  // Datos comunes
  const [shipName, setShipName] = useState('');
  const [shipPhone, setShipPhone] = useState('');

  // DNI (solo transferencia)
  const [shipDni, setShipDni] = useState('');

  // Domicilio (solo si shipping === 'domicilio')
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [floor, setFloor] = useState('');        // opcional
  const [apartment, setApartment] = useState('');// opcional
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');

  // Sucursal (solo si shipping === 'sucursal')
  const [branchId, setBranchId] = useState(''); // requerido (por ahora texto, futuro: selector)

  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoadingBrand(true);
    supabase.from('brands')
      .select('slug, name, ship_domicilio, ship_sucursal, ship_free_from, mp_fee')
      .eq('slug', slug)
      .single()
      .then(({ data, error }) => {
        if (error) setErr('No se pudo cargar la marca');
        setBrand(data || null);
        setLoadingBrand(false);
      });
    setCart(parseCart(slug));
  }, [slug]);

  const subtotal = useMemo(
    () => cart.reduce((acc, it) => acc + (it.price * it.qty), 0),
    [cart]
  );

  const mpPercent = Number.isFinite(brand?.mp_fee) ? Number(brand.mp_fee) : 10;
  const canDomicilio = Number.isFinite(brand?.ship_domicilio);
  const canSucursal = Number.isFinite(brand?.ship_sucursal);

  const baseShipPrice = shipping === 'domicilio'
    ? (brand?.ship_domicilio || 0)
    : shipping === 'sucursal'
    ? (brand?.ship_sucursal || 0)
    : 0;

  const shipFreeFrom = Number(brand?.ship_free_from || 0);
  const shipCost = (shipFreeFrom > 0 && subtotal >= shipFreeFrom) ? 0 : baseShipPrice;

  const mpFee = pay === 'mp' ? Math.round(subtotal * (mpPercent / 100)) : 0;
  const total = subtotal + shipCost + mpFee;

  // Validación contextual mínima
  function validate() {
    if (cart.length === 0) return 'Tu carrito está vacío';
    if (!shipping) return 'Elegí el tipo de envío';
    if (!shipName?.trim()) return 'Ingresá tu nombre';
    if (!shipPhone?.trim()) return 'Ingresá un teléfono de contacto';

    if (shipping === 'domicilio') {
      if (!street?.trim()) return 'Ingresá la calle';
      if (!number?.trim()) return 'Ingresá la altura';
      if (!city?.trim()) return 'Ingresá la ciudad';
      if (!state?.trim()) return 'Ingresá la provincia';
      if (!zip?.trim()) return 'Ingresá el código postal';
    }
    if (shipping === 'sucursal') {
      if (!branchId?.trim()) return 'Ingresá el ID de la sucursal a retirar';
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
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        location.href = `/?next=${encodeURIComponent(router.asPath)}`;
        return;
      }

      // Build payload con datos mínimos necesarios según selección
      const payload = {
        user_id: user.id,
        brand_slug: slug,
        shipping,
        pay,
        ship_name: shipName,
        ship_phone: shipPhone,
        // DNI solo si transferencia; si no, lo dejamos vacío
        ship_dni: pay === 'transferencia' ? shipDni : null,
        subtotal,
        mp_fee_pct: mpPercent,
        total,
        status: pay === 'mp' ? 'created' : 'pending',
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
          // Estos campos de sucursal quedan opcionales / null hasta integrar buscador de sucursales
          branch_name: null,
          branch_address: null,
          branch_city: null,
          branch_state: null,
          branch_zip: null,
        });
      }

      // Insertar orden
      const { data: order, error: e1 } = await supabase
        .from('orders')
        .insert(payload)
        .select('*')
        .single();
      if (e1) throw e1;

      // MP → crear preferencia
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
        try { localStorage.removeItem(`cart:${slug}`); } catch {}
        location.href = initPoint;
        return;
      }

      // Transferencia → pendiente y a /compras (adjuntos por chat en iteración de “comprobantes”)
      try { localStorage.removeItem(`cart:${slug}`); } catch {}
      router.replace('/compras');
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  // ---------- UI moderna (Tailwind) ----------
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white/90">
        Finalizar compra
      </h1>

      {loadingBrand && (
        <p className="mt-6 text-sm text-white/60">Cargando datos de la marca…</p>
      )}

      {err && (
        <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      )}

      {brand && (
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[1fr_380px]">
          {/* Formulario */}
          <section className="rounded-2xl border border-white/10 bg-[#0f1118] p-5 md:p-6 shadow-[0_10px_30px_rgba(0,0,0,.35)]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white/90">Datos de envío</h2>
              <span className="text-xs px-2 py-1 rounded-full border border-white/10 text-white/60">
                {brand.name}
              </span>
            </div>

            {/* Nombre / Teléfono */}
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/70 mb-1">Nombre y apellido</label>
                <input
                  className="w-full rounded-xl border border-white/10 bg-[#0b0d14] px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  value={shipName}
                  onChange={e=>setShipName(e.target.value)}
                  placeholder="Tu nombre"
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-1">Teléfono</label>
                <input
                  className="w-full rounded-xl border border-white/10 bg-[#0b0d14] px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  value={shipPhone}
                  onChange={e=>setShipPhone(e.target.value)}
                  placeholder="Ej: +54 9 388 ..."
                />
              </div>
            </div>

            {/* Tipo de envío */}
            <div className="mt-5">
              <label className="block text-sm text-white/70 mb-2">Tipo de envío</label>
              <div className="flex flex-wrap gap-3">
                {canDomicilio && (
                  <button
                    type="button"
                    onClick={()=>setShipping('domicilio')}
                    className={`rounded-xl border px-3 py-2 text-sm transition
                      ${shipping==='domicilio'
                        ? 'border-indigo-400/50 bg-indigo-500/10 text-indigo-200'
                        : 'border-white/10 bg-[#0b0d14] text-white/80 hover:border-white/20'}`}
                  >
                    Domicilio {brand.ship_domicilio>0 && <span className="text-white/50">(+ {money(brand.ship_domicilio)})</span>}
                  </button>
                )}
                {canSucursal && (
                  <button
                    type="button"
                    onClick={()=>setShipping('sucursal')}
                    className={`rounded-xl border px-3 py-2 text-sm transition
                      ${shipping==='sucursal'
                        ? 'border-indigo-400/50 bg-indigo-500/10 text-indigo-200'
                        : 'border-white/10 bg-[#0b0d14] text-white/80 hover:border-white/20'}`}
                  >
                    Retiro en sucursal {brand.ship_sucursal>0 && <span className="text-white/50">(+ {money(brand.ship_sucursal)})</span>}
                  </button>
                )}
              </div>
              {!!shipFreeFrom && shipFreeFrom>0 && (
                <p className="mt-2 text-xs text-white/50">Envío gratis desde {money(shipFreeFrom)}.</p>
              )}
            </div>

            {/* Campos condicionales */}
            {shipping === 'domicilio' && (
              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm text-white/70 mb-1">Calle</label>
                    <input
                      className="w-full rounded-xl border border-white/10 bg-[#0b0d14] px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                      value={street}
                      onChange={e=>setStreet(e.target.value)}
                      placeholder="Calle"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-1">Altura</label>
                    <input
                      className="w-full rounded-xl border border-white/10 bg-[#0b0d14] px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                      value={number}
                      onChange={e=>setNumber(e.target.value)}
                      placeholder="Altura"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-white/70 mb-1">Piso (opcional)</label>
                    <input
                      className="w-full rounded-xl border border-white/10 bg-[#0b0d14] px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                      value={floor}
                      onChange={e=>setFloor(e.target.value)}
                      placeholder="Piso"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-1">Depto (opcional)</label>
                    <input
                      className="w-full rounded-xl border border-white/10 bg-[#0b0d14] px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                      value={apartment}
                      onChange={e=>setApartment(e.target.value)}
                      placeholder="Departamento"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-white/70 mb-1">Ciudad</label>
                    <input
                      className="w-full rounded-xl border border-white/10 bg-[#0b0d14] px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                      value={city}
                      onChange={e=>setCity(e.target.value)}
                      placeholder="Ciudad"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-1">Provincia</label>
                    <input
                      className="w-full rounded-xl border border-white/10 bg-[#0b0d14] px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                      value={state}
                      onChange={e=>setState(e.target.value)}
                      placeholder="Provincia"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-1">Código postal</label>
                    <input
                      className="w-full rounded-xl border border-white/10 bg-[#0b0d14] px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                      value={zip}
                      onChange={e=>setZip(e.target.value)}
                      placeholder="CP"
                    />
                  </div>
                </div>
              </div>
            )}

            {shipping === 'sucursal' && (
              <div className="mt-5">
                <label className="block text-sm text-white/70 mb-1">ID de sucursal</label>
                <input
                  className="w-full rounded-xl border border-white/10 bg-[#0b0d14] px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  value={branchId}
                  onChange={e=>setBranchId(e.target.value)}
                  placeholder="Ej: CA-1234"
                />
                <p className="mt-2 text-xs text-white/50">
                  Más adelante sumamos el buscador de sucursales. Por ahora, ingresá el ID exacto.
                </p>
              </div>
            )}

            {/* Pago */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-white/90">Pago</h3>
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={()=>setPay('mp')}
                  className={`rounded-xl border px-3 py-2 text-sm transition
                    ${pay==='mp'
                      ? 'border-indigo-400/50 bg-indigo-500/10 text-indigo-200'
                      : 'border-white/10 bg-[#0b0d14] text-white/80 hover:border-white/20'}`}
                >
                  Mercado Pago
                </button>
                <button
                  type="button"
                  onClick={()=>setPay('transferencia')}
                  className={`rounded-xl border px-3 py-2 text-sm transition
                    ${pay==='transferencia'
                      ? 'border-indigo-400/50 bg-indigo-500/10 text-indigo-200'
                      : 'border-white/10 bg-[#0b0d14] text-white/80 hover:border-white/20'}`}
                >
                  Transferencia bancaria
                </button>
              </div>

              {pay==='mp' && (
                <p className="mt-2 text-xs text-white/60">
                  Recargo MP: {mpPercent}% sobre el subtotal.
                </p>
              )}

              {pay==='transferencia' && (
                <div className="mt-4">
                  <label className="block text-sm text-white/70 mb-1">DNI del ordenante (obligatorio)</label>
                  <input
                    className="w-full rounded-xl border border-white/10 bg-[#0b0d14] px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    value={shipDni}
                    onChange={e=>setShipDni(e.target.value)}
                    placeholder="Ej: 30123456"
                  />
                  <p className="mt-2 text-xs text-white/50">
                    Te pediremos subir el comprobante en el chat del pedido luego de confirmar.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Resumen */}
          <aside className="rounded-2xl border border-white/10 bg-[#0f1118] p-5 md:p-6 shadow-[0_10px_30px_rgba(0,0,0,.35)]">
            <h2 className="text-lg font-semibold text-white/90">Resumen</h2>

            <div className="mt-4 space-y-2">
              {cart.length === 0 && (
                <div className="text-white/60">Tu carrito está vacío</div>
              )}
              {cart.map((it, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-white/80">{it.name} × {it.qty}</span>
                  <span className="text-white/90">{money(it.price * it.qty)}</span>
                </div>
              ))}
            </div>

            {/* Totales */}
            <div className="mt-5 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/60">Subtotal</span>
                <span className="text-white/90">{money(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Envío</span>
                <span className="text-white/90">{money(shipCost)}</span>
              </div>
              {pay==='mp' && (
                <div className="flex justify-between">
                  <span className="text-white/60">Recargo MP</span>
                  <span className="text-white/90">{money(mpFee)}</span>
                </div>
              )}
              <div className="mt-2 h-px bg-white/10" />
              <div className="flex justify-between font-extrabold text-white">
                <span>Total</span>
                <span>{money(total)}</span>
              </div>
            </div>

            <button
              disabled={busy || cart.length===0 || !shipping}
              onClick={onConfirm}
              className={`mt-6 w-full rounded-xl px-4 py-3 text-sm font-semibold transition
                ${busy || cart.length===0 || !shipping
                  ? 'cursor-not-allowed border border-white/10 bg-white/5 text-white/40'
                  : 'border border-indigo-400/40 bg-indigo-500/20 text-indigo-100 hover:border-indigo-400/60 hover:bg-indigo-500/30'}`}
            >
              {busy ? 'Procesando…' : 'Confirmar pedido'}
            </button>
          </aside>
        </div>
      )}
    </main>
  );
}
