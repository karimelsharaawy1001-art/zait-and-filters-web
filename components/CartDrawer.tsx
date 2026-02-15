'use client';
import { useCart } from '@/context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Trash2, Plus, Minus, ArrowLeft } from 'lucide-react';

export default function CartDrawer() {
  const { cartItems, isCartOpen, setIsCartOpen, removeFromCart, updateQuantity, cartTotal } = useCart();

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Background Overlay */}
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setIsCartOpen(false)}
            style={overlayStyle}
          />
          {/* Drawer Content */}
          <motion.div 
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={drawerStyle}
          >
            <div style={drawerHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShoppingBag color="#27ae60" />
                <h2 style={{ margin: 0, fontSize: '1.2rem' }}>سلة المشتريات ({cartItems.length})</h2>
              </div>
              <button onClick={() => setIsCartOpen(false)} style={closeBtn}><X /></button>
            </div>

            <div style={cartItemsList}>
              {cartItems.length === 0 ? (
                <div style={emptyState}>السلة فارغة حالياً.. ابدأ بالتسوق الآن!</div>
              ) : (
                // تم تعديل السطر التالي لإضافة (item: any) لحل مشكلة TypeScript Build
                cartItems.map((item: any) => (
                  <div key={item.id} style={cartItemRow}>
                    <img src={item.image_url} style={itemThumb} alt={item.name} />
                    <div style={{ flex: 1 }}>
                      <h4 style={itemName}>{item.name}</h4>
                      <span style={itemPrice}>{(item.sale_price || item.regular_price)} ج.م</span>
                      <div style={itemActions}>
                        <div style={stepper}>
                          <button onClick={() => updateQuantity(item.id, 1)} style={stepBtn}><Plus size={14}/></button>
                          <span>{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, -1)} style={stepBtn}><Minus size={14}/></button>
                        </div>
                        <button onClick={() => removeFromCart(item.id)} style={deleteBtn}><Trash2 size={18}/></button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cartItems.length > 0 && (
              <div style={drawerFooter}>
                <div style={totalRow}>
                  <span>الإجمالي الاسترشادي:</span>
                  <span style={totalPrice}>{cartTotal} ج.م</span>
                </div>
                <button style={checkoutBtn}>إتمام الطلب الآن <ArrowLeft size={18}/></button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// --- Styles ---
const overlayStyle: any = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 999 };
const drawerStyle: any = { position: 'fixed', top: 0, left: 0, bottom: 0, width: '400px', background: '#fff', zIndex: 1000, display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 30px rgba(0,0,0,0.1)' };
const drawerHeader: any = { padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const closeBtn: any = { border: 'none', background: 'none', cursor: 'pointer', color: '#888' };
const cartItemsList: any = { flex: 1, overflowY: 'auto', padding: '20px' };
const cartItemRow: any = { display: 'flex', gap: '15px', marginBottom: '20px', borderBottom: '1px solid #f9f9f9', paddingBottom: '15px' };
const itemThumb: any = { width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover', background: '#f8f8f8' };
const itemName: any = { margin: '0 0 5px 0', fontSize: '0.95rem', fontWeight: '800' };
const itemPrice: any = { color: '#27ae60', fontWeight: 'bold' };
const itemActions: any = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' };
const stepper: any = { display: 'flex', alignItems: 'center', gap: '12px', background: '#f5f5f5', padding: '5px 10px', borderRadius: '10px' };
const stepBtn: any = { border: 'none', background: 'none', cursor: 'pointer' };
const deleteBtn: any = { color: '#e74c3c', border: 'none', background: 'none', cursor: 'pointer' };
const drawerFooter: any = { padding: '20px', borderTop: '2px solid #f5f5f5', background: '#fcfcfc' };
const totalRow: any = { display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '20px' };
const totalPrice: any = { color: '#1a1a1a', fontSize: '1.3rem' };
const checkoutBtn: any = { width: '100%', background: '#27ae60', color: '#fff', border: 'none', padding: '16px', borderRadius: '15px', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' };
const emptyState: any = { textAlign: 'center', marginTop: '100px', color: '#888', fontWeight: 'bold' };