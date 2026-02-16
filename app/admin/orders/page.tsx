'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/app/lib/supabase';
import { 
  Package, Phone, MapPin, Clock, Truck, CheckCircle, 
  AlertCircle, ShoppingCart, Trash2, CreditCard, Banknote, 
  Image as ImageIcon, ExternalLink, Eye, X, User, Hash,
  CarFront, Globe, Factory, Calendar, Smartphone, Search
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // خريطة أسماء طرق الدفع بالعربية
  const paymentLabels: any = {
    'card_installments': 'بطاقة / تقسيط',
    'instapay': 'انستا باي',
    'wallets': 'محفظة إلكترونية'
  };

  useEffect(() => {
    fetchOrders();
    const channel = supabase
      .channel('orders-channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        setOrders(prev => [payload.new, ...prev]);
        toast.success('وصل طلب جديد الآن! 🛍️', { duration: 5000, position: 'top-center' });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchOrders() {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setOrders(data);
    } catch (err: any) {
      toast.error('خطأ في جلب الطلبات: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateOrderStatus(orderId: string, newStatus: string) {
    try {
      const orderToUpdate = orders.find(o => o.id === orderId);

      // Update order status
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (orderError) throw orderError;

      // If status is delivered, set delivery date for commission (14-day hold)
      if (newStatus === 'delivered' && orderToUpdate?.status !== 'delivered') {
        const deliveryDate = new Date().toISOString();
        const releaseDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

        // Update commission record
        const { error: commError } = await supabase
          .from('affiliate_commissions')
          .update({ 
            delivery_date: deliveryDate,
            release_date: releaseDate
          })
          .eq('order_id', orderId);

        if (commError) {
          console.error('Commission update error:', commError);
        } else {
          toast.success('تم تحديث حالة الطلب - سيتم إصدار العمولة بعد 14 يوم! ✅');
        }
      } else {
        toast.success('تم تحديث حالة الطلب');
      }

      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch (err: any) {
      toast.error('فشل التحديث');
    }
  }

  async function deleteOrder(orderId: string) {
    if (!confirm('هل أنت متأكد من حذف هذا الطلب نهائياً؟')) return;
    try {
      const { error } = await supabase.from('orders').delete().eq('id', orderId);
      if (error) throw error;
      setOrders(prev => prev.filter(o => o.id !== orderId));
      if(selectedOrder?.id === orderId) setSelectedOrder(null);
      toast.success('تم حذف الطلب');
    } catch (err: any) {
      toast.error('فشل الحذف');
    }
  }

  if (loading) return <div style={loaderStyle}>جاري تحميل الطلبات...</div>;

  return (
    <div style={{ padding: '30px', direction: 'rtl', maxWidth: '1400px', margin: '0 auto', background: '#f8f9fa', minHeight: '100vh' }}>
      <div style={headerSection}>
        <h1 style={mainTitle}>📦 إدارة الطلبات <span style={badgeCount}>{orders.length}</span></h1>
        <p style={{ color: '#666', fontSize: '0.95rem', marginTop: '5px' }}>متابعة عمليات البيع وحالة الشحن لـ "زيت أند فلترز"</p>
      </div>

      <div style={tableWrapper}>
        <table style={table}>
          <thead>
            <tr style={thRow}>
              <th style={th}>العميل</th>
              <th style={th}>المحافظة</th>
              <th style={th}>طريقة الدفع</th>
              <th style={th}>الحالة</th>
              <th style={th}>التاريخ</th>
              <th style={th}>الإجمالي</th>
              <th style={th}>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} style={tr}>
                <td style={td}>
                  <div style={{ fontWeight: '800', color: '#1a1a1a' }}>{order.customer_name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#777', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Phone size={12} /> {order.customer_phone}
                  </div>
                </td>
                <td style={td}>
                  <div style={cityBadge}>
                    <MapPin size={14} color="#15803d" /> {order.city || 'غير محدد'}
                  </div>
                </td>
                <td style={td}>
                  <div style={payTypeStyle}>
                    {order.payment_method === 'instapay' ? <Banknote size={16} color="#9b59b6" /> : 
                     order.payment_method === 'wallets' ? <Smartphone size={16} color="#e74c3c" /> : 
                     <CreditCard size={16} color="#3498db" />}
                    <span>{paymentLabels[order.payment_method] || order.payment_method}</span>
                    {order.payment_screenshot_url && <ImageIcon size={14} color="#27ae60" />}
                  </div>
                </td>
                <td style={td}>
                  <select 
                    value={order.status} 
                    onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                    style={miniSelect(order.status)}
                  >
                    <option value="pending">جديد</option>
                    <option value="processing">تجهيز</option>
                    <option value="shipped">شحن</option>
                    <option value="delivered">توصيل</option>
                  </select>
                </td>
                <td style={td}>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>{new Date(order.created_at).toLocaleDateString('ar-EG')}</div>
                </td>
                <td style={td}>
                  <span style={{ color: '#15803d', fontWeight: '900', fontSize: '1rem' }}>{order.total_price} <small>ج.م</small></span>
                </td>
                <td style={td}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setSelectedOrder(order)} style={iconBtn}><Eye size={16} /></button>
                    <button onClick={() => deleteOrder(order.id)} style={delBtn}><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedOrder && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <div style={modalHeader}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, color: '#1a1a1a' }}>
                <Hash size={24} color="#27ae60" /> تفاصيل الطلب
              </h2>
              <button onClick={() => setSelectedOrder(null)} style={closeBtn}><X size={24} /></button>
            </div>

            <div style={modalBody}>
              <div style={modalCard}>
                <h3 style={cardTitle}><User size={18}/> بيانات العميل والتوصيل</h3>
                <div style={modalGrid}>
                  <p><strong>الاسم:</strong> {selectedOrder.customer_name}</p>
                  <p><strong>الموبايل:</strong> {selectedOrder.customer_phone}</p>
                  <p><strong>المحافظة:</strong> {selectedOrder.city}</p>
                  <p><strong>العنوان:</strong> {selectedOrder.customer_address}</p>
                  {selectedOrder.car_mileage && <p><strong>قراءة العداد:</strong> {selectedOrder.car_mileage} كم</p>}
                </div>
              </div>

              <div style={modalCard}>
                <h3 style={cardTitle}><ShoppingCart size={18}/> المنتجات المطلوبة</h3>
                <div style={itemsContainer}>
                  {selectedOrder.items?.map((item: any, i: number) => (
                    <div key={i} style={productDetailCard}>
                      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <div style={miniProductImgBox}>
                          <img src={item.image_url || item.image || 'https://via.placeholder.com/150'} alt="" style={miniProductImg} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={productMainInfo}>
                            <span style={productName}>{item.name} <strong style={{color:'#15803d', marginRight:'5px'}}>×{item.quantity}</strong></span>
                            <span style={productPrice}>{(parseFloat(item.price) * item.quantity).toFixed(0)} ج.م</span>
                          </div>
                          <div style={extraDetailsGrid}>
                            <div style={detailTag}><Factory size={12}/> {item.brand}</div>
                            <div style={detailTag}><CarFront size={12}/> {item.car_make} {item.car_model}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div style={modalTotalRow}>
                    <span>الإجمالي النهائي:</span>
                    <span style={{fontSize:'1.5rem', color:'#15803d'}}>{selectedOrder.total_price} ج.م</span>
                  </div>
                </div>
              </div>

              <div style={modalCard}>
                <h3 style={cardTitle}><CreditCard size={18}/> إثبات وتفاصيل الدفع</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                   <span>الوسيلة: <strong>{paymentLabels[selectedOrder.payment_method] || selectedOrder.payment_method}</strong></span>
                   {selectedOrder.payment_screenshot_url && (
                     <a href={selectedOrder.payment_screenshot_url} target="_blank" rel="noreferrer" style={viewLink}>
                       <ExternalLink size={16} /> فتح الصورة الأصلية
                     </a>
                   )}
                </div>
                {selectedOrder.payment_screenshot_url && (
                  <div style={imagePreviewBox}>
                    <img src={selectedOrder.payment_screenshot_url} alt="Proof" style={fullImg} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// التنسيقات (Styles) - تم تحويلها بالكامل لـ Light Mode
const headerSection: any = { marginBottom: '30px' };
const mainTitle: any = { color: '#1a1a1a', fontSize: '2.2rem', fontWeight: '900', margin: 0, display: 'flex', alignItems: 'center', gap: '15px' };
const badgeCount: any = { background: '#27ae60', color: '#fff', padding: '4px 14px', borderRadius: '12px', fontSize: '1.1rem' };
const tableWrapper: any = { background: '#fff', borderRadius: '25px', border: '1px solid #eee', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' };
const table: any = { width: '100%', borderCollapse: 'collapse', textAlign: 'right' };
const thRow: any = { background: '#fcfcfc', borderBottom: '1px solid #eee' };
const th: any = { padding: '18px 20px', fontSize: '0.85rem', color: '#888', fontWeight: 'bold' };
const tr: any = { borderBottom: '1px solid #f9f9f9', transition: '0.2s' };
const td: any = { padding: '18px 20px', fontSize: '0.95rem', color: '#333', verticalAlign: 'middle' };

const cityBadge: any = { display: 'flex', alignItems: 'center', gap: '6px', background: '#f0fdf4', color: '#15803d', padding: '6px 12px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 'bold', width: 'fit-content' };
const payTypeStyle: any = { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#555' };

const miniSelect = (s:string): any => ({ 
  background: s === 'pending' ? '#fff7ed' : s === 'delivered' ? '#f0fdf4' : s === 'shipped' ? '#eff6ff' : '#fef3c7', 
  color: s === 'pending' ? '#c2410c' : s === 'delivered' ? '#15803d' : s === 'shipped' ? '#1e40af' : '#ca8a04', 
  border: `1px solid ${s === 'pending' ? '#ffedd5' : s === 'delivered' ? '#dcfce7' : s === 'shipped' ? '#dbeafe' : '#fef3c7'}`, 
  padding: '6px 10px', 
  borderRadius: '8px', 
  cursor: 'pointer', 
  outline: 'none', 
  fontSize: '0.8rem',
  fontWeight: 'bold'
});

const iconBtn: any = { background: '#f8f9fa', border: '1px solid #eee', color: '#555', padding: '10px', borderRadius: '12px', cursor: 'pointer', transition: '0.2s' };
const delBtn: any = { background: '#fff5f5', border: '1px solid #ffebeb', color: '#e74c3c', padding: '10px', borderRadius: '12px', cursor: 'pointer', transition: '0.2s' };

const modalOverlay: any = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', backdropFilter: 'blur(4px)' };
const modalContent: any = { background: '#fff', width: '100%', maxWidth: '750px', maxHeight: '92vh', overflowY: 'auto', borderRadius: '35px', padding: '35px', boxShadow: '0 25px 50px rgba(0,0,0,0.15)' };
const modalHeader: any = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '1px solid #eee', paddingBottom: '15px' };
const closeBtn: any = { background: '#f8f9fa', border: 'none', color: '#888', cursor: 'pointer', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const modalBody: any = { display: 'flex', flexDirection: 'column', gap: '25px' };
const modalCard: any = { background: '#fcfcfc', padding: '25px', borderRadius: '25px', border: '1px solid #f0f0f0' };
const cardTitle: any = { fontSize: '1.1rem', color: '#1a1a1a', fontWeight: '800', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' };
const modalGrid: any = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '0.95rem', color: '#555' };

const itemsContainer: any = { display: 'grid', gap: '15px' };
const productDetailCard: any = { background: '#fff', padding: '15px', borderRadius: '20px', border: '1px solid #eee' };
const miniProductImgBox: any = { width: '70px', height: '70px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #eee', flexShrink: 0 };
const miniProductImg: any = { width: '100%', height: '100%', objectFit: 'contain' };
const productMainInfo: any = { display: 'flex', justifyContent: 'space-between', marginBottom: '10px' };
const productName: any = { color: '#1a1a1a', fontWeight: '800', fontSize: '1rem' };
const productPrice: any = { color: '#15803d', fontWeight: '900', fontSize: '1.05rem' };
const extraDetailsGrid: any = { display: 'flex', flexWrap: 'wrap', gap: '10px' };
const detailTag: any = { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#666', background: '#f8f9fa', padding: '5px 10px', borderRadius: '8px', border: '1px solid #eee' };

const modalTotalRow: any = { display: 'flex', justifyContent: 'space-between', marginTop: '20px', fontWeight: '900', borderTop: '2px dashed #eee', paddingTop: '20px', color: '#1a1a1a', fontSize: '1.2rem' };
const imagePreviewBox: any = { marginTop: '15px', borderRadius: '20px', overflow: 'hidden', border: '1px solid #eee', maxHeight: '450px', background: '#f8f9fa' };
const fullImg: any = { width: '100%', display: 'block', objectFit: 'contain' };
const viewLink: any = { color: '#27ae60', fontSize: '0.9rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' };
const loaderStyle: any = { color: '#15803d', textAlign: 'center', padding: '150px', fontWeight: '900', fontSize: '1.5rem', direction: 'rtl' };
