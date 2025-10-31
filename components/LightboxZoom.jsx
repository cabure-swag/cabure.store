// components/LightboxZoom.jsx
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * LightboxZoom (modal no full-screen)
 * - Anima desde la miniatura (thumbRect) hasta un modal centrado (máx 780×80vh).
 * - Cerrar: click afuera / botón ✕ / ESC.
 * - Navegar: ← → o botones si hay más de 1 imagen.
 *
 * Props:
 *  - images: [{ url } | string]
 *  - index: number
 *  - thumbRect: DOMRect de la miniatura
 *  - onClose, onPrev, onNext
 */
export default function LightboxZoom({ images=[], index=0, thumbRect, onClose, onPrev, onNext }) {
  const [mounted, setMounted] = useState(false);
  const [frameStyle, setFrameStyle] = useState(null);
  const overlayRef = useRef(null);
  const imgRef = useRef(null);

  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

  // Animación: miniatura -> modal centrado (no full-screen)
  useEffect(() => {
    if (!thumbRect) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const targetW = Math.min(780, vw * 0.92);
    const targetH = Math.min(vh * 0.8, 780); // alto máx 80vh

    const start = {
      left: thumbRect.left,
      top: thumbRect.top,
      width: thumbRect.width,
      height: thumbRect.height,
    };
    const end = {
      left: (vw - targetW) / 2,
      top: (vh - targetH) / 2,
      width: targetW,
      height: targetH,
    };

    // estado inicial sin transición
    setFrameStyle({
      position: 'fixed',
      left: `${start.left}px`,
      top: `${start.top}px`,
      width: `${start.width}px`,
      height: `${start.height}px`,
      borderRadius: '12px',
      transform: 'translate3d(0,0,0)',
      boxShadow: '0 24px 80px rgba(0,0,0,.55)',
      overflow: 'hidden',
      zIndex: 100001,
    });

    // siguiente frame: animar a destino
    requestAnimationFrame(() => {
      setFrameStyle({
        position: 'fixed',
        left: `${end.left}px`,
        top: `${end.top}px`,
        width: `${end.width}px`,
        height: `${end.height}px`,
        borderRadius: '14px',
        transform: 'translate3d(0,0,0)',
        transition: 'left 220ms ease, top 220ms ease, width 220ms ease, height 220ms ease, border-radius 220ms ease',
        boxShadow: '0 24px 80px rgba(0,0,0,.55)',
        overflow: 'hidden',
        zIndex: 100001,
        background: '#0b0d14',
      });
    });
  }, [thumbRect, index]);

  // teclado
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key === 'ArrowLeft') onPrev?.();
      if (e.key === 'ArrowRight') onNext?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext]);

  const onOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose?.();
  };

  if (!mounted) return null;

  const src = images?.[index]?.url || images?.[index];

  return createPortal(
    <>
      {/* overlay clickeable */}
      <div
        ref={overlayRef}
        className="lz-overlay"
        onClick={onOverlayClick}
      />
      {/* frame (modal centrado) */}
      <div className="lz-frame" style={frameStyle}>
        <img ref={imgRef} src={src} alt="" className="lz-img" />
        {/* navegación si hay varias */}
        {images?.length > 1 && (
          <>
            <button className="lz-nav lz-prev" onClick={onPrev} aria-label="Anterior">‹</button>
            <button className="lz-nav lz-next" onClick={onNext} aria-label="Siguiente">›</button>
          </>
        )}
        <button className="lz-close" onClick={onClose} aria-label="Cerrar">✕</button>
      </div>

      <style jsx global>{`
        .lz-overlay{
          position: fixed; inset: 0;
          background: rgba(8,10,16,.6);
          backdrop-filter: blur(2px);
          z-index: 100000;
          animation: lzFadeIn 140ms ease;
        }
        @keyframes lzFadeIn { from { opacity: 0; } to { opacity: 1; } }

        .lz-frame{ display:flex; align-items:center; justify-content:center; }
        .lz-img{
          width:100%; height:100%; object-fit: contain; display:block; background:#0b0d14;
        }

        .lz-nav{
          position:absolute; top:50%; transform:translateY(-50%);
          width:38px; height:38px; border-radius:12px; border:1px solid var(--line);
          background: rgba(15,17,24,.78); color: var(--text); cursor:pointer;
          z-index: 100002; backdrop-filter: blur(4px);
        }
        .lz-prev{ left: 12px; }
        .lz-next{ right: 12px; }

        .lz-close{
          position:absolute; top:10px; right:10px;
          width:36px; height:36px; border-radius:10px; border:1px solid var(--line);
          background: rgba(15,17,24,.82); color: var(--text); cursor: pointer;
          z-index: 100002; backdrop-filter: blur(4px);
        }
      `}</style>
    </>,
    document.body
  );
}
