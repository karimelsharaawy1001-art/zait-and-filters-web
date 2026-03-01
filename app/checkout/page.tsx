'use client';
import { useState, useEffect, useMemo } from 'react';
import { useCart } from '@/context/CartContext'; 
import { supabase } from '@/app/lib/supabase';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAbandonedCart } from '@/hooks/useAbandonedCart';
import Link from 'next/link';
import { 
  User, MapPin, ShoppingCart, Loader2, CheckCircle, Car, Globe, Mail,
  Settings2, Calendar, Tags, Upload, ExternalLink, Plus, Gauge, 
  Banknote, CreditCard, Wallet, SmartphoneNfc, Ticket, FileText, Download
} from 'lucide-react';

export default function CheckoutPage() {
  const { cart, clearCart, addToCart, isInitialized } = useCart();
  const router = useRouter();
  const { markAsRecovered } = useAbandonedCart();
  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // ── NEW: track completed order for invoice button ──
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // ── FIX: snapshot cart/totals before clearCart so invoice still renders ──
  const [completedOrderItems, setCompletedOrderItems] = useState<any[]>([]);
  const [completedSubtotal, setCompletedSubtotal] = useState(0);
  const [completedFinalTotal, setCompletedFinalTotal] = useState(0);

  const [shippingRates, setShippingRates] = useState<any[]>([]);
  const [selectedCity, setSelectedCity] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState('card_installments'); 
  const [screenshot, setScreenshot] = useState<File | null>(null);

  const [promoCode, setPromoCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [appliedPromoType, setAppliedPromoType] = useState<string | null>(null); 
  const [promoLoading, setPromoLoading] = useState(false);
  const [affiliateMarketerId, setAffiliateMarketerId] = useState<string | null>(null);

  const [carMileage, setCarMileage] = useState('');
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('new');

  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    secondary_phone: '',
    email: '', 
    address: ''
  });

  const CLOUD_NAME = "dxtncdxfh";
  const UPLOAD_PRESET = "zaitandfiltersnew";

  useEffect(() => {
    async function initCheckout() {
      const { data: shippingData } = await supabase.from('shipping_rates').select('*').order('city_name', { ascending: true });
      if (shippingData && shippingData.length > 0) {
        setShippingRates(shippingData);
        setSelectedCity(shippingData[0]); 
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('full_name, phone_number, email').eq('id', user.id).single();
        if (profile) setCustomerInfo(prev => ({ 
          ...prev, 
          name: profile.full_name || '', 
          phone: profile.phone_number || '',
          email: profile.email || '' 
        }));

        const { data: addresses } = await supabase.from('addresses').select('*').eq('user_id', user.id);
        if (addresses && addresses.length > 0) {
          setSavedAddresses(addresses);
          const defaultAddr = addresses.find(a => a.is_default) || addresses[0];
          setSelectedAddressId(defaultAddr.id);
          setCustomerInfo(prev => ({ ...prev, address: defaultAddr.full_address }));
          if (shippingData) {
            const city = shippingData.find(c => c.city_name === defaultAddr.city_name);
            if (city) setSelectedCity(city);
          }
        }
      }

      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get('ref');
      if (refCode) {
        localStorage.setItem('zf_marketer_ref', refCode);
        await trackReferralClick(refCode);
      }

      // ── BUY NOW: if redirected from Buy Now button, add the product to cart ──
      const isBuyNow = urlParams.get('buyNow') === 'true';
      const buyNowProductId = urlParams.get('productId');
      const buyNowPrice = urlParams.get('price');
      if (isBuyNow && buyNowProductId) {
        const { data: product } = await supabase
          .from('products')
          .select('*')
          .eq('id', buyNowProductId)
          .single();
        if (product) {
          const price = buyNowPrice ? parseFloat(buyNowPrice) : (product.sale_price || product.regular_price);
          addToCart({ ...product, price }, 1);
        }
      }
      // ─────────────────────────────────────────────────────────────────────
    }
    initCheckout();
  }, []);

  const trackReferralClick = async (refCode: string) => {
    try {
      const { data: marketer } = await supabase
        .from('marketers')
        .select('id, total_clicks')
        .eq('referral_id', refCode)
        .single();

      if (marketer) {
        await supabase
          .from('marketers')
          .update({ total_clicks: (marketer.total_clicks || 0) + 1 })
          .eq('id', marketer.id);
        toast.success('تم تطبيق رابط الإحالة! ستحصل على خصم 5%');
      }
    } catch (error) {
      console.error('Error tracking referral:', error);
    }
  };

  const subtotal = useMemo(() => cart.reduce((sum: number, item: any) => sum + (parseFloat(item.price) * item.quantity), 0), [cart]);

  const finalTotal = useMemo(() => {
    const shipping = selectedCity?.price || 0;
    let currentDiscount = discountAmount;
    if (appliedPromoType === 'free_shipping') currentDiscount = shipping;
    const total = (subtotal + shipping) - currentDiscount;
    return total > 0 ? total : 0;
  }, [subtotal, selectedCity, discountAmount, appliedPromoType]);

  useEffect(() => { if (isInitialized) setTimeout(() => setIsReady(true), 800); }, [isInitialized]);

  const trackAbandonedCart = async () => {
    if (!customerInfo.email || cart.length === 0) return;
    try {
      await supabase.from('abandoned_carts').upsert({
        email: customerInfo.email,
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone,
        cart_items: cart,
        total_price: finalTotal,
        status: 'abandoned',
        updated_at: new Date().toISOString()
      }, { onConflict: 'email' });
    } catch (err) {
      console.error("Tracking abandoned cart failed:", err);
    }
  };

  const applyPromoCode = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    try {
      // ── FIX: no embedded join — fetch promo_codes and marketer separately ──
const { data: affiliatePromo } = await supabase
  .from('promo_codes')
  .select('*')
  .eq('code', promoCode.trim().toUpperCase())
  .eq('is_active', true)
  .maybeSingle();

if (affiliatePromo) {
  const { data: marketerData } = await supabase
    .from('marketers')
    .select('id, full_name, tier_percentage')
    .eq('id', affiliatePromo.marketer_id)
    .maybeSingle();

  const discountPercentage = affiliatePromo.discount_percentage || 5;
  const calculatedDiscount = (subtotal * discountPercentage) / 100;
  setDiscountAmount(calculatedDiscount);
  setAppliedPromo(affiliatePromo.code);
  setAppliedPromoType('affiliate_percentage');
  setAffiliateMarketerId(affiliatePromo.marketer_id);
  await supabase.from('promo_codes').update({ usage_count: (affiliatePromo.usage_count || 0) + 1 }).eq('id', affiliatePromo.id);
  toast.success(`تم تطبيق كود المسوق "${marketerData?.full_name || 'المسوق'}" - خصم ${discountPercentage}%! 🎉`);
  trackAbandonedCart();
  return;
}

const { data, error } = await supabase
  .from('coupons')
  .select('*')
  .eq('code', promoCode.trim().toUpperCase())
  .eq('is_active', true)
  .maybeSingle();


      if (error || !data) {
        toast.error('كود الخصم غير صحيح أو منتهي');
        setDiscountAmount(0);
        setAppliedPromo(null);
        setAppliedPromoType(null);
        return;
      }

      if (data.expiry_date && new Date(data.expiry_date) < new Date()) {
        toast.error('هذا الكود قد انتهت صلاحيته');
        return;
      }

      setAppliedPromoType(data.discount_type);
      setAppliedPromo(data.code);
      if (data.discount_type === 'free_shipping') {
        setDiscountAmount(0);
        toast.success(`مبروك! تم تطبيق الشحن المجاني 🚚`);
      } else {
        let calculatedDiscount = data.discount_type === 'percentage' 
          ? (subtotal * data.discount_value) / 100 
          : data.discount_value;
        setDiscountAmount(calculatedDiscount);
        toast.success(`تم تطبيق خصم بقيمة ${calculatedDiscount.toFixed(2)} ج.م ✅`);
      }
      trackAbandonedCart();
    } catch (err) {
      toast.error('حدث خطأ أثناء التحقق من الكود');
    } finally {
      setPromoLoading(false);
    }
  };

  const uploadToCloudinary = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
    const data = await res.json();
    return data.secure_url;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setScreenshot(e.target.files[0]);
      toast.success('تم اختيار إثبات التحويل');
    }
  };

  const initiateEasyKashPayment = async (orderId: string) => {
    try {
      console.log('[EasyKash] Initiating payment for order:', orderId, 'amount:', finalTotal);

      const payload = {
        amount: finalTotal,
        customerName: customerInfo.name.trim(),
        customerPhone: customerInfo.phone.trim(),
        customerEmail: customerInfo.email?.trim() || 'customer@zaitandfilters.com',
        orderId: orderId,
        description: `طلب رقم ${orderId} - زيت وفلاتر`,
      };

      console.log('[EasyKash] Sending payload:', payload);

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const rawText = await response.text();
      console.log('[EasyKash] Raw response:', rawText);

      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(`Response is not valid JSON: ${rawText.slice(0, 200)}`);
      }

      if (!response.ok) {
        const detail = data?.details?.message || data?.message || data?.error || `HTTP ${response.status}`;
        throw new Error(detail);
      }

      if (data.success && data.url) {
        toast.success('جاري التحويل لصفحة الدفع... 🚀');
        setTimeout(() => { window.location.href = data.url; }, 500);
      } else {
        throw new Error(data.message || data.error || 'لم يتم إرجاع رابط الدفع من EasyKash');
      }
    } catch (err: any) {
      console.error('[EasyKash] Error:', err);
      toast.error('خطأ في بوابة الدفع: ' + err.message);
      setLoading(false);
    }
  };

  const trackAffiliateCommission = async (orderId: string, marketerId: string) => {
    try {
      const { data: marketer } = await supabase
        .from('marketers')
        .select('tier_percentage, total_conversions, total_earnings, pending_balance')
        .eq('id', marketerId)
        .single();

      const commissionRate = marketer?.tier_percentage || 5;
      const commissionAmount = subtotal * (commissionRate / 100);

      await supabase.from('affiliate_commissions').insert([{
        marketer_id: marketerId,
        order_id: orderId,
        commission_amount: commissionAmount,
        order_total: subtotal,
        status: 'pending',
        is_released: false,
        delivery_date: null,
        release_date: null
      }]);

      await supabase.from('marketers').update({
        total_earnings: (marketer?.total_earnings || 0) + commissionAmount,
        total_conversions: (marketer?.total_conversions || 0) + 1,
        pending_balance: (marketer?.pending_balance || 0) + commissionAmount
      }).eq('id', marketerId);
    } catch (error) {
      console.error('Error tracking commission:', error);
    }
  };

  // ── PDF download handler ───────────────────────────────────────────────────
  const handleDownloadInvoice = async (orderId: string) => {
    setIsDownloadingPdf(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);

      const element = document.getElementById('order-invoice-preview');
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const orderNum = orderId.slice(0, 8).toUpperCase();
      pdf.save(`ORDER-${orderNum}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast.error('حدث خطأ في تحميل الـ PDF');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (subtotal <= 0) return toast.error('السلة فارغة');

    if (paymentMethod !== 'card_installments' && !screenshot) {
      return toast.error('يرجى رفع سكرين شوت التحويل');
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let uploadedImageUrl = screenshot ? await uploadToCloudinary(screenshot) : null;

      let finalMarketerId = affiliateMarketerId;

      if (!finalMarketerId && appliedPromo) {
        const { data: marketerByPromo } = await supabase.from('marketers').select('id').eq('promo_code', appliedPromo).single();
        if (marketerByPromo) finalMarketerId = marketerByPromo.id;
      }

      if (!finalMarketerId) {
        const savedRef = localStorage.getItem('zf_marketer_ref');
        if (savedRef) {
          const { data: marketerByRef } = await supabase.from('marketers').select('id').eq('referral_id', savedRef).single();
          if (marketerByRef) finalMarketerId = marketerByRef.id;
        }
      }

      const orderData = {
        user_id: user?.id || null,
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone,
        customer_email: customerInfo.email,
        customer_address: customerInfo.address,
        city: selectedCity?.city_name,
        shipping_cost: selectedCity?.price,
        discount_applied: appliedPromoType === 'free_shipping' ? selectedCity?.price : discountAmount, 
        promo_code: appliedPromo, 
        total_price: finalTotal,
        items: cart, 
        payment_method: paymentMethod,
        payment_screenshot_url: uploadedImageUrl,
        car_mileage: carMileage,
        marketer_id: finalMarketerId,
        status: paymentMethod === 'card_installments' ? 'pending_payment' : 'pending',
        created_at: new Date().toISOString()
      };

      const { data: newOrder, error } = await supabase.from('orders').insert([orderData]).select().single();
      if (error) throw error;

      if (finalMarketerId) await trackAffiliateCommission(newOrder.id, finalMarketerId);

      if (customerInfo.email) {
        await supabase.from('abandoned_carts').update({ status: 'recovered' }).eq('email', customerInfo.email);
      }

      await markAsRecovered(newOrder.id);
      localStorage.removeItem('zf_marketer_ref');
      if (paymentMethod === 'card_installments') {
        await initiateEasyKashPayment(newOrder.id);
      } else {
        // ── FIX: snapshot cart & totals BEFORE clearCart so invoice renders correctly ──
        setCompletedOrderItems([...cart]);
        setCompletedSubtotal(subtotal);
        setCompletedFinalTotal(finalTotal);
        setCompletedOrderId(newOrder.id);
        clearCart();
        toast.success('تم تسجيل طلبك بنجاح! 🎉');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setLoading(false);
      }
    } catch (err: any) {
      toast.error('Error: ' + err.message);
      setLoading(false);
    }
  };

  if (!isReady || shippingRates.length === 0) return <div style={loaderStyle}><Loader2 className="animate-spin" size={40} color="#15803d" /> جاري تجهيز الطلب...</div>;

  // ── ORDER SUCCESS SCREEN with Invoice ─────────────────────────────────────
  if (completedOrderId) {
    const orderNum = completedOrderId.slice(0, 8).toUpperCase();
    const orderDate = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    const shipping = selectedCity?.price || 0;
    const discount = appliedPromoType === 'free_shipping' ? shipping : discountAmount;

    return (
      <div style={{ direction: 'rtl', padding: '30px 20px', maxWidth: '820px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {/* Success banner */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a, #14532d)',
          borderRadius: '20px', padding: '30px', textAlign: 'center',
          marginBottom: '24px', color: '#fff',
        }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '10px' }}>🎉</div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '900', marginBottom: '6px' }}>تم تسجيل طلبك بنجاح!</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem' }}>
            رقم الطلب: <span style={{ color: '#22c55e', fontWeight: '900' }}>#{orderNum}</span>
          </p>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <button
            onClick={() => handleDownloadInvoice(completedOrderId)}
            disabled={isDownloadingPdf}
            style={{
              flex: 1, minWidth: '200px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              padding: '14px 24px',
              background: isDownloadingPdf ? '#ccc' : 'linear-gradient(135deg, #22c55e, #16a34a)',
              color: '#fff', border: 'none', borderRadius: '14px',
              fontWeight: '800', fontSize: '0.95rem',
              cursor: isDownloadingPdf ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 15px rgba(34,197,94,0.3)',
            }}
          >
            {isDownloadingPdf ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            {isDownloadingPdf ? 'جاري التحميل...' : 'تحميل ORDER (PDF)'}
          </button>

          <Link
            href={`/orders/${completedOrderId}/invoice`}
            target="_blank"
            style={{
              flex: 1, minWidth: '200px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              padding: '14px 24px',
              background: '#0f172a',
              color: '#fff', borderRadius: '14px',
              fontWeight: '800', fontSize: '0.95rem',
              textDecoration: 'none',
            }}
          >
            <FileText size={18} color="#22c55e" />
            عرض ORDER في صفحة جديدة
            <ExternalLink size={14} style={{ opacity: 0.6 }} />
          </Link>

          <button
            onClick={() => router.push('/')}
            style={{
              flex: 1, minWidth: '160px',
              padding: '14px 24px',
              background: '#fff', color: '#1a1a1a',
              border: '1.5px solid #e5e5e5', borderRadius: '14px',
              fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer',
            }}
          >
            العودة للرئيسية
          </button>
        </div>

        {/* ── INVOICE PREVIEW (also used by html2canvas for PDF) ── */}
        <div
          id="order-invoice-preview"
          style={{
            backgroundColor: '#fff',
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 10px 40px rgba(0,0,0,0.10)',
            border: '1px solid #f0f0f0',
          }}
        >
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f4c2a 100%)',
            padding: '36px 44px', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: '-60px', left: '-60px', width: '200px', height: '200px', borderRadius: '50%', backgroundColor: 'rgba(34,197,94,0.07)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '-40px', right: '10%', width: '150px', height: '150px', borderRadius: '50%', backgroundColor: 'rgba(34,197,94,0.05)', pointerEvents: 'none' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
              <div>
                <div style={{ fontSize: '1.9rem', fontWeight: '900', fontStyle: 'italic', color: '#fff', letterSpacing: '-1px', marginBottom: '4px' }}>
                  ZAIT <span style={{ color: '#22c55e' }}>& FILTERS</span>
                </div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', fontWeight: '600', letterSpacing: '2px' }}>
                  AUTO PARTS · قطع غيار
                </div>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '2.6rem', fontWeight: '900', color: '#22c55e', letterSpacing: '-1px', lineHeight: 1 }}>ORDER</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', fontWeight: '700', marginTop: '4px', letterSpacing: '1px' }}>#{orderNum}</div>
              </div>
            </div>
            <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '10px', position: 'relative', zIndex: 1 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                backgroundColor: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)',
                padding: '5px 14px', borderRadius: '20px',
              }}>
                <CheckCircle size={13} color="#22c55e" />
                <span style={{ color: '#22c55e', fontSize: '0.78rem', fontWeight: '800' }}>تم تأكيد الطلب</span>
              </div>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem' }}>{orderDate}</span>
            </div>
          </div>
          {/* Meta row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid #f0f0f0' }}>
            {[
              { label: 'رقم الطلب', value: `#${orderNum}` },
              { label: 'تاريخ الطلب', value: orderDate },
              // ── FIX: use completedOrderItems instead of cart ──
              { label: 'عدد المنتجات', value: `${completedOrderItems.length} منتج` },
            ].map((item, i) => (
              <div key={i} style={{ padding: '18px 22px', borderRight: i < 2 ? '1px solid #f0f0f0' : 'none' }}>
                <div style={{ fontSize: '0.68rem', color: '#aaa', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '4px' }}>{item.label}</div>
                <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#1a1a1a' }}>{item.value}</div>
              </div>
            ))}
          </div>

          <div style={{ padding: '30px 44px' }}>
            {/* Customer info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '28px' }}>
              <div style={{ backgroundColor: '#f9fafb', borderRadius: '14px', padding: '20px', border: '1px solid #f0f0f0' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: '900', color: '#888', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>بيانات العميل</div>
                <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#1a1a1a', marginBottom: '8px' }}>{customerInfo.name}</div>
                <div style={{ fontSize: '0.82rem', color: '#555', fontWeight: '600', direction: 'ltr', marginBottom: '4px' }}>{customerInfo.phone}</div>
                {customerInfo.email && <div style={{ fontSize: '0.8rem', color: '#888' }}>{customerInfo.email}</div>}
              </div>
              <div style={{ backgroundColor: '#f9fafb', borderRadius: '14px', padding: '20px', border: '1px solid #f0f0f0' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: '900', color: '#888', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>عنوان التوصيل</div>
                <div style={{ fontSize: '0.85rem', color: '#1a1a1a', fontWeight: '700', lineHeight: '1.5', marginBottom: '8px' }}>{customerInfo.address}</div>
                <div style={{ fontSize: '0.8rem', color: '#22c55e', fontWeight: '700' }}>{selectedCity?.city_name}</div>
                <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e5e5e5' }}>
                  طريقة الدفع: <span style={{ fontWeight: '800', color: '#1a1a1a' }}>
                    {paymentMethod === 'card_installments' ? 'بطاقة / تقسيط' : paymentMethod === 'instapay' ? 'InstaPay' : 'محفظة إلكترونية'}
                  </span>
                </div>
              </div>
            </div>

            {/* Items table */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: '900', color: '#888', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>تفاصيل المنتجات</div>
              <div style={{ backgroundColor: '#0f172a', borderRadius: '10px 10px 0 0', padding: '10px 16px', display: 'grid', gridTemplateColumns: '2.5fr 0.7fr 1fr 1fr' }}>
                {['المنتج', 'الكمية', 'سعر الوحدة', 'الإجمالي'].map((h, i) => (
                  <div key={i} style={{ fontSize: '0.68rem', fontWeight: '800', color: '#94a3b8', textAlign: i === 0 ? 'right' : 'center', textTransform: 'uppercase' }}>{h}</div>
                ))}
              </div>
              {/* ── FIX: use completedOrderItems instead of cart ── */}
              {completedOrderItems.map((item: any, i: number) => (
                <div key={item.id} style={{
                  display: 'grid', gridTemplateColumns: '2.5fr 0.7fr 1fr 1fr',
                  padding: '12px 16px', backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa',
                  borderBottom: '1px solid #f0f0f0', borderRight: '1px solid #f0f0f0', borderLeft: '1px solid #f0f0f0',
                  alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: '0.87rem', fontWeight: '800', color: '#1a1a1a' }}>{item.name}</div>
                    {item.brand && <div style={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: '700' }}>{item.brand}</div>}
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ backgroundColor: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: '800' }}>×{item.quantity}</span>
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '0.85rem', fontWeight: '700', color: '#444' }}>{parseFloat(item.price).toLocaleString('ar-EG')} ج.م</div>
                  <div style={{ textAlign: 'center', fontSize: '0.9rem', fontWeight: '900', color: '#1a1a1a' }}>{(parseFloat(item.price) * item.quantity).toLocaleString('ar-EG')} ج.م</div>
                </div>
              ))}
              <div style={{ height: '4px', backgroundColor: '#0f172a', borderRadius: '0 0 10px 10px' }} />
            </div>
            {/* Totals */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ width: '270px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px dashed #e5e5e5', fontSize: '0.86rem' }}>
                  <span style={{ color: '#666', fontWeight: '700' }}>المجموع الجزئي</span>
                  {/* ── FIX: use completedSubtotal instead of subtotal ── */}
                  <span style={{ fontWeight: '800' }}>{completedSubtotal.toFixed(2)} ج.م</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px dashed #e5e5e5', fontSize: '0.86rem' }}>
                  <span style={{ color: '#666', fontWeight: '700' }}>الشحن</span>
                  {appliedPromoType === 'free_shipping'
                    ? <span style={{ color: '#22c55e', fontWeight: '800' }}>مجاني 🚚</span>
                    : <span style={{ fontWeight: '800' }}>{shipping.toFixed(2)} ج.م</span>
                  }
                </div>
                {discount > 0 && appliedPromoType !== 'free_shipping' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px dashed #e5e5e5', fontSize: '0.86rem' }}>
                    <span style={{ color: '#666', fontWeight: '700' }}>الخصم</span>
                    <span style={{ color: '#ef4444', fontWeight: '800' }}>- {discount.toFixed(2)} ج.م</span>
                  </div>
                )}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginTop: '12px', padding: '14px 18px',
                  background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderRadius: '12px',
                }}>
                  <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.82rem', fontWeight: '700' }}>الإجمالي الكلي</span>
                  {/* ── FIX: use completedFinalTotal instead of finalTotal ── */}
                  <span style={{ color: '#22c55e', fontSize: '1.35rem', fontWeight: '900' }}>{completedFinalTotal.toFixed(2)} ج.م</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            background: 'linear-gradient(135deg, #0f172a, #1e293b)',
            padding: '24px 44px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: '900', fontStyle: 'italic', color: '#fff' }}>
                ZAIT <span style={{ color: '#22c55e' }}>& FILTERS</span>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem', marginTop: '3px' }}>zaitandfilters.com</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#22c55e', fontSize: '0.78rem', fontWeight: '800' }}>شكراً لثقتكم بنا</div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.68rem', marginTop: '2px' }}>Thank you for your order</div>
            </div>
            <div style={{
              backgroundColor: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: '8px', padding: '6px 14px',
              color: '#22c55e', fontSize: '0.72rem', fontWeight: '800', letterSpacing: '1px',
            }}>
              ORDER #{orderNum}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── NORMAL CHECKOUT FORM ──────────────────────────────────────────────────
  return (
    <div style={container}>
      <style dangerouslySetInnerHTML={{ __html: `
        .btn-hover:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(21, 128, 61, 0.4); background: #14532d !important; }
        .action-hover:hover { background: #000 !important; transform: translateY(-1px); }
        .upload-hover:hover { background: #f0fdf4 !important; border-color: #15803d !important; }
        .promo-btn:hover { background: #1a1a1a !important; color: #fff !important; transform: scale(1.02); }
        input:focus, select:focus, textarea:focus { border-color: #15803d !important; box-shadow: 0 0 0 3px rgba(21, 128, 61, 0.1); }
      `}} />

      <h1 style={title}>🏁 إتمام عملية الشراء</h1>
      <div style={layoutGrid}>

        <div style={summarySide}>
          {/* ── Changed فاتورتك → ORDER ── */}
          <h3 style={sectionTitle}><ShoppingCart size={18} /> تفاصيل ORDER</h3>
          <div style={itemsList}>
            {cart.map((item: any) => {
               const country = item.country_origin || item.country_of_origin || 'أصلي';
               return (
                <div key={item.id} style={cartItem}>
                  <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={imageBox}><img src={item.image_url || item.image} alt="" style={imgFluid} /></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: '900', fontSize: '0.95rem' }}>{item.name}</span>
                        <span style={{ fontWeight: '900' }}>{(parseFloat(item.price) * item.quantity).toFixed(2)} ج.م</span>
                      </div>
                      <div style={detailsGrid}>
                        <div style={detailItem}><Tags size={11} color="#15803d" /> <span>البراند: <b>{item.brand}</b></span></div>
                        <div style={detailItem}><Settings2 size={11} color="#15803d" /> <span>لسيارة: <b>{item.car_make} {item.car_model}</b></span></div>
                        {item.car_model_year && <div style={detailItem}><Calendar size={11} color="#15803d" /> <span>سنة الموديل: <b>{item.car_model_year}</b></span></div>}
                        <div style={detailItem}><Globe size={11} color="#15803d" /> <span>بلد المنشأ: <b>{country}</b></span></div>
                      </div>
                      <div style={{ marginTop: '5px' }}>
                        <span style={qtyBadge}>الكمية: {item.quantity}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={promoWrapper}>
            <label style={lab}><Ticket size={14} color="#15803d" /> هل لديك كود خصم أو كود مسوق؟</label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '5px' }}>
              <input placeholder="ادخل الكود هنا" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} style={{ ...inp, marginBottom: 0, flex: 1 }} disabled={!!appliedPromo} />
              <button type="button" onClick={applyPromoCode} disabled={promoLoading || !!appliedPromo || !promoCode} className="promo-btn" style={promoBtnStyle}>
                {promoLoading ? <Loader2 size={16} className="animate-spin" /> : appliedPromo ? 'تم التطبيق' : 'تطبيق'}
              </button>
            </div>
            {appliedPromo && <p style={promoSuccessText}>✅ تم تطبيق الكود "{appliedPromo}" بنجاح! {appliedPromoType === 'free_shipping' ? 'تم تصفير مصاريف الشحن 🚚' : appliedPromoType === 'affiliate_percentage' ? `خصم ${discountAmount.toFixed(2)} ج.م` : `تم خصم ${discountAmount.toFixed(2)} ج.م`}</p>}
          </div>
          <div style={totalBox}>
            <div style={rowPrice}><span>إجمالي المنتجات:</span><span>{subtotal.toFixed(2)} ج.م</span></div>
            <div style={rowPrice}>
              <span>الشحن ({selectedCity?.city_name}):</span>
              <span style={{ textDecoration: appliedPromoType === 'free_shipping' ? 'line-through' : 'none', color: appliedPromoType === 'free_shipping' ? '#999' : 'inherit' }}>
                {(selectedCity?.price || 0).toFixed(2)} ج.م
              </span>
            </div>
            {appliedPromoType === 'free_shipping' && <div style={{ ...rowPrice, color: '#27ae60', fontWeight: 'bold' }}><span>خصم الشحن المجاني:</span><span>-{(selectedCity?.price || 0).toFixed(2)} ج.م</span></div>}
            {discountAmount > 0 && (
              <div style={{ ...rowPrice, color: '#e74c3c', fontWeight: 'bold' }}>
                <span>{appliedPromoType === 'affiliate_percentage' ? 'خصم كود المسوق:' : 'خصم البرومو كود:'}</span>
                <span>-{discountAmount.toFixed(2)} ج.م</span>
              </div>
            )}
            <div style={finalRow}><span>الإجمالي النهائي:</span><span>{finalTotal.toFixed(2)} ج.م</span></div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={formSide}>
          <h3 style={sectionTitle}><User size={18} /> بيانات المستلم</h3>
          <div style={inputGroup}>
            <label style={lab}>الاسم بالكامل</label>
            <input value={customerInfo.name} onChange={(e) => { setCustomerInfo({...customerInfo, name: e.target.value}); localStorage.setItem('checkout_name', e.target.value); }} onBlur={trackAbandonedCart} required style={inp} />
          </div>
          <div style={inputGroup}>
            <label style={lab}>رقم الموبايل</label>
            <input value={customerInfo.phone} onChange={(e) => { setCustomerInfo({...customerInfo, phone: e.target.value}); localStorage.setItem('checkout_phone', e.target.value); }} onBlur={trackAbandonedCart} required style={inp} />
          </div>
          <div style={inputGroup}>
            <label style={lab}><Mail size={14} /> البريد الإلكتروني</label>
            <input type="email" placeholder="example@mail.com" value={customerInfo.email} onChange={(e) => { setCustomerInfo({...customerInfo, email: e.target.value}); localStorage.setItem('checkout_email', e.target.value); }} onBlur={trackAbandonedCart} required style={inp} />
          </div>
          <div style={inputGroup}>
            <label style={lab}><Gauge size={14} /> قراءة العداد (اختياري)</label>
            <input type="number" value={carMileage} onChange={(e) => setCarMileage(e.target.value)} style={inp} />
          </div>
          <div style={inputGroup}>
            <label style={lab}>المحافظة</label>
            <select style={inp} value={selectedCity?.city_name} onChange={(e) => setSelectedCity(shippingRates.find(c => c.city_name === e.target.value))}>
              {shippingRates.map(city => <option key={city.id} value={city.city_name}>{city.city_name}</option>)}
            </select>
          </div>
          <div style={inputGroup}>
            <label style={lab}>العنوان بالتفصيل</label>
            <textarea value={customerInfo.address} onChange={(e)=>setCustomerInfo({...customerInfo, address: e.target.value})} required style={{...inp, height: '80px', paddingTop: '12px'}} />
          </div>

          <div style={{ marginTop: '20px', marginBottom: '20px' }}>
            <h3 style={sectionTitle}><Banknote size={18} /> وسيلة الدفع</h3>
            <div style={paymentContainer}>

              <label style={paymentCard(paymentMethod === 'card_installments')}>
                <input type="radio" value="card_installments" checked={paymentMethod === 'card_installments'} onChange={(e) => setPaymentMethod(e.target.value)} style={hideRadio}/>
                <div style={payCardInner}>
                  <div style={payHeader}>
                    <div style={payIconWrapper}><CreditCard size={16} color={paymentMethod === 'card_installments' ? '#15803d' : '#666'} /></div>
                    <div style={payTextContent}>
                      <span style={payTitle}>دفع بالتقسيط أو الفيرا</span>
                    </div>
                  </div>
                  <div style={logosGrid}>
                    {[
                      'فيزا', 'ماستر كارد', 'ميزة', 'Apple Pay', 'فاليو',
                      'أمان', 'سهولة', 'فرصة', 'كونتاكت', 'ترو',
                      'كليفر', 'كارت فوري', 'كارت حالا', 'كارت لاكي',
                      'تقسيط البنك الأهلي', 'كارت تكة',
                    ].map((label) => (
                      <span key={label} style={paymentBadge}>{label}</span>
                    ))}
                  </div>
                </div>
              </label>

              <label style={paymentCard(paymentMethod === 'instapay')}>
                <input type="radio" value="instapay" checked={paymentMethod === 'instapay'} onChange={(e) => setPaymentMethod(e.target.value)} style={hideRadio}/>
                <div style={payCardInner}>
                  <div style={payHeader}>
                    <div style={payIconWrapper}><SmartphoneNfc size={16} color={paymentMethod === 'instapay' ? '#15803d' : '#666'} /></div>
                    <div style={payTextContent}><span style={payTitle}>تطبيق انستا باي (InstaPay)</span></div>
                  </div>
                  <div style={logosGrid}>
                    <img src="https://i.postimg.cc/3r19c1zy/Pv1p8v-KJq4Z-LLOj-Qj-BZp-K8DNJg4Zb5.png" alt="InstaPay" style={miniLogoImg} />
                  </div>
                  {paymentMethod === 'instapay' && (
                    <div style={payDetailsBox}>
                      <a href="https://ipn.eg/S/jimmymodo/instapay/3Jvfcf" target="_blank" className="action-hover" style={actionBtnLink}><ExternalLink size={14} /> اذهب للدفع الآن</a>
                      <label htmlFor="u-insta" className="upload-hover" style={uploadArea}><Upload size={14}/> {screenshot ? '✅ تم اختيار الإثبات' : 'رفع سكرين شوت التحويل'}</label>
                      <input id="u-insta" type="file" accept="image/*" onChange={handleFileUpload} style={{display:'none'}}/>
                    </div>
                  )}
                </div>
              </label>

              <label style={paymentCard(paymentMethod === 'wallets')}>
                <input type="radio" value="wallets" checked={paymentMethod === 'wallets'} onChange={(e) => setPaymentMethod(e.target.value)} style={hideRadio}/>
                <div style={payCardInner}>
                  <div style={payHeader}>
                    <div style={payIconWrapper}><Wallet size={16} color={paymentMethod === 'wallets' ? '#15803d' : '#666'} /></div>
                    <div style={payTextContent}><span style={payTitle}>محافظ إلكترونية (كاش)</span></div>
                  </div>
                  <div style={logosGrid}>
                    <img src="https://i.postimg.cc/ryjgPj7K/VODAFONE.jpg" alt="Vodafone Cash" style={miniLogoImg} />
                    <img src="https://i.postimg.cc/Y2R8sRTj/ORANGE.jpg" alt="Orange Money" style={miniLogoImg} />
                    <img src="https://i.postimg.cc/59gpRgDy/ETTISALAT.jpg" alt="Etisalat Cash" style={miniLogoImg} />
                  </div>
                  {paymentMethod === 'wallets' && (
                    <div style={payDetailsBox}>
                      <span style={{fontSize:'0.8rem', color:'#666'}}>التحويل للرقم: <strong>01023862436</strong></span>
                      <label htmlFor="u-cash" className="upload-hover" style={uploadArea}><Upload size={14}/> {screenshot ? '✅ تم اختيار الإثبات' : 'رفع إثبات التحويل'}</label>
                      <input id="u-cash" type="file" accept="image/*" onChange={handleFileUpload} style={{display:'none'}}/>
                    </div>
                  )}
                </div>
              </label>

            </div>
          </div>

          <button disabled={loading} type="submit" className="btn-hover" style={btnStyle}>
            {loading ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle size={20} /> {paymentMethod === 'card_installments' ? 'الانتقال للدفع والتقسيط' : 'تأكيد وإتمام الطلب'}</>}
          </button>
        </form>
      </div>
    </div>
  );
}

