'use client';
// app/order-success/OrderSuccessClient.tsx
// This is the client component that uses useSearchParams()
// It must stay separate so page.tsx can wrap it in <Suspense>

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';
import { CheckCircle, XCircle, Loader2, Download, Home } from 'lucide-react';
import toast from 'react-hot-toast';

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_TRIES   = 30;

export default function OrderSuccessClient() {
  const params    = useSearchParams();
  const router    = useRouter();

  const status  = params.get('status');
  const custRef = params.get('customerReference');
  const provRef = params.get('providerRefNum');

  const [phase, setPhase]           = useState<'polling' | 'found' | 'failed' | 'payment_failed'>('polling');
  const [order, setOrder]           = useState<any>(null);
  const [tries, setTries]           = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const triesRef    = useRef(0);

  useEffect(() => {
    if (status === 'failed') { setPhase('payment_failed'); return; }
    pollForOrder();
    intervalRef.current = setInterval(pollForOrder, POLL_INTERVAL_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  async function pollForOrder() {
    triesRef.current += 1;
    setTries(triesRef.current);

    if (triesRef.current > POLL_MAX_TRIES) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setPhase('failed');
      return;
    }

    try {
      let query = supabase.from('orders').select('*');
      if (provRef)       query = query.eq('easykash_ref', provRef);
      else if (custRef)  query = query.eq('easykash_customer_ref', custRef);
      else               { if (intervalRef.current) clearInterval(intervalRef.current); setPhase('failed'); return; }

      const { data } = await query.maybeSingle();
      if (data) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setOrder(data);
        setPhase('found');
        localStorage.removeItem('cart');
        localStorage.removeItem('zf_marketer_ref');
        localStorage.removeItem('zf_pending_order');
      }
    } catch (err) {
      console.error('[OrderSuccess] Poll error:', err);
    }
  }

  async function handleDownloadInvoice() {
    if (!order) return;
    setIsDownloading(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'), import('html2canvas'),
      ]);
      const element = document.getElementById('invoice-preview');
      if (!element) return;
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      let heightLeft = imgHeight; let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight); heightLeft -= pageHeight;
      while (heightLeft > 0) { position = heightLeft - imgHeight; pdf.addPage(); pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight); heightLeft -= pageHeight; }
      pdf.save(`ORDER-${order.id.slice(0, 8).toUpperCase()}.pdf`);
      toast.success('تم تحميل الـ PDF ✅');
    } catch { toast.error('حدث خطأ في تحميل الـ PDF'); }
    finally { setIsDownloading(false); }
  }

  // ── Polling ───────────────────────────────────────────────────────────────
  if (phase === 'polling') return (
    <div style={centerStyle}>
      <div style={card}>
        <Loader2 size={52} color="#22c55e" style={{ animation: 'spin 1s linear infinite', marginBottom: '20px' }} />
        <h2 style={{ fontWeight: '900', fontSize: '1.4rem', marginBottom: '8px', color: '#1a1a1a' }}>جاري التحقق من الدفع...</h2>
        <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '4px' }}>تم استلام طلبك، نتحقق من تأكيد الدفع من EasyKash</p>
        <p style={{ color: '#bbb', fontSize: '0.78rem' }}>({tries}/{POLL_MAX_TRIES} محاولة)</p>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }` }} />
    </div>
  );

  // ── Payment failed ────────────────────────────────────────────────────────
  if (phase === 'payment_failed') return (
    <div style={centerStyle}>
      <div style={{ ...card, borderColor: '#fee2e2' }}>
        <XCircle size={52} color="#dc2626" style={{ marginBottom: '20px' }} />
        <h2 style={{ fontWeight: '900', fontSize: '1.4rem', marginBottom: '8px', color: '#dc2626' }}>لم يتم إتمام الدفع</h2>
        <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '24px' }}>لم يتم خصم أي مبلغ من حسابك. يمكنك المحاولة مرة أخرى.</p>
        <button onClick={() => router.push('/checkout')}
          style={{ padding: '12px 28px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', fontSize: '0.95rem' }}>
          العودة للدفع
        </button>
      </div>
    </div>
  );

  // ── Timeout ───────────────────────────────────────────────────────────────
  if (phase === 'failed') return (
    <div style={centerStyle}>
      <div style={{ ...card, borderColor: '#fef3c7' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⏳</div>
        <h2 style={{ fontWeight: '900', fontSize: '1.3rem', marginBottom: '8px', color: '#1a1a1a' }}>تأخر ظهور تأكيد الطلب</h2>
        <p style={{ color: '#888', fontSize: '0.88rem', lineHeight: '1.6', marginBottom: '24px' }}>
          لو تم خصم المبلغ، الطلب هيظهر في حسابك خلال دقيقة.<br />تواصل معنا إذا استمرت المشكلة.
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => { triesRef.current = 0; setTries(0); setPhase('polling'); pollForOrder(); intervalRef.current = setInterval(pollForOrder, POLL_INTERVAL_MS); }}
            style={{ padding: '11px 22px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer' }}>
            إعادة المحاولة
          </button>
          <button onClick={() => router.push('/')}
            style={{ padding: '11px 22px', background: '#f5f5f5', color: '#555', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}>
            الرئيسية
          </button>
        </div>
      </div>
    </div>
  );

  // ── Order found → Invoice ─────────────────────────────────────────────────
  if (phase === 'found' && order) {
    const orderNum  = order.id.slice(0, 8).toUpperCase();
    const orderDate = new Date(order.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    const items: any[] = order.items || [];
    const subtotal  = items.reduce((s: number, i: any) => s + parseFloat(i.price) * i.quantity, 0);
    const shipping  = parseFloat(order.shipping_cost || 0);
    const discount  = parseFloat(order.discount_applied || 0);
    const total     = parseFloat(order.total_price || 0);

    return (
      <div style={{ direction: 'rtl', padding: '30px 20px', maxWidth: '820px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

        {/* Success banner */}
        <div style={{ background: 'linear-gradient(135deg, #0f172a, #14532d)', borderRadius: '20px', padding: '28px 30px', textAlign: 'center', marginBottom: '20px', color: '#fff' }}>
          <div style={{ fontSize: '3rem', marginBottom: '8px' }}>🎉</div>
          <h1 style={{ fontSize: '1.7rem', fontWeight: '900', marginBottom: '6px' }}>تم الدفع وتسجيل طلبك بنجاح!</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>رقم الطلب: <span style={{ color: '#22c55e', fontWeight: '900' }}>#{orderNum}</span></p>
          {order.easykash_payment_method && <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', marginTop: '4px' }}>طريقة الدفع: {order.easykash_payment_method}</p>}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '22px', flexWrap: 'wrap' }}>
          <button onClick={handleDownloadInvoice} disabled={isDownloading}
            style={{ flex: 1, minWidth: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '13px 20px', background: isDownloading ? '#ccc' : 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff', border: 'none', borderRadius: '14px', fontWeight: '800', fontSize: '0.9rem', cursor: isDownloading ? 'not-allowed' : 'pointer' }}>
            {isDownloading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={16} />}
            {isDownloading ? 'جاري التحميل...' : 'تحميل PDF'}
          </button>
          <button onClick={() => router.push('/')}
            style={{ flex: 1, minWidth: '140px', padding: '13px 20px', background: '#fff', color: '#1a1a1a', border: '1.5px solid #e5e5e5', borderRadius: '14px', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Home size={16} /> الرئيسية
          </button>
        </div>

        {/* Invoice */}
        <div id="invoice-preview" style={{ backgroundColor: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0' }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f4c2a 100%)', padding: '32px 40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '1.8rem', fontWeight: '900', fontStyle: 'italic', color: '#fff', letterSpacing: '-1px', marginBottom: '4px' }}>ZAIT <span style={{ color: '#22c55e' }}>&amp; FILTERS</span></div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.72rem', fontWeight: '600', letterSpacing: '2px' }}>AUTO PARTS · قطع غيار</div>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '2.4rem', fontWeight: '900', color: '#22c55e', lineHeight: 1 }}>ORDER</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', fontWeight: '700', marginTop: '4px' }}>#{orderNum}</div>
              </div>
            </div>
            <div style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', padding: '5px 14px', borderRadius: '20px' }}>
              <CheckCircle size={13} color="#22c55e" />
              <span style={{ color: '#22c55e', fontSize: '0.76rem', fontWeight: '800' }}>تم الدفع · يتم التجهيز خلال 24 ساعة · التسليم 2-5 أيام عمل</span>
            </div>
          </div>
          {/* Meta */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid #f0f0f0' }}>
            {[{ label: 'رقم الطلب', value: `#${orderNum}` }, { label: 'تاريخ الطلب', value: orderDate }, { label: 'عدد المنتجات', value: `${items.length} منتج` }].map((m, i) => (
              <div key={i} style={{ padding: '16px 20px', borderRight: i < 2 ? '1px solid #f0f0f0' : 'none' }}>
                <div style={{ fontSize: '0.66rem', color: '#aaa', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>{m.label}</div>
                <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#1a1a1a' }}>{m.value}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: '28px 40px' }}>
            {/* Customer + address */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
              <div style={{ backgroundColor: '#f9fafb', borderRadius: '12px', padding: '18px', border: '1px solid #f0f0f0' }}>
                <div style={{ fontSize: '0.66rem', fontWeight: '900', color: '#888', textTransform: 'uppercase', marginBottom: '10px' }}>بيانات العميل</div>
                <div style={{ fontWeight: '800', color: '#1a1a1a', marginBottom: '6px' }}>{order.customer_name}</div>
                <div style={{ fontSize: '0.8rem', color: '#555', direction: 'ltr', marginBottom: '4px' }}>{order.customer_phone}</div>
                {order.customer_email && <div style={{ fontSize: '0.76rem', color: '#888' }}>{order.customer_email}</div>}
              </div>
              <div style={{ backgroundColor: '#f9fafb', borderRadius: '12px', padding: '18px', border: '1px solid #f0f0f0' }}>
                <div style={{ fontSize: '0.66rem', fontWeight: '900', color: '#888', textTransform: 'uppercase', marginBottom: '10px' }}>عنوان التوصيل</div>
                <div style={{ fontSize: '0.84rem', fontWeight: '700', color: '#1a1a1a', lineHeight: '1.5', marginBottom: '6px' }}>{order.customer_address}</div>
                <div style={{ fontSize: '0.78rem', color: '#22c55e', fontWeight: '700' }}>{order.city}</div>
                <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e5e5e5' }}>
                  طريقة الدفع: <strong style={{ color: '#1a1a1a' }}>{order.easykash_payment_method || 'بطاقة / تقسيط'}</strong>
                </div>
              </div>
            </div>
            {/* Items */}
            <div style={{ marginBottom: '22px' }}>
              <div style={{ fontSize: '0.66rem', fontWeight: '900', color: '#888', textTransform: 'uppercase', marginBottom: '10px' }}>تفاصيل المنتجات</div>
              <div style={{ backgroundColor: '#0f172a', borderRadius: '10px 10px 0 0', padding: '10px 14px', display: 'grid', gridTemplateColumns: '2.5fr 0.7fr 1fr 1fr' }}>
                {['المنتج', 'الكمية', 'سعر الوحدة', 'الإجمالي'].map((h, i) => (
                  <div key={i} style={{ fontSize: '0.66rem', fontWeight: '800', color: '#94a3b8', textAlign: i === 0 ? 'right' : 'center', textTransform: 'uppercase' }}>{h}</div>
                ))}
              </div>
              {items.map((item: any, i: number) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2.5fr 0.7fr 1fr 1fr', padding: '11px 14px', backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f0f0f0', borderRight: '1px solid #f0f0f0', borderLeft: '1px solid #f0f0f0', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.86rem', fontWeight: '800', color: '#1a1a1a' }}>{item.name}</div>
                    {item.brand && <div style={{ fontSize: '0.68rem', color: '#22c55e', fontWeight: '700' }}>{item.brand}</div>}
                  </div>
                  <div style={{ textAlign: 'center' }}><span style={{ backgroundColor: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '800' }}>×{item.quantity}</span></div>
                  <div style={{ textAlign: 'center', fontSize: '0.83rem', fontWeight: '700', color: '#444' }}>{parseFloat(item.price).toLocaleString('ar-EG')} ج.م</div>
                  <div style={{ textAlign: 'center', fontSize: '0.88rem', fontWeight: '900', color: '#1a1a1a' }}>{(parseFloat(item.price) * item.quantity).toLocaleString('ar-EG')} ج.م</div>
                </div>
              ))}
              <div style={{ height: '4px', backgroundColor: '#0f172a', borderRadius: '0 0 10px 10px' }} />
            </div>
            {/* Totals */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ width: '260px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #e5e5e5', fontSize: '0.84rem' }}>
                  <span style={{ color: '#666', fontWeight: '700' }}>المجموع الجزئي</span>
                  <span style={{ fontWeight: '800' }}>{subtotal.toLocaleString('ar-EG')} ج.م</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #e5e5e5', fontSize: '0.84rem' }}>
                  <span style={{ color: '#666', fontWeight: '700' }}>الشحن</span>
                  {shipping === 0 ? <span style={{ color: '#22c55e', fontWeight: '800' }}>مجاني 🚚</span> : <span style={{ fontWeight: '800' }}>{shipping.toLocaleString('ar-EG')} ج.م</span>}
                </div>
                {discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #e5e5e5', fontSize: '0.84rem' }}>
                    <span style={{ color: '#666', fontWeight: '700' }}>الخصم</span>
                    <span style={{ color: '#ef4444', fontWeight: '800' }}>- {discount.toLocaleString('ar-EG')} ج.م</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', padding: '12px 16px', background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderRadius: '12px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.8rem', fontWeight: '700' }}>الإجمالي الكلي</span>
                  <span style={{ color: '#22c55e', fontSize: '1.3rem', fontWeight: '900' }}>{total.toLocaleString('ar-EG')} ج.م</span>
                </div>
              </div>
            </div>
          </div>
          {/* Footer */}
          <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', padding: '22px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: '900', fontStyle: 'italic', color: '#fff' }}>ZAIT <span style={{ color: '#22c55e' }}>&amp; FILTERS</span></div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.68rem', marginTop: '3px' }}>zaitandfilters.com</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#22c55e', fontSize: '0.76rem', fontWeight: '800' }}>شكراً لثقتكم بنا</div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.66rem', marginTop: '2px' }}>Thank you for your order</div>
            </div>
            <div style={{ backgroundColor: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px', padding: '5px 12px', color: '#22c55e', fontSize: '0.7rem', fontWeight: '800' }}>
              ORDER #{orderNum}
            </div>
          </div>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }` }} />
      </div>
    );
  }

  return null;
}

// Styles
const centerStyle: any = { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '20px', direction: 'rtl' };
const card: any = { backgroundColor: '#fff', borderRadius: '20px', padding: '48px 40px', textAlign: 'center', maxWidth: '440px', width: '100%', boxShadow: '0 10px 40px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0' };