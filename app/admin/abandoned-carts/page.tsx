'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import toast from 'react-hot-toast';
import { 
  ShoppingCart, Mail, Phone, MapPin, Calendar, DollarSign, 
  ExternalLink, RefreshCw, Filter, Search, Eye, Send, 
  CheckCircle, Clock, X, Package, User, Smartphone
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
  const [selectedCart, setSelectedCart] = useState<AbandonedCart | null>(null);
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

    // Filter by status
    if (filter === 'pending') {
      filtered = filtered.filter(cart => !cart.recovered);
    } else if (filter === 'recovered') {
      filtered = filtered.filter(cart => cart.recovered);
    }

    // Search filter
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
      // Call your email API here
      const response = await fetch('/api/send-recovery-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartId, customerEmail })
      });

      if (!response.ok) throw new Error('Failed to send email');

      // Update the database
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
        <RefreshCw className="animate-spin" size={40} color="#15803d" />
        <span>جاري تحميل السلات المتروكة...</span>
      </div>
    );
  }

  return (
    <div style={container}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .cart-card { animation: fadeIn 0.3s ease; }
        .cart-card:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.08); }
        .action-btn:hover { transform: scale(1.05); }
        .filter-btn:hover { background: #15803d !important; color: #fff !important; }
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
          <button 
            onClick={() => setFilter('all')} 
            style={filterBtn(filter === 'all')}
            className="filter-btn"
          >
            الكل ({stats.total})
          </button>
          <button 
            onClick={() => setFilter('pending')} 
            style={filterBtn(filter === 'pending')}
            className="filter-btn"
          >
            قيد الانتظار ({stats.pending})
          </button>
          <button 
            onClick={() => setFilter('recovered')} 
            style={filterBtn(filter === 'recovered')}
            className="filter-btn"
          >
            تم الاسترجاع ({stats.recovered})
          </button>
        </div>
      </div>

      {/* Carts List */}
      {filteredCarts.length === 0 ? (
        <div style={emptyState}>
          <ShoppingCart size={60} color="#ccc" />
          <h3>لا توجد سلات متروكة</h3>
          <p>سيتم عرض السلات المتروكة هنا</p>
        </div>
      ) : (
        <div style={cardsGrid}>
          {filteredCarts.map((cart) => (
            <div key={cart.id} className="cart-card" style={cartCard(cart.recovered)}>
              
              {/* Status Badge */}
              <div style={statusBadge(cart.recovered)}>
                {cart.recovered ? '✅ تم الاسترجاع' : '⏳ قيد الانتظار'}
              </div>

              {/* Customer Info */}
              <div style={customerSection}>
                <div style={customerInfo}>
                  <User size={16} color="#15803d" />
                  <span style={customerName}>{cart.customer_name || 'غير محدد'}</span>
                </div>
                <div style={contactInfo}>
                  <Mail size={14} color="#666" />
                  <span>{cart.customer_email}</span>
                </div>
                {cart.customer_phone && (
                  <div style={contactInfo}>
                    <Phone size={14} color="#666" />
                    <span>{cart.customer_phone}</span>
                  </div>
                )}
              </div>

              {/* Cart Items Summary */}
              <div style={itemsSection}>
                <div style={itemsHeader}>
                  <Package size={16} color="#15803d" />
                  <span>المنتجات ({cart.cart_items?.length || 0})</span>
                </div>
                <div style={itemsList}>
                  {cart.cart_items?.slice(0, 2).map((item: any, idx: number) => (
                    <div key={idx} style={itemRow}>
                      <img src={item.image_url || item.image} alt="" style={itemImage} />
                      <div style={itemDetails}>
                        <span style={itemName}>{item.name}</span>
                        <span style={itemPrice}>{item.quantity} x {parseFloat(item.price).toFixed(2)} ج.م</span>
                      </div>
                    </div>
                  ))}
                  {cart.cart_items?.length > 2 && (
                    <span style={moreItems}>+{cart.cart_items.length - 2} منتجات أخرى</span>
                  )}
                </div>
              </div>

              {/* Cart Total */}
              <div style={totalSection}>
                <span>الإجمالي:</span>
                <span style={totalAmount}>{cart.cart_total?.toFixed(2) || '0.00'} ج.م</span>
              </div>

              {/* Metadata */}
              <div style={metadata}>
                <div style={metaItem}>
                  <Calendar size={12} color="#999" />
                  <span>{formatDate(cart.last_activity_at || cart.created_at)}</span>
                </div>
                <div style={metaItem}>
                  <Smartphone size={12} color="#999" />
                  <span>{cart.device_type === 'mobile' ? 'موبايل' : 'كمبيوتر'}</span>
                </div>
                {cart.shipping_city && (
                  <div style={metaItem}>
                    <MapPin size={12} color="#999" />
                    <span>{cart.shipping_city}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {!cart.recovered && (
                <div style={actionsSection}>
                  <button 
                    onClick={() => sendRecoveryEmail(cart.id, cart.customer_email)}
                    disabled={sendingEmail === cart.id || cart.recovery_email_sent}
                    style={actionButton('#15803d', cart.recovery_email_sent)}
                    className="action-btn"
                  >
                    <Mail size={16} />
                    {cart.recovery_email_sent ? 'تم الإرسال' : sendingEmail === cart.id ? 'جاري الإرسال...' : 'إرسال إيميل'}
                  </button>
                  
                  {cart.customer_phone && (
                    <>
                      <button 
                        onClick={() => sendWhatsAppMessage(cart.customer_phone, cart.cart_total)}
                        style={actionButton('#25D366')}
                        className="action-btn"
                      >
                        <Send size={16} />
                        واتساب
                      </button>
                      <button 
                        onClick={() => callCustomer(cart.customer_phone)}
                        style={actionButton('#3b82f6')}
                        className="action-btn"
                      >
                        <Phone size={16} />
                        اتصال
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Recovered Info */}
              {cart.recovered && cart.recovered_at && (
                <div style={recoveredInfo}>
                  <CheckCircle size={14} color="#10b981" />
                  <span>تم الاسترجاع في {new Date(cart.recovered_at).toLocaleDateString('ar-EG')}</span>
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
const container: any = { padding: '30px', maxWidth: '1400px', margin: '0 auto', direction: 'rtl' };
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

const cardsGrid: any = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '20px' };
const cartCard = (recovered: boolean) => ({ background: '#fff', padding: '25px', borderRadius: '20px', border: recovered ? '2px solid #10b981' : '1px solid #eee', position: 'relative' as const, transition: '0.3s', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' });
const statusBadge = (recovered: boolean) => ({ position: 'absolute' as const, top: '15px', left: '15px', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold', background: recovered ? '#d1fae5' : '#fef3c7', color: recovered ? '#065f46' : '#92400e' });

const customerSection: any = { marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #f0f0f0' };
const customerInfo: any = { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' };
const customerName: any = { fontWeight: '900', fontSize: '1.1rem', color: '#1a1a1a' };
const contactInfo: any = { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#666', marginTop: '5px' };

const itemsSection: any = { marginBottom: '15px' };
const itemsHeader: any = { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontWeight: 'bold', fontSize: '0.9rem' };
const itemsList: any = { display: 'flex', flexDirection: 'column' as const, gap: '8px' };
const itemRow: any = { display: 'flex', gap: '10px', alignItems: 'center', padding: '8px', background: '#f9fafb', borderRadius: '10px' };
const itemImage: any = { width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' as const, border: '1px solid #eee' };
const itemDetails: any = { flex: 1, display: 'flex', flexDirection: 'column' as const, gap: '3px' };
const itemName: any = { fontSize: '0.85rem', fontWeight: 'bold', color: '#1a1a1a' };
const itemPrice: any = { fontSize: '0.75rem', color: '#666' };
const moreItems: any = { fontSize: '0.75rem', color: '#15803d', fontWeight: 'bold', marginTop: '5px' };

const totalSection: any = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: '#f0fdf4', borderRadius: '12px', marginBottom: '15px', fontWeight: 'bold' };
const totalAmount: any = { fontSize: '1.3rem', color: '#15803d' };

const metadata: any = { display: 'flex', gap: '15px', flexWrap: 'wrap' as const, marginBottom: '15px' };
const metaItem: any = { display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: '#999' };

const actionsSection: any = { display: 'flex', gap: '10px', flexWrap: 'wrap' as const };
const actionButton = (color: string, disabled?: boolean) => ({ 
  flex: 1, 
  padding: '12px', 
  background: disabled ? '#e5e7eb' : color, 
  color: '#fff', 
  border: 'none', 
  borderRadius: '10px', 
  fontWeight: 'bold', 
  cursor: disabled ? 'not-allowed' : 'pointer', 
  display: 'flex', 
  alignItems: 'center', 
  justifyContent: 'center', 
  gap: '8px', 
  fontSize: '0.85rem',
  transition: '0.3s',
  opacity: disabled ? 0.6 : 1
});

const recoveredInfo: any = { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: '#d1fae5', borderRadius: '10px', fontSize: '0.85rem', color: '#065f46', fontWeight: 'bold' };

const emptyState: any = { textAlign: 'center' as const, padding: '60px 20px', color: '#999' };
const loaderStyle: any = { display: 'flex', flexDirection: 'column' as const, justifyContent: 'center', alignItems: 'center', height: '80vh', gap: '15px', color: '#15803d', fontWeight: 'bold' };
