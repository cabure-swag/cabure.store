const KEY='caburee_cart_v1';export function read(){if(typeof window==='undefined')return{};try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return{}}}
export function save(c){if(typeof window==='undefined')return;localStorage.setItem(KEY,JSON.stringify(c))}
export function add(b,p,q=1){const c=read();const by=c[b]||{};const line=by[p.id]||{...p,qty:0};line.qty+=q;by[p.id]=line;c[b]=by;save(c)}
export function lines(b){return Object.values(read()[b]||{})}
export function total(b){return lines(b).reduce((s,l)=>s+l.price*l.qty,0)}
export function clear(b){const c=read();delete c[b];save(c)}
