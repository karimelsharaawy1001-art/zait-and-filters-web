'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

// Fullscreen image viewer with zoom + pan.
// Desktop: mouse wheel / +/- buttons / double-click to zoom, drag to pan.
// Mobile: two-finger pinch to zoom, one-finger drag to pan, double-tap to toggle.
export default function ImageLightbox({ src, alt, onClose }: { src: string; alt?: string; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastDist = useRef(0);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const lastTap = useRef(0);

  const clamp = (s: number) => Math.min(5, Math.max(1, s));

  const reset = useCallback(() => { setScale(1); setTx(0); setTy(0); }, []);
  const zoomBy = useCallback((d: number) => setScale(s => { const n = clamp(s + d); if (n === 1) { setTx(0); setTy(0); } return n; }), []);

  // Lock body scroll while open; close on Escape.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  // Non-passive wheel listener so we can preventDefault the page scroll.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setScale(s => { const n = clamp(s + (e.deltaY < 0 ? 0.35 : -0.35)); if (n === 1) { setTx(0); setTy(0); } return n; });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  function onPointerDown(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      dragging.current = true;
      last.current = { x: e.clientX, y: e.clientY };
      // Double-tap / double-click to toggle zoom
      const now = Date.now();
      if (now - lastTap.current < 300) { setScale(s => { const n = s > 1 ? 1 : 2.5; if (n === 1) { setTx(0); setTy(0); } return n; }); }
      lastTap.current = now;
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    if (pts.length === 2) {
      dragging.current = false;
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (lastDist.current) setScale(s => clamp(s * (d / lastDist.current)));
      lastDist.current = d;
    } else if (pts.length === 1 && dragging.current && scale > 1) {
      const dx = e.clientX - last.current.x;
      const dy = e.clientY - last.current.y;
      last.current = { x: e.clientX, y: e.clientY };
      setTx(t => t + dx);
      setTy(t => t + dy);
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) lastDist.current = 0;
    if (pointers.current.size === 0) dragging.current = false;
  }

  const btn: React.CSSProperties = {
    width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer',
    background: 'rgba(255,255,255,0.15)', color: '#fff', display: 'flex',
    alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)',
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'none', overscrollBehavior: 'contain' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Controls */}
      <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 10, zIndex: 2 }}>
        <button style={btn} onClick={() => zoomBy(0.5)} aria-label="zoom in"><ZoomIn size={20} /></button>
        <button style={btn} onClick={() => zoomBy(-0.5)} aria-label="zoom out"><ZoomOut size={20} /></button>
        <button style={btn} onClick={reset} aria-label="reset"><RotateCcw size={18} /></button>
      </div>
      <button style={{ ...btn, position: 'absolute', top: 16, right: 16, zIndex: 2 }} onClick={onClose} aria-label="close"><X size={22} /></button>

      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
      >
        <img
          src={src}
          alt={alt || ''}
          draggable={false}
          style={{
            maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', userSelect: 'none',
            transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
            transition: pointers.current.size ? 'none' : 'transform 0.15s ease-out',
            cursor: scale > 1 ? 'grab' : 'zoom-in',
          }}
        />
      </div>

      <div style={{ position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontFamily: "'Cairo', sans-serif" }}>
        قرّب بإصبعين أو بعجلة الماوس · اضغط مرتين للتكبير
      </div>
    </div>
  );
}
