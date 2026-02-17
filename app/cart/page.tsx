'use client';
import { useCart } from '@/context/CartContext';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, Info, Car, Tag, Globe, Loader2, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function CartPage() {
  const { cart, addToCart, removeFromCart, getCartTotal, isInitialized } = useCart();

  if (!isInitialized) {
    return (
      <div style={emptyContainer}>
        <Loader2 size={30} className="animate-spin" color="#27ae60" />
        <h2 style={{ marginTop: '15px', fontSize: '1.1rem' }}>جاري التحميل...</h2>
      </div>
    );
  }

  if (!cart || cart.length === 0) {
    return (
      <div style={emptyContainer}>
        <ShoppingBag size={60} color="#eee" />
        <h2 style={{ marginTop: '15px', fontSize: '1.1rem' }}>سلة المشتريات فارغة</h2>
        <Link href="/store" style={continueBtn}>العودة للمتجر</Link>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .cart-page-container {
          max-width: 1100px;
          margin: 20px auto;
          padding: 0 20px;
          direction: rtl;
          box-sizing: border-box;
        }

        .cart-grid {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 20px;
          align-items: start;
        }

        .cart-item-row {
          display: flex;
          background: #fff;
          padding: 15px;
          border-radius: 20px;
          border: 1px solid #f0f0f0;
          gap: 15px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.02);
          box-sizing: border-box;
          min-width: 0;
        }

        .item-main-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 0;
          overflow: hidden;
        }

        .item-header-row {
          display: flex;
          justify-content: space-between;
          width: 100%;
          gap: 8px;
          flex-wrap: wrap;
        }

        .item-name {
          font-size: 0.95rem;
          font-weight: 800;
          margin: 0;
          color: #1a1a1a;
          word-break: break-word;
        }

        .price-text {
          font-size: 1rem;
          font-weight: 900;
          color: #27ae60;
          white-space: nowrap;
        }

        .cart-summary-card {
          background: #fff;
          border-radius: 25px;
          border: 1px solid #f0f0f0;
          padding: 20px;
          position: sticky;
          top: 20px;
          box-sizing: border-box;
        }

        @media (max-width: 640px) {
          .cart-page-container {
            padding: 0 12px;
            margin: 12px auto;
          }

          .cart-grid {
            grid-template-columns: 1fr;
          }

          .cart-summary-card {
            position: static;
          }

          .cart-item-row {
            padding: 12px;
            gap: 10px;
            border-radius: 14px;
          }

          .item-image-box {
            width: 80px !important;
            height: 80px !important;
            flex-shrink: 0;
          }

          .item-header-row {
            flex-direction: column;
            gap: 2px;
          }

          .price-text {
            font-size: 0.95rem;
          }

          .item-name {
            font-size: 0.88rem;
          }

          .footer-row {
            flex-wrap: wrap;
            gap: 8px;
          }
        }

        @media (max-width: 380px) {
          .cart-page-container {
            padding: 0 8px;
          }

          .item-image-box {
            width: 65px !important;
            height: 65px !important;
          }
        }
      `}</style>

      <div className="cart-page-container">
        <h1 style={title}>سلة المشتريات 🛒</h1>

        <div className="cart-grid">
          <div style={itemsSection}>
            {cart.map((item: any) => {
              const itemPrice = parseFloat(item.price || 0);
              const productImg = item.image_url || item.image || 'https://via.placeholder.com/150?text=No+Image';
              const origin = item.country_origin || item.country_of_origin || 'أصلي';
              const carYear = item.car_model_year || item.year || '';

              return (
                <div key={item.id} className="cart-item-row">
                  <div
                    className="item-image-box"
                    style={itemImageBox}
                  >
                    <img src={productImg} alt={item.name} style={itemImage} />
                  </div>

                  <div className="item-main-info">
                    <div className="item-header-row">
                      <h3 className="item-name">{item.name}</h3>
                      <span className="price-text">{(itemPrice * item.quantity).toLocaleString()} ج.م</span>
                    </div>

                    <div style={specsWrapper}>
                      <div style={specEntry}>
                        <Car size={13} color="#27ae60" />
                        <span>مناسب لـ: <b>{item.car_make || 'عالمي'} {item.car_model} {carYear}</b></span>
                      </div>
                      <div style={specEntry}>
                        <Tag size={13} color="#27ae60" />
                        <span>الماركة: <b>{item.brand || 'أصلي'}</b></span>
                      </div>
                      <div style={specEntry}>
                        <Globe size={13} color="#27ae60" />
                        <span>المنشأ: <b>{origin}</b></span>
                      </div>
                    </div>

                    <div className="footer-row" style={footerRow}>
                      <div style={qtyBox}>
                        <button onClick={() => addToCart(item, 1)} style={qtyBtn}><Plus size={14} /></button>
                        <span style={qtyLabel}>{item.quantity}</span>
                        <button onClick={() => item.quantity > 1 && removeFromCart(item.id, true)} style={qtyBtn}><Minus size={14} /></button>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} style={deleteBtn}>
                        <Trash2 size={14} /> <span>حذف</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <aside className="cart-summary-card">
            <h2 style={summaryTitle}>ملخص الحساب</h2>
            <div style={sumRow}><span>إجمالي المنتجات:</span> <b>{getCartTotal().toLocaleString()} ج.م</b></div>
            <div style={infoAlert}><Info size={14} /> <p>مصاريف الشحن تُحدد بناءً على المحافظة.</p></div>
            <div style={{ borderTop: '1px solid #eee', margin: '15px 0', paddingTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '800' }}>الإجمالي النهائي:</span>
              <span style={{ fontSize: '1.3rem', fontWeight: '1000', color: '#1a1a1a' }}>{getCartTotal().toLocaleString()} ج.م</span>
            </div>
            <Link href="/checkout" style={checkoutBtn}>إتمام الطلب <ArrowRight size={18} /></Link>
          </aside>
        </div>
      </div>
    </>
  );
}

// --- Styles ---
const title: any = { fontSize: '1.4rem', fontWeight: '900', marginBottom: '20px' };
const itemsSection: any = { display: 'flex', flexDirection: 'column', gap: '12px' };
const itemImageBox: any = { width: '100px', height: '100px', borderRadius: '15px', overflow: 'hidden', background: '#f9f9f9', border: '1px solid #eee', flexShrink: 0 };
const itemImage: any = { width: '100%', height: '100%', objectFit: 'cover' };
const specsWrapper: any = { display: 'flex', flexDirection: 'column', gap: '5px' };
const specEntry: any = { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#666' };
const footerRow: any = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '10px' };
const qtyBox: any = { display: 'flex', alignItems: 'center', gap: '10px', background: '#f8f8f8', padding: '5px 12px', borderRadius: '10px' };
const qtyBtn: any = { border: 'none', background: 'none', cursor: 'pointer', color: '#27ae60', display: 'flex' };
const qtyLabel: any = { fontWeight: '900', fontSize: '0.9rem' };
const deleteBtn: any = { display: 'flex', alignItems: 'center', gap: '4px', border: 'none', background: 'none', cursor: 'pointer', color: '#ff4d4d', fontSize: '0.75rem', fontWeight: 'bold' };
const summaryTitle: any = { fontSize: '1.1rem', fontWeight: '800', marginBottom: '15px' };
const sumRow: any = { display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.85rem', color: '#666' };
const infoAlert: any = { display: 'flex', gap: '8px', background: '#f0fdf4', padding: '10px', borderRadius: '10px', margin: '15px 0', fontSize: '0.7rem', color: '#166534' };
const checkoutBtn: any = { width: '100%', background: '#1a1a1a', color: '#fff', textDecoration: 'none', padding: '14px', borderRadius: '12px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: '0.9rem' };
const emptyContainer: any = { textAlign: 'center', padding: '80px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' };
const continueBtn: any = { background: '#27ae60', color: '#fff', padding: '10px 30px', borderRadius: '10px', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem' };
