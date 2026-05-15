'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import toast from 'react-hot-toast';
import {
  ShoppingCart, Mail, Phone, DollarSign,
  RefreshCw, Search, Send, CheckCircle, Clock,
  User, Smartphone, Trash2, ChevronLeft, ChevronRight,
  TrendingUp, AlertCircle, Monitor, ChevronsLeft, ChevronsRight,
  MoreHorizontal, Bell, Tag, Zap, MessageCircle, RotateCcw,
  ArrowRightLeft,
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
  reminder_sent?: boolean;
  reminder_sent_at?: string | null;
  reminder_promo_code?: string | null;
  _returnCount?: number;
  _isDuplicate?: boolean;
}

function formatExactTime(dateString: string | null | undefined): { date: string; time: string; relative: string } {
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

function isWithin24Hours(dateString: string | null | undefined): boolean {
  if (!dateString) return false;
  return Date.now() - new Date(dateString).getTime() < 24 * 60 * 60 * 1000;
}

function isWithin48Hours(dateString: string | null | undefined): boolean {
  if (!dateString) return false;
  return Date.now() - new Date(dateString).getTime() < 48 * 60 * 60 * 1000;
}

function toWhatsAppNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('20') && digits.length === 12) return digits;
  if (digits.startsWith('20') && digits.length !== 12) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length === 11) return '2' + digits;
  if (digits.startsWith('1') && digits.length === 10) return '20' + digits;
  return '20' + digits;
}

// ── FIX: Use String.fromCodePoint() so emojis survive file encoding and encodeURIComponent ──
const EMOJI = {
  smile: String.fromCodePoint(0x1F604),          // 😄
  oil:   String.fromCodePoint(0x1F6E2, 0xFE0F),  // 🛢️  (oil drum + VS-16 variation selector)
  down:  String.fromCodePoint(0x1F447),           // 👇
  hands: String.fromCodePoint(0x1F64C),           // 🙌
};

function openWhatsApp(waNumber: string, msg: string) {
  const waUrl = `https://wa.me/${waNumber}?text=${msg}`;
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile) {
    window.location.href = waUrl;
  } else {
    window.open(waUrl, '_blank');
  }
}

function buildWhatsAppMessage(cart: AbandonedCart, promoCode: string): string {
  const items = cart.cart_items?.slice(0, 2).map((i: any) => i.name).join('، ') || 'منتجات';
  const more  = cart.cart_items?.length > 2 ? ` و${cart.cart_items.length - 2} منتجات أخرى` : '';
  // Build the plain text first, then encode — emojis from EMOJI constant are valid Unicode
  const plainText =
    `إزيك يا ${cart.customer_name || 'صديقنا'} ${EMOJI.smile}\n` +
    `إحنا زيت اند فلترز ${EMOJI.oil}\n\n` +
    `سلتك بتستناك من امبارح — فيها ${items}${more}\n\n` +
    `مش هنضغط عليك، بس عشان إحنا بنحب عملاءنا، عملنالك كود خصم 5% خاص بيك:\n` +
    `*${promoCode}*\n\n` +
    `استخدمه قبل بكره و كمل طلبك من هنا ${EMOJI.down}\n` +
    `https://zaitandfilters.com/checkout\n\n` +
    `لو عندك أي سؤال، إحنا هنا ${EMOJI.hands}`;
  return encodeURIComponent(plainText);
}

function generatePromoCode(cartId: string): string {
  const suffix = cartId.replace(/-/g, '').slice(0, 6).toUpperCase();
  return `BACK-${suffix}`;
}

// ── FIX 1: propagate recovered=true if ANY entry in the group is recovered ────
function deduplicateCarts(carts: AbandonedCart[]): AbandonedCart[] {
  const groups = new Map<string, AbandonedCart[]>();
  for (const cart of carts) {
    const key = cart.customer_phone?.trim() || cart.customer_email?.trim() || cart.id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(cart);
  }
  const result: AbandonedCart[] = [];
  for (const [, group] of groups) {
    group.sort((a, b) =>
      new Date(b.last_activity_at || b.created_at).getTime() -
      new Date(a.last_activity_at || a.created_at).getTime()
    );
    const latest = { ...group[0] };
    latest._returnCount = group.length;
    latest._isDuplicate = group.length > 1;
    if (!latest.recovered && group.some(c => c.recovered)) {
      latest.recovered = true;
      latest.recovered_at = group.find(c => c.recovered)?.recovered_at ?? null;
    }
    result.push(latest);
  }
  result.sort((a, b) =>
    new Date(b.last_activity_at || b.created_at).getTime() -
    new Date(a.last_activity_at || a.created_at).getTime()
  );
  return result;
}

function SmartPagination({ currentPage, totalPages, totalItems, onPageChange }: {
  currentPage: number; totalPages: number; totalItems: number; onPageChange: (p: number) => void;
}) {
  const [jumpValue, setJumpValue] = useState('');
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    if (totalPages <= 9) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | 'ellipsis')[] = [];
    pages.push(1);
    if (currentPage > 4) pages.push('ellipsis');
    for (let i = Math.max(2, currentPage - 2); i <= Math.min(totalPages - 1, currentPage + 2); i++) pages.push(i);
    if (currentPage < totalPages - 3) pages.push('ellipsis');
    pages.push(totalPages);
    return pages;
  };
  const handleJump = () => {
    const n = parseInt(jumpValue);
    if (!isNaN(n) && n >= 1 && n <= totalPages) { onPageChange(n); setJumpValue(''); }
  };
  const from = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const to = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);
  const PBtn = ({ onClick, disabled, children, title }: any) => (
    <button onClick={onClick} disabled={disabled} title={title} style={{ width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '9px', border: '1px solid #e2e8f0', background: disabled ? '#f8fafc' : '#fff', color: disabled ? '#cbd5e1' : '#475569', cursor: disabled ? 'not-allowed' : 'pointer', flexShrink: 0 }}>{children}</button>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginTop: '16px', padding: '14px 20px', background: '#fff', borderRadius: '14px', border: '1px solid #f1f5f9', direction: 'rtl' }}>
      <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '600' }}>عرض <span style={{ fontWeight: '800', color: '#0f172a' }}>{from}–{to}</span> من <span style={{ fontWeight: '800', color: '#0f172a' }}>{totalItems.toLocaleString()}</span> سلة</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <PBtn onClick={() => onPageChange(1)} disabled={currentPage === 1} title="الأولى"><ChevronsRight size={14} /></PBtn>
        <PBtn onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} title="السابقة"><ChevronRight size={14} /></PBtn>
        {getPageNumbers().map((p, idx) => p === 'ellipsis' ? (
          <div key={`e-${idx}`} style={{ width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}><MoreHorizontal size={14} /></div>
        ) : (
          <button key={p} onClick={() => onPageChange(p as number)} style={{ minWidth: '34px', height: '34px', padding: '0 6px', borderRadius: '9px', border: currentPage === p ? 'none' : '1px solid #e2e8f0', background: currentPage === p ? '#0f172a' : '#fff', color: currentPage === p ? '#fff' : '#475569', fontWeight: currentPage === p ? '800' : '600', fontSize: '0.875rem', cursor: 'pointer' }}>{p}</button>
        ))}
        <PBtn onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} title="التالية"><ChevronLeft size={14} /></PBtn>
        <PBtn onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages} title="الأخيرة"><ChevronsLeft size={14} /></PBtn>
      </div>
      <div className="ac-pagination-jump" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: '#64748b' }}>
        <span style={{ fontWeight: '600' }}>انتقل إلى:</span>
        <input type="number" min={1} max={totalPages} value={jumpValue} onChange={e => setJumpValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleJump()} placeholder={`1–${totalPages}`} style={{ width: '72px', height: '34px', border: '1px solid #e2e8f0', borderRadius: '9px', padding: '0 10px', fontSize: '0.875rem', textAlign: 'center', outline: 'none' }} />
        <button onClick={handleJump} style={{ height: '34px', padding: '0 14px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '9px', fontSize: '0.875rem', fontWeight: '700', cursor: 'pointer' }}>اذهب</button>
      </div>
    </div>
  );
}

