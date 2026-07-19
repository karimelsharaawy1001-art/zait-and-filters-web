'use client';
import { useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import {
  Search, Package, Clock, CheckCircle, Truck, XCircle,
  MapPin, User, Phone, CreditCard, Tag, Hash, Calendar,
  Banknote, Smartphone, Wallet, ImageIcon, Loader2, AlertCircle, MessageCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const COD_FEE = 20;

// ── WhatsApp reactivation box (shown on orders cancelled for "no WhatsApp") ──
function WhatsappReactivation({ order, phone }: { order: any; phone: string }) {
  const [num, setNum] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<boolean>(!!order.whatsapp_reactivation_requested);

  async function submit() {
    const clean = num.replace(/\D/g, '');
    if (clean.length < 11) return toast.error('يرجى إدخال رقم واتساب صحيح');
    setSending(true);
    try {
      const res = await fetch('/api/orders/whatsapp-reactivation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, phone, newNumber: num }),
      });
      const result = await res.json();
      if (!res.ok || result.error) return toast.error(result.error || 'حدث خطأ، حاول لاحقًا');
      setDone(true);
      toast.success('تم إرسال الرقم، سنراجع طلبك لإعادة تفعيله');
    } catch {
      toast.error('حدث خطأ، حاول لاحقًا');
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={reactBox}>
      <div style={reactTitle}><MessageCircle size={16} color="#16a34a" /> إعادة تفعيل الطلب</div>
      <p style={reactText}>تم إلغاء هذا الطلب لعدم توفّر رقم واتساب للتواصل معك. أدخل رقم واتساب صحيح لإعادة تفعيل طلبك.</p>
      {done ? (
        <div style={reactDone}><CheckCircle size={16} color="#16a34a" /> تم استلام رقمك الجديد{order.new_whatsapp_number ? ` (${order.new_whatsapp_number})` : ''} — طلبك قيد المراجعة لإعادة التفعيل.</div>
      ) : (
        <div style={reactForm}>
          <input
            type="tel"
            inputMode="numeric"
            placeholder="01xxxxxxxxx"
            value={num}
            onChange={(e) => setNum(e.target.value)}
            maxLength={13}
            style={reactInput}
          />
          <button onClick={submit} disabled={sending} style={reactBtn}>
            {sending ? <Loader2 className="animate-spin" size={16} /> : 'إرسال'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────
const orderRef = (id: string) => (id ? id.slice(0, 8).toUpperCase() : '');

const statusInfo = (s: string) => {
  switch (s) {
    case 'processing': return { label: 'جاري التجهيز', icon: <Package size={14} />, bg: '#eff6ff', color: '#1d4ed8' };
    case 'shipped':    return { label: 'تم الشحن',    icon: <Truck size={14} />,   bg: '#f0f9ff', color: '#0369a1' };
    case 'delivered':  return { label: 'تم التوصيل',  icon: <CheckCircle size={14} />, bg: '#f0fdf4', color: '#14532d' };
    case 'cancelled':  return { label: 'ملغي',        icon: <XCircle size={14} />,  bg: '#fef2f2', color: '#b91c1c' };
    default:           return { label: 'قيد المراجعة', icon: <Clock size={14} />,   bg: '#fff7ed', color: '#c2410c' };
  }
};

const paymentInfo = (m: string) => {
  switch (m) {
    case 'cash':              return { label: 'الدفع عند الاستلام (كاش)', icon: <Banknote size={16} color="#16a34a" /> };
    case 'instapay':          return { label: 'انستا باي',                icon: <CreditCard size={16} color="#16a34a" /> };
    case 'card_installments': return { label: 'بطاقة / تقسيط',            icon: <CreditCard size={16} color="#16a34a" /> };
    case 'wallet':
    case 'vodafone_cash':     return { label: 'محفظة إلكترونية',          icon: <Wallet size={16} color="#16a34a" /> };
    default:                  return { label: m || 'غير محدد',            icon: <Smartphone size={16} color="#16a34a" /> };
  }
};

const egp = (n: number) => `${Number(n || 0).toLocaleString('ar-EG')} ج.م`;

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
        <p style={subTitle}>أدخل رقم الموبايل الذي استخدمته في الطلب لعرض كل التفاصيل ومتابعة الحالة</p>

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
          <div style={centerStyle}><Loader2 className="animate-spin" size={40} color="#16a34a" /></div>
        ) : hasSearched && orders.length === 0 ? (
          <div style={emptyState}>
            <AlertCircle size={50} color="#9ca3af" />
            <p>لم نجد أي طلبات مرتبطة بهذا الرقم</p>
          </div>
        ) : (
          <div style={ordersList}>
            {orders.map((order) => {
              const st = statusInfo(order.status);
              const pay = paymentInfo(order.payment_method);
              const items: any[] = Array.isArray(order.items) ? order.items : [];
              const subtotal = items.reduce((s: number, i: any) => s + (parseFloat(i.price) || 0) * (i.quantity || 0), 0);
              const shipping = parseFloat(order.shipping_cost) || 0;
              const discount = parseFloat(order.discount_applied) || 0;
              const wallet = parseFloat(order.wallet_discount) || 0;
              const codFee = order.payment_method === 'cash' ? COD_FEE : 0;

              return (
                <div key={order.id} style={orderCard}>
                  {/* Header: order number + status */}
                  <div style={cardHeader}>
                    <div>
                      <div style={orderNumLabel}><Hash size={12} /> رقم الطلب</div>
                      <div style={orderNumValue}>#{orderRef(order.id)}</div>
                    </div>
                    <div style={statusBadge(st)}>{st.icon} {st.label}</div>
                  </div>

                  <div style={dateRow}>
                    <Calendar size={14} color="#9ca3af" />
                    <span>تاريخ الطلب: {new Date(order.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>

                  {/* Customer + address */}
                  <div style={sectionBox}>
                    <div style={sectionTitle}><User size={15} color="#16a34a" /> بيانات التوصيل</div>
                    {order.customer_name && <div style={infoRow}><User size={15} color="#9ca3af" /><span>{order.customer_name}</span></div>}
                    {order.customer_phone && <div style={infoRow}><Phone size={15} color="#9ca3af" /><span dir="ltr">{order.customer_phone}</span></div>}
                    <div style={infoRow}><MapPin size={15} color="#9ca3af" /><span>{[order.city, order.customer_address].filter(Boolean).join(' - ')}</span></div>
                    {order.shipping_type && (
                      <div style={infoRow}><Truck size={15} color="#9ca3af" /><span>{order.shipping_type === 'express' ? 'شحن سريع (Express)' : 'شحن عادي'}</span></div>
                    )}
                  </div>

                  {/* Payment */}
                  <div style={sectionBox}>
                    <div style={sectionTitle}><CreditCard size={15} color="#16a34a" /> الدفع</div>
                    <div style={infoRow}>{pay.icon}<span>طريقة الدفع: <strong>{pay.label}</strong></span></div>
                    {order.promo_code && (
                      <div style={infoRow}><Tag size={15} color="#9ca3af" /><span>كود الخصم: <strong>{order.promo_code}</strong></span></div>
                    )}
                    {order.payment_screenshot_url && (
                      <a href={order.payment_screenshot_url} target="_blank" rel="noreferrer" style={proofLink}>
                        <ImageIcon size={14} /> عرض إثبات الدفع
                      </a>
                    )}
                  </div>

                  {/* Items */}
                  <div style={sectionBox}>
                    <div style={sectionTitle}><Package size={15} color="#16a34a" /> المنتجات ({items.length})</div>
                    {items.map((item: any, i: number) => (
                      <div key={i} style={itemRow}>
                        <img
                          src={item.image_url || '/api/placeholder/60/60'}
                          alt={item.name}
                          style={itemImg}
                          loading="lazy"
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={itemName}>{item.name}</div>
                          <div style={itemMeta}>الكمية: {item.quantity} × {egp(item.price)}</div>
                        </div>
                        <div style={itemTotal}>{egp((parseFloat(item.price) || 0) * (item.quantity || 0))}</div>
                      </div>
                    ))}
                  </div>

                  {/* Price breakdown */}
                  <div style={sectionBox}>
                    <div style={sectionTitle}>💰 ملخص الحساب</div>
                    <div style={priceRow}><span>المجموع الفرعي</span><span>{egp(subtotal)}</span></div>
                    <div style={priceRow}><span>الشحن</span><span>{shipping === 0 ? 'مجاني 🚚' : egp(shipping)}</span></div>
                    {discount > 0 && <div style={{ ...priceRow, color: '#16a34a' }}><span>الخصم</span><span>− {egp(discount)}</span></div>}
                    {wallet > 0 && <div style={{ ...priceRow, color: '#16a34a' }}><span>خصم المحفظة</span><span>− {egp(wallet)}</span></div>}
                    {codFee > 0 && <div style={priceRow}><span>رسوم الدفع عند الاستلام</span><span>{egp(codFee)}</span></div>}
                  </div>

                  <div style={cardFooter}>
                    <span style={totalLabel}>الإجمالي النهائي</span>
                    <span style={totalAmount}>{egp(order.total_price)}</span>
                  </div>

                  {order.status === 'cancelled' && order.cancel_reason === 'no_whatsapp' && (
                    <WhatsappReactivation order={order} phone={phone} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// --- التنسيقات (متوافقة مع تصميم زيت أند فلترز) ---
const container: any = { padding: '40px 20px', maxWidth: '800px', margin: '0 auto', direction: 'rtl', minHeight: '80vh' };
const heroSection: any = { textAlign: 'center', marginBottom: '50px' };
const mainTitle: any = { fontSize: '2.5rem', fontWeight: '900', color: '#1a1a1a', marginBottom: '10px' };
const subTitle: any = { color: '#9ca3af', fontSize: '1.1rem' };
const searchBox: any = { display: 'flex', gap: '10px', maxWidth: '500px', margin: '30px auto 0' };
const searchInput: any = { flex: 1, padding: '15px 20px', borderRadius: '15px', border: '2px solid #e5e7eb', fontSize: '1.1rem', outline: 'none' };
const searchBtn: any = { background: '#16a34a', color: '#ffffff', border: 'none', padding: '0 30px', borderRadius: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' };
const resultsArea: any = { marginTop: '30px' };
const ordersList: any = { display: 'flex', flexDirection: 'column', gap: '24px' };
const orderCard: any = { background: '#ffffff', borderRadius: '24px', border: '1px solid #e5e7eb', padding: '25px', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' };
const cardHeader: any = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' };
const orderNumLabel: any = { display: 'flex', alignItems: 'center', gap: '4px', color: '#9ca3af', fontSize: '0.78rem', fontWeight: '700', marginBottom: '2px' };
const orderNumValue: any = { color: '#1a1a1a', fontSize: '1.15rem', fontWeight: '900', letterSpacing: '0.5px' };
const statusBadge = (st: { bg: string; color: string }): any => ({ display: 'flex', alignItems: 'center', gap: '6px', background: st.bg, color: st.color, padding: '7px 14px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 'bold', whiteSpace: 'nowrap' });
const dateRow: any = { display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', fontSize: '0.85rem', marginBottom: '18px' };
const sectionBox: any = { background: '#f9fafb', borderRadius: '16px', padding: '16px', marginBottom: '14px' };
const sectionTitle: any = { display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.9rem', fontWeight: '900', color: '#1a1a1a', marginBottom: '12px' };
const infoRow: any = { display: 'flex', alignItems: 'center', gap: '10px', color: '#374151', fontSize: '0.88rem', marginBottom: '8px' };
const proofLink: any = { color: '#16a34a', fontSize: '0.85rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 'bold', marginTop: '4px' };
const itemRow: any = { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid #eef0f2' };
const itemImg: any = { width: '50px', height: '50px', borderRadius: '10px', objectFit: 'cover', background: '#fff', border: '1px solid #e5e7eb', flexShrink: 0 };
const itemName: any = { fontSize: '0.85rem', fontWeight: '700', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const itemMeta: any = { fontSize: '0.78rem', color: '#9ca3af', marginTop: '3px' };
const itemTotal: any = { fontSize: '0.85rem', fontWeight: '900', color: '#1a1a1a', whiteSpace: 'nowrap' };
const priceRow: any = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem', color: '#374151', fontWeight: '600', marginBottom: '8px' };
const cardFooter: any = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid #f0fdf4', paddingTop: '18px', marginTop: '4px' };
const totalLabel: any = { color: '#6b7280', fontWeight: 'bold' };
const totalAmount: any = { fontSize: '1.5rem', fontWeight: '900', color: '#16a34a' };
const emptyState: any = { textAlign: 'center', padding: '50px', color: '#6b7280' };
const centerStyle: any = { display: 'flex', justifyContent: 'center', padding: '50px' };
const reactBox: any = { marginTop: '16px', background: '#f0fdf4', border: '2px solid #16a34a', borderRadius: '16px', padding: '16px' };
const reactTitle: any = { display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.92rem', fontWeight: '900', color: '#14532d', marginBottom: '8px' };
const reactText: any = { fontSize: '0.82rem', color: '#166534', fontWeight: '600', lineHeight: '1.6', margin: '0 0 12px' };
const reactForm: any = { display: 'flex', gap: '8px', flexWrap: 'wrap' as const };
const reactInput: any = { flex: 1, minWidth: '140px', padding: '12px 14px', borderRadius: '12px', border: '1.5px solid #bbf7d0', fontSize: '1rem', outline: 'none', direction: 'ltr' as const, textAlign: 'center' as const };
const reactBtn: any = { background: '#16a34a', color: '#fff', border: 'none', padding: '0 26px', borderRadius: '12px', cursor: 'pointer', fontWeight: '900', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '90px' };
const reactDone: any = { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#14532d', fontWeight: '800', background: '#dcfce7', borderRadius: '12px', padding: '12px 14px' };
