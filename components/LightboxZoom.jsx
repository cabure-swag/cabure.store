// components/LightboxZoom.jsx
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * LightboxZoom
 * - Anima desde la posición/tamaño de la miniatura (thumbRect) hasta el centro (fullscreen-ish).
 * - Navegación: ← →, click en flechas, ESC, click oscuro para cerrar.
 *
 * Props:
 *  - images: [{ url } ...]  // lista de imágenes
 *  - index: number          // índice inicial
 *  - thumbRect: DOMRect     // posición/tamaño de la miniatura clickeada
 *  - onClose(): void
 *  - onPrev(): void
 *  - onNext(): void
 */
export default function LightboxZoom({ images, index, thumbRect, onClose, onPrev, onNext }) {
  const [mounted, setMounted] = useState(false);
  const [animStyle, setAnimStyle] = useState(null);
  const imgRef = useRef(null);
  const overlayRef = useRef(null);

  // Montaje en portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Animación de entrada: desde thumbRect → centro
  useEffect(() => {
    if (!imgRef.current || !thumbRect) return;

    const img = imgRef.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Tamaño destino (max 88vh, manteniendo aspect cover-ish)
    const destW = Math.min(vw * 0.9, 1200);
    const destH = Math.min(vh * 0.88, 900);

    // Partimos de la miniatura (posición absoluta)
    const startX = thumbRect.left;
    const startY = thumbRect.top;
    const startW = thumbRect.width;
    const startH = thumbRect.height;

    // Centro destino
    const endX = (vw - destW) / 2;
    const endY = (vh - destH) / 2;

    // Estado inicial (sin transición)
    setAnimStyle({
      position: 'fixed',
      left: startX + 'px',
      top: startY + 'px',
      width: startW + 'px',
      height: startH + 'px',
      transform: 'translate3d(0,0,0)',
      borderRadius: '12px',
    });

    // Siguiente frame: activar transición a destino
    requestAnimationFrame(() => {
      setAnimStyle({
        position: 'fixed',
        left: endX + 'px',
        top: endY + 'px',
        width: destW + 'px',
        height: destH + 'px',
        transform: 'translate3d(0,0,0)',
        transition: 'left 220ms ease, top 220ms ease, width 220ms ease, height 220ms ease, border-radius 220ms ease',
        borderRadius: '14px',
      });
    });
  }, [index, thumbRect]);

  // Cerrar con ESC y navegar con flechas
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key === 'ArrowLeft') onPrev?.();
      if (e.key === 'ArrowRight') onNext?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext]);

  // Click en overlay para cerrar (no sobre la imagen)
  const onOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose?.();
  };

  // Si aún no está montado el portal, no renderizamos nada
  if (!mounted) return null;

  const src = images?.[index]?.url || images?.[index];

  return createPortal(
    <div ref={overlayRef} className="lz-overlay" onClick={onOverlayClick}>
      <div className="lz-frame" style={animStyle}>
        <img ref={imgRef} className="lz-img" src={src} alt="" />
      </div>

      {/* Botones de navegación */}
      {images?.length > 1 && (
        <>
          <button className="lz-nav lz-prev" onClick={onPrev} aria-label="Anterior">‹</button>
          <button className="lz-nav lz-next" onClick={onNext} aria-label="Siguiente">›</button>
        </>
      )}

      <button className="lz-close" onClick={onClose} aria-label="Cerrar">✕</button>

      <style jsx global>{`
        .lz-overlay{
          position: fixed; inset: 0; background: rgba(8,10,16,.78);
          backdrop-filter: blur(4px);
          z-index: 99999;
          animation: lzFadeIn 180ms ease;
        }
        @keyframes lzFadeIn { from { opacity: 0; } to { opacity: 1; } }

        .lz-frame { box-shadow: 0 24px 80px rgba(0,0,0,.55); overflow: hidden; }
        .lz-img { width:100%; height:100%; object-fit: contain; background:#0b0d14; display:block; }

        .lz-nav{
          position: fixed; top: 50%; transform: translateY(-50%);
          width:42px; height:42px; border-radius:12px; border:1px solid var(--line);
          background: rgba(15,17,24,.75); color: var(--text); cursor: pointer;
          z-index: 100000; backdrop-filter: blur(6px);
        }
        .lz-prev{ left: 24px; }
        .lz-next{ right: 24px; }

        .lz-close{
          position: fixed; top: 18px; right: 18px;
          width:40px; height:40px; border-radius:12px; border:1px solid var(--line);
          background: rgba(15,17,24,.8); color: var(--text); cursor: pointer;
          z-index: 100000; backdrop-filter: blur(6px);
        }
      `}</style>
    </div>,
    document.body
  );
}
