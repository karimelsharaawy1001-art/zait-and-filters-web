'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import toast from 'react-hot-toast';
import {
  ShoppingCart, Mail, Phone, MapPin, Calendar, DollarSign,
  RefreshCw, Search, Send, CheckCircle, Clock, Package,
  User, Smartphone, Car, Trash2, ChevronLeft, ChevronRight,
  TrendingUp, AlertCircle, Monitor, ChevronsLeft, ChevronsRight,
  MoreHorizontal
} from 'lucide-react';

const ITEMS_PER_PAGE = 12;

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

function formatExactTime(dateString: string): { date: string; time: string; relative: string } {
  if (!dateString) return { date: '—', time: '—', relative: '—' };
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const dateStr = date.toLocaleDateString('ar-EG', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
  let relative = '';
  if (diffMins < 1) relative = 'الآن';
  else if (diffMins < 60) relative = `${diffMins}د`;
  else if (diffHours < 24) relative = `${diffHours}س`;
  else if (diffDays === 1) relative = 'أمس';
  else relative = `${diffDays}ي`;
  return { date: dateStr, time: timeStr, relative };
}

// ── Smart Pagination Component ────────────────────────────────────────────────
function SmartPagination({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (p: number) => void;
}) {
  const [jumpValue, setJumpValue] = useState('');

  // Build the visible page numbers with ellipsis
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    if (totalPages <= 9) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | 'ellipsis')[] = [];
    // Always show first page
    pages.push(1);
    // Left ellipsis
    if (currentPage > 4) pages.push('ellipsis');
    // Pages around current
    const start = Math.max(2, currentPage - 2);
    const end = Math.min(totalPages - 1, currentPage + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    // Right ellipsis
    if (currentPage < totalPages - 3) pages.push('ellipsis');
    // Always show last page
    pages.push(totalPages);
    return pages;
  };

  const handleJump = () => {
    const n = parseInt(jumpValue);
    if (!isNaN(n) && n >= 1 && n <= totalPages) {
      onPageChange(n);
      setJumpValue('');
    }
  };

  const from = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const to = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '12px',
      marginTop: '16px',
      padding: '14px 20px',
      background: '#fff',
      borderRadius: '14px',
      border: '1px solid #f1f5f9',
      direction: 'rtl',
    }}>
      {/* Results count */}
      <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '600', whiteSpace: 'nowrap' }}>
        عرض <span style={{ fontWeight: '800', color: '#0f172a' }}>{from}–{to}</span> من{' '}
        <span style={{ fontWeight: '800', color: '#0f172a' }}>{totalItems.toLocaleString()}</span> سلة
      </div>

      {/* Page buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {/* First page */}
        <PaginationBtn
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          title="الصفحة الأولى"
        >
          <ChevronsRight size={14} />
        </PaginationBtn>

        {/* Previous page */}
        <PaginationBtn
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          title="السابقة"
        >
          <ChevronRight size={14} />
        </PaginationBtn>

        {/* Page numbers */}
        {getPageNumbers().map((p, idx) =>
          p === 'ellipsis' ? (
            <div
              key={`ellipsis-${idx}`}
              style={{ width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}
            >
              <MoreHorizontal size={14} />
            </div>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              style={{
                minWidth: '34px',
                height: '34px',
                padding: '0 6px',
                borderRadius: '9px',
                border: currentPage === p ? 'none' : '1px solid #e2e8f0',
                background: currentPage === p ? '#0f172a' : '#fff',
                color: currentPage === p ? '#fff' : '#475569',
                fontWeight: currentPage === p ? '800' : '600',
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.15s',
                lineHeight: 1,
              }}
            >
              {p}
            </button>
          )
        )}

        {/* Next page */}
        <PaginationBtn
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          title="التالية"
        >
          <ChevronLeft size={14} />
        </PaginationBtn>

        {/* Last page */}
        <PaginationBtn
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          title="الصفحة الأخيرة"
        >
          <ChevronsLeft size={14} />
        </PaginationBtn>
      </div>

      {/* Jump to page */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: '#64748b' }}>
        <span style={{ fontWeight: '600', whiteSpace: 'nowrap' }}>انتقل إلى:</span>
        <input
          type="number"
          min={1}
          max={totalPages}
          value={jumpValue}
          onChange={(e) => setJumpValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleJump()}
          placeholder={`1–${totalPages}`}
          style={{
            width: '72px',
            height: '34px',
            border: '1px solid #e2e8f0',
            borderRadius: '9px',
            padding: '0 10px',
            fontSize: '0.875rem',
            textAlign: 'center',
            outline: 'none',
            color: '#0f172a',
            fontWeight: '700',
          }}
        />
        <button
          onClick={handleJump}
          style={{
            height: '34px',
            padding: '0 14px',
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            borderRadius: '9px',
            fontSize: '0.875rem',
            fontWeight: '700',
            cursor: 'pointer',
            color: '#334155',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#e2e8f0')}
          onMouseLeave={e => (e.currentTarget.style.background = '#f1f5f9')}
        >
          اذهب
        </button>
      </div>
    </div>
  );
}

