// pages/checkout/[brandSlug].js
import { useEffect, useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

/**
 * Utilidades
 */
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

/**
 * Componente de transición simple (fade + slide + height auto)
 * sin dependencias. Cuando show=true, hace mount con animación;
 * cuando show=false, hace un collapse suave y luego unmount.
 */
function Collapse({ show, children }) {
  const ref = useRef(null);
  const [render, setRender] = useState(show);
  useEffect(() => {
    if (show) setRender(true);
  }, [show]);
  const onEnd = () => { if (!show) setRender(false); };
  return (
    <div
      ref={ref}
      className={`overflow-hidden transition-all duration-300 ease-out
        ${show ? 'opacity-100 translate-y-0 max-h-[2000px]' : 'opacity-0 -translate-y-1 max-h-0'}`}
      onTransitionEnd={onEnd}
    >
      {render ? children : null}
    </div>
  );
}

/**
 * Página Checkout con stepper y animaciones
 */
export default function Checkout() {
  const router = useRouter();
  const slug = router.query.brandSlug;

  // Marca / costos
  const [brand, setBrand] = useState(null);
  const [loadingBrand, setLoadingBrand] = useState(true);
  const [err, setErr] = useState('');

  // Carrito
  const [cart, setCart] = useState([]);

  // Paso actual (1: Envío, 2: Pago, 3: Confirmar)
  const [step, setStep] = useState(1);

  // Selecciones
  const [shipping, setShipping] = useState('');   // 'domicilio' | 'sucursal'
  const [pay, setPay] = useState('mp');          // 'mp' | 'transferencia'

  // Datos comunes mínimos
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
  const [branchId, setBranchId] = useState(''); // requerido (futuro: selector)

  // UI
  const [busy, setBusy] = useState(false);

  // Carga inicial
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

  // Totales
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

  /**
   * Validación por paso
   */
  function validateStep(s) {
    if (s === 1) {
      if (cart.length === 0) return 'Tu carrito está vacío';
      if (!shipName?.trim()) return 'Ingresá tu nombre';
      if (!shipPhone?.trim()) return 'Ingresá un teléfono de contacto';
      if (!shipping) return 'Elegí el tipo de envío';

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
    }

    if (s === 2) {
      if (!pay) return 'Elegí un método de pago';
      if (pay === 'transferencia' && !shipDni?.trim()) {
        return 'Para transferencia, el DNI es obligatorio';
      }
    }

    return null;
  }

  function goNext() {
    const why = validateStep(step);
    if (why) {
      setErr(why);
      return;
    }
    setErr('');
    setStep((s) => Math.min(3, s + 1));
  }

  function goPrev() {
    setErr('');
    setStep((s) => Math.max(1, s - 1));
  }

  /**
   * Confirmar (inserta orden + redirecciones)
   */
  async function onConfirm() {
    // validación final de los 2 pasos
    const w1 = validateStep(1);
    if (w1) { setErr(w1); setStep(1); return; }
    const w2 = validateStep(2);
    if (w2) { setErr(w2); setStep(2); return; }

    try {
      setBusy(true);
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        location.href = `/?next=${encodeURIComponent(router.asPath)}`;
        return;
      }

      const payload = {
        user_id: user.id,
        brand_slug: slug,
        shipping,
        pay,
        ship_name: shipName,
        ship_phone: shipPhone,
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
          branch_name: null,
          branch_address: null,
          branch_city: null,
          branch_state: null,
          branch_zip: null,
        });
      }

      const { data: order, error: e1 } = await supabase
        .from('orders')
        .insert(payload)
        .select('*')
        .single();
      if (e1) throw e1;

      // Si es MP → preferencia + redirect
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

      // Transferencia: pending → /compras
      try { localStorage.removeItem(`cart:${slug}`); } catch {}
      router.replace('/compras');
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  /**
   * UI
   */
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {/* Título + marca */}
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white/90">
          Finalizar compra
        </h1>
        {!loadingBrand && brand && (
          <span className="text-xs px-2 py-1 rounded-full border border-white/10 text-white/60">
            {brand.name}
          </span>
        )}
      </div>

      {/* Stepper */}
      <ol className="mt-6 grid grid-cols-3 gap-3 text-xs md:text-sm">
        {['Envío', 'Pago', 'Confirmar'].map((label, i) => {
          const n = i + 1;
          const active = step === n;
          const done = step > n;
          return (
            <li key={label} className={`rounded-xl border px-3 py-2 text-center transition
              ${active ? 'border-indigo-400/50 bg-indigo-500/10 text-indigo-200' :
               done   ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200' :
                        'border-white/10 bg-[#0b0d14] text-white/70'}`}>
              <span className="font-semibold">{n}.</span> {label}
            </li>
          );
        })}
      </ol>

      {err && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      )}

      {/* Layout principal */}
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[1fr_380px]">
        {/* Columna izquierda: pasos (cards con animación) */}
        <section className="space-y-4">
          {/* Paso 1: Envío */}
          <div className="rounded-2xl border border-white/10 bg-[#0f1118] p-5 md:p-6 shadow-[0_10px_30px_rgba(0,0,0,.35)] transition">
            <header className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white/90">1. Datos de envío</h2>
              <span className="text-[11px] text-white/50">Completá y continuá</span>
            </header>

            <Collapse show={step === 1}>
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
                  {Number.isFinite(brand?.ship_domicilio) && (
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
                  {Number.isFinite(brand?.ship_sucursal) && (
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
              <Collapse show={shipping === 'domicilio'}>
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
              </Collapse>

              <Collapse show={shipping === 'sucursal'}>
                <div className="mt-5">
                  <label className="block text-sm text-white/70 mb-1">ID de sucursal</label>
                  <input
                    className="w-full rounded-xl border border-white/10 bg-[#0b0d14] px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    value={branchId}
                    onChange={e=>setBranchId(e.target.value)}
                    placeholder="Ej: CA-1234"
                  />
                  <p className="mt-2 text-xs text-white/50">
                    En una próxima iteración agregamos el buscador de sucursales.
                  </p>
                </div>
              </Collapse>

              <div className="mt-6 flex items-center justify-between">
                <div className="text-xs text-white/50">
                  Completá los campos requeridos para continuar.
                </div>
                <button
                  type="button"
                  onClick={goNext}
                  className="rounded-xl border border-indigo-400/40 bg-indigo-500/20 text-indigo-100 px-4 py-2 text-sm font-semibold hover:border-indigo-400/60 hover:bg-indigo-500/30 transition"
                >
                  Continuar
                </button>
              </div>
            </Collapse>
          </div>

          {/* Paso 2: Pago */}
          <div className="rounded-2xl border border-white/10 bg-[#0f1118] p-5 md:p-6 shadow-[0_10px_30px_rgba(0,0,0,.35)] transition">
            <header className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white/90">2. Método de pago</h2>
              <div className="flex gap-2">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={goPrev}
                    className="rounded-xl border border-white/10 bg-white/5 text-white/70 px-3 py-1.5 text-xs hover:border-white/20 transition"
                  >
                    Volver
                  </button>
                )}
                {step === 2 && (
                  <button
                    type="button"
                    onClick={goNext}
                    className="rounded-xl border border-indigo-400/40 bg-indigo-500/20 text-indigo-100 px-3 py-1.5 text-xs font-semibold hover:border-indigo-400/60 hover:bg-indigo-500/30 transition"
                  >
                    Continuar
                  </button>
                )}
              </div>
            </header>

            <Collapse show={step === 2}>
              <div className="mt-5">
                <div className="flex flex-wrap gap-3">
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

                <Collapse show={pay === 'mp'}>
                  <p className="mt-3 text-xs text-white/60">
                    Recargo MP: {mpPercent}% sobre el subtotal.
                  </p>
                </Collapse>

                <Collapse show={pay === 'transferencia'}>
                  <div className="mt-4">
                    <label className="block text-sm text-white/70 mb-1">DNI del ordenante (obligatorio)</label>
                    <input
                      className="w-full rounded-xl border border-white/10 bg-[#0b0d14] px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                      value={shipDni}
                      onChange={e=>setShipDni(e.target.value)}
                      placeholder="Ej: 30123456"
                    />
                    <p className="mt-2 text-xs text-white/50">
                      Después de confirmar te pediremos el comprobante en el chat del pedido.
                    </p>
                  </div>
                </Collapse>
              </div>
            </Collapse>
          </div>

          {/* Paso 3: Confirmar */}
          <div className="rounded-2xl border border-white/10 bg-[#0f1118] p-5 md:p-6 shadow-[0_10px_30px_rgba(0,0,0,.35)] transition">
            <header className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white/90">3. Confirmación</h2>
              {step > 1 && (
                <button
                  type="button"
                  onClick={goPrev}
                  className="rounded-xl border border-white/10 bg-white/5 text-white/70 px-3 py-1.5 text-xs hover:border-white/20 transition"
                >
                  Volver
                </button>
              )}
            </header>

            <Collapse show={step === 3}>
              <div className="mt-4 text-sm text-white/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span>Envío:</span>
                  <span className="text-white/90">
                    {shipping === 'domicilio' ? 'A domicilio' : 'Retiro en sucursal'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Pago:</span>
                  <span className="text-white/90">
                    {pay === 'mp' ? 'Mercado Pago' : 'Transferencia'}
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <button
                  disabled={busy || cart.length===0}
                  onClick={onConfirm}
                  className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition
                    ${busy || cart.length===0
                      ? 'cursor-not-allowed border border-white/10 bg-white/5 text-white/40'
                      : 'border border-emerald-400/40 bg-emerald-500/20 text-emerald-100 hover:border-emerald-400/60 hover:bg-emerald-500/30'}`}
                >
                  {busy ? 'Procesando…' : 'Confirmar pedido'}
                </button>
              </div>
            </Collapse>
          </div>
        </section>

        {/* Columna derecha: resumen (siempre visible) */}
        <aside className="rounded-2xl border border-white/10 bg-[#0f1118] p-5 md:p-6 shadow-[0_10px_30px_rgba(0,0,0,.35)]">
          <h2 className="text-lg font-semibold text-white/90">Resumen</h2>

          <div className="mt-4 space-y-2 text-sm">
            {cart.length === 0 && (
              <div className="text-white/60">Tu carrito está vacío</div>
            )}
            {cart.map((it, i) => (
              <div key={i} className="flex items-center justify-between">
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
        </aside>
      </div>
    </main>
  );
}
