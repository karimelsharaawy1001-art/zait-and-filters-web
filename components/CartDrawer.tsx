'use client';
import { useCart } from '@/context/CartContext';
import { m, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Trash2, Plus, Minus, ArrowRight, Car } from 'lucide-react';
import { optimizeImageUrl } from '@/lib/images';
import Link from 'next/link';
import { useState } from 'react';

// CartDrawer is triggered via a global event dispatched by the cart icon
// It uses a local open state and listens for 'openCart' custom events
export default function CartDrawer() {
  const { cart, addToCart, removeFromCart, getCartTotal } = useCart();
  const [open, setOpen] = useState(false);

  // Listen for open event from navbar cart icon
  if (typeof window !== 'undefined') {
    // Only attach once
    (window as any).__cartDrawerOpen = () => setOpen(true);
  }

  const totalQty = cart.reduce((s: number, i: any) => s + (parseInt(i.quantity) || 1), 0);
  const univ = ['universal', 'عام', 'all', 'الكل', ''];

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <m.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', zIndex: 2000 }}
          />

          {/* Drawer */}
          <m.div
            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            style={{
              position: 'fixed', top: 0, left: 0, bottom: 0, width: '420px', maxWidth: '100vw',
              background: '#1c1c1c', zIndex: 2001,
              display: 'flex', flexDirection: 'column',
              boxShadow: '4px 0 40px rgba(0,0,0,0.15)',
              direction: 'rtl',
            }}
          >
            {/* Header */}
            <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #242424', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShoppingBag size={20} color="#e50914" />
                <span style={{ fontWeight: '900', fontSize: '1.05rem', color: '#f5f5f5' }}>سلتك</span>
                {totalQty > 0 && (
                  <span style={{ background: '#1a0d0d', color: '#b91c1c', borderRadius: '20px', padding: '2px 10px', fontSize: '0.75rem', fontWeight: '800', border: '1px solid #7f1d1d' }}>
                    {totalQty} قطعة
                  </span>
                )}
              </div>
              <button onClick={() => setOpen(false)} style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: '#242424', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                <X size={16} />
              </button>
            </div>

            {/* Items */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#242424', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShoppingBag size={32} color="#cbd5e1" />
                  </div>
                  <p style={{ fontWeight: '800', color: '#94a3b8', margin: 0, fontSize: '0.95rem' }}>سلتك فارغة</p>
                  <Link href="/store" onClick={() => setOpen(false)}
                    style={{ background: 'linear-gradient(135deg,#e50914,#dc2626)', color: '#fff', padding: '10px 24px', borderRadius: '12px', textDecoration: 'none', fontWeight: '800', fontSize: '0.88rem' }}>
                    تسوق الآن
                  </Link>
                </div>
              ) : (
                <AnimatePresence>
                  {cart.map((item: any) => {
                    const price = parseFloat(item.price || 0);
                    const img = item.image_url || item.image || '';
                    const mk = (item.car_make || '').trim();
                    const mo = (item.car_model || '').trim();
                    const isUniversal = !mk || univ.includes(mk.toLowerCase());
                    const compatText = isUniversal ? '' : `${mk}${univ.includes(mo.toLowerCase()) ? '' : ' ' + mo}`;

                    return (
                      <m.div key={item.id}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40 }}
                        style={{ display: 'flex', gap: '12px', padding: '14px 0', borderBottom: '1px solid #161616' }}>
                        {/* Image */}
                        <div style={{ width: '72px', height: '72px', borderRadius: '14px', overflow: 'hidden', background: '#161616', border: '1px solid #242424', flexShrink: 0 }}>
                          {img ? <img src={optimizeImageUrl(img)} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ShoppingBag size={22} color="#cbd5e1" /></div>
                          )}
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '0.68rem', color: '#e50914', fontWeight: '800', textTransform: 'uppercase' as const, letterSpacing: '0.3px' }}>
                              {item.brand}
                            </span>
                            <button onClick={() => removeFromCart(item.id)}
                              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#cbd5e1', padding: '2px', display: 'flex', flexShrink: 0, transition: 'color 0.15s' }}
                              onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                              onMouseLeave={e => (e.currentTarget.style.color = '#cbd5e1')}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                          <p style={{ margin: '0 0 4px', fontSize: '0.85rem', fontWeight: '800', color: '#f5f5f5', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                            {item.name}
                          </p>
                          {!isUniversal && compatText && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: '#b91c1c', background: '#1a0d0d', border: '1px solid #7f1d1d', borderRadius: '10px', padding: '1px 6px' }}>
                              <Car size={9} />{compatText}
                            </span>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                            <span style={{ fontSize: '0.95rem', fontWeight: '900', color: '#f5f5f5' }}>{(price * item.quantity).toFixed(2)} ج.م</span>
                            {/* Qty stepper */}
                            <div style={{ display: 'flex', alignItems: 'center', background: '#161616', border: '1px solid #2a2a2a', borderRadius: '10px', overflow: 'hidden' }}>
                              <button onClick={() => addToCart(item, 1)} style={{ width: '28px', height: '28px', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}><Plus size={12} /></button>
                              <span style={{ width: '28px', textAlign: 'center', fontWeight: '900', fontSize: '0.85rem' }}>{item.quantity}</span>
                              <button onClick={() => item.quantity > 1 && removeFromCart(item.id, true)} style={{ width: '28px', height: '28px', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}><Minus size={12} /></button>
                            </div>
                          </div>
                        </div>
                      </m.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>

            {/* Footer */}
            {cart.length > 0 && (
              <div style={{ padding: '16px 20px 24px', borderTop: '1px solid #242424', flexShrink: 0, background: '#1c1c1c' }}>
                {/* Total */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <span style={{ fontWeight: '700', color: '#64748b', fontSize: '0.88rem' }}>الإجمالي</span>
                  <span style={{ fontSize: '1.3rem', fontWeight: '900', color: '#f5f5f5' }}>{getCartTotal().toFixed(2)} <small style={{ fontSize: '0.75rem' }}>ج.م</small></span>
                </div>
                {/* CTA */}
                <Link href="/checkout" onClick={() => setOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '15px', background: 'linear-gradient(135deg,#e50914,#dc2626)', color: '#fff', textDecoration: 'none', borderRadius: '14px', fontWeight: '900', fontSize: '0.95rem', boxShadow: '0 6px 20px rgba(34,197,94,0.3)', marginBottom: '10px' }}>
                  إتمام الطلب <ArrowRight size={17} />
                </Link>
                <Link href="/cart" onClick={() => setOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', padding: '11px', background: '#161616', color: '#94a3b8', textDecoration: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '0.82rem', border: '1px solid #2a2a2a' }}>
                  عرض السلة كاملة
                </Link>
                {/* Trust */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '12px', flexWrap: 'wrap' as const }}>
                  {['🔒 دفع آمن', '🚚 شحن سريع', '✅ قطع أصلية'].map((t, i) => (
                    <span key={i} style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: '700' }}>{t}</span>
                  ))}
                </div>
              </div>
            )}
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
}