function PaginationBtn({ onClick, disabled, children, title }: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        width: '34px',
        height: '34px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '9px',
        border: '1px solid #e2e8f0',
        background: disabled ? '#f8fafc' : '#fff',
        color: disabled ? '#cbd5e1' : '#475569',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function AbandonedCartsAdmin() {
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [filteredCarts, setFilteredCarts] = useState<AbandonedCart[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'recovered'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCart, setExpandedCart] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [deletingCart, setDeletingCart] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => { fetchAbandonedCarts(); }, []);
  useEffect(() => { applyFilters(); setCurrentPage(1); }, [carts, filter, searchTerm]);

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
      toast.error('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...carts];
    if (filter === 'pending') filtered = filtered.filter(c => !c.recovered);
    else if (filter === 'recovered') filtered = filtered.filter(c => c.recovered);
    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.customer_phone?.includes(searchTerm)
      );
    }
    setFilteredCarts(filtered);
  };

  const deleteCart = async (cartId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه السلة؟')) return;
    setDeletingCart(cartId);
    try {
      const { error } = await supabase.from('abandoned_carts').delete().eq('id', cartId);
      if (error) throw error;
      toast.success('تم الحذف ✓');
      setCarts(prev => prev.filter(c => c.id !== cartId));
    } catch (err: any) {
      toast.error('خطأ: ' + err.message);
    } finally {
      setDeletingCart(null);
    }
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
      await supabase.from('abandoned_carts')
        .update({ recovery_email_sent: true, recovery_email_sent_at: new Date().toISOString() })
        .eq('id', cartId);
      toast.success('تم الإرسال ✓');
      fetchAbandonedCarts();
    } catch (err: any) {
      toast.error('خطأ: ' + err.message);
    } finally {
      setSendingEmail(null);
    }
  };

  const sendWhatsApp = (phone: string, total: number) => {
    const msg = encodeURIComponent(`مرحباً! 👋\n\nلاحظنا أنك تركت منتجات في سلتك بقيمة ${total.toFixed(2)} ج.م\n\nأكمل طلبك الآن واحصل على خصم 10% باستخدام كود: COMEBACK10\n\nhttps://zaitandfilters.com/checkout`);
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  // Scroll to top of table when page changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const stats = {
    total: carts.length,
    pending: carts.filter(c => !c.recovered).length,
    recovered: carts.filter(c => c.recovered).length,
    totalValue: carts.reduce((s, c) => s + (c.cart_total || 0), 0),
    recoveryRate: carts.length ? Math.round((carts.filter(c => c.recovered).length / carts.length) * 100) : 0,
  };

  const totalPages = Math.ceil(filteredCarts.length / ITEMS_PER_PAGE);
  const paginated = filteredCarts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh', gap: '14px', color: '#15803d' }}>
      <RefreshCw size={36} style={{ animation: 'spin 1s linear infinite' }} />
      <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>جاري التحميل...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ padding: '24px', maxWidth: '1500px', margin: '0 auto', direction: 'rtl', background: '#f8fafc', minHeight: '100vh' }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform:rotate(360deg); } }
        .ac-row { transition: background 0.15s; }
        .ac-row:hover { background: #f0fdf4 !important; }
        .ac-btn { transition: all 0.15s; }
        .ac-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.05); }
        .ac-chip:hover { opacity: 0.85; }
        .ac-expand:hover { background: #f0fdf4 !important; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '900', color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>
            السلات المتروكة
          </h1>
          <p style={{ fontSize: '0.92rem', color: '#94a3b8', marginTop: '3px', fontWeight: '500' }}>
            تتبع واسترجع العملاء المحتملين
          </p>
        </div>
        <button
          onClick={fetchAbandonedCarts}
          className="ac-btn"
          style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 16px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '0.93rem', cursor: 'pointer' }}
        >
          <RefreshCw size={14} /> تحديث
        </button>
      </div>

      {/* ── Stats Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'إجمالي السلات', value: stats.total, icon: <ShoppingCart size={16} />, color: '#0f172a', light: '#f1f5f9' },
          { label: 'قيد الانتظار', value: stats.pending, icon: <AlertCircle size={16} />, color: '#d97706', light: '#fffbeb' },
          { label: 'تم الاسترجاع', value: stats.recovered, icon: <CheckCircle size={16} />, color: '#15803d', light: '#f0fdf4' },
          { label: 'معدل الاسترجاع', value: `${stats.recoveryRate}%`, icon: <TrendingUp size={16} />, color: '#7c3aed', light: '#f5f3ff' },
          { label: 'القيمة الكلية', value: `${stats.totalValue.toFixed(0)} ج`, icon: <DollarSign size={16} />, color: '#0369a1', light: '#f0f9ff' },
        ].map((s, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: '14px', padding: '14px 16px', border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', animation: `fadeUp 0.3s ease ${i * 0.05}s both` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '700' }}>{s.label}</span>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: s.light, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                {s.icon}
              </div>
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: '900', color: s.color, letterSpacing: '-0.5px' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Filters Bar ── */}
      <div style={{ background: '#fff', borderRadius: '14px', padding: '12px 16px', marginBottom: '14px', display: 'flex', gap: '12px', alignItems: 'center', border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', borderRadius: '9px', padding: '8px 12px' }}>
          <Search size={15} color="#cbd5e1" />
          <input
            type="text"
            placeholder="بحث بالاسم، الإيميل، أو الموبايل..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '0.96rem', color: '#334155' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['all', 'pending', 'recovered'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="ac-chip"
              style={{ padding: '7px 14px', background: filter === f ? '#0f172a' : '#f1f5f9', color: filter === f ? '#fff' : '#64748b', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.15s' }}
            >
              {f === 'all' ? `الكل · ${stats.total}` : f === 'pending' ? `انتظار · ${stats.pending}` : `مسترجع · ${stats.recovered}`}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      {filteredCarts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#cbd5e1', background: '#fff', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
          <ShoppingCart size={48} strokeWidth={1} />
          <p style={{ marginTop: '12px', fontWeight: '700' }}>لا توجد نتائج</p>
        </div>
      ) : (
        <>
          <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
            {/* Table head */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.6fr 2.2fr 0.9fr 1.4fr 0.8fr 1.6fr', padding: '10px 18px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
              {['العميل', 'التواصل', 'المنتجات', 'الإجمالي', 'التوقيت', 'الحالة', 'إجراءات'].map((h, i) => (
                <div key={i} style={{ fontSize: '0.78rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', paddingRight: i > 0 ? '10px' : 0 }}>{h}</div>
              ))}
            </div>

            {/* Rows */}
            {paginated.map((cart, idx) => {
              const ts = formatExactTime(cart.last_activity_at || cart.created_at);
              const isExpanded = expandedCart === cart.id;

              return (
                <div key={cart.id} style={{ animation: `fadeUp 0.25s ease ${idx * 0.03}s both` }}>
                  <div
                    className="ac-row"
                    style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.6fr 2.2fr 0.9fr 1.4fr 0.8fr 1.6fr', padding: '11px 18px', borderBottom: '1px solid #f8fafc', background: cart.recovered ? '#fafffe' : '#fff', alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => setExpandedCart(isExpanded ? null : cart.id)}
                  >
                    {/* Customer */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: cart.recovered ? '#dcfce7' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <User size={15} color={cart.recovered ? '#15803d' : '#94a3b8'} />
                      </div>
                      <div>
                        <div style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>{cart.customer_name || 'غير محدد'}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          {cart.device_type === 'mobile' ? <Smartphone size={10} color="#cbd5e1" /> : <Monitor size={10} color="#cbd5e1" />}
                          <span style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: '600' }}>{cart.device_type === 'mobile' ? 'موبايل' : 'كمبيوتر'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Contact */}
                    <div style={{ paddingRight: '10px' }}>
                      <div style={{ fontSize: '0.88rem', color: '#475569', fontWeight: '600', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                        {cart.customer_email}
                      </div>
                      {cart.customer_phone && (
                        <div style={{ fontSize: '0.84rem', color: '#94a3b8', fontWeight: '600', direction: 'ltr', textAlign: 'right' }}>{cart.customer_phone}</div>
                      )}
                    </div>

                    {/* Products */}
                    <div style={{ paddingRight: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <div style={{ padding: '2px 8px', background: '#f0fdf4', borderRadius: '5px', fontSize: '0.8rem', fontWeight: '800', color: '#15803d' }}>
                          {cart.cart_items?.length || 0} منتج
                        </div>
                      </div>
                      {cart.cart_items?.[0] && (
                        <div style={{ fontSize: '0.84rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                          {cart.cart_items[0].name}
                        </div>
                      )}
                    </div>

                    {/* Total */}
                    <div style={{ paddingRight: '10px' }}>
                      <div style={{ fontSize: '1rem', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.3px' }}>{(cart.cart_total || 0).toFixed(0)}</div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>ج.م</div>
                    </div>

                    {/* Time */}
                    <div style={{ paddingRight: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' }}>
                        <Clock size={11} color="#94a3b8" />
                        <span style={{ fontSize: '0.84rem', fontWeight: '700', color: '#334155' }}>{ts.time}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>{ts.date}</div>
                      <div style={{ display: 'inline-block', marginTop: '3px', padding: '1px 6px', background: '#f1f5f9', borderRadius: '4px', fontSize: '0.78rem', fontWeight: '800', color: '#64748b' }}>{ts.relative}</div>
                    </div>

                    {/* Status */}
                    <div style={{ paddingRight: '10px' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 9px', borderRadius: '7px', fontSize: '0.8rem', fontWeight: '800', background: cart.recovered ? '#dcfce7' : '#fef3c7', color: cart.recovered ? '#15803d' : '#92400e' }}>
                        {cart.recovered ? <CheckCircle size={10} /> : <Clock size={10} />}
                        {cart.recovered ? 'تم' : 'قيد'}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center', paddingRight: '10px' }} onClick={e => e.stopPropagation()}>
                      {!cart.recovered && (
                        <>
                          <button
                            onClick={() => sendRecoveryEmail(cart.id, cart.customer_email)}
                            disabled={sendingEmail === cart.id || cart.recovery_email_sent}
                            className="ac-btn"
                            title={cart.recovery_email_sent ? 'تم الإرسال' : 'إرسال إيميل'}
                            style={{ width: '30px', height: '30px', borderRadius: '8px', border: 'none', background: cart.recovery_email_sent ? '#dcfce7' : '#eff6ff', color: cart.recovery_email_sent ? '#15803d' : '#3b82f6', cursor: cart.recovery_email_sent ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Mail size={13} />
                          </button>
                          {cart.customer_phone && (
                            <button
                              onClick={() => sendWhatsApp(cart.customer_phone, cart.cart_total)}
                              className="ac-btn"
                              title="واتساب"
                              style={{ width: '30px', height: '30px', borderRadius: '8px', border: 'none', background: '#f0fdf4', color: '#15803d', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Send size={13} />
                            </button>
                          )}
                          {cart.customer_phone && (
                            <button
                              onClick={() => window.open(`tel:${cart.customer_phone}`, '_self')}
                              className="ac-btn"
                              title="اتصال"
                              style={{ width: '30px', height: '30px', borderRadius: '8px', border: 'none', background: '#eff6ff', color: '#6366f1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Phone size={13} />
                            </button>
                          )}
                        </>
                      )}
                      <button
                        onClick={() => deleteCart(cart.id)}
                        disabled={deletingCart === cart.id}
                        className="ac-btn"
                        title="حذف"
                        style={{ width: '30px', height: '30px', borderRadius: '8px', border: 'none', background: '#fff1f2', color: '#e11d48', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        {deletingCart === cart.id
                          ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                          : <Trash2 size={13} />}
                      </button>
                      <button
                        onClick={() => setExpandedCart(isExpanded ? null : cart.id)}
                        className="ac-btn ac-expand"
                        style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid #f1f5f9', background: isExpanded ? '#f0fdf4' : '#fff', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '900' }}
                      >
                        {isExpanded ? '▲' : '▼'}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Products */}
                  {isExpanded && (
                    <div style={{ padding: '14px 20px 16px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#94a3b8', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '10px' }}>تفاصيل المنتجات</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {cart.cart_items?.map((item: any, i: number) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: '#fff', borderRadius: '11px', border: '1px solid #f1f5f9' }}>
                            {(item.image_url || item.image) && (
                              <img src={item.image_url || item.image} alt="" style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'contain', border: '1px solid #f1f5f9', background: '#fafafa' }} />
                            )}
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.93rem', fontWeight: '800', color: '#0f172a' }}>{item.name}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                                {item.brand && <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#15803d', background: '#f0fdf4', padding: '1px 7px', borderRadius: '4px' }}>{item.brand}</span>}
                                {item.car_make && <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>{item.car_make} {item.car_model} {item.car_model_year}</span>}
                              </div>
                            </div>
                            <div style={{ textAlign: 'left' }}>
                              <div style={{ fontSize: '0.96rem', fontWeight: '900', color: '#0f172a' }}>{(parseFloat(item.price) * item.quantity).toFixed(2)} ج.م</div>
                              <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>× {item.quantity}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
                        {[
                          { label: 'آخر نشاط', value: formatExactTime(cart.last_activity_at || cart.created_at) },
                          cart.recovered_at ? { label: 'تاريخ الاسترجاع', value: formatExactTime(cart.recovered_at) } : null,
                        ].filter(Boolean).map((t: any, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '6px 12px', background: '#fff', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                            <Clock size={12} color="#94a3b8" />
                            <span style={{ fontSize: '0.84rem', color: '#64748b', fontWeight: '700' }}>{t.label}:</span>
                            <span style={{ fontSize: '0.84rem', color: '#0f172a', fontWeight: '800' }}>{t.value.date} — {t.value.time}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Smart Pagination ── */}
          {totalPages > 1 && (
            <SmartPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredCarts.length}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}
    </div>
  );
}