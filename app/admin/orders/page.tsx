'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import { 
  Package, Phone, MapPin, Clock, Truck, CheckCircle, 
  AlertCircle, ShoppingCart, Trash2, CreditCard, Banknote, 
  Image as ImageIcon, ExternalLink, Eye, X, User, Hash,
  CarFront, Globe, Factory, Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null); // للتحكم في النافذة المنبثقة

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
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      toast.success('تم تحديث حالة الطلب');
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
    <div style={{ padding: '30px', direction: 'rtl', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={headerSection}>
        <h1 style={mainTitle}>📦 الطلبات <span style={badgeCount}>{orders.length}</span></h1>
        <p style={{ color: '#555', fontSize: '0.9rem' }}>إدارة مبيعات زيت أند فلترز بشكل مختصر</p>
      </div>

      {/* جدول الطلبات المختصر */}
      <div style={tableWrapper}>
        <table style={table}>
          <thead>
            <tr style={thRow}>
              <th style={th}>العميل</th>
              <th style={th}>الحالة</th>
              <th style={th}>التاريخ</th>
              <th style={th}>الإجمالي</th>
              <th style={th}>الدفع</th>
              <th style={th}>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} style={tr}>
                <td style={td}>
                  <div style={{ fontWeight: 'bold', color: '#fff' }}>{order.customer_name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#444' }}>{order.customer_phone}</div>
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
                  <span style={{ color: '#2ecc71', fontWeight: '900' }}>{order.total_price} ج.م</span>
                </td>
                <td style={td}>
                  {order.payment_method === 'instapay' ? <Banknote size={16} color="#9b59b6" title="انستا باي" /> : 
                   order.payment_method === 'wallets' ? <Smartphone size={16} color="#e74c3c" title="محفظة" /> : 
                   <CreditCard size={16} color="#3498db" title="بطاقة" />}
                  {order.payment_screenshot_url && <ImageIcon size={14} color="#2ecc71" style={{marginRight:'5px'}} />}
                </td>
                <td style={td}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setSelectedOrder(order)} style={iconBtn} title="عرض التفاصيل"><Eye size={16} /></button>
                    <button onClick={() => deleteOrder(order.id)} style={delBtn}><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* نافذة تفاصيل الطلب (Modal) */}
      {selectedOrder && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <div style={modalHeader}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                <Hash size={20} color="#2ecc71" /> تفاصيل الطلب الكاملة
              </h2>
              <button onClick={() => setSelectedOrder(null)} style={closeBtn}><X size={24} /></button>
            </div>

            <div style={modalBody}>
              {/* بيانات العميل */}
              <div style={modalCard}>
                <h3 style={cardTitle}><User size={16}/> بيانات العميل</h3>
                <div style={modalGrid}>
                  <p><strong>الاسم:</strong> {selectedOrder.customer_name}</p>
                  <p><strong>الموبايل:</strong> {selectedOrder.customer_phone}</p>
                  <p><strong>العنوان:</strong> {selectedOrder.city} - {selectedOrder.customer_address}</p>
                  {selectedOrder.secondary_phone && <p><strong>رقم إضافي:</strong> {selectedOrder.secondary_phone}</p>}
                </div>
              </div>

              {/* المنتجات المطلوبة مع الصور والتفاصيل الكاملة */}
              <div style={modalCard}>
                <h3 style={cardTitle}><ShoppingCart size={16}/> المنتجات المطلوبة</h3>
                <div style={itemsContainer}>
                  {selectedOrder.items?.map((item: any, i: number) => {
                    const productImg = item.image || item.image_url || 'https://via.placeholder.com/150?text=No+Image';
                    return (
                      <div key={i} style={productDetailCard}>
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                          <div style={miniProductImgBox}>
                            <img src={productImg} alt="" style={miniProductImg} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={productMainInfo}>
                              <span style={productName}>{item.name} <strong style={{color:'#2ecc71'}}>×{item.quantity}</strong></span>
                              <span style={productPrice}>{(parseFloat(item.price) * item.quantity).toFixed(0)} ج.م</span>
                            </div>
                            
                            <div style={extraDetailsGrid}>
                              <div style={detailTag}><Factory size={12}/> {item.brand || 'غير محددة'}</div>
                              <div style={detailTag}><Globe size={12}/> {item.country_of_origin || 'غير محدد'}</div>
                              <div style={detailTag}><CarFront size={12}/> {item.car_make} {item.car_model || ''}</div>
                              <div style={detailTag}><Calendar size={12}/> {item.car_model_year || 'الكل'}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div style={modalTotalRow}>
                    <span>الإجمالي النهائي (شامل الشحن):</span>
                    <span style={{fontSize:'1.3rem', color:'#2ecc71'}}>{selectedOrder.total_price} ج.م</span>
                  </div>
                </div>
              </div>

              {/* إثبات الدفع */}
              <div style={modalCard}>
                <h3 style={cardTitle}><CreditCard size={16}/> إثبات الدفع</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                   <span>الوسيلة: <strong>{selectedOrder.payment_method === 'instapay' ? 'انستا باي' : 'محفظة إلكترونية'}</strong></span>
                   {selectedOrder.payment_screenshot_url ? (
                     <a href={selectedOrder.payment_screenshot_url} target="_blank" rel="noreferrer" style={viewLink}>
                       <ExternalLink size={16} /> فتح الصورة الأصلية
                     </a>
                   ) : <span style={{color:'#e74c3c'}}>لا يوجد سكرين شوت</span>}
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

const Smartphone = ({ size, color, title }: any) => (
  <svg title={title} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
);

// --- Styles التنسيقات المطورة ---
const headerSection: any = { marginBottom: '30px' };
const mainTitle: any = { color: '#fff', fontSize: '2rem', fontWeight: '900', margin: 0, display: 'flex', alignItems: 'center', gap: '15px' };
const badgeCount: any = { background: '#2ecc71', color: '#000', padding: '2px 12px', borderRadius: '10px', fontSize: '1rem' };
const tableWrapper: any = { background: '#080808', borderRadius: '20px', border: '1px solid #111', overflow: 'hidden' };
const table: any = { width: '100%', borderCollapse: 'collapse', textAlign: 'right' };
const thRow: any = { background: '#0a0a0a' };
const th: any = { padding: '15px 20px', fontSize: '0.8rem', color: '#444', textTransform: 'uppercase' };
const tr: any = { borderBottom: '1px solid #0d0d0d', transition: '0.2s' };
const td: any = { padding: '15px 20px', fontSize: '0.9rem', color: '#ccc' };
const miniSelect = (s:string): any => ({
  background: s === 'pending' ? '#f39c1220' : '#000',
  color: s === 'pending' ? '#f39c12' : '#2ecc71',
  border: '1px solid #1a1a1a', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', outline: 'none', fontSize: '0.75rem'
});
const iconBtn: any = { background: '#111', border: '1px solid #222', color: '#fff', padding: '8px', borderRadius: '10px', cursor: 'pointer' };
const delBtn: any = { background: '#111', border: '1px solid #222', color: '#e74c3c', padding: '8px', borderRadius: '10px', cursor: 'pointer' };

// Modal Styles
const modalOverlay: any = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', backdropFilter: 'blur(5px)' };
const modalContent: any = { background: '#050505', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '30px', border: '1px solid #1a1a1a', padding: '30px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' };
const modalHeader: any = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', color: '#fff' };
const closeBtn: any = { background: 'none', border: 'none', color: '#444', cursor: 'pointer' };
const modalBody: any = { display: 'flex', flexDirection: 'column', gap: '20px' };
const modalCard: any = { background: '#0a0a0a', padding: '20px', borderRadius: '20px', border: '1px solid #111' };
const cardTitle: any = { fontSize: '0.9rem', color: '#2ecc71', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 15px 0' };
const modalGrid: any = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem', color: '#999' };
const itemsContainer: any = { display: 'grid', gap: '12px' };

// تنسيق المنتج الجديد مع الصورة
const productDetailCard: any = { background: '#050505', padding: '12px', borderRadius: '15px', border: '1px solid #151515' };
const miniProductImgBox: any = { width: '60px', height: '60px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #222', flexShrink: 0 };
const miniProductImg: any = { width: '100%', height: '100%', objectFit: 'cover' };
const productMainInfo: any = { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' };
const productName: any = { color: '#fff', fontWeight: 'bold', fontSize: '0.9rem' };
const productPrice: any = { color: '#2ecc71', fontWeight: 'bold', fontSize: '0.9rem' };
const extraDetailsGrid: any = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' };
const detailTag: any = { display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', color: '#666', background: '#0a0a0a', padding: '3px 6px', borderRadius: '4px' };

const modalTotalRow: any = { display: 'flex', justifyContent: 'space-between', marginTop: '15px', fontWeight: 'bold', borderTop: '2px solid #111', paddingTop: '15px', color: '#fff' };
const imagePreviewBox: any = { marginTop: '15px', borderRadius: '15px', overflow: 'hidden', border: '1px solid #222', maxHeight: '400px' };
const fullImg: any = { width: '100%', display: 'block' };
const viewLink: any = { color: '#2ecc71', fontSize: '0.8rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' };
const loaderStyle: any = { color: '#2ecc71', textAlign: 'center', padding: '100px', fontWeight: 'bold' };