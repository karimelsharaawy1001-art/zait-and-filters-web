'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import toast from 'react-hot-toast';
import { 
  ShoppingCart, Mail, Phone, MapPin, Calendar, DollarSign, 
  RefreshCw, Search, Send, CheckCircle, Clock, Package, 
  User, Smartphone, Car
} from 'lucide-react';


interface AbandonedCart {
  id: string;
  customer_email: string;
  customer_name: string;
  customer_phone: string;
  cart_items: any[];
  cart_total: number;
  cart_subtotal: number;
  shipping_city: string;
  device_type: string;
  page_url: string;
  abandoned_at: string;
  last_activity_at: string;
  recovery_email_sent: boolean;
  recovery_sms_sent: boolean;
  recovered: boolean;
  recovered_at: string | null;
  created_at: string;
}


export default function AbandonedCartsAdmin() {
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [filteredCarts, setFilteredCarts] = useState<AbandonedCart[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'recovered'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCart, setExpandedCart] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);


  useEffect(() => {
    fetchAbandonedCarts();
  }, []);


  useEffect(() => {
    applyFilters();
  }, [carts, filter, searchTerm]);


  const fetchAbandonedCarts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('abandoned_carts')
        .select('*')
        .order('last_activity_at', { ascending: false });

      if (error) throw error;
      setCarts(data || []);
    } catch (err: any) {
      toast.error('Error loading abandoned carts: ' + err.message);
    } finally {
      setLoading(false);
    }
  };


  const applyFilters = () => {
    let filtered = [...carts];

    if (filter === 'pending') {
      filtered = filtered.filter(cart => !cart.recovered);
    } else if (filter === 'recovered') {
      filtered = filtered.filter(cart => cart.recovered);
    }

    if (searchTerm) {
      filtered = filtered.filter(cart => 
        cart.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cart.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cart.customer_phone?.includes(searchTerm)
      );
    }

    setFilteredCarts(filtered);
  };


  const sendRecoveryEmail = async (cartId: string, customerEmail: string) => {
    setSendingEmail(cartId);
    try {
      const response = await fetch('/api/send-recovery-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartId, customerEmail })
      });

      if (!response.ok) throw new Error('Failed to send email');

      await supabase
        .from('abandoned_carts')
        .update({ 
          recovery_email_sent: true, 
          recovery_email_sent_at: new Date().toISOString() 
        })
        .eq('id', cartId);

      toast.success('تم إرسال البريد الإلكتروني بنجاح! ✅');
      fetchAbandonedCarts();
    } catch (err: any) {
      toast.error('خطأ في إرسال البريد: ' + err.message);
    } finally {
      setSendingEmail(null);
    }
  };


  const sendWhatsAppMessage = (phone: string, cartTotal: number) => {
    const message = encodeURIComponent(
      `مرحباً! 👋\n\nلاحظنا أنك تركت منتجات في سلتك بقيمة ${cartTotal.toFixed(2)} ج.م\n\nأكمل طلبك الآن واحصل على خصم 10% باستخدام كود: COMEBACK10\n\nرابط إتمام الطلب:\nhttps://zaitandfilters.com/checkout`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };


  const callCustomer = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };


  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'منذ أقل من ساعة';
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays === 1) return 'منذ يوم واحد';
    return `منذ ${diffDays} أيام`;
  };


  const stats = {
    total: carts.length,
    pending: carts.filter(c => !c.recovered).length,
    recovered: carts.filter(c => c.recovered).length,
    totalValue: carts.reduce((sum, c) => sum + (c.cart_total || 0), 0),
    recoveredValue: carts.filter(c => c.recovered).reduce((sum, c) => sum + (c.cart_total || 0), 0)
  };


  if (loading) {
    return (
      <div style={loaderStyle}>
        <RefreshCw size={40} color="#15803d" />
        <span>جاري تحميل السلات المتروكة...</span>
      </div>
    );
  }


  return (
    <div style={container}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .cart-row { animation: fadeIn 0.3s ease; }
        .cart-row:hover { background: #f9fafb; }
        .action-btn:hover { transform: scale(1.05); }
        .filter-btn:hover { background: #15803d !important; color: #fff !important; }
        .expand-btn:hover { background: #f0fdf4; }
      `}} />

      {/* Header */}
      <div style={header}>
        <div>
          <h1 style={title}>🛒 إدارة السلات المتروكة</h1>
          <p style={subtitle}>تتبع واسترجع السلات المتروكة لزيادة المبيعات</p>
        </div>
        <button onClick={fetchAbandonedCarts} style={refreshBtn} className="action-btn">
          <RefreshCw size={18} /> تحديث
        </button>
      </div>

      {/* Stats Cards */}
      <div style={statsGrid}>
        <div style={statCard('#15803d')}>
          <ShoppingCart size={30} color="#fff" />
          <div>
            <div style={statValue}>{stats.total}</div>
            <div style={statLabel}>إجمالي السلات</div>
          </div>
        </div>
        <div style={statCard('#f59e0b')}>
          <Clock size={30} color="#fff" />
          <div>
            <div style={statValue}>{stats.pending}</div>
            <div style={statLabel}>قيد الانتظار</div>
          </div>
        </div>
        <div style={statCard('#10b981')}>
          <CheckCircle size={30} color="#fff" />
          <div>
            <div style={statValue}>{stats.recovered}</div>
            <div style={statLabel}>تم الاسترجاع</div>
          </div>
        </div>
        <div style={statCard('#8b5cf6')}>
          <DollarSign size={30} color="#fff" />
          <div>
            <div style={statValue}>{stats.totalValue.toFixed(0)} ج.م</div>
            <div style={statLabel}>القيمة الإجمالية</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={filtersBar}>
        <div style={searchBox}>
          <Search size={18} color="#999" />
          <input 
            type="text" 
            placeholder="ابحث بالإيميل، الاسم، أو رقم الموبايل..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={searchInput}
          />
        </div>
        <div style={filterButtons}>
          <button onClick={() => setFilter('all')} style={filterBtn(filter === 'all')} className="filter-btn">
            الكل ({stats.total})
          </button>
          <button onClick={() => setFilter('pending')} style={filterBtn(filter === 'pending')} className="filter-btn">
            قيد الانتظار ({stats.pending})
          </button>
          <button onClick={() => setFilter('recovered')} style={filterBtn(filter === 'recovered')} className="filter-btn">
            تم الاسترجاع ({stats.recovered})
          </button>
        </div>
      </div>

      {/* List View */}
      {filteredCarts.length === 0 ? (
        <div style={emptyState}>
          <ShoppingCart size={60} color="#ccc" />
          <h3>لا توجد سلات متروكة</h3>
          <p>سيتم عرض السلات المتروكة هنا</p>
        </div>
      ) : (
        <div style={listContainer}>
          {/* Table Header */}
          <div style={tableHeader}>
            <div style={{...tableCell, flex: 2}}>العميل</div>
            <div style={{...tableCell, flex: 1.5}}>التواصل</div>
            <div style={{...tableCell, flex: 3}}>المنتجات</div>
            <div style={{...tableCell, flex: 1}}>الإجمالي</div>
            <div style={{...tableCell, flex: 1}}>التوقيت</div>
            <div style={{...tableCell, flex: 1}}>الحالة</div>
            <div style={{...tableCell, flex: 2}}>الإجراءات</div>
          </div>

          {/* Table Body */}
          {filteredCarts.map((cart) => (
            <div key={cart.id}>
              <div className="cart-row" style={tableRow(cart.recovered)}>

                {/* Customer Info */}
                <div style={{...tableCell, flex: 2}}>
                  <div style={customerColumn}>
                    <User size={16} color="#15803d" />
                    <div>
                      <div style={customerName}>{cart.customer_name || 'غير محدد'}</div>
                      <div style={customerMeta}>
                        <Smartphone size={11} />
                        {cart.device_type === 'mobile' ? 'موبايل' : 'كمبيوتر'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact */}
                <div style={{...tableCell, flex: 1.5}}>
                  <div style={contactColumn}>
                    <div style={contactItem}>
                      <Mail size={12} color="#666" />
                      <span>{cart.customer_email?.substring(0, 20)}...</span>
                    </div>
                    {cart.customer_phone && (
                      <div style={contactItem}>
                        <Phone size={12} color="#666" />
                        <span>{cart.customer_phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Products Summary */}
                <div style={{...tableCell, flex: 3}}>
                  <div style={productsColumn}>
                    <div style={productsHeader}>
                      <Package size={14} color="#15803d" />
                      <span>{cart.cart_items?.length || 0} منتجات</span>
                      <button 
                        onClick={() => setExpandedCart(expandedCart === cart.id ? null : cart.id)}
                        style={expandBtn}
                        className="expand-btn"
                      >
                        {expandedCart === cart.id ? '▲' : '▼'}
                      </button>
                    </div>
                    {cart.cart_items?.slice(0, 1).map((item: any, idx: number) => (
                      <div key={idx} style={productQuickView}>
                        {item.name?.substring(0, 40)}...
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div style={{...tableCell, flex: 1}}>
                  <div style={totalAmount}>{cart.cart_total?.toFixed(2)} ج.م</div>
                  {cart.shipping_city && (
                    <div style={cityBadge}>
                      <MapPin size={10} />
                      {cart.shipping_city}
                    </div>
                  )}
                </div>

                {/* Time */}
                <div style={{...tableCell, flex: 1}}>
                  <div style={timeColumn}>
                    <Calendar size={12} color="#999" />
                    <span>{formatDate(cart.last_activity_at || cart.created_at)}</span>
                  </div>
                </div>

                {/* Status */}
                <div style={{...tableCell, flex: 1}}>
                  <div style={statusBadge(cart.recovered)}>
                    {cart.recovered ? '✅ تم' : '⏳ قيد'}
                  </div>
                </div>

                {/* Actions */}
                <div style={{...tableCell, flex: 2}}>
                  {!cart.recovered ? (
                    <div style={actionsColumn}>
                      <button 
                        onClick={() => sendRecoveryEmail(cart.id, cart.customer_email)}
                        disabled={sendingEmail === cart.id || cart.recovery_email_sent}
                        style={actionBtn('#15803d', cart.recovery_email_sent)}
                        className="action-btn"
                        title="إرسال إيميل"
                      >
                        <Mail size={14} />
                      </button>
                      {cart.customer_phone && (
                        <>
                          <button 
                            onClick={() => sendWhatsAppMessage(cart.customer_phone, cart.cart_total)}
                            style={actionBtn('#25D366')}
                            className="action-btn"
                            title="واتساب"
                          >
                            <Send size={14} />
                          </button>
                          <button 
                            onClick={() => callCustomer(cart.customer_phone)}
                            style={actionBtn('#3b82f6')}
                            className="action-btn"
                            title="اتصال"
                          >
                            <Phone size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div style={recoveredText}>
                      <CheckCircle size={14} color="#10b981" />
                      استرجع
                    </div>
                  )}
                </div>
              </div>

              {/* Expanded Products View */}
              {expandedCart === cart.id && (
                <div style={expandedSection}>
                  <h4 style={expandedTitle}>تفاصيل المنتجات:</h4>
                  {cart.cart_items?.map((item: any, idx: number) => (
                    <div key={idx} style={expandedProduct}>
                      <img src={item.image_url || item.image} alt="" style={productImage} />
                      <div style={productDetails}>
                        <div style={productName}>{item.name}</div>
                        <div style={productSpecs}>
                          <Car size={13} color="#15803d" />
                          <span>
                            <strong>{item.brand}</strong> • 
                            {item.car_make} {item.car_model} {item.car_model_year}
                          </span>
                        </div>
                        <div style={productPrice}>
                          {item.quantity} × {parseFloat(item.price).toFixed(2)} ج.م = 
                          <strong> {item.line_total?.toFixed(2)} ج.م</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// Styles
const container: any = { padding: '30px', maxWidth: '1600px', margin: '0 auto', direction: 'rtl' };
const header: any = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' };
const title: any = { fontSize: '2rem', fontWeight: '900', color: '#1a1a1a', marginBottom: '5px' };
const subtitle: any = { fontSize: '0.95rem', color: '#666' };
const refreshBtn: any = { padding: '12px 24px', background: '#15803d', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: '0.3s' };
const statsGrid: any = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' };
const statCard = (color: string) => ({ background: color, padding: '25px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '20px', color: '#fff', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' });
const statValue: any = { fontSize: '2rem', fontWeight: '900' };
const statLabel: any = { fontSize: '0.9rem', opacity: 0.9, marginTop: '5px' };
const filtersBar: any = { background: '#fff', padding: '20px', borderRadius: '20px', marginBottom: '25px', display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center', border: '1px solid #eee' };
const searchBox: any = { flex: 1, display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 15px', background: '#f9fafb', borderRadius: '12px', minWidth: '300px' };
const searchInput: any = { flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '0.95rem' };
const filterButtons: any = { display: 'flex', gap: '10px' };
const filterBtn = (active: boolean) => ({ padding: '10px 20px', background: active ? '#15803d' : '#f3f4f6', color: active ? '#fff' : '#666', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s', fontSize: '0.9rem' });
const listContainer: any = { background: '#fff', borderRadius: '20px', border: '1px solid #eee', overflow: 'hidden' };
const tableHeader: any = { display: 'flex', padding: '15px 20px', background: '#f0fdf4', borderBottom: '2px solid #dcfce7', fontWeight: 'bold', fontSize: '0.85rem', color: '#15803d' };
const tableRow = (recovered: boolean) => ({ display: 'flex', padding: '20px', borderBottom: '1px solid #f0f0f0', transition: '0.3s', background: recovered ? '#f0fdf4' : '#fff', cursor: 'pointer' });
const tableCell: any = { display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: '0.85rem' };
const customerColumn: any = { display: 'flex', alignItems: 'center', gap: '10px' };
const customerName: any = { fontWeight: 'bold', fontSize: '0.9rem', color: '#1a1a1a' };
const customerMeta: any = { fontSize: '0.75rem', color: '#999', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' };
const contactColumn: any = { display: 'flex', flexDirection: 'column' as const, gap: '5px' };
const contactItem: any = { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#666' };
const productsColumn: any = { display: 'flex', flexDirection: 'column' as const, gap: '5px', width: '100%' };
const productsHeader: any = { display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '0.85rem' };
const expandBtn: any = { marginLeft: 'auto', padding: '4px 8px', background: 'transparent', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '0.7rem', transition: '0.3s' };
const productQuickView: any = { fontSize: '0.75rem', color: '#666' };
const totalAmount: any = { fontSize: '1.1rem', fontWeight: 'bold', color: '#15803d' };
const cityBadge: any = { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#999', marginTop: '4px' };
const timeColumn: any = { display: 'flex', flexDirection: 'column' as const, gap: '4px', fontSize: '0.75rem', color: '#666' };
const statusBadge = (recovered: boolean) => ({ padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold', background: recovered ? '#d1fae5' : '#fef3c7', color: recovered ? '#065f46' : '#92400e', textAlign: 'center' as const });
const actionsColumn: any = { display: 'flex', gap: '8px' };
const actionBtn = (color: string, disabled?: boolean) => ({ padding: '8px 12px', background: disabled ? '#e5e7eb' : color, color: '#fff', border: 'none', borderRadius: '8px', cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.3s', opacity: disabled ? 0.6 : 1 });
const recoveredText: any = { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#10b981', fontWeight: 'bold' };
const expandedSection: any = { padding: '20px 40px', background: '#f9fafb', borderBottom: '1px solid #eee' };
const expandedTitle: any = { marginBottom: '15px', fontSize: '0.9rem', fontWeight: 'bold', color: '#15803d' };
const expandedProduct: any = { display: 'flex', gap: '15px', padding: '15px', background: '#fff', borderRadius: '12px', marginBottom: '10px', border: '1px solid #eee' };
const productImage: any = { width: '60px', height: '60px', borderRadius: '10px', objectFit: 'cover' as const, border: '1px solid #eee' };
const productDetails: any = { flex: 1, display: 'flex', flexDirection: 'column' as const, gap: '6px' };
const productName: any = { fontWeight: 'bold', fontSize: '0.9rem', color: '#1a1a1a' };
const productSpecs: any = { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#666' };
const productPrice: any = { fontSize: '0.85rem', color: '#15803d', fontWeight: 'bold' };
const emptyState: any = { textAlign: 'center' as const, padding: '60px 20px', color: '#999' };
const loaderStyle: any = { display: 'flex', flexDirection: 'column' as const, justifyContent: 'center', alignItems: 'center', height: '80vh', gap: '15px', color: '#15803d', fontWeight: 'bold' };
