// utils/cart.js
// Carrito basado en localStorage (key estable) con API mínima.
//
// API:
// - read(): devuelve objeto { [brandSlug]: [ { id, name, price, qty, image_url? } ] }
// - save(state)
// - add(brandSlug, item) // item: { id, name, price, image_url? }, qty+=1
// - remove(brandSlug, productId) // decrementa; si llega a 0, elimina
// - clear(brandSlug) // elimina carrito de la marca
//
// Nota: totalmente client-side; en SSR retorna estado vacío.

const KEY = 'caburee_cart_v5';

function isBrowser(){ return typeof window !== 'undefined'; }

export function read(){
  if(!isBrowser()) return {};
  try{
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  }catch(_e){
    return {};
  }
}

export function save(state){
  if(!isBrowser()) return;
  try{
    window.localStorage.setItem(KEY, JSON.stringify(state || {}));
  }catch(_e){}
}

export function add(brandSlug, item){
  const s = read();
  const list = Array.isArray(s[brandSlug]) ? s[brandSlug] : [];
  const idx = list.findIndex(x => x.id === item.id);
  if (idx >= 0){
    list[idx].qty = Math.min(999, (list[idx].qty||0) + 1);
  }else{
    list.push({ id: item.id, name: item.name, price: item.price, image_url: item.image_url || null, qty: 1 });
  }
  s[brandSlug] = list;
  save(s);
  return s;
}

export function remove(brandSlug, productId){
  const s = read();
  const list = Array.isArray(s[brandSlug]) ? s[brandSlug] : [];
  const idx = list.findIndex(x => x.id === productId);
  if (idx >= 0){
    const nextQty = Math.max(0, (list[idx].qty||0) - 1);
    if (nextQty <= 0){ list.splice(idx, 1); }
    else { list[idx].qty = nextQty; }
  }
  s[brandSlug] = list;
  save(s);
  return s;
}

export function clear(brandSlug){
  const s = read();
  delete s[brandSlug];
  save(s);
  return s;
}
