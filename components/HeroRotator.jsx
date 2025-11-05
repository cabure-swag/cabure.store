// components/HeroRotator.jsx
import { useEffect, useMemo, useState } from 'react';

/**
 * Rotador simple de imágenes (fade cada 10s).
 * - No impone estilos globales; el contenedor padre define tamaños.
 * - Si no hay imágenes, no renderiza nada.
 */
export default function HeroRotator({ images = [], alt = '', height = 260 }) {
  const pics = Array.isArray(images) ? images.filter(Boolean) : [];
  const [idx, setIdx] = useState(0);
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (pics.length < 2) return; // sin rotación si hay 0/1
    const id = setInterval(() => setIdx(i => (i + 1) % pics.length), 10000);
    return () => clearInterval(id);
  }, [pics.length]);

  // pausa al hover
  function onEnter() { setShow(false); }
  function onLeave() { setShow(true); }

  const current = useMemo(() => (pics.length ? pics[idx] : null), [pics, idx]);
  if (!current) return null;

  return (
    <div
      className="hero-rotator"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      aria-label={alt}
      style={{
        position: 'relative',
        width: '100%',
        height,
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid var(--line)',
        background: '#0f1118'
      }}
    >
      {/* Imagen actual */}
      <img
        src={current}
        alt={alt}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          opacity: show ? 1 : 1, // mantenemos visible al pausar
          transition: 'opacity .4s ease'
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 8,
          right: 10,
          display: 'flex',
          gap: 6
        }}
      >
        {pics.map((_, i) => (
          <span
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: i === idx ? 'white' : 'rgba(255,255,255,.4)'
            }}
          />
        ))}
      </div>
    </div>
  );
}
