// components/RotatingCover.jsx
import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * RotatingCover
 * - Recibe `images` (array de URLs) y rota cada `intervalMs` (default 10000ms).
 * - Transición suave crossfade. Pausa al pasar el mouse (hover).
 * - Modo "contain" u "cover" con prop objectFit (default 'cover').
 *
 * Props:
 *  - images: string[]
 *  - alt: string
 *  - className: string
 *  - style: object
 *  - intervalMs: number (default 10000)
 *  - objectFit: 'cover' | 'contain'
 *  - borderRadius: string (ej: '12px')
 */
export default function RotatingCover({
  images = [],
  alt = '',
  className = '',
  style = {},
  intervalMs = 10000,
  objectFit = 'cover',
  borderRadius = undefined,
}) {
  const list = useMemo(() => (Array.isArray(images) && images.length ? images : []), [images]);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!list.length) return;
    timerRef.current && clearInterval(timerRef.current);
    if (!paused) {
      timerRef.current = setInterval(() => {
        setIdx(i => (i + 1) % list.length);
      }, intervalMs);
    }
    return () => timerRef.current && clearInterval(timerRef.current);
  }, [list, paused, intervalMs]);

  if (!list.length) {
    return (
      <div className={className} style={{ ...style, background: '#0e0f16', borderRadius }}>
        {/* sin imágenes, el contenedor queda oscuro */}
      </div>
    );
  }

  return (
    <div
      className={`rc-wrap ${className}`}
      style={{ ...style, position: 'relative', overflow: 'hidden', borderRadius }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {list.map((src, i) => (
        <img
          key={`${src}-${i}`}
          src={src}
          alt={alt}
          className={`rc-img ${i === idx ? 'on' : ''}`}
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
      <style jsx>{`
        .rc-wrap { background: #0e0f16; }
        .rc-img { backface-visibility: hidden; }
      `}</style>
    </div>
  );
}
