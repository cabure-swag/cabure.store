// components/RotatingCover.jsx
import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Rotación de imágenes con crossfade (por defecto, cada 10s).
 * Pausa en hover. No bloquea si no hay imágenes (muestra fondo oscuro).
 *
 * Props:
 *  - images: string[] (URLs públicas)
 *  - alt: string
 *  - intervalMs: number (default 10000)
 *  - className, style, objectFit ('cover'|'contain')
 */
export default function RotatingCover({
  images = [],
  alt = '',
  intervalMs = 10000,
  className = '',
  style = {},
  objectFit = 'cover',
}) {
  const list = useMemo(
    () => (Array.isArray(images) ? images.filter(Boolean) : []),
    [images]
  );
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!list.length) return;
    clearInterval(timerRef.current);
    if (!paused) {
      timerRef.current = setInterval(
        () => setIdx((i) => (i + 1) % list.length),
        intervalMs
      );
    }
    return () => clearInterval(timerRef.current);
  }, [list, paused, intervalMs]);

  if (!list.length) {
    return <div className={className} style={{ ...style, background: '#0e0f16' }} />;
  }

  return (
    <div
      className={`rc-wrap ${className}`}
      style={{ ...style, position: 'relative', overflow: 'hidden' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {list.map((src, i) => (
        <img
          key={`${src}-${i}`}
          src={src}
          alt={alt}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit,
            opacity: i === idx ? 1 : 0,
            transition: 'opacity 500ms ease',
            display: 'block',
          }}
          loading={i === 0 ? 'eager' : 'lazy'}
        />
      ))}
    </div>
  );
}
