// pages/checkout/[brandSlug].js
import { useEffect, useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

/* =========================
   Utilidades / helpers
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
   Micro UI: GlassCard / Field
========================= */

// Card “glass” con fondo sutil y blur (agradable y moderno)
function GlassCard({ children, className='' }) {
  return (
    <section
      className={
        `rounded-2xl border border-white/10 bg-[#0c0f16]/65 backdrop-blur-md
         shadow-[0_10px_40px_rgba(0,0,0,.35)] ${className}`
      }
    >
      {children}
    </section>
  );
}

// Input con floating label oscuro y foco suave
function Field({ id, label, value, onChange, type='text', placeholder=' ', autoComplete, required=false }) {
  const filled = !!value?.toString().trim();
  return (
    <div className="relative">
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className="peer w-full rounded-xl border border-white/12 bg-[#0a0d13] px-3 py-3 text-white
                   placeholder-transparent outline-none transition
                   focus:ring-2 focus:ring-indigo-500/35 focus:border-indigo-400/50"
      />
      <label
        htmlFor={id}
        className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/55 text-sm transition-all
                    peer-focus:top-2 peer-focus:text-xs peer-focus:text-indigo-200
                    ${filled ? 'top-2 text-xs text-white/60' : ''}`}
      >
        {label}
      </label>
    </div>
  );
}

// Botón “pill” para opciones (envío/pago)
function Pill({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3 py-2 text-sm transition border
        ${active
          ? 'border-indigo-400/60 bg-indigo-500/15 text-indigo-100'
          : 'border-white/12 bg-[#0a0d13] text-white/75 hover:border-white/20 hover:text-white'}`}
    >
      {children}
    </button>
  );
}