function ReminderModal({ carts, onClose, onDone }: { carts: AbandonedCart[]; onClose: () => void; onDone: () => void; }) {
  const eligible = carts.filter(c => !c.recovered && isWithin48Hours(c.last_activity_at || c.created_at) && c.customer_phone);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState<string | null>(null);

  async function sendReminder(cart: AbandonedCart) {
    setSending(cart.id);
    const promoCode = cart.reminder_promo_code || generatePromoCode(cart.id);
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 2);
    const { error: couponError } = await supabase.from('coupons').upsert(
      { code: promoCode, discount_type: 'percentage', discount_value: 5, is_active: true, expiry_date: expiry.toISOString() },
      { onConflict: 'code' }
    );
    if (couponError) { toast.error('فشل إنشاء كود الخصم: ' + couponError.message); setSending(null); return; }
    await supabase.from('abandoned_carts').update({
      reminder_sent: true,
      reminder_sent_at: new Date().toISOString(),
      reminder_promo_code: promoCode,
    }).eq('id', cart.id);
    const waNumber = toWhatsAppNumber(cart.customer_phone);
    const msg = buildWhatsAppMessage(cart, promoCode);
    openWhatsApp(waNumber, msg);
    setSent(prev => new Set([...prev, cart.id]));
    setSending(null);
    toast.success(`تم فتح واتساب لـ ${cart.customer_name} ✅`);
  }

  async function sendAll() {
    for (const cart of eligible) {
      if (!sent.has(cart.id) && !cart.reminder_sent) { await sendReminder(cart); await new Promise(r => setTimeout(r, 800)); }
    }
    toast.success(`تم إرسال التذكيرات! 🎉`);
    onDone();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '620px', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(0,0,0,0.2)', direction: 'rtl' }}>
        <div style={{ padding: '24px 28px 16px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '900', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', background: '#f0fdf4', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bell size={18} color="#15803d" /></div>
                إرسال تذكير واتساب بخصم 5%
              </h2>
              <p style={{ margin: '6px 0 0', color: '#94a3b8', fontSize: '0.88rem', fontWeight: '600' }}>السلات المتروكة خلال آخر 48 ساعة — {eligible.length} عميل</p>
            </div>
            <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', color: '#64748b' }}>✕</button>
          </div>
          <div style={{ marginTop: '14px', background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '1px solid #86efac', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Tag size={16} color="#15803d" />
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#15803d' }}>كود خصم 5% تلقائي لكل عميل</div>
              <div style={{ fontSize: '0.78rem', color: '#16a34a', marginTop: '2px' }}>يُنشأ كود فريد لكل عميل، صالح 48 ساعة، ويُحفظ تلقائياً في جدول الكوبونات</div>
            </div>
          </div>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 28px' }}>
          {eligible.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              <Clock size={40} strokeWidth={1} style={{ margin: '0 auto 12px', display: 'block' }} />
              <p style={{ fontWeight: '700', fontSize: '0.95rem' }}>لا توجد سلات متروكة في آخر 48 ساعة</p>
            </div>
          ) : eligible.map(cart => {
            const isSent = sent.has(cart.id) || !!cart.reminder_sent;
            const promoCode = cart.reminder_promo_code || generatePromoCode(cart.id);
            const ts = formatExactTime(cart.last_activity_at || cart.created_at);
            return (
              <div key={cart.id} style={{ background: isSent ? '#f0fdf4' : '#f8fafc', border: `1px solid ${isSent ? '#86efac' : '#e2e8f0'}`, borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px', transition: 'all 0.2s' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: isSent ? '#dcfce7' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {isSent ? <CheckCircle size={18} color="#15803d" /> : <User size={18} color="#94a3b8" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '800', fontSize: '0.95rem', color: '#0f172a' }}>{cart.customer_name || 'عميل'}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span>{cart.customer_phone}</span>
                    <span style={{ color: '#cbd5e1' }}>·</span>
                    <span>{(cart.cart_total || 0).toFixed(0)} ج.م</span>
                    <span style={{ color: '#cbd5e1' }}>·</span>
                    <span style={{ color: '#f59e0b', fontWeight: '700' }}>{ts.relative} مضت</span>
                  </div>
                  <div style={{ marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '5px', background: isSent ? '#dcfce7' : '#fff', border: `1px solid ${isSent ? '#86efac' : '#e2e8f0'}`, borderRadius: '7px', padding: '3px 9px' }}>
                    <Tag size={11} color={isSent ? '#15803d' : '#94a3b8'} />
                    <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', fontWeight: '900', color: isSent ? '#15803d' : '#475569', letterSpacing: '0.5px' }}>{promoCode}</span>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '600' }}>— خصم 5%</span>
                  </div>
                </div>
                <button onClick={() => sendReminder(cart)} disabled={sending === cart.id || isSent}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '10px', border: 'none', background: isSent ? '#dcfce7' : 'linear-gradient(135deg, #25D366, #128C7E)', color: isSent ? '#15803d' : '#fff', fontWeight: '800', fontSize: '0.85rem', cursor: isSent || sending === cart.id ? 'not-allowed' : 'pointer', flexShrink: 0, whiteSpace: 'nowrap', opacity: sending === cart.id ? 0.7 : 1 }}>
                  {sending === cart.id ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : isSent ? <CheckCircle size={14} /> : <MessageCircle size={14} />}
                  {sending === cart.id ? 'جاري...' : isSent ? 'تم الإرسال' : 'واتساب'}
                </button>
              </div>
            );
          })}
        </div>
        {eligible.length > 0 && (
          <div style={{ padding: '16px 28px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '10px' }}>
            <button onClick={sendAll} style={{ flex: 1, padding: '13px', background: 'linear-gradient(135deg, #25D366, #128C7E)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '900', fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Zap size={16} /> إرسال للكل ({eligible.filter(c => !sent.has(c.id) && !c.reminder_sent).length} عميل)
            </button>
            <button onClick={() => { onDone(); onClose(); }} style={{ padding: '13px 20px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer' }}>إغلاق</button>
          </div>
        )}
      </div>
      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
    </div>
  );
}

function EmailModal({ carts, onClose, onDone }: { carts: AbandonedCart[]; onClose: () => void; onDone: () => void; }) {
  const eligible = carts.filter(c => !c.recovered && c.customer_email && !c.customer_phone);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState<string | null>(null);

  async function sendEmail(cart: AbandonedCart) {
    setSending(cart.id);
    try {
      const res = await fetch('/api/send-cart-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cartId: cart.id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل الإرسال');
      setSent(prev => new Set([...prev, cart.id]));
      toast.success(`تم إرسال الإيميل لـ ${cart.customer_email} ✅`);
    } catch (err: any) { toast.error('خطأ: ' + err.message); }
    finally { setSending(null); }
  }

  async function sendAll() {
    for (const cart of eligible) {
      if (!sent.has(cart.id) && !cart.recovery_email_sent) { await sendEmail(cart); await new Promise(r => setTimeout(r, 1000)); }
    }
    toast.success('تم إرسال كل الإيميلات! 🎉');
    onDone();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '620px', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(0,0,0,0.2)', direction: 'rtl' }}>
        <div style={{ padding: '24px 28px 16px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '900', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', background: '#eff6ff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Mail size={18} color="#3b82f6" /></div>
                إرسال إيميل تذكير بخصم 5%
              </h2>
              <p style={{ margin: '6px 0 0', color: '#94a3b8', fontSize: '0.88rem', fontWeight: '600' }}>العملاء اللي عندهم إيميل بس من غير رقم — {eligible.length} عميل</p>
            </div>
            <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', color: '#64748b' }}>✕</button>
          </div>
          <div style={{ marginTop: '14px', background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '1px solid #93c5fd', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Mail size={16} color="#3b82f6" />
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#1d4ed8' }}>إيميل HTML احترافي مع كود خصم 5%</div>
              <div style={{ fontSize: '0.78rem', color: '#2563eb', marginTop: '2px' }}>يتبعت عبر Resend — يُنشأ كوبون لكل عميل، صالح 48 ساعة</div>
            </div>
          </div>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 28px' }}>
          {eligible.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              <Mail size={40} strokeWidth={1} style={{ margin: '0 auto 12px', display: 'block' }} />
              <p style={{ fontWeight: '700', fontSize: '0.95rem' }}>مفيش عملاء عندهم إيميل بس من غير رقم موبايل</p>
            </div>
          ) : eligible.map(cart => {
            const isSent = sent.has(cart.id) || !!cart.recovery_email_sent;
            const promoCode = cart.reminder_promo_code || generatePromoCode(cart.id);
            const ts = formatExactTime(cart.last_activity_at || cart.created_at);
            return (
              <div key={cart.id} style={{ background: isSent ? '#f0fdf4' : '#f8fafc', border: `1px solid ${isSent ? '#86efac' : '#e2e8f0'}`, borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px', transition: 'all 0.2s' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: isSent ? '#dcfce7' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {isSent ? <CheckCircle size={18} color="#15803d" /> : <Mail size={18} color="#3b82f6" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '800', fontSize: '0.95rem', color: '#0f172a' }}>{cart.customer_name || 'عميل'}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ color: '#3b82f6' }}>{cart.customer_email}</span>
                    <span style={{ color: '#cbd5e1' }}>·</span>
                    <span>{(cart.cart_total || 0).toFixed(0)} ج.م</span>
                    <span style={{ color: '#cbd5e1' }}>·</span>
                    <span style={{ color: '#f59e0b', fontWeight: '700' }}>{ts.relative} مضت</span>
                  </div>
                  <div style={{ marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '5px', background: isSent ? '#dcfce7' : '#fff', border: `1px solid ${isSent ? '#86efac' : '#e2e8f0'}`, borderRadius: '7px', padding: '3px 9px' }}>
                    <Tag size={11} color={isSent ? '#15803d' : '#94a3b8'} />
                    <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', fontWeight: '900', color: isSent ? '#15803d' : '#475569', letterSpacing: '0.5px' }}>{promoCode}</span>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '600' }}>— خصم 5%</span>
                  </div>
                </div>
                <button onClick={() => sendEmail(cart)} disabled={sending === cart.id || isSent}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '10px', border: 'none', background: isSent ? '#dcfce7' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: isSent ? '#15803d' : '#fff', fontWeight: '800', fontSize: '0.85rem', cursor: isSent || sending === cart.id ? 'not-allowed' : 'pointer', flexShrink: 0, whiteSpace: 'nowrap', opacity: sending === cart.id ? 0.7 : 1 }}>
                  {sending === cart.id ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : isSent ? <CheckCircle size={14} /> : <Mail size={14} />}
                  {sending === cart.id ? 'جاري...' : isSent ? 'تم الإرسال' : 'إرسال إيميل'}
                </button>
              </div>
            );
          })}
        </div>
        {eligible.length > 0 && (
          <div style={{ padding: '16px 28px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '10px' }}>
            <button onClick={sendAll} style={{ flex: 1, padding: '13px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '900', fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Zap size={16} /> إرسال للكل ({eligible.filter(c => !sent.has(c.id) && !c.recovery_email_sent).length} عميل)
            </button>
            <button onClick={() => { onDone(); onClose(); }} style={{ padding: '13px 20px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer' }}>إغلاق</button>
          </div>
        )}
      </div>
      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
    </div>
  );
}

export default function AbandonedCartsAdmin() {
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [filteredCarts, setFilteredCarts] = useState<AbandonedCart[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'recovered'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCart, setExpandedCart] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [deletingCart, setDeletingCart] = useState<string | null>(null);
  const [transferringCart, setTransferringCart] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  useEffect(() => { fetchAbandonedCarts(); }, []);
  useEffect(() => { applyFilters(); setCurrentPage(1); }, [carts, filter, searchTerm]);

  const fetchAbandonedCarts = async () => {
    setLoading(true);
    try {
      const { data: cartsData, error } = await supabase
        .from('abandoned_carts')
        .select('*')
        .order('last_activity_at', { ascending: false });
      if (error) throw error;

      const { data: ordersData } = await supabase
        .from('orders')
        .select('customer_phone, customer_email, created_at')
        .not('status', 'eq', 'cancelled');

      const normalizePhone = (p: string | null | undefined) => {
        if (!p) return '';
        let d = p.replace(/\D/g, '');
        if (!d) return '';
        if (d.startsWith('00')) d = d.slice(2);
        if (d.startsWith('20') && d.length === 12) return d;
        if (d.startsWith('20') && d.length !== 12) d = d.slice(2);
        if (d.startsWith('0') && d.length === 11) return '2' + d;
        if (d.startsWith('1') && d.length === 10) return '20' + d;
        return '20' + d;
      };

      const completedPhones = new Set(
        (ordersData || []).map((o: any) => normalizePhone(o.customer_phone)).filter(Boolean)
      );
      const completedEmails = new Set(
        (ordersData || []).map((o: any) => o.customer_email?.trim().toLowerCase()).filter(Boolean)
      );

      const reconciled = (cartsData || []).map((cart: AbandonedCart) => {
        if (cart.recovered) return cart;
        const phoneMatch = cart.customer_phone && completedPhones.has(normalizePhone(cart.customer_phone));
        const emailMatch = cart.customer_email && completedEmails.has(cart.customer_email.trim().toLowerCase());
        if (phoneMatch || emailMatch) {
          supabase
            .from('abandoned_carts')
            .update({ recovered: true })
            .eq('id', cart.id)
            .then(() => {});
          return { ...cart, recovered: true };
        }
        return cart;
      });

      setCarts(reconciled);
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let deduped = deduplicateCarts(carts);
    if (filter === 'pending') deduped = deduped.filter(c => !c.recovered);
    else if (filter === 'recovered') deduped = deduped.filter(c => c.recovered);
    if (searchTerm) deduped = deduped.filter(c =>
      c.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customer_phone?.includes(searchTerm)
    );
    setFilteredCarts(deduped);
  };

  const deleteCart = async (cartId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه السلة؟')) return;
    setDeletingCart(cartId);
    try {
      const { error } = await supabase.from('abandoned_carts').delete().eq('id', cartId);
      if (error) throw error;
      toast.success('تم الحذف ✓');
      setCarts(prev => prev.filter(c => c.id !== cartId));
    } catch (err: any) { toast.error('خطأ: ' + err.message); }
    finally { setDeletingCart(null); }
  };

  const transferToOrder = async (cart: AbandonedCart) => {
    if (!confirm(`هل أنت متأكد من تحويل سلة "${cart.customer_name || 'غير محدد'}" إلى طلب ناجح؟`)) return;
    setTransferringCart(cart.id);

    try {
      const now = new Date().toISOString();

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_name: cart.customer_name || 'غير محدد',
          customer_email: cart.customer_email || null,
          customer_phone: cart.customer_phone || null,
          total_amount: cart.cart_total || 0,
          subtotal: cart.cart_subtotal || 0,
          shipping_city: cart.shipping_city || null,
          status: 'completed',
          source: 'abandoned_cart_transfer',
          abandoned_cart_id: cart.id,
          created_at: now,
        })
        .select()
        .single();

      if (orderError) {
        console.error('Order insert error:', orderError);
        throw new Error(orderError.message);
      }

      if (!orderData?.id) {
        throw new Error('لم يتم إرجاع بيانات الطلب');
      }

      const orderItems = (cart.cart_items || []).map((item: any) => ({
        order_id: orderData.id,
        product_id: item.product_id || item.id || null,
        product_name: item.name || 'منتج غير معروف',
        quantity: item.quantity || 1,
        price: parseFloat(item.price) || 0,
        total: (parseFloat(item.price) || 0) * (item.quantity || 1),
        image_url: item.image_url || item.image || null,
      }));

      if (orderItems.length > 0) {
        const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
        if (itemsError) {
          console.error('Order items error:', itemsError);
          toast.error('تم إنشاء الطلب لكن فشل إضافة المنتجات');
        }
      }

      await supabase
        .from('abandoned_carts')
        .update({ recovered: true, recovered_at: now })
        .eq('id', cart.id);

      toast.success(`✅ تم تحويل السلة إلى طلب رقم #${orderData.id.slice(0, 8)}`);
      fetchAbandonedCarts();

    } catch (err: any) {
      console.error('Transfer error:', err);
      toast.error('خطأ في التحويل: ' + (err.message || 'حدث خطأ غير متوقع'));
    } finally {
      setTransferringCart(null);
    }
  };

  const sendRecoveryEmail = async (cartId: string) => {
    setSendingEmail(cartId);
    try {
      const res = await fetch('/api/send-cart-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cartId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل الإرسال');
      toast.success('تم إرسال الإيميل ✓');
      fetchAbandonedCarts();
    } catch (err: any) { toast.error('خطأ: ' + err.message); }
    finally { setSendingEmail(null); }
  };

  const sendWhatsApp = async (cart: AbandonedCart) => {
    const promoCode = cart.reminder_promo_code || generatePromoCode(cart.id);
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 2);
    const { error: couponError } = await supabase.from('coupons').upsert(
      { code: promoCode, discount_type: 'percentage', discount_value: 5, is_active: true, expiry_date: expiry.toISOString() },
      { onConflict: 'code' }
    );
    if (couponError) { toast.error('فشل إنشاء كود الخصم: ' + couponError.message); return; }
    await supabase.from('abandoned_carts').update({
      reminder_sent: true,
      reminder_sent_at: new Date().toISOString(),
      reminder_promo_code: promoCode,
    }).eq('id', cart.id);
    const waNumber = toWhatsAppNumber(cart.customer_phone);
    const msg = buildWhatsAppMessage(cart, promoCode);
    openWhatsApp(waNumber, msg);
    toast.success(`تم فتح واتساب لـ ${cart.customer_name} ✅`);
  };

  const handlePageChange = (page: number) => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const eligible24h = carts.filter(c => !c.recovered && isWithin48Hours(c.last_activity_at || c.created_at) && c.customer_phone);
  const eligibleEmail = carts.filter(c => !c.recovered && c.customer_email && !c.customer_phone);
  const stats = {
    total: filteredCarts.length,
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
    <div className="ac-page-wrap" style={{ maxWidth: '1500px', margin: '0 auto', direction: 'rtl', background: '#f8fafc', minHeight: '100vh' }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
        .ac-row:hover { background: #f0fdf4 !important; }
        .ac-btn { transition: all 0.15s; }
        .ac-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.05); }
        .ac-chip:hover { opacity: 0.85; }
        .ac-page-wrap { padding: 24px; }
        .ac-stats-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 20px; }
        .ac-filters { display: flex; gap: 12px; align-items: center; }
        .ac-filters-chips { display: flex; gap: 6px; }
        .ac-table-header { display: grid; grid-template-columns: 1.8fr 1.6fr 2.2fr 0.9fr 1.4fr 0.8fr 1.6fr; padding: 10px 18px; }
        .ac-table-row { display: grid; grid-template-columns: 1.8fr 1.6fr 2.2fr 0.9fr 1.4fr 0.8fr 1.6fr; padding: 11px 18px; }
        .ac-mobile-card { display: none; }
        .ac-pagination-jump { display: flex; align-items: center; gap: 8px; }
        @media (max-width: 768px) {
          .ac-page-wrap { padding: 12px; }
          .ac-stats-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 12px; }
          .ac-stats-grid > div:last-child { grid-column: span 2; }
          .ac-filters { flex-direction: column; gap: 8px; align-items: stretch; }
          .ac-filters-chips { flex-wrap: wrap; }
          .ac-filters-chips button { flex: 1; min-width: calc(33% - 6px); }
          .ac-table-header { display: none; }
          .ac-table-row { display: none; }
          .ac-mobile-card { display: block; }
          .ac-pagination-jump { display: none; }
          .banner-text { font-size: 0.88rem !important; }
          .banner-sub { font-size: 0.76rem !important; }
          .banner-btn { font-size: 0.82rem !important; padding: 8px 12px !important; }
        }
      `}</style>

      {showReminderModal && <ReminderModal carts={carts} onClose={() => setShowReminderModal(false)} onDone={() => { setShowReminderModal(false); fetchAbandonedCarts(); }} />}
      {showEmailModal && <EmailModal carts={carts} onClose={() => setShowEmailModal(false)} onDone={() => { setShowEmailModal(false); fetchAbandonedCarts(); }} />}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '900', color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>السلات المتروكة</h1>
          <p style={{ fontSize: '0.92rem', color: '#94a3b8', marginTop: '3px', fontWeight: '500' }}>تتبع واسترجاع العملاء المحتملين</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => setShowReminderModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: eligible24h.length > 0 ? 'linear-gradient(135deg, #25D366, #128C7E)' : '#e2e8f0', color: eligible24h.length > 0 ? '#fff' : '#94a3b8', border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: eligible24h.length > 0 ? '0 4px 14px rgba(37,211,102,0.35)' : 'none', animation: eligible24h.length > 0 ? 'pulse 2s ease-in-out infinite' : 'none' }}>
            <Bell size={15} /> واتساب 48س
            {eligible24h.length > 0 && <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '8px', padding: '1px 8px', fontSize: '0.8rem', fontWeight: '900' }}>{eligible24h.length}</span>}
          </button>
          <button onClick={() => setShowEmailModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: eligibleEmail.length > 0 ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : '#e2e8f0', color: eligibleEmail.length > 0 ? '#fff' : '#94a3b8', border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: eligibleEmail.length > 0 ? '0 4px 14px rgba(59,130,246,0.35)' : 'none' }}>
            <Mail size={15} /> إيميل تذكير
            {eligibleEmail.length > 0 && <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '8px', padding: '1px 8px', fontSize: '0.8rem', fontWeight: '900' }}>{eligibleEmail.length}</span>}
          </button>
          <button onClick={fetchAbandonedCarts} className="ac-btn" style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 16px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '0.93rem', cursor: 'pointer' }}>
            <RefreshCw size={14} /> تحديث
          </button>
        </div>
      </div>

      {eligible24h.length > 0 && (
        <div style={{ marginBottom: '12px', background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '1.5px solid #86efac', borderRadius: '14px', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', animation: 'fadeUp 0.3s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', background: '#22c55e', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Bell size={18} color="#fff" /></div>
            <div>
              <div className="banner-text" style={{ fontWeight: '900', fontSize: '1rem', color: '#15803d' }}>{eligible24h.length} عميل تركوا سلتهم في آخر 48 ساعة</div>
              <div className="banner-sub" style={{ fontSize: '0.82rem', color: '#16a34a', marginTop: '2px' }}>أرسل لهم تذكير واتساب مع خصم 5%</div>
            </div>
          </div>
          <button onClick={() => setShowReminderModal(true)} className="banner-btn" style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 18px', background: 'linear-gradient(135deg, #25D366, #128C7E)', color: '#fff', border: 'none', borderRadius: '11px', fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer', flexShrink: 0 }}>
            <MessageCircle size={16} /> إرسال التذكيرات
          </button>
        </div>
      )}

      {eligibleEmail.length > 0 && (
        <div style={{ marginBottom: '18px', background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '1.5px solid #93c5fd', borderRadius: '14px', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', animation: 'fadeUp 0.3s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', background: '#3b82f6', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Mail size={18} color="#fff" /></div>
            <div>
              <div className="banner-text" style={{ fontWeight: '900', fontSize: '1rem', color: '#1d4ed8' }}>{eligibleEmail.length} عميل عندهم إيميل بس من غير رقم موبايل</div>
              <div className="banner-sub" style={{ fontSize: '0.82rem', color: '#2563eb', marginTop: '2px' }}>أرسل لهم إيميل HTML احترافي مع كود خصم 5%</div>
            </div>
          </div>
          <button onClick={() => setShowEmailModal(true)} className="banner-btn" style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 18px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff', border: 'none', borderRadius: '11px', fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer', flexShrink: 0 }}>
            <Mail size={16} /> إرسال الإيميلات
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="ac-stats-grid">
        {[
          { label: 'إجمالي السلات', value: stats.total, icon: <ShoppingCart size={16} />, color: '#0f172a', light: '#f1f5f9' },
          { label: 'قيد الانتظار', value: stats.pending, icon: <AlertCircle size={16} />, color: '#d97706', light: '#fffbeb' },
          { label: 'تم الاسترجاع', value: stats.recovered, icon: <CheckCircle size={16} />, color: '#15803d', light: '#f0fdf4' },
          { label: 'معدل الاسترجاع', value: `${stats.recoveryRate}%`, icon: <TrendingUp size={16} />, color: '#7c3aed', light: '#f5f3ff' },
          { label: 'القيمة الكلية', value: `${stats.totalValue.toFixed(0)} ج`, icon: <DollarSign size={16} />, color: '#0369a1', light: '#f0f9ff' },
        ].map((s, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: '14px', padding: '14px 16px', border: '1px solid #f1f5f9', animation: `fadeUp 0.3s ease ${i * 0.05}s both` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '700' }}>{s.label}</span>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: s.light, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>{s.icon}</div>
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: '900', color: s.color, letterSpacing: '-0.5px' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="ac-filters" style={{ background: '#fff', borderRadius: '14px', padding: '12px 16px', marginBottom: '14px', border: '1px solid #f1f5f9' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', borderRadius: '9px', padding: '8px 12px' }}>
          <Search size={15} color="#cbd5e1" />
          <input type="text" placeholder="بحث بالاسم، الإيميل، أو الموبايل..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '0.96rem', color: '#334155' }} />
        </div>
        <div className="ac-filters-chips">
          {(['all', 'pending', 'recovered'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className="ac-chip" style={{ padding: '7px 14px', background: filter === f ? '#0f172a' : '#f1f5f9', color: filter === f ? '#fff' : '#64748b', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.15s' }}>
              {f === 'all' ? `الكل · ${stats.total}` : f === 'pending' ? `انتظار · ${stats.pending}` : `مسترجع · ${stats.recovered}`}
            </button>
          ))}
        </div>
      </div>

      {filteredCarts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#cbd5e1', background: '#fff', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
          <ShoppingCart size={48} strokeWidth={1} />
          <p style={{ marginTop: '12px', fontWeight: '700' }}>لا توجد نتائج</p>
        </div>
      ) : (
        <>
          <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
            <div className="ac-table-header" style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
              {['العميل', 'التواصل', 'المنتجات', 'الإجمالي', 'التوقيت', 'الحالة', 'إجراءات'].map((h, i) => (
                <div key={i} style={{ fontSize: '0.78rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', paddingRight: i > 0 ? '10px' : 0 }}>{h}</div>
              ))}
            </div>

            {paginated.map((cart, idx) => {
              const ts = formatExactTime(cart.last_activity_at || cart.created_at);
              const isExpanded = expandedCart === cart.id;
              const is24h = isWithin24Hours(cart.last_activity_at || cart.created_at);

              return (
                <div key={cart.id} style={{ animation: `fadeUp 0.25s ease ${idx * 0.03}s both` }}>
                  {/* Desktop row */}
                  <div className="ac-row ac-table-row" style={{ borderBottom: '1px solid #f8fafc', background: cart.recovered ? '#fafffe' : '#fff', alignItems: 'center', cursor: 'pointer', transition: 'background 0.15s' }}
                    onClick={() => setExpandedCart(isExpanded ? null : cart.id)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                      <div style={{ position: 'relative' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: cart.recovered ? '#dcfce7' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <User size={15} color={cart.recovered ? '#15803d' : '#94a3b8'} />
                        </div>
                        {is24h && !cart.recovered && <div style={{ position: 'absolute', top: '-3px', right: '-3px', width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e', border: '2px solid #fff' }} />}
                      </div>
                      <div>
                        <div style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>{cart.customer_name || 'غير محدد'}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', flexWrap: 'wrap' }}>
                          {cart.device_type === 'mobile' ? <Smartphone size={10} color="#cbd5e1" /> : <Monitor size={10} color="#cbd5e1" />}
                          <span style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: '600' }}>{cart.device_type === 'mobile' ? 'موبايل' : 'كمبيوتر'}</span>
                          {is24h && !cart.recovered && <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#15803d', background: '#dcfce7', padding: '1px 5px', borderRadius: '4px' }}>24س</span>}
                          {cart._isDuplicate && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.68rem', fontWeight: '900', color: '#7c3aed', background: '#f5f3ff', border: '1px solid #ddd6fe', padding: '1px 6px', borderRadius: '6px' }}>
                              <RotateCcw size={9} /> رجع {cart._returnCount}x
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{ paddingRight: '10px' }}>
                      <div style={{ fontSize: '0.88rem', color: '#475569', fontWeight: '600', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>{cart.customer_email}</div>
                      {cart.customer_phone && <div style={{ fontSize: '0.84rem', color: '#94a3b8', fontWeight: '600', direction: 'ltr', textAlign: 'right' }}>{cart.customer_phone}</div>}
                      {!cart.customer_phone && cart.customer_email && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.68rem', fontWeight: '800', color: '#3b82f6', background: '#eff6ff', padding: '1px 6px', borderRadius: '5px', marginTop: '2px' }}>
                          <Mail size={9} /> إيميل فقط
                        </div>
                      )}
                    </div>
                    <div style={{ paddingRight: '10px' }}>
                      <div style={{ display: 'inline-block', padding: '2px 8px', background: '#f0fdf4', borderRadius: '5px', fontSize: '0.8rem', fontWeight: '800', color: '#15803d', marginBottom: '4px' }}>{cart.cart_items?.length || 0} منتج</div>
                      {cart.cart_items?.[0] && <div style={{ fontSize: '0.84rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>{cart.cart_items[0].name}</div>}
                    </div>
                    <div style={{ paddingRight: '10px' }}>
                      <div style={{ fontSize: '1rem', fontWeight: '900', color: '#0f172a' }}>{(cart.cart_total || 0).toFixed(0)}</div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>ج.م</div>
                    </div>
                    <div style={{ paddingRight: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' }}><Clock size={11} color="#94a3b8" /><span style={{ fontSize: '0.84rem', fontWeight: '700', color: '#334155' }}>{ts.time}</span></div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>{ts.date}</div>
                      <div style={{ display: 'inline-block', marginTop: '3px', padding: '1px 6px', background: '#f1f5f9', borderRadius: '4px', fontSize: '0.78rem', fontWeight: '800', color: '#64748b' }}>{ts.relative}</div>
                    </div>
                    <div style={{ paddingRight: '10px' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 9px', borderRadius: '7px', fontSize: '0.8rem', fontWeight: '800', background: cart.recovered ? '#dcfce7' : '#fef3c7', color: cart.recovered ? '#15803d' : '#92400e' }}>
                        {cart.recovered ? <CheckCircle size={10} /> : <Clock size={10} />}
                        {cart.recovered ? 'تم' : 'قيد'}
                      </div>
                      {cart.reminder_sent && (
                        <div style={{ marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 6px', borderRadius: '5px', fontSize: '0.72rem', fontWeight: '800', background: '#f0fdf4', color: '#15803d' }}>
                          <MessageCircle size={9} /> تذكير
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center', paddingRight: '10px' }} onClick={e => e.stopPropagation()}>
                      {!cart.recovered && (
                        <>
                          <button onClick={() => transferToOrder(cart)} disabled={transferringCart === cart.id} className="ac-btn" title="تحويل لطلب"
                            style={{ width: '30px', height: '30px', borderRadius: '8px', border: 'none', background: '#fef3c7', color: '#92400e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {transferringCart === cart.id ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <ArrowRightLeft size={13} />}
                          </button>
                          {cart.customer_email && (
                            <button onClick={() => sendRecoveryEmail(cart.id)} disabled={sendingEmail === cart.id || cart.recovery_email_sent} className="ac-btn" title={cart.recovery_email_sent ? 'تم الإرسال' : 'إرسال إيميل'}
                              style={{ width: '30px', height: '30px', borderRadius: '8px', border: 'none', background: cart.recovery_email_sent ? '#dcfce7' : '#eff6ff', color: cart.recovery_email_sent ? '#15803d' : '#3b82f6', cursor: cart.recovery_email_sent ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {sendingEmail === cart.id ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Mail size={13} />}
                            </button>
                          )}
                          {cart.customer_phone && (
                            <button onClick={() => sendWhatsApp(cart)} className="ac-btn" title="واتساب"
                              style={{ width: '30px', height: '30px', borderRadius: '8px', border: 'none', background: '#f0fdf4', color: '#15803d', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Send size={13} />
                            </button>
                          )}
                          {cart.customer_phone && (
                            <button onClick={() => window.open(`tel:${cart.customer_phone}`, '_self')} className="ac-btn" title="اتصال"
                              style={{ width: '30px', height: '30px', borderRadius: '8px', border: 'none', background: '#eff6ff', color: '#6366f1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Phone size={13} />
                            </button>
                          )}
                        </>
                      )}
                      <button onClick={() => deleteCart(cart.id)} disabled={deletingCart === cart.id} className="ac-btn" title="حذف"
                        style={{ width: '30px', height: '30px', borderRadius: '8px', border: 'none', background: '#fff1f2', color: '#e11d48', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {deletingCart === cart.id ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={13} />}
                      </button>
                      <button onClick={() => setExpandedCart(isExpanded ? null : cart.id)} className="ac-btn"
                        style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid #f1f5f9', background: isExpanded ? '#f0fdf4' : '#fff', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '900' }}>
                        {isExpanded ? '▲' : '▼'}
                      </button>
                    </div>
                  </div>

                  {/* Mobile card */}
                  <div className="ac-mobile-card" style={{ padding: '12px 14px', borderBottom: '1px solid #f8fafc', background: cart.recovered ? '#fafffe' : '#fff', cursor: 'pointer' }} onClick={() => setExpandedCart(isExpanded ? null : cart.id)}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: cart.recovered ? '#dcfce7' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={16} color={cart.recovered ? '#15803d' : '#94a3b8'} />
                        </div>
                        {is24h && !cart.recovered && <div style={{ position: 'absolute', top: '-3px', right: '-3px', width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e', border: '2px solid #fff' }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a' }}>{cart.customer_name || 'غير محدد'}</span>
                          <span style={{ fontSize: '1rem', fontWeight: '900', color: '#0f172a', flexShrink: 0 }}>{(cart.cart_total || 0).toFixed(0)} ج.م</span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '3px', alignItems: 'center' }}>
                          {cart.customer_phone && <span style={{ fontSize: '0.78rem', color: '#475569', direction: 'ltr' }}>{cart.customer_phone}</span>}
                          {!cart.customer_phone && cart.customer_email && <span style={{ fontSize: '0.78rem', color: '#3b82f6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>{cart.customer_email}</span>}
                          <span style={{ fontSize: '0.74rem', fontWeight: '700', color: '#f59e0b' }}>{ts.relative}</span>
                          {is24h && !cart.recovered && <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#15803d', background: '#dcfce7', padding: '1px 5px', borderRadius: '4px' }}>24س</span>}
                          {cart._isDuplicate && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '0.65rem', fontWeight: '900', color: '#7c3aed', background: '#f5f3ff', border: '1px solid #ddd6fe', padding: '1px 5px', borderRadius: '5px' }}><RotateCcw size={8} /> {cart._returnCount}x</span>}
                        </div>
                        <div style={{ marginTop: '5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ display: 'inline-block', padding: '1px 7px', background: '#f0fdf4', borderRadius: '5px', fontSize: '0.76rem', fontWeight: '800', color: '#15803d' }}>{cart.cart_items?.length || 0} منتج</span>
                          {cart.cart_items?.[0] && <span style={{ fontSize: '0.78rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>{cart.cart_items[0].name}</span>}
                        </div>
                        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '7px', fontSize: '0.76rem', fontWeight: '800', background: cart.recovered ? '#dcfce7' : '#fef3c7', color: cart.recovered ? '#15803d' : '#92400e' }}>
                              {cart.recovered ? <CheckCircle size={10} /> : <Clock size={10} />}
                              {cart.recovered ? 'تم' : 'قيد الانتظار'}
                            </div>
                            {cart.reminder_sent && <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 6px', borderRadius: '5px', fontSize: '0.68rem', fontWeight: '800', background: '#f0fdf4', color: '#15803d' }}><MessageCircle size={9} /> تذكير</div>}
                          </div>
                          <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                            {!cart.recovered && (
                              <>
                                <button onClick={() => transferToOrder(cart)} disabled={transferringCart === cart.id} className="ac-btn" title="تحويل لطلب"
                                  style={{ width: '34px', height: '34px', borderRadius: '8px', border: 'none', background: '#fef3c7', color: '#92400e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {transferringCart === cart.id ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <ArrowRightLeft size={14} />}
                                </button>
                                {cart.customer_email && (
                                  <button onClick={() => sendRecoveryEmail(cart.id)} disabled={sendingEmail === cart.id || cart.recovery_email_sent} className="ac-btn"
                                    style={{ width: '34px', height: '34px', borderRadius: '8px', border: 'none', background: cart.recovery_email_sent ? '#dcfce7' : '#eff6ff', color: cart.recovery_email_sent ? '#15803d' : '#3b82f6', cursor: cart.recovery_email_sent ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {sendingEmail === cart.id ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Mail size={14} />}
                                  </button>
                                )}
                                {cart.customer_phone && (
                                  <button onClick={() => sendWhatsApp(cart)} className="ac-btn"
                                    style={{ width: '34px', height: '34px', borderRadius: '8px', border: 'none', background: '#f0fdf4', color: '#15803d', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Send size={14} />
                                  </button>
                                )}
                                {cart.customer_phone && (
                                  <button onClick={() => window.open(`tel:${cart.customer_phone}`, '_self')} className="ac-btn"
                                    style={{ width: '34px', height: '34px', borderRadius: '8px', border: 'none', background: '#eff6ff', color: '#6366f1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Phone size={14} />
                                  </button>
                                )}
                              </>
                            )}
                            <button onClick={() => deleteCart(cart.id)} disabled={deletingCart === cart.id} className="ac-btn"
                              style={{ width: '34px', height: '34px', borderRadius: '8px', border: 'none', background: '#fff1f2', color: '#e11d48', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {deletingCart === cart.id ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={14} />}
                            </button>
                            <button onClick={() => setExpandedCart(isExpanded ? null : cart.id)} className="ac-btn"
                              style={{ width: '34px', height: '34px', borderRadius: '8px', border: '1px solid #f1f5f9', background: isExpanded ? '#f0fdf4' : '#fff', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '900' }}>
                              {isExpanded ? '▲' : '▼'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ padding: '14px 20px 16px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                      {cart._isDuplicate && (
                        <div style={{ marginBottom: '12px', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <RotateCcw size={14} color="#7c3aed" />
                          <div>
                            <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#7c3aed' }}>العميل ده رجع للموقع {cart._returnCount} مرات بنفس العناصر في السلة</div>
                            <div style={{ fontSize: '0.74rem', color: '#8b5cf6', marginTop: '2px' }}>بيتعرض آخر زيارة — الزيارات القديمة اتدمجت تلقائياً</div>
                          </div>
                        </div>
                      )}
                      <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '10px' }}>تفاصيل المنتجات</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {cart.cart_items?.map((item: any, i: number) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: '#fff', borderRadius: '11px', border: '1px solid #f1f5f9' }}>
                            {(item.image_url || item.image) && <img src={item.image_url || item.image} alt="" style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'contain', border: '1px solid #f1f5f9', background: '#fafafa' }} />}
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.93rem', fontWeight: '800', color: '#0f172a' }}>{item.name}</div>
                              <div style={{ display: 'flex', gap: '6px', marginTop: '3px' }}>
                                {item.brand && <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#15803d', background: '#f0fdf4', padding: '1px 7px', borderRadius: '4px' }}>{item.brand}</span>}
                                {item.car_make && <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>{item.car_make} {item.car_model}</span>}
                              </div>
                            </div>
                            <div style={{ textAlign: 'left' }}>
                              <div style={{ fontSize: '0.96rem', fontWeight: '900', color: '#0f172a' }}>{(parseFloat(item.price) * item.quantity).toFixed(2)} ج.م</div>
                              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>× {item.quantity}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {cart.reminder_sent && cart.reminder_promo_code && (
                        <div style={{ marginTop: '12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Tag size={14} color="#15803d" />
                          <div>
                            <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#15803d' }}>تم إرسال تذكير مع كود الخصم</div>
                            <div style={{ fontFamily: 'monospace', fontWeight: '900', fontSize: '0.95rem', color: '#0f172a', marginTop: '2px' }}>{cart.reminder_promo_code}</div>
                          </div>
                          {cart.reminder_sent_at && <div style={{ marginRight: 'auto', fontSize: '0.78rem', color: '#94a3b8' }}>{formatExactTime(cart.reminder_sent_at).date}</div>}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
                        {[
                          { label: 'آخر نشاط', value: formatExactTime(cart.last_activity_at || cart.created_at) },
                          cart.recovered_at ? { label: 'الاسترجاع', value: formatExactTime(cart.recovered_at) } : null,
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
          {totalPages > 1 && <SmartPagination currentPage={currentPage} totalPages={totalPages} totalItems={filteredCarts.length} onPageChange={handlePageChange} />}
        </>
      )}
    </div>
  );
}