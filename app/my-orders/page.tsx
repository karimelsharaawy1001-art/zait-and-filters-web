'use client';
import { useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import { 
  Search, Package, Clock, CheckCircle, Truck, 
  MapPin, ShoppingCart, Smartphone, Banknote, 
  ImageIcon, ExternalLink, Loader2, AlertCircle 
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function MyOrdersPage() {
  const [phone, setPhone] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (phone.length < 11) return toast.error('يرجى إدخال رقم موبايل صحيح');

    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_phone', phone)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('حدث خطأ أثناء البحث');
    } else {
      setOrders(data || []);
      setHasSearched(true);
    }
    setLoading(false);
  }

  return (
    <div style={container}>
      <div style={heroSection}>
        <h1 style={mainTitle}>📦 تتبع طلباتك</h1>
        <p style={subTitle}>أدخل رقم الموبايل الذي استخدمته في الطلب لمتابعة الحالة</p>
        
        <form onSubmit={handleSearch} style={searchBox}>
          <input 
            type="text" 
            placeholder="01xxxxxxxxx" 
            value={phone} 
            onChange={(e) => setPhone(e.target.value)}
            style={searchInput}
            maxLength={11}
          />
          <button type="submit" disabled={loading} style={searchBtn}>
            {loading ? <Loader2 className="animate-spin" size={20} /> : <><Search size={20} /> بحث</>}
          </button>
        </form>
      </div>

      <div style={resultsArea}>
        {loading ? (
          <div style={centerStyle}><Loader2 className="animate-spin" size={40} color="#2ecc71" /></div>
        ) : hasSearched && orders.length === 0 ? (
          <div style={emptyState}>
            <AlertCircle size={50} color="#555" />
            <p>لم نجد أي طلبات مرتبطة بهذا الرقم</p>
          </div>
        ) : (
          <div style={ordersList}>
            {orders.map((order) => (
              <div key={order.id} style={orderCard}>
                <div style={cardHeader}>
                  <div style={statusBadge(order.status)}>
                    {order.status === 'pending' ? <Clock size={14}/> : <CheckCircle size={14}/>}
                    {order.status === 'pending' ? 'قيد المراجعة' : 
                     order.status === 'processing' ? 'جاري التجهيز' : 
                     order.status === 'shipped' ? 'تم الشحن' : 'تم التوصيل'}
                  </div>
                  <span style={dateText}>{new Date(order.created_at).toLocaleDateString('ar-EG')}</span>
                </div>

                <div style={cardBody}>
                   <div style={infoRow}><MapPin size={16} color="#2ecc71"/> <span>{order.city} - {order.customer_address}</span></div>
                   <div style={infoRow}><ShoppingCart size={16} color="#2ecc71"/> <span>{order.items?.length} منتجات</span></div>
                   
                   <div style={paymentSummary}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {order.payment_method === 'instapay' ? <Banknote size={16}/> : <Smartphone size={16}/>}
                        <span>الدفع عبر: <strong>{order.payment_method === 'instapay' ? 'انستا باي' : 'محفظة إلكترونية'}</strong></span>
                      </div>
                      {order.payment_screenshot_url && (
                        <a href={order.payment_screenshot_url} target="_blank" style={proofLink}>
                          <ImageIcon size={14} /> عرض إثبات الدفع
                        </a>
                      )}
                   </div>
                </div>

                <div style={cardFooter}>
                  <span style={totalLabel}>الإجمالي النهائي:</span>
                  <span style={totalAmount}>{order.total_price} ج.م</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- التنسيقات (متوافقة مع تصميم زيت أند فلترز) ---
const container: any = { padding: '40px 20px', maxWidth: '800px', margin: '0 auto', direction: 'rtl', minHeight: '80vh' };
const heroSection: any = { textAlign: 'center', marginBottom: '50px' };
const mainTitle: any = { fontSize: '2.5rem', fontWeight: '900', color: '#f5f5f5', marginBottom: '10px' };
const subTitle: any = { color: '#9ca3af', fontSize: '1.1rem' };
const searchBox: any = { display: 'flex', gap: '10px', maxWidth: '500px', margin: '30px auto 0' };
const searchInput: any = { flex: 1, padding: '15px 20px', borderRadius: '15px', border: '2px solid #eee', fontSize: '1.1rem', outline: 'none' };
const searchBtn: any = { background: '#1c1c1c', color: '#fff', border: 'none', padding: '0 30px', borderRadius: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' };
const resultsArea: any = { marginTop: '30px' };
const ordersList: any = { display: 'flex', flexDirection: 'column', gap: '20px' };
const orderCard: any = { background: '#1c1c1c', borderRadius: '24px', border: '1px solid #eee', padding: '25px', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' };
const cardHeader: any = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' };
const statusBadge = (s:string):any => ({ display: 'flex', alignItems: 'center', gap: '6px', background: s==='pending'?'#fff7ed':'#1a0d0d', color: s==='pending'?'#c2410c':'#991b1b', padding: '6px 12px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 'bold' });
const dateText: any = { color: '#999', fontSize: '0.9rem' };
const cardBody: any = { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' };
const infoRow: any = { display: 'flex', alignItems: 'center', gap: '10px', color: '#cbd5e1' };
const paymentSummary: any = { marginTop: '10px', padding: '15px', background: '#161616', borderRadius: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const proofLink: any = { color: '#2ecc71', fontSize: '0.85rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' };
const cardFooter: any = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #eee', paddingTop: '20px' };
const totalLabel: any = { color: '#777', fontWeight: 'bold' };
const totalAmount: any = { fontSize: '1.5rem', fontWeight: '900', color: '#f5f5f5' };
const emptyState: any = { textAlign: 'center', padding: '50px', color: '#999' };
const centerStyle: any = { display: 'flex', justifyContent: 'center', padding: '50px' };