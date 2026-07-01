'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Plus, Minus, RotateCcw } from 'lucide-react';

const MIN = 1;
const MAX = 5;
const clamp = (s: number) => Math.min(MAX, Math.max(MIN, s));

// Fullscreen image viewer with smooth zoom + pan.
// Mobile: two-finger pinch to zoom, drag to pan, double-tap to toggle.
// Desktop: wheel / buttons / double-click to zoom, drag to pan.
export default function ImageLightbox({ src, alt, onClose }: { src: string; alt?: string; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [gesturing, setGesturing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  // Snapshot taken whenever a gesture (re)starts — the baseline everything is measured from.
  const start = useRef({ dist: 0, midX: 0, midY: 0, scale: 1, tx: 0, ty: 0 });
  const lastTap = useRef(0);
  const view = useRef({ scale: 1, tx: 0, ty: 0 });
  view.current = { scale, tx, ty };

  const reset = useCallback(() => { setScale(1); setTx(0); setTy(0); }, []);
  const zoomBy = useCallback((d: number) => setScale(s => {
    const n = clamp(s + d);
    if (n === 1) { setTx(0); setTy(0); }
    return n;
  }), []);

  // (Re)baseline the gesture from the current pointers + current view.
  const syncGesture = useCallback(() => {
    const pts = [...pointers.current.values()];
    if (pts.length === 0) return;
    const midX = pts.reduce((a, p) => a + p.x, 0) / pts.length;
    const midY = pts.reduce((a, p) => a + p.y, 0) / pts.length;
    const dist = pts.length === 2 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0;
    start.current = { dist, midX, midY, scale: view.current.scale, tx: view.current.tx, ty: view.current.ty };
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  // Non-passive wheel so we can preventDefault the page scroll.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setScale(s => {
        const n = clamp(s * (e.deltaY < 0 ? 1.12 : 0.89));
        if (n === 1) { setTx(0); setTy(0); }
        return n;
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  function onPointerDown(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setGesturing(true);
    // Double-tap / double-click to toggle zoom
    if (pointers.current.size === 1) {
      const now = Date.now();
      if (now - lastTap.current < 300) {
        setScale(s => { const n = s > 1 ? 1 : 2.5; if (n === 1) { setTx(0); setTy(0); } return n; });
      }
      lastTap.current = now;
    }
    syncGesture();
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    const midX = pts.reduce((a, p) => a + p.x, 0) / pts.length;
    const midY = pts.reduce((a, p) => a + p.y, 0) / pts.length;

    if (pts.length === 2) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const ratio = start.current.dist ? dist / start.current.dist : 1;
      setScale(clamp(start.current.scale * ratio));
      // Pan with the pinch midpoint so it tracks the fingers naturally.
      setTx(start.current.tx + (midX - start.current.midX));
      setTy(start.current.ty + (midY - start.current.midY));
    } else if (pts.length === 1 && view.current.scale > 1) {
      setTx(start.current.tx + (midX - start.current.midX));
      setTy(start.current.ty + (midY - start.current.midY));
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) {
      setGesturing(false);
      if (view.current.scale <= 1) { setTx(0); setTy(0); }
    } else {
      // A finger was lifted — rebaseline so the remaining finger(s) don't jump.
      syncGesture();
    }
  }

  const glassBtn: React.CSSProperties = {
    width: 42, height: 42, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer',
    background: 'rgba(255,255,255,0.1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', transition: 'background 0.15s',
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(9,14,26,0.94)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'none', overscrollBehavior: 'contain', animation: 'lb-fade 0.2s ease-out' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <style>{`
        @keyframes lb-fade { from { opacity: 0 } to { opacity: 1 } }
        .lb-glass:hover { background: rgba(255,255,255,0.2) !important; }
      `}</style>

      {/* Close */}
      <button className="lb-glass" style={{ ...glassBtn, position: 'absolute', top: 18, right: 18, zIndex: 2 }} onClick={onClose} aria-label="إغلاق"><X size={22} /></button>

      {/* Stage */}
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
            maxWidth: '92%', maxHeight: '88%', objectFit: 'contain', userSelect: 'none',
            transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: gesturing ? 'none' : 'transform 0.18s cubic-bezier(0.22,1,0.36,1)',
            cursor: scale > 1 ? 'grab' : 'zoom-in',
            filter: 'drop-shadow(0 24px 60px rgba(0,0,0,0.5))',
            willChange: 'transform',
          }}
        />
      </div>

      {/* Control pill */}
      <div style={{ position: 'absolute', bottom: 22, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 4, padding: 6, borderRadius: 999, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', zIndex: 2 }}>
        <button className="lb-glass" style={{ ...glassBtn, width: 40, height: 40, background: 'transparent', border: 'none' }} onClick={() => zoomBy(-0.5)} aria-label="تصغير"><Minus size={18} /></button>
        <span style={{ minWidth: 56, textAlign: 'center', color: '#fff', fontSize: '0.82rem', fontWeight: 800, fontFamily: "'Cairo', sans-serif", letterSpacing: '0.5px' }}>{Math.round(scale * 100)}%</span>
        <button className="lb-glass" style={{ ...glassBtn, width: 40, height: 40, background: 'transparent', border: 'none' }} onClick={() => zoomBy(0.5)} aria-label="تكبير"><Plus size={18} /></button>
        <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.18)', margin: '0 2px' }} />
        <button className="lb-glass" style={{ ...glassBtn, width: 40, height: 40, background: 'transparent', border: 'none' }} onClick={reset} aria-label="إعادة"><RotateCcw size={16} /></button>
      </div>
    </div>
  );
}
