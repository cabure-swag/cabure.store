// pages/marcas/[slug].js
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import LightboxZoom from '../../components/LightboxZoom';
import HeroRotator from '../../components/HeroRotator';

function useBrand(slug) {
  const [brand, setBrand] = useState(null);
  useEffect(() => {
    if (!slug) return;
    supabase
      .from('brands')
      .select(
        'slug,name,description,instagram,logo_url,cover_url,avatar_url,cover_photos,ship_domicilio,ship_sucursal,ship_free_from,mp_fee'
      )
      .eq('slug', slug)
      .maybeSingle()
      .then(({ data }) => setBrand(data || null));
  }, [slug]);
  return brand;
}

function useCats(slug) {
  const [cats, setCats] = useState([]);
  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data } = await supabase
        .from('categories')
        .select('id,name')
        .eq('brand_slug', slug)
        .order('name', { ascending: true });
      setCats(data || []);
    })();
  }, [slug]);
  return cats;
}

function useProducts(slug) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: prods } = await supabase
        .from('products')
        .select('id,name,description,price,stock,brand_slug')
        .eq('brand_slug', slug)
        .order('created_at', { ascending: false });
      const ids = (prods || []).map((p) => p.id);
      let images = [];
      if (ids.length) {
        const { data: imgs } = await supabase
          .from('product_images')
          .select('id,product_id,url,position')
          .in('product_id', ids);
        images = imgs || [];
      }
      let pc = [];
      if (ids.length) {
        const { data: rel } = await supabase
          .from('product_categories')
          .select('product_id,category_id')
          .in('product_id', ids);
        pc = rel || [];
      }
      const grouped = (prods || []).map((p) => ({
        ...p,
        stock: Math.max(1, p.stock ?? 1),
        images: images.filter((i) => i.product_id === p.id).sort((a, b) => a.position - b.position).slice(0, 5),
        category_ids: pc.filter((r) => r.product_id === p.id).map((r) => r.category_id),
      }));
      setItems(grouped);
    })();
  }, [slug]);
  return items;
}

export default function BrandPage() {
  const router = useRouter();
  const slug = router.query.slug;
  const brand = useBrand(slug);
  const cats = useCats(slug);
  const products = useProducts(slug);
  const [cart, setCart] = useState([]);

  // hero de esta marca
  const heroImages = useMemo(() => {
    if (!brand) return [];
    if (Array.isArray(brand.cover_photos) && brand.cover_photos.length) {
      return brand.cover_photos.filter(Boolean);
    }
    if (brand.cover_url) return [brand.cover_url];
    return [];
  }, [brand]);

  useEffect(() => {
    if (!slug) return;
    const raw = localStorage.getItem(`cart:${slug}`);
    try {
      const arr = raw ? JSON.parse(raw) : [];
      setCart(Array.isArray(arr) ? arr : []);
    } catch (e) {
      setCart([]);
    }
  }, [slug]);

  function addToCart(p) {
    setCart((cs) => {
      const idx = cs.findIndex((x) => x.id === p.id);
      if (idx >= 0) {
        const it = cs[idx];
        if (it.qty >= p.stock) return cs;
        const c = [...cs];
        c[idx] = { ...it, qty: it.qty + 1 };
        return c;
      }
      return [...cs, { id: p.id, name: p.name, price: p.price, qty: 1, stock: p.stock }];
    });
  }
  function dec(id) {
    setCart((cs) => cs.map((c) => (c.id === id ? { ...c, qty: Math.max(1, c.qty - 1) } : c)));
  }
  function inc(id) {
    setCart((cs) => cs.map((c) => (c.id === id ? { ...c, qty: Math.min(c.stock, c.qty + 1) } : c)));
  }
  function rm(id) {
    setCart((cs) => cs.filter((c) => c.id !== id));
  }
  const subtotal = useMemo(() => cart.reduce((s, c) => s + c.price * c.qty, 0), [cart]);
  function goCheckout() {
    localStorage.setItem(`cart:${slug}`, JSON.stringify(cart));
    router.push(`/checkout/${slug}`);
  }

  return (
    <main className="container" style={{ paddingTop: 16 }}>
      {heroImages.length > 0 ? (
        <div style={{ width: '100%', height: 300, marginBottom: 16, borderRadius: 16, overflow: 'hidden' }}>
          <HeroRotator images={heroImages} alt={brand?.name || 'Marca'} height={300} />
        </div>
      ) : null}

      {!brand ? <div className="card">Cargando marca…</div> : null}

      {brand ? (
        <header style={{ marginBottom: 20 }}>
          <h1 className="h1" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {brand.avatar_url ? (
              <img
                src={brand.avatar_url}
                alt={brand.name}
                style={{ width: 46, height: 46, borderRadius: '999px', objectFit: 'cover' }}
              />
            ) : null}
            {brand.name}
          </h1>
          {brand.description ? <p style={{ maxWidth: 680 }}>{brand.description}</p> : null}
          {brand.instagram ? <p style={{ color: '#888' }}>@{brand.instagram}</p> : null}
        </header>
      ) : null}

      {/* resto de tu UI de productos (sin tocar tu lógica) */}
      {/* ... */}
    </main>
  );
}