const container: any = { padding: '40px 20px', maxWidth: '1200px', margin: '0 auto', direction: 'rtl' };
const title: any = { marginBottom: '30px', fontWeight: '900', textAlign: 'center', fontSize: '2rem' };
const layoutGrid: any = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '25px', alignItems: 'start' };
const sectionTitle: any = { marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '2px solid #eee', paddingBottom: '10px', fontWeight: '800' };
const formSide: any = { background: '#fff', padding: '25px', borderRadius: '25px', border: '1px solid #eee', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' };
const summarySide: any = { background: '#fcfcfc', padding: '25px', borderRadius: '25px', border: '1px solid #eee' };
const inp: any = { width: '100%', height: '50px', padding: '0 15px', borderRadius: '12px', border: '1px solid #ddd', marginBottom: '10px', outline: 'none', fontSize: '0.95rem', display: 'flex', alignItems: 'center' };
const lab: any = { display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85rem', color: '#444' };
const inputGroup: any = { marginBottom: '10px' };
const cartItem: any = { padding: '10px 0', borderBottom: '1px solid #eee', marginBottom: '10px' };
const imageBox: any = { width: '65px', height: '65px', borderRadius: '12px', overflow: 'hidden', background: '#fff', border: '1px solid #eee' };
const imgFluid: any = { width: '100%', height: '100%', objectFit: 'contain' };
const totalBox: any = { background: '#f0fdf4', padding: '15px', borderRadius: '15px', marginTop: '10px', border: '1px solid #dcfce7' };
const rowPrice: any = { display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.9rem' };
const finalRow: any = { display: 'flex', justifyContent: 'space-between', fontWeight: '1000', fontSize: '1.4rem', color: '#166534', borderTop: '1px solid #dcfce7', paddingTop: '10px', marginTop: '5px' };
const btnStyle: any = { width: '100%', padding: '18px', background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)', color: '#fff', border: 'none', borderRadius: '16px', fontWeight: '900', cursor: 'pointer', fontSize: '1.1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', transition: 'all 0.3s ease', boxShadow: '0 4px 15px rgba(21, 128, 61, 0.25)' };
const loaderStyle: any = { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', gap: '10px', color: '#15803d', fontWeight: 'bold' };
const itemsList: any = { maxHeight: '350px', overflowY: 'auto' };
const detailsGrid = { display: 'flex', flexDirection: 'column' as const, gap: '3px', marginTop: '8px' };
const detailItem = { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#666' };
const qtyBadge = { backgroundColor: '#f0fdf4', color: '#15803d', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800' };

// ── Payment styles — compact & elegant ────────────────────────────────────────
const paymentContainer: any = { display: 'flex', flexDirection: 'column', gap: '6px' };
const paymentCard = (isActive: boolean) => ({ display: 'block', padding: '10px 14px', borderRadius: '12px', border: isActive ? '2px solid #15803d' : '1px solid #e8e8e8', borderRight: isActive ? '4px solid #15803d' : '1px solid #e8e8e8', background: isActive ? '#f7fff9' : '#fafafa', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: isActive ? '0 2px 10px rgba(21, 128, 61, 0.08)' : 'none' });
const payCardInner: any = { display: 'flex', flexDirection: 'column', gap: '4px' };
const payHeader: any = { display: 'flex', alignItems: 'center', gap: '10px' };
const payIconWrapper: any = { width: '32px', height: '32px', borderRadius: '8px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ececec', flexShrink: 0 };
const payTextContent: any = { display: 'flex', flexDirection: 'column' };
const payTitle: any = { fontWeight: '800', fontSize: '0.85rem', color: '#1a1a1a' };
const paySubTitle: any = { fontSize: '0.67rem', color: '#999', fontWeight: '500' };
const hideRadio: any = { display: 'none' };
const payDetailsBox: any = { marginTop: '6px', padding: '10px 12px', background: '#fff', borderRadius: '10px', border: '1px dashed #b6e9c8', display: 'flex', flexDirection: 'column', gap: '6px' };
const actionBtnLink: any = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#1a1a1a', color: '#fff', padding: '9px 12px', borderRadius: '10px', textDecoration: 'none', fontSize: '0.82rem', fontWeight: 'bold', transition: '0.3s ease' };
const uploadArea: any = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: '1.5px dashed #15803d', color: '#15803d', padding: '8px 12px', borderRadius: '10px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '800', transition: '0.3s ease' };
const promoWrapper: any = { marginTop: '20px', padding: '15px', background: '#fff', borderRadius: '20px', border: '1px dashed #ddd', marginBottom: '15px' };
const promoBtnStyle: any = { padding: '0 25px', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', transition: '0.3s ease', fontSize: '0.9rem' };
const promoSuccessText: any = { fontSize: '0.8rem', color: '#15803d', marginTop: '10px', fontWeight: 'bold' };
const logosGrid: any = { display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '3px', paddingRight: '42px' };
const miniLogoImg: any = { height: '22px', width: 'auto', borderRadius: '4px', border: '1px solid #f0f0f0', padding: '1px', background: '#fff' };
const paymentBadge: any = { display: 'inline-flex', alignItems: 'center', padding: '2px 7px', background: '#f0fdf4', color: '#15803d', borderRadius: '5px', fontSize: '0.65rem', fontWeight: '800', border: '1px solid #dcfce7', whiteSpace: 'nowrap' };