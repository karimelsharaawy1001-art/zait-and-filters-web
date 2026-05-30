'use client';
import { useCart } from '@/context/CartContext';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, Car, Tag, Loader2, ShieldCheck, Truck, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CartPage() {
  const { cart, addToCart, removeFromCart, getCartTotal, isInitialized, updateCartItemPrice } = useCart();

  useEffect(() => {
    if (!isInitialized || !cart || cart.length === 0) return;
    const syncPrices = async () => {
      try {
        const ids = cart.map((item: any) => item.id);
        const res = await fetch('/api/products/prices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
        if (!res.ok) return;
        const data: { id: string; price: number }[] = await res.json();
        data.forEach((product) => {
          const cartItem = cart.find((i: any) => i.id === product.id);
          if (cartItem && parseFloat(cartItem.price) !== product.price) updateCartItemPrice(product.id, product.price);
        });
      } catch (e) { console.error('خطأ في مزامنة الأسعار:', e); }
    };
    syncPrices();
  }, [isInitialized]);

  const totalQty = cart.reduce((s: number, i: any) => s + (parseInt(i.quantity) || 1), 0);
  const univ = ['universal', 'عام', 'all', 'الكل', ''];

  if (!isInitialized) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '12px' }}>
      <Loader2 size={32} color="#22c55e" style={{ animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!cart || cart.length === 0) return (
    <div style={{ textAlign: 'center', padding: '80px 20px', direction: 'rtl', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      <div style={{ width: '96px', height: '96px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ShoppingBag size={44} color="#cbd5e1" />
      </div>
      <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#0f172a', margin: 0 }}>سلتك فارغة</h2>
      <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>لم تضف أي منتجات بعد — ابدأ التسوق الآن!</p>
      <Link href="/store" style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', padding: '14px 32px', borderRadius: '14px', textDecoration: 'none', fontWeight: '800', fontSize: '0.95rem', marginTop: '8px', boxShadow: '0 8px 24px rgba(34,197,94,0.3)' }}>
        تصفح المتجر
      </Link>
    </div>
  );

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        .cart-wrap { max-width: 1100px; margin: 0 auto; padding: 20px 16px 48px; direction: rtl; }
        .cart-grid { display: grid; grid-template-columns: 1fr 360px; gap: 24px; align-items: start; }
        .cart-summary { position: sticky; top: 90px; }
        .cart-item { display: flex; background: #fff; border-radius: 20px; border: 1px solid #f1f5f9; gap: 16px; padding: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.04); transition: box-shadow 0.2s; }
        .cart-item:hover { box-shadow: 0 6px 24px rgba(0,0,0,0.08); }
        .cart-item-img { width: 100px; height: 100px; border-radius: 16px; overflow: hidden; background: #f8fafc; border: 1px solid #f1f5f9; flex-shrink: 0; }
        .cart-item-img img { width: 100%; height: 100%; object-fit: cover; }
        .item-info { flex: 1; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
        .item-name { font-size: 0.95rem; font-weight: 900; color: #0f172a; margin: 0; word-break: break-word; line-height: 1.4; }
        .item-brand { display: inline-flex; align-items: center; gap: 4px; font-size: 0.72rem; font-weight: 800; color: #22c55e; text-transform: uppercase; letter-spacing: 0.4px; }
        .item-compat { display: inline-flex; align-items: center; gap: 5px; font-size: 0.72rem; font-weight: 700; color: #15803d; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 2px 8px; align-self: flex-start; overflow: hidden; max-width: 100%; }
        .item-compat span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .item-footer { display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 10px; gap: 8px; flex-wrap: wrap; }
        .item-price { font-size: 1.1rem; font-weight: 900; color: #0f172a; }
        .item-unit-price { font-size: 0.72rem; color: #94a3b8; font-weight: 600; }
        .qty-stepper { display: flex; align-items: center; background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
        .qty-btn { width: 36px; height: 36px; border: none; background: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #475569; transition: background 0.15s; }
        .qty-btn:hover { background: #f1f5f9; color: #0f172a; }
        .qty-val { width: 36px; text-align: center; font-weight: 900; font-size: 0.95rem; color: #0f172a; }
        .del-btn { display: flex; align-items: center; gap: 4px; border: none; background: none; cursor: pointer; color: #94a3b8; font-size: 0.75rem; font-weight: 700; padding: 6px 8px; border-radius: 8px; transition: all 0.15s; }
        .del-btn:hover { color: #ef4444; background: #fef2f2; }
        .summary-card { background: #fff; border-radius: 24px; border: 1px solid #f1f5f9; box-shadow: 0 4px 24px rgba(0,0,0,0.05); padding: 24px; }
        .sum-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.88rem; color: #64748b; margin-bottom: 10px; }
        .sum-total-row { display: flex; justify-content: space-between; align-items: center; padding-top: 14px; margin-top: 6px; border-top: 1.5px solid #f1f5f9; }
        .checkout-link { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 16px; background: linear-gradient(135deg,#22c55e,#16a34a); color: #fff; text-decoration: none; border-radius: 16px; font-weight: 900; font-size: 1rem; margin-top: 16px; box-shadow: 0 8px 24px rgba(34,197,94,0.35); transition: all 0.2s; letter-spacing: 0.3px; }
        .checkout-link:hover { box-shadow: 0 12px 32px rgba(34,197,94,0.5); transform: translateY(-1px); }
        .continue-link { display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; padding: 12px; background: #f8fafc; color: #475569; text-decoration: none; border-radius: 14px; font-weight: 700; font-size: 0.88rem; margin-top: 10px; border: 1px solid #e2e8f0; transition: all 0.15s; }
        .continue-link:hover { background: #f1f5f9; color: #0f172a; }
        .trust-row { display: flex; flex-direction: column; gap: 8px; margin-top: 20px; padding-top: 16px; border-top: 1px solid #f1f5f9; }
        .trust-item { display: flex; align-items: center; gap: 8px; font-size: 0.78rem; color: #64748b; font-weight: 700; }
        @media(max-width:768px){
          .cart-grid { grid-template-columns: 1fr; }
          .cart-summary { position: static; }
          .cart-item-img { width: 80px !important; height: 80px !important; }
          .item-name { font-size: 0.88rem; }
          .item-price { font-size: 1rem; }
          .summary-card { border-radius: 16px; padding: 18px; }
        }
        @media(max-width:400px){
          .cart-item { padding: 12px; gap: 10px; }
          .cart-item-img { width: 68px !important; height: 68px !important; }
        }
      `}</style>

      <div className="cart-wrap">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShoppingBag size={22} color="#22c55e" />
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '900', color: '#0f172a' }}>سلة المشتريات</h1>
            <span style={{ background: '#f0fdf4', color: '#15803d', borderRadius: '20px', padding: '3px 12px', fontSize: '0.8rem', fontWeight: '800', border: '1px solid #bbf7d0' }}>{totalQty} {totalQty === 1 ? 'قطعة' : 'قطع'}</span>
          </div>
          <Link href="/store" style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#64748b', textDecoration: 'none', fontSize: '0.85rem', fontWeight: '700' }}>
            <ArrowRight size={16} /> متابعة التسوق
          </Link>
        </div>

        <div className="cart-grid">
          {/* Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <AnimatePresence>
              {cart.map((item: any) => {
                const price = parseFloat(item.price || 0);
                const img = item.image_url || item.image || '';
                const mk = (item.car_make || '').trim();
                const mo = (item.car_model || '').trim();
                const compatText = !mk || univ.includes(mk.toLowerCase()) ? 'جميع السيارات' : `${mk}${univ.includes(mo.toLowerCase()) ? '' : ' ' + mo}`;
                const isUniversal = !mk || univ.includes(mk.toLowerCase());

                return (
                  <motion.div key={item.id} className="cart-item"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40 }}
                    transition={{ duration: 0.25 }}>
                    <div className="cart-item-img">
                      {img ? <img src={img} alt={item.name} /> : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ShoppingBag size={28} color="#cbd5e1" />
                        </div>
                      )}
                    </div>
                    <div className="item-info">
                      <span className="item-brand"><Tag size={10} />{item.brand || 'غير محدد'}</span>
                      <h3 className="item-name">{item.name}</h3>
                      {!isUniversal && (
                        <span className="item-compat">
                          <Car size={10} style={{ flexShrink: 0 }} />
                          <span>{compatText}</span>
                        </span>
                      )}
                      <div className="item-footer">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span className="item-price">{(price * item.quantity).toFixed(2)} ج.م</span>
                          {item.quantity > 1 && <span className="item-unit-price">{price.toFixed(2)} ج.م × {item.quantity}</span>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className="qty-stepper">
                            <button className="qty-btn" onClick={() => addToCart(item, 1)}><Plus size={14} /></button>
                            <span className="qty-val">{item.quantity}</span>
                            <button className="qty-btn" onClick={() => item.quantity > 1 && removeFromCart(item.id, true)}><Minus size={14} /></button>
                          </div>
                          <button className="del-btn" onClick={() => removeFromCart(item.id)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Summary */}
          <aside className="cart-summary">
            <div className="summary-card">
              <h2 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: '900', color: '#0f172a' }}>ملخص الطلب</h2>

              <div className="sum-row">
                <span>المنتجات ({totalQty} قطعة)</span>
                <span style={{ fontWeight: '800', color: '#0f172a' }}>{getCartTotal().toFixed(2)} ج.م</span>
              </div>
              <div className="sum-row">
                <span>الشحن</span>
                <span style={{ fontWeight: '700', color: '#64748b', fontSize: '0.82rem' }}>يُحدد عند الطلب</span>
              </div>

              <div className="sum-total-row">
                <span style={{ fontWeight: '900', color: '#0f172a', fontSize: '0.95rem' }}>الإجمالي</span>
                <span style={{ fontSize: '1.4rem', fontWeight: '900', color: '#0f172a' }}>{getCartTotal().toFixed(2)} <span style={{ fontSize: '0.85rem' }}>ج.م</span></span>
              </div>

              <Link href="/checkout" className="checkout-link">
                إتمام الطلب — {getCartTotal().toFixed(0)} ج.م <ArrowRight size={18} />
              </Link>
              <Link href="/store" className="continue-link">
                <ArrowRight size={14} /> متابعة التسوق
              </Link>

              <div className="trust-row">
                {[
                  { icon: <ShieldCheck size={14} color="#22c55e" />, text: 'دفع آمن ومشفر 100%' },
                  { icon: <Truck size={14} color="#22c55e" />, text: 'شحن لباب البيت في جميع المحافظات' },
                  { icon: <RotateCcw size={14} color="#22c55e" />, text: 'ضمان الاستبدال على جميع المنتجات' },
                ].map((b, i) => (
                  <div key={i} className="trust-item">{b.icon}{b.text}</div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
