// pages/checkout/[brandSlug].js
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

/* =========================
   Utilidades
========================= */
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
  } catch { return []; }
}

/* =========================
   Microcomponentes UI
========================= */

// Pill del stepper
function StepPill({ label, state }) {
  // state: 'active' | 'done' | 'idle'
  const styles = state === 'active'
    ? 'border-indigo-400/60 bg-indigo-500/15 text-indigo-100 shadow-[0_0_0_1px_rgba(99,102,241,0.25)_inset]'
    : state === 'done'
    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
    : 'border-white/10 bg-[#0b0d14] text-white/65';
  return (
    <span className={`rounded-full border px-3 py-1.5 text-xs md:text-sm transition ${styles}`}>
      {label}
    </span>
  );
}

// Floating label input
function FLInput({ id, label, value, onChange, type='text', placeholder='', required=false, autoComplete, ...rest }) {
  const filled = !!value?.toString().trim();
  return (
    <div className="relative group">
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder || ' '}
        required={required}
        autoComplete={autoComplete}
        className="peer w-full rounded-xl border border-white/10 bg-[#0b0d14] px-3 py-3 text-white placeholder-transparent
                   outline-none transition focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400/50"
        {...rest}
      />
      <label
        htmlFor={id}
        className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/50 text-sm transition-all
                   peer-focus:top-2 peer-focus:text-xs peer-focus:text-indigo-200
                   ${filled ? 'top-2 text-xs text-white/60' : ''}`}
      >
        {label}
      </label>
    </div>
  );
}

// Collapse con animación (height + fade + slide)
function Collapse({ show, children }) {
  const [mounted, setMounted] = useState(show);
  useEffect(() => { if (show) setMounted(true); }, [show]);
  const onEnd = () => { if (!show) setMounted(false); };
  return (
    <div
      className={`overflow-hidden transition-all duration-300 ease-out motion-reduce:transition-none
                  ${show ? 'opacity-100 translate-y-0 max-h-[2000px]' : 'opacity-0 -translate-y-1 max-h-0'}`}
      onTransitionEnd={onEnd}
      aria-hidden={!show}
    >
      {mounted ? children : null}
    </div>
  );
}

/* =========================
   Página Checkout
========================= */

export default function Checkout() {
  const router = useRouter();
  const slug = router.query.brandSlug;

  // Estado de negocio
  const [brand, setBrand] = useState(null);
  const [loadingBrand, setLoadingBrand] = useState(true);
  const [cart, setCart] = useState([]);

  // Pasos: 1 Envío → 2 Pago → 3 Confirmación
  const [step, setStep] = useState(1);

  // Selecciones
  const [shipping, setShipping] = useState('');       // 'domicilio' | 'sucursal'
  const [pay, setPay] = useState('mp');               // 'mp' | 'transferencia'

  // Datos mínimos
  const [shipName, setShipName] = useState('');
  const [shipPhone, setShipPhone] = useState('');
  const [shipDni, setShipDni] = useState('');         // solo si transferencia

  // Domicilio
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [floor, setFloor] = useState('');
  const [apartment, setApartment] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');

  // Sucursal
  const [branchId, setBranchId] = useState('');

  // UI
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // Carga inicial
  useEffect(() => {
    if (!slug) return;
    setLoadingBrand(true);
    supabase.from('brands')
      .select('slug, name, ship_domicilio, ship_sucursal, ship_free_from, mp_fee')
      .eq('slug', slug).single()
      .then(({ data, error }) => {
        if (error) setErr('No se pudo cargar la marca.');
        setBrand(data || null);
        setLoadingBrand(false);
      });
    setCart(parseCart(slug));
  }, [slug]);

  // Totales
  const subtotal = useMemo(() => cart.reduce((a, it) => a + it.price * it.qty, 0), [cart]);
  const mpPercent = Number.isFinite(brand?.mp_fee) ? Number(brand.mp_fee) : 10;
  const baseShipPrice = shipping === 'domicilio'
    ? (brand?.ship_domicilio || 0)
    : shipping === 'sucursal'
    ? (brand?.ship_sucursal || 0)
    : 0;
  const shipFreeFrom = Number(brand?.ship_free_from || 0);
  const shipCost = (shipFreeFrom > 0 && subtotal >= shipFreeFrom) ? 0 : baseShipPrice;
  const mpFee = pay === 'mp' ? Math.round(subtotal * (mpPercent / 100)) : 0;
  const total = subtotal + shipCost + mpFee;

  /* ===== Validación por paso ===== */
  function validateStep(s) {
    if (s === 1) {
      if (cart.length === 0) return 'Tu carrito está vacío.';
      if (!shipName.trim()) return 'Ingresá tu nombre.';
      if (!shipPhone.trim()) return 'Ingresá un teléfono de contacto.';
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
      }
    }
    if (s === 2) {
      if (!pay) return 'Elegí un método de pago.';
      if (pay === 'transferencia' && !shipDni.trim()) return 'Para transferencia, el DNI es obligatorio.';
    }
    return null;
  }

  function nextStep() {
    const why = validateStep(step);
    if (why) { setErr(why); return; }
    setErr('');
    setStep(s => Math.min(3, s + 1));
  }

  function prevStep() {
    setErr('');
    setStep(s => Math.max(1, s - 1));
  }

  /* ===== Confirmar (DB + MP/transferencia) ===== */
  async function onConfirm() {
    const w1 = validateStep(1); if (w1) { setErr(w1); setStep(1); return; }
    const w2 = validateStep(2); if (w2) { setErr(w2); setStep(2); return; }

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

      const { data: order, error: e1 } = await supabase.from('orders').insert(payload).select('*').single();
      if (e1) throw e1;

      if (pay === 'mp') {
        const r = await fetch('/api/mp/create-preference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_id: order.id,
            brand_slug: slug,
            items: cart.map(it => ({ title: it.name, quantity: it.qty, unit_price: it.price })),
            shipping: shipCost,
            fee_pct: mpPercent,
            subtotal,
            total,
          }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || 'No se pudo crear la preferencia de MP.');
        const initPoint = j?.init_point || j?.sandbox_init_point;
        if (!initPoint) throw new Error('MP no devolvió init_point.');
        try { localStorage.removeItem(`cart:${slug}`); } catch {}
        location.href = initPoint;
        return;
      }

      try { localStorage.removeItem(`cart:${slug}`); } catch {}
      router.replace('/compras');
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  /* ===== UI ===== */
  const progress = step === 1 ? 33 : step === 2 ? 66 : 100;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <header className="flex items-end justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white/90">Finalizar compra</h1>
        {!loadingBrand && brand && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/55">Marca</span>
            <span className="rounded-full border border-white/10 px-2 py-1 text-xs text-white/70">{brand.name}</span>
          </div>
        )}
      </header>

      {/* Barra de progreso */}
      <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full origin-left rounded-full bg-gradient-to-r from-indigo-400/70 to-indigo-300/80 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
          aria-hidden="true"
        />
      </div>

      {/* Stepper (compacto, sin números visibles) */}
      <div className="mt-4 flex flex-wrap gap-2">
        <StepPill label="Envío" state={step === 1 ? 'active' : step > 1 ? 'done' : 'idle'} />
        <StepPill label="Pago" state={step === 2 ? 'active' : step > 2 ? 'done' : 'idle'} />
        <StepPill label="Confirmación" state={step === 3 ? 'active' : 'idle'} />
      </div>

      {/* Errores */}
      {err && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      )}

      {/* Layout */}
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[1fr_380px]">
        {/* Columna izquierda: pasos */}
        <section className="space-y-4">
          {/* Paso 1: Envío */}
          <div className="rounded-2xl border border-white/10 bg-[#0f1118] p-5 md:p-6 shadow-[0_10px_30px_rgba(0,0,0,.35)]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white/90">Datos de envío</h2>
              {step > 1 && (
                <button onClick={() => setStep(1)} className="text-xs text-white/60 hover:text-white/90 transition">
                  Editar
                </button>
              )}
            </div>

            <Collapse show={step === 1}>
              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <FLInput id="shipName" label="Nombre y apellido" value={shipName} onChange={e=>setShipName(e.target.value)} autoComplete="name" />
                <FLInput id="shipPhone" label="Teléfono" value={shipPhone} onChange={e=>setShipPhone(e.target.value)} autoComplete="tel" />
              </div>

              {/* Tipo de envío (segmented) */}
              <div className="mt-5">
                <div className="text-sm text-white/70 mb-2">Tipo de envío</div>
                <div className="inline-flex rounded-xl border border-white/10 p-1 bg-[#0b0d14]">
                  <button
                    type="button"
                    onClick={()=>setShipping('domicilio')}
                    className={`px-3 py-2 text-sm rounded-lg transition
                      ${shipping==='domicilio' ? 'bg-indigo-500/15 text-indigo-200' : 'text-white/70 hover:text-white'}`}
                    aria-pressed={shipping==='domicilio'}
                  >
                    Domicilio {Number.isFinite(brand?.ship_domicilio) && brand.ship_domicilio>0 ? `(+ ${money(brand.ship_domicilio)})` : ''}
                  </button>
                  <button
                    type="button"
                    onClick={()=>setShipping('sucursal')}
                    className={`px-3 py-2 text-sm rounded-lg transition
                      ${shipping==='sucursal' ? 'bg-indigo-500/15 text-indigo-200' : 'text-white/70 hover:text-white'}`}
                    aria-pressed={shipping==='sucursal'}
                  >
                    Sucursal {Number.isFinite(brand?.ship_sucursal) && brand.ship_sucursal>0 ? `(+ ${money(brand.ship_sucursal)})` : ''}
                  </button>
                </div>
                {!!shipFreeFrom && shipFreeFrom>0 && (
                  <p className="mt-2 text-xs text-white/50">Envío gratis desde {money(shipFreeFrom)}.</p>
                )}
              </div>

              {/* Campos condicionales */}
              <Collapse show={shipping === 'domicilio'}>
                <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <FLInput id="street" label="Calle" value={street} onChange={e=>setStreet(e.target.value)} autoComplete="address-line1" />
                  </div>
                  <div>
                    <FLInput id="number" label="Altura" value={number} onChange={e=>setNumber(e.target.value)} autoComplete="address-line2" />
                  </div>
                  <FLInput id="floor" label="Piso (opcional)" value={floor} onChange={e=>setFloor(e.target.value)} />
                  <FLInput id="apartment" label="Depto (opcional)" value={apartment} onChange={e=>setApartment(e.target.value)} />
                  <FLInput id="city" label="Ciudad" value={city} onChange={e=>setCity(e.target.value)} autoComplete="address-level2" />
                  <FLInput id="state" label="Provincia" value={state} onChange={e=>setState(e.target.value)} autoComplete="address-level1" />
                  <FLInput id="zip" label="Código postal" value={zip} onChange={e=>setZip(e.target.value)} autoComplete="postal-code" />
                </div>
              </Collapse>

              <Collapse show={shipping === 'sucursal'}>
                <div className="mt-5 grid grid-cols-1 gap-4">
                  <FLInput id="branchId" label="ID de sucursal" value={branchId} onChange={e=>setBranchId(e.target.value)} />
                  <p className="text-xs text-white/50">Próximamente: buscador de sucursales.</p>
                </div>
              </Collapse>

              <div className="mt-6 flex items-center justify-end">
                <button
                  onClick={nextStep}
                  className="rounded-xl border border-indigo-400/40 bg-indigo-500/20 px-4 py-2 text-sm font-semibold text-indigo-100 hover:border-indigo-400/60 hover:bg-indigo-500/30 transition"
                >
                  Continuar
                </button>
              </div>
            </Collapse>
          </div>

          {/* Paso 2: Pago */}
          <div className="rounded-2xl border border-white/10 bg-[#0f1118] p-5 md:p-6 shadow-[0_10px_30px_rgba(0,0,0,.35)]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white/90">Pago</h2>
              {step > 2 && (
                <button onClick={() => setStep(2)} className="text-xs text-white/60 hover:text-white/90 transition">
                  Editar
                </button>
              )}
            </div>

            <Collapse show={step === 2}>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={()=>setPay('mp')}
                  className={`rounded-xl border px-3 py-2 text-sm transition
                    ${pay==='mp'
                      ? 'border-indigo-400/60 bg-indigo-500/15 text-indigo-200'
                      : 'border-white/10 bg-[#0b0d14] text-white/75 hover:border-white/20 hover:text-white'}`}
                  aria-pressed={pay==='mp'}
                >
                  Mercado Pago
                </button>
                <button
                  type="button"
                  onClick={()=>setPay('transferencia')}
                  className={`rounded-xl border px-3 py-2 text-sm transition
                    ${pay==='transferencia'
                      ? 'border-indigo-400/60 bg-indigo-500/15 text-indigo-200'
                      : 'border-white/10 bg-[#0b0d14] text-white/75 hover:border-white/20 hover:text-white'}`}
                  aria-pressed={pay==='transferencia'}
                >
                  Transferencia bancaria
                </button>
              </div>

              <Collapse show={pay === 'mp'}>
                <p className="mt-3 text-xs text-white/60">Recargo MP: {mpPercent}% sobre el subtotal.</p>
              </Collapse>

              <Collapse show={pay === 'transferencia'}>
                <div className="mt-4 grid grid-cols-1 gap-4">
                  <FLInput
                    id="shipDni"
                    label="DNI del ordenante"
                    value={shipDni}
                    onChange={e=>setShipDni(e.target.value)}
                    autoComplete="off"
                  />
                  <p className="text-xs text-white/50">Luego del pedido, subí el comprobante en el chat del pedido.</p>
                </div>
              </Collapse>

              <div className="mt-6 flex items-center justify-between">
                <button
                  onClick={prevStep}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:border-white/20 hover:text-white transition"
                >
                  Volver
                </button>
                <button
                  onClick={nextStep}
                  className="rounded-xl border border-indigo-400/40 bg-indigo-500/20 px-4 py-2 text-sm font-semibold text-indigo-100 hover:border-indigo-400/60 hover:bg-indigo-500/30 transition"
                >
                  Continuar
                </button>
              </div>
            </Collapse>
          </div>

          {/* Paso 3: Confirmación */}
          <div className="rounded-2xl border border-white/10 bg-[#0f1118] p-5 md:p-6 shadow-[0_10px_30px_rgba(0,0,0,.35)]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white/90">Confirmación</h2>
              {step > 1 && (
                <button onClick={prevStep} className="text-xs text-white/60 hover:text-white/90 transition">
                  Volver
                </button>
              )}
            </div>

            <Collapse show={step === 3}>
              <div className="mt-4 text-sm text-white/75 space-y-1">
                <div className="flex items-center justify-between"><span>Envío</span><span className="text-white/90">{shipping === 'domicilio' ? 'A domicilio' : 'Retiro en sucursal'}</span></div>
                <div className="flex items-center justify-between"><span>Pago</span><span className="text-white/90">{pay === 'mp' ? 'Mercado Pago' : 'Transferencia'}</span></div>
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

        {/* Columna derecha: Resumen (sticky) */}
        <aside className="rounded-2xl border border-white/10 bg-[#0f1118] p-5 md:p-6 shadow-[0_10px_30px_rgba(0,0,0,.35)] md:sticky md:top-6 h-fit">
          <h2 className="text-lg font-semibold text-white/90">Resumen</h2>

          <div className="mt-4 space-y-2 text-sm">
            {cart.length === 0 && (<div className="text-white/60">Tu carrito está vacío</div>)}
            {cart.map((it, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-white/80">{it.name} × {it.qty}</span>
                <span className="text-white/90">{money(it.price * it.qty)}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-white/60">Subtotal</span><span className="text-white/90">{money(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-white/60">Envío</span><span className="text-white/90">{money(shipCost)}</span></div>
            {pay==='mp' && (
              <div className="flex justify-between"><span className="text-white/60">Recargo MP</span><span className="text-white/90">{money(mpFee)}</span></div>
            )}
            <div className="mt-2 h-px bg-white/10" />
            <div className="flex justify-between font-extrabold text-white">
              <span>Total</span><span>{money(total)}</span>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