// Collapse con animación sutil (height + fade)
function Collapse({ show, children }) {
  const [mounted, setMounted] = useState(show);
  useEffect(() => { if (show) setMounted(true); }, [show]);
  const onEnd = () => { if (!show) setMounted(false); };
  return (
    <div
      className={`overflow-hidden transition-all duration-300 ease-out
                  ${show ? 'opacity-100 max-h-[2000px]' : 'opacity-0 max-h-0'}`}
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

  // Marca / costos
  const [brand, setBrand] = useState(null);
  const [loadingBrand, setLoadingBrand] = useState(true);

  // Carrito
  const [cart, setCart] = useState([]);

  // Selecciones
  const [shipping, setShipping] = useState('');   // 'domicilio' | 'sucursal'
  const [pay, setPay] = useState('mp');           // 'mp' | 'transferencia'

  // Datos comunes
  const [shipName, setShipName] = useState('');
  const [shipPhone, setShipPhone] = useState('');

  // DNI (solo si transferencia)
  const [shipDni, setShipDni] = useState('');

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

  useEffect(() => {
    if (!slug) return;
    setLoadingBrand(true);
    supabase.from('brands')
      .select('slug, name, ship_domicilio, ship_sucursal, ship_free_from, mp_fee')
      .eq('slug', slug).single()
      .then(({ data }) => {
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

  // Validación mínima y contextual
  function validate() {
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

    if (pay === 'transferencia' && !shipDni.trim()) {
      return 'Para transferencia, el DNI es obligatorio.';
    }
    return null;
  }

  // Confirmación
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

      try { localStorage.removeItem(`cart:${slug}`); } catch {}
      router.replace('/compras');
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  /* =========================
     UI
  ========================= */
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {/* Encabezado con acento sutil */}
      <div className="mb-6 rounded-2xl border border-white/10 bg-gradient-to-r from-white/3 to-white/0 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white/90">
            Finalizar compra
          </h1>
          {!loadingBrand && brand && (
            <span className="text-xs px-2 py-1 rounded-full border border-white/10 text-white/70">
              {brand.name}
            </span>
          )}
        </div>
      </div>

      {/* Error suave */}
      {err && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      )}

      {/* Dos columnas: Form + Resumen */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_380px]">
        {/* Formulario */}
        <GlassCard className="p-5 md:p-6">
          <h2 className="text-lg font-semibold text-white/90">Datos de envío</h2>

          {/* Nombre / Teléfono */}
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field id="shipName" label="Nombre y apellido" value={shipName} onChange={e=>setShipName(e.target.value)} autoComplete="name" />
            <Field id="shipPhone" label="Teléfono" value={shipPhone} onChange={e=>setShipPhone(e.target.value)} autoComplete="tel" />
          </div>

          {/* Tipo de envío */}
          <div className="mt-6">
            <div className="mb-2 text-xs text-white/70">Tipo de envío</div>
            <div className="flex flex-wrap gap-3">
              <Pill active={shipping==='domicilio'} onClick={()=>setShipping('domicilio')}>
                Domicilio {Number.isFinite(brand?.ship_domicilio) && brand.ship_domicilio>0 ? `(+ ${money(brand.ship_domicilio)})` : ''}
              </Pill>
              <Pill active={shipping==='sucursal'} onClick={()=>setShipping('sucursal')}>
                Sucursal {Number.isFinite(brand?.ship_sucursal) && brand.ship_sucursal>0 ? `(+ ${money(brand.ship_sucursal)})` : ''}
              </Pill>
            </div>
            {!!shipFreeFrom && shipFreeFrom>0 && (
              <p className="mt-2 text-xs text-white/55">Envío gratis desde {money(shipFreeFrom)}.</p>
            )}
          </div>

          {/* Domicilio */}
          <Collapse show={shipping === 'domicilio'}>
            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Field id="street" label="Calle" value={street} onChange={e=>setStreet(e.target.value)} autoComplete="address-line1" />
              </div>
              <Field id="number" label="Altura" value={number} onChange={e=>setNumber(e.target.value)} autoComplete="address-line2" />
              <Field id="floor" label="Piso (opcional)" value={floor} onChange={e=>setFloor(e.target.value)} />
              <Field id="apartment" label="Depto (opcional)" value={apartment} onChange={e=>setApartment(e.target.value)} />
              <Field id="city" label="Ciudad" value={city} onChange={e=>setCity(e.target.value)} autoComplete="address-level2" />
              <Field id="state" label="Provincia" value={state} onChange={e=>setState(e.target.value)} autoComplete="address-level1" />
              <Field id="zip" label="Código postal" value={zip} onChange={e=>setZip(e.target.value)} autoComplete="postal-code" />
            </div>
          </Collapse>

          {/* Sucursal */}
          <Collapse show={shipping === 'sucursal'}>
            <div className="mt-5 grid grid-cols-1 gap-4">
              <Field id="branchId" label="ID de sucursal" value={branchId} onChange={e=>setBranchId(e.target.value)} />
              <p className="text-xs text-white/55">Próximamente: buscador de sucursales con autocompletar.</p>
            </div>
          </Collapse>

          {/* Pago */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-white/90">Pago</h3>
            <div className="mt-3 flex flex-wrap gap-3">
              <Pill active={pay==='mp'} onClick={()=>setPay('mp')}>Mercado Pago</Pill>
              <Pill active={pay==='transferencia'} onClick={()=>setPay('transferencia')}>Transferencia bancaria</Pill>
            </div>
            {pay==='mp' && (
              <p className="mt-2 text-xs text-white/60">Recargo MP: {mpPercent}% sobre el subtotal.</p>
            )}
            <Collapse show={pay === 'transferencia'}>
              <div className="mt-4 grid grid-cols-1 gap-4">
                <Field id="shipDni" label="DNI del ordenante (obligatorio)" value={shipDni} onChange={e=>setShipDni(e.target.value)} autoComplete="off" />
                <p className="text-xs text-white/55">Después de confirmar vas a subir el comprobante en el chat del pedido.</p>
              </div>
            </Collapse>
          </div>

          {/* Acción */}
          <div className="mt-6">
            <button
              disabled={busy || cart.length===0 || !shipping}
              onClick={onConfirm}
              className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition
                ${busy || cart.length===0 || !shipping
                  ? 'cursor-not-allowed border border-white/12 bg-white/[0.04] text-white/40'
                  : 'border border-emerald-400/45 bg-emerald-500/20 text-emerald-100 hover:border-emerald-400/70 hover:bg-emerald-500/30'}`}
            >
              {busy ? 'Procesando…' : 'Confirmar pedido'}
            </button>
          </div>
        </GlassCard>

        {/* Resumen */}
        <GlassCard className="p-5 md:p-6 md:sticky md:top-6 h-fit">
          <h2 className="text-lg font-semibold text-white/90">Resumen</h2>

          <div className="mt-4 space-y-2 text-sm">
            {cart.length === 0 && <div className="text-white/60">Tu carrito está vacío</div>}
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
        </GlassCard>
      </div>
    </main>
  );
}
