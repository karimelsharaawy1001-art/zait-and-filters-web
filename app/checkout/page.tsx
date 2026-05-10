'use client';
import { useState, useEffect, useMemo } from 'react';
import { useCart } from '@/context/CartContext'; 
import { supabase } from '@/app/lib/supabase';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAbandonedCart } from '@/hooks/useAbandonedCart';
import { useExitWarning } from '@/app/hooks/useExitWarning';
import Link from 'next/link';
import { 
  User, MapPin, ShoppingCart, Loader2, CheckCircle, Car, Globe, Mail,
  Settings2, Calendar, Tags, Upload, ExternalLink, Plus, Gauge, 
  Banknote, CreditCard, Wallet, SmartphoneNfc, Ticket, FileText, Download, Truck
} from 'lucide-react';

export default function CheckoutPage() {
  const { cart, clearCart, addToCart, isInitialized } = useCart();
  const router = useRouter();
  const { markAsRecovered } = useAbandonedCart();
  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const [completedOrderItems, setCompletedOrderItems] = useState<any[]>([]);
  const [completedSubtotal, setCompletedSubtotal] = useState(0);
  const [completedFinalTotal, setCompletedFinalTotal] = useState(0);

  const [shippingRates, setShippingRates] = useState<any[]>([]);
  const [selectedCity, setSelectedCity] = useState<any>(null);
  const [expressShipping, setExpressShipping] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('instapay');
  const [screenshot, setScreenshot] = useState<File | null>(null);

  const [promoCode, setPromoCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [appliedPromoType, setAppliedPromoType] = useState<string | null>(null);

  const [walletBalance, setWalletBalance] = useState(0);
  const [walletDiscount, setWalletDiscount] = useState(0);
  const [walletApplied, setWalletApplied] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [cashbackPct, setCashbackPct] = useState(5);
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

  const EXPRESS_COST = 150;
  const EXPRESS_CITIES = ['القاهرة', 'الجيزة'];
  const isExpressAvailable = EXPRESS_CITIES.includes(selectedCity?.city_name || '');

  useEffect(() => {
    if (!isExpressAvailable && expressShipping) setExpressShipping(false);
    if (expressShipping && paymentMethod === 'card_installments') setPaymentMethod('instapay');
  }, [selectedCity, expressShipping, paymentMethod, isExpressAvailable]);

  useExitWarning(cart.length > 0 && !completedOrderId);

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

      const { data: { user: u } } = await supabase.auth.getUser();
      if (u) {
        const [walletRes, cashbackRes] = await Promise.all([
          supabase.from('wallets').select('balance').eq('user_id', u.id).single(),
          supabase.from('cashback_settings').select('cashback_percentage, is_enabled').single(),
        ]);
        if (walletRes.data) setWalletBalance(walletRes.data.balance ?? 0);
        if (cashbackRes.data?.is_enabled) setCashbackPct(cashbackRes.data.cashback_percentage ?? 5);
      }

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
    const shipping = expressShipping ? EXPRESS_COST : (selectedCity?.price || 0);
    let currentDiscount = discountAmount;
    if (appliedPromoType === 'free_shipping') currentDiscount = shipping;
    const total = (subtotal + shipping) - currentDiscount - walletDiscount;
    return total > 0 ? total : 0;
  }, [subtotal, selectedCity, discountAmount, appliedPromoType, expressShipping, walletDiscount]);

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

  const applyWallet = async () => {
    if (walletBalance <= 0) return toast.error('رصيد المحفظة صفر');
    setWalletLoading(true);
    try {
      const res = await fetch('/api/wallet/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountToUse: walletBalance, orderTotal: finalTotal + walletDiscount }),
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data.error || 'خطأ في تطبيق المحفظة');
      setWalletDiscount(data.applied);
      setWalletApplied(true);
      toast.success(`تم خصم ${data.applied.toFixed(2)} ج.م من محفظتك 💰`);
    } catch { toast.error('خطأ في الاتصال'); }
    finally { setWalletLoading(false); }
  };

  const removeWallet = () => {
    setWalletDiscount(0);
    setWalletApplied(false);
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

  const initiateEasyKashPayment = async (orderId: string, customerReference: number) => {
    try {
      const payload = {
        amount: finalTotal,
        customerName: customerInfo.name.trim(),
        customerPhone: customerInfo.phone.trim(),
        customerEmail: customerInfo.email?.trim() || 'customer@zaitandfilters.com',
        orderId: orderId,
        customerReference: customerReference,
        description: `طلب رقم ${orderId} - زيت وفلاتر`,
      };

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const rawText = await response.text();
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
        guest_email: customerInfo.email || null,
        guest_phone: customerInfo.phone || null,
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone,
        customer_email: customerInfo.email,
        customer_address: customerInfo.address,
        city: selectedCity?.city_name,
        shipping_cost: expressShipping ? EXPRESS_COST : selectedCity?.price,
        shipping_type: expressShipping ? 'express' : 'standard',
        discount_applied: appliedPromoType === 'free_shipping' ? (expressShipping ? EXPRESS_COST : selectedCity?.price) : discountAmount,
        wallet_discount: walletDiscount || 0,
        promo_code: appliedPromo,
        total_price: finalTotal,
        items: cart,
        payment_method: paymentMethod,
        payment_screenshot_url: uploadedImageUrl,
        car_mileage: carMileage,
        marketer_id: finalMarketerId,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      if (paymentMethod === 'card_installments') {
        const { data: newOrder, error } = await supabase.from('orders').insert([orderData]).select().single();
        if (error) throw error;

        if (finalMarketerId) await trackAffiliateCommission(newOrder.id, finalMarketerId);

        if (customerInfo.email) {
          await supabase.from('abandoned_carts').update({ status: 'recovered' }).eq('email', customerInfo.email);
        }
        await markAsRecovered(newOrder.id);
        localStorage.removeItem('zf_marketer_ref');

        const customerReference = Date.now() % 100000000;
        await initiateEasyKashPayment(newOrder.id, customerReference);

      } else {
        const { data: newOrder, error } = await supabase.from('orders').insert([orderData]).select().single();
        if (error) throw error;

        if (finalMarketerId) await trackAffiliateCommission(newOrder.id, finalMarketerId);

        if (walletDiscount > 0 && user?.id) {
          await supabase.rpc('deduct_wallet', {
            p_user_id: user.id,
            p_amount: walletDiscount,
            p_order_id: newOrder.id,
          });
        }

        if (user?.id) {
          const cashbackAmount = parseFloat((finalTotal * cashbackPct / 100).toFixed(2));
          if (cashbackAmount > 0) {
            await supabase.rpc('credit_cashback', {
              p_user_id: user.id,
              p_order_id: newOrder.id,
              p_amount: cashbackAmount,
            });
          }
        }

        if (customerInfo.email) {
          await supabase.from('abandoned_carts').update({ status: 'recovered' }).eq('email', customerInfo.email);
        }

        await markAsRecovered(newOrder.id);
        localStorage.removeItem('zf_marketer_ref');

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
    const shipping = expressShipping ? EXPRESS_COST : (selectedCity?.price || 0);
    const discount = appliedPromoType === 'free_shipping' ? shipping : discountAmount;

    return (
      <div style={{ direction: 'rtl', padding: '30px 20px', maxWidth: '820px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
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
                <span style={{ color: '#22c55e', fontSize: '0.78rem', fontWeight: '800' }}>تم تأكيد الطلب. يتم تجهيز الطلب في خلال 24 ساعة. و يتم التسليم في خلال 2-5أيام عمل</span>
              </div>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem' }}>{orderDate}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid #f0f0f0' }}>
            {[
              { label: 'رقم الطلب', value: `#${orderNum}` },
              { label: 'تاريخ الطلب', value: orderDate },
              { label: 'عدد المنتجات', value: `${completedOrderItems.length} منتج` },
            ].map((item, i) => (
              <div key={i} style={{ padding: '18px 22px', borderRight: i < 2 ? '1px solid #f0f0f0' : 'none' }}>
                <div style={{ fontSize: '0.68rem', color: '#aaa', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '4px' }}>{item.label}</div>
                <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#1a1a1a' }}>{item.value}</div>
              </div>
            ))}
          </div>

          <div style={{ padding: '30px 44px' }}>
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
                    {expressShipping && <span style={{ marginRight: '6px', color: '#f59e0b', fontSize: '0.7rem' }}>⚡ شحن سريع 48 ساعة</span>}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: '900', color: '#888', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>تفاصيل المنتجات</div>
              <div style={{ backgroundColor: '#0f172a', borderRadius: '10px 10px 0 0', padding: '10px 16px', display: 'grid', gridTemplateColumns: '2.5fr 0.7fr 1fr 1fr' }}>
                {['المنتج', 'الكمية', 'سعر الوحدة', 'الإجمالي'].map((h, i) => (
                  <div key={i} style={{ fontSize: '0.68rem', fontWeight: '800', color: '#94a3b8', textAlign: i === 0 ? 'right' : 'center', textTransform: 'uppercase' }}>{h}</div>
                ))}
              </div>
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

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ width: '270px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px dashed #e5e5e5', fontSize: '0.86rem' }}>
                  <span style={{ color: '#666', fontWeight: '700' }}>المجموع الجزئي</span>
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
                  <span style={{ color: '#22c55e', fontSize: '1.35rem', fontWeight: '900' }}>{completedFinalTotal.toFixed(2)} ج.م</span>
                </div>
              </div>
            </div>
          </div>

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
        .pay-card-label:hover { border-color: #15803d !important; box-shadow: 0 4px 16px rgba(21,128,61,0.10) !important; }
      `}} />

      <h1 style={title}>🏁 إتمام عملية الشراء</h1>
      <div style={layoutGrid}>

        <div style={summarySide}>
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

          {/* ── Wallet Section ── */}
          {walletBalance > 0 && (
            <div style={{ marginBottom: '15px', padding: '15px', background: '#fff', borderRadius: '20px', border: '1px solid #dcfce7' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <label style={{ ...lab, marginBottom: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Wallet size={14} color="#15803d" /> رصيد محفظتك
                </label>
                <span style={{ background: '#f0fdf4', color: '#15803d', fontWeight: '900', fontSize: '0.95rem', padding: '4px 12px', borderRadius: '10px', border: '1px solid #dcfce7' }}>
                  {walletBalance.toFixed(2)} ج.م
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '10px' }}>
                يمكنك استخدام حتى 50% من قيمة الطلب كخصم من محفظتك
              </div>
              {!walletApplied ? (
                <button
                  type="button"
                  onClick={applyWallet}
                  disabled={walletLoading}
                  style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg, #15803d, #166534)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {walletLoading ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
                  {walletLoading ? 'جاري التحقق...' : 'استخدام رصيد المحفظة'}
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', padding: '10px 14px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                  <span style={{ color: '#15803d', fontWeight: '800', fontSize: '0.88rem' }}>✅ تم خصم {walletDiscount.toFixed(2)} ج.م من المحفظة</span>
                  <button type="button" onClick={removeWallet} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700' }}>إلغاء</button>
                </div>
              )}
            </div>
          )}

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
              <span>الشحن ({expressShipping ? 'سريع 48 ساعة' : selectedCity?.city_name}):</span>
              <span style={{ textDecoration: appliedPromoType === 'free_shipping' ? 'line-through' : 'none', color: appliedPromoType === 'free_shipping' ? '#999' : expressShipping ? '#f59e0b' : 'inherit' }}>
                {expressShipping ? `${EXPRESS_COST}` : (selectedCity?.price || 0).toFixed(2)} ج.م
              </span>
            </div>
            {appliedPromoType === 'free_shipping' && <div style={{ ...rowPrice, color: '#27ae60', fontWeight: 'bold' }}><span>خصم الشحن المجاني:</span><span>-{(selectedCity?.price || 0).toFixed(2)} ج.م</span></div>}
            {discountAmount > 0 && (
              <div style={{ ...rowPrice, color: '#e74c3c', fontWeight: 'bold' }}>
                <span>{appliedPromoType === 'affiliate_percentage' ? 'خصم كود المسوق:' : 'خصم البرومو كود:'}</span>
                <span>-{discountAmount.toFixed(2)} ج.م</span>
              </div>
            )}
            {walletDiscount > 0 && (
              <div style={{ ...rowPrice, color: '#15803d', fontWeight: 'bold' }}>
                <span>💰 خصم المحفظة:</span>
                <span>-{walletDiscount.toFixed(2)} ج.م</span>
              </div>
            )}
            <div style={finalRow}><span>الإجمالي النهائي:</span><span>{finalTotal.toFixed(2)} ج.م</span></div>
            <div style={{ marginTop: '10px', padding: '8px 12px', background: '#fffbeb', borderRadius: '10px', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', color: '#92400e', fontWeight: '700' }}>🎁 كاش باك ستحصل عليه في محفظتك</span>
              <span style={{ fontSize: '0.88rem', fontWeight: '900', color: '#d97706' }}>+{(finalTotal * cashbackPct / 100).toFixed(2)} ج.م</span>
            </div>
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

          {/* ── Shipping Type Selector (only for Cairo & Giza) ── */}
          {isExpressAvailable && (
            <div style={{ marginBottom: '16px' }}>
              <label style={lab}><Truck size={14} /> نوع الشحن</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

                {/* Standard shipping */}
                <label onClick={() => setExpressShipping(false)} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 16px', borderRadius: '12px', cursor: 'pointer',
                  border: !expressShipping ? '2px solid #15803d' : '1px solid #e0e0e0',
                  background: !expressShipping ? '#f0fdf4' : '#fafafa',
                  transition: 'all 0.2s',
                }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${!expressShipping ? '#15803d' : '#ccc'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {!expressShipping && <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#15803d' }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '800', fontSize: '0.88rem', color: '#1a1a1a' }}>شحن عادي</div>
                    <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '2px' }}>توصيل خلال 2-5 أيام عمل</div>
                  </div>
                  <div style={{ fontWeight: '900', fontSize: '0.9rem', color: '#15803d' }}>{(selectedCity?.price || 0).toFixed(0)} ج.م</div>
                </label>

                {/* Express shipping */}
                <label onClick={() => { setExpressShipping(true); if (paymentMethod === 'card_installments') setPaymentMethod('instapay'); }} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '12px',
                  padding: '12px 16px', borderRadius: '12px', cursor: 'pointer',
                  border: expressShipping ? '2px solid #f59e0b' : '1px solid #e0e0e0',
                  background: expressShipping ? '#fffbeb' : '#fafafa',
                  transition: 'all 0.2s',
                }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${expressShipping ? '#f59e0b' : '#ccc'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                    {expressShipping && <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#f59e0b' }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: '800', fontSize: '0.88rem', color: '#1a1a1a' }}>شحن سريع خلال 48 ساعة</span>
                      <span style={{ background: '#f59e0b', color: '#fff', fontSize: '0.65rem', fontWeight: '900', padding: '2px 7px', borderRadius: '6px' }}>داخل القاهرة والجيزة</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '3px' }}>توصيل سريع خلال 48 ساعة من تأكيد الطلب</div>
                    <div style={{ marginTop: '6px', padding: '7px 10px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fde68a', fontSize: '0.73rem', color: '#92400e', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      ⚠️ الشحن السريع يقبل فقط: <strong>InstaPay</strong> و <strong>فودافون كاش</strong>
                    </div>
                  </div>
                  <div style={{ fontWeight: '900', fontSize: '0.9rem', color: '#f59e0b', flexShrink: 0 }}>{EXPRESS_COST} ج.م</div>
                </label>
              </div>
            </div>
          )}
          <div style={inputGroup}>
            <label style={lab}>العنوان بالتفصيل</label>
            <textarea value={customerInfo.address} onChange={(e)=>setCustomerInfo({...customerInfo, address: e.target.value})} required style={{...inp, height: '80px', paddingTop: '12px'}} />
          </div>

          {/* ── Payment Methods ── */}
          <div style={{ marginTop: '20px', marginBottom: '20px' }}>
            <h3 style={sectionTitle}><Banknote size={18} /> وسيلة الدفع</h3>

            {/* ── Sorry note: no COD ── */}
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: '12px',
              background: '#fff8f0',
              border: '1.5px solid #f59e0b',
              borderRight: '4px solid #f59e0b',
              borderRadius: '12px',
              padding: '14px 16px',
              marginBottom: '16px',
            }}>
              <span style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: '1px' }}>🙏</span>
              <p style={{ fontSize: '0.82rem', color: '#92400e', fontWeight: '700', lineHeight: '1.6', margin: 0 }}>
                نأسف لعملائنا الكرام — الدفع عند الاستلام غير متاح على موقعنا حاليًا بسبب مشاكل لوجيستية. يرجى اختيار أحد خيارات الدفع المتاحة أدناه.
              </p>
            </div>

            <div style={paymentContainer}>

              {/* ── 1st: InstaPay ── */}
              <label className="pay-card-label" style={paymentCard(paymentMethod === 'instapay')}>
                <input type="radio" value="instapay" checked={paymentMethod === 'instapay'} onChange={(e) => setPaymentMethod(e.target.value)} style={hideRadio}/>
                <div style={payCardInner}>
                  <div style={payHeader}>
                    <div style={paymentMethod === 'instapay' ? payIconWrapperActive : payIconWrapper}>
                      <SmartphoneNfc size={18} color={paymentMethod === 'instapay' ? '#15803d' : '#888'} />
                    </div>
                    <div style={{ ...payTextContent, flex: 1 }}>
                      <span style={payTitle}>InstaPay — انستا باي</span>
                      <span style={paySubTitle}>تحويل فوري عبر تطبيق انستا باي</span>
                    </div>
                    <span style={paymentMethod === 'instapay' ? payBadgeGreen : payBadgeGray}>الأسرع</span>
                  </div>
                  <div style={logosGrid}>
                    <img src="https://i.postimg.cc/3r19c1zy/Pv1p8v-KJq4Z-LLOj-Qj-BZp-K8DNJg4Zb5.png" alt="InstaPay" style={miniLogoImg} />
                  </div>
                  {paymentMethod === 'instapay' && (
                    <div style={payDetailsBox}>
                      <a href="https://ipn.eg/S/jimmydodo/instapay/3Jvfcf" target="_blank" className="action-hover" style={actionBtnLink}><ExternalLink size={14} /> اذهب للدفع الآن</a>
                      <label htmlFor="u-insta" className="upload-hover" style={uploadArea}><Upload size={14}/> {screenshot ? '✅ تم اختيار الإثبات' : 'رفع سكرين شوت التحويل'}</label>
                      <input id="u-insta" type="file" accept="image/*" onChange={handleFileUpload} style={{display:'none'}}/>
                    </div>
                  )}
                </div>
              </label>

              {/* ── 2nd: EasyKash (card/installments) — hidden for express shipping ── */}
              {!expressShipping && (
              <label className="pay-card-label" style={paymentCard(paymentMethod === 'card_installments')}>
                <input type="radio" value="card_installments" checked={paymentMethod === 'card_installments'} onChange={(e) => setPaymentMethod(e.target.value)} style={hideRadio}/>
                <div style={payCardInner}>
                  <div style={payHeader}>
                    <div style={paymentMethod === 'card_installments' ? payIconWrapperActive : payIconWrapper}>
                      <CreditCard size={18} color={paymentMethod === 'card_installments' ? '#15803d' : '#888'} />
                    </div>
                    <div style={{ ...payTextContent, flex: 1 }}>
                      <span style={payTitle}>بطاقة بنكية أو تقسيط</span>
                      <span style={paySubTitle}>فيزا · ماستر كارد · ميزة · Apple Pay والمزيد</span>
                    </div>
                    <span style={paymentMethod === 'card_installments' ? payBadgeAmber : payBadgeGray}>تقسيط متاح</span>
                  </div>
                  {/* ── Professional card options grid ── */}
                  <div style={cardOptionsGrid}>
                    {[
                      { label: 'فيزا', color: '#1a1f71' },
                      { label: 'ماستر كارد', color: '#eb001b' },
                      { label: 'ميزة', color: '#0060a9' },
                      { label: 'Apple Pay', color: '#1a1a1a' },
                      { label: 'فاليو', color: '#6d28d9' },
                      { label: 'أمان', color: '#0369a1' },
                      { label: 'سهولة', color: '#0f766e' },
                      { label: 'فرصة', color: '#b45309' },
                      { label: 'كونتاكت', color: '#be185d' },
                      { label: 'ترو', color: '#15803d' },
                      { label: 'كليفر', color: '#7c3aed' },
                      { label: 'كارت فوري', color: '#c2410c' },
                      { label: 'كارت حالا', color: '#0369a1' },
                      { label: 'كارت لاكي', color: '#0f766e' },
                      { label: 'تقسيط الأهلي', color: '#1a1f71' },
                      { label: 'كارت تكة', color: '#92400e' },
                    ].map(({ label, color }) => (
                      <div key={label} style={{ ...cardOptionBadge, borderColor: color + '33', color: color, background: color + '0d' }}>
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              </label>
              )}

              {/* ── 3rd: E-Wallets ── */}
              <label className="pay-card-label" style={paymentCard(paymentMethod === 'wallets')}>
                <input type="radio" value="wallets" checked={paymentMethod === 'wallets'} onChange={(e) => setPaymentMethod(e.target.value)} style={hideRadio}/>
                <div style={payCardInner}>
                  <div style={payHeader}>
                    <div style={paymentMethod === 'wallets' ? payIconWrapperActive : payIconWrapper}>
                      <Wallet size={18} color={paymentMethod === 'wallets' ? '#15803d' : '#888'} />
                    </div>
                    <div style={{ ...payTextContent, flex: 1 }}>
                      <span style={payTitle}>محافظ إلكترونية (كاش)</span>
                      <span style={paySubTitle}>فودافون كاش · أورنج موني · إتصالات كاش</span>
                    </div>
                  </div>
                  <div style={logosGrid}>
                    <img src="https://i.postimg.cc/ryjgPj7K/VODAFONE.jpg" alt="Vodafone Cash" style={miniLogoImg} />
                    <img src="https://i.postimg.cc/Y2R8sRTj/ORANGE.jpg" alt="Orange Money" style={miniLogoImg} />
                    <img src="https://i.postimg.cc/59gpRgDy/ETTISALAT.jpg" alt="Etisalat Cash" style={miniLogoImg} />
                  </div>
                  {paymentMethod === 'wallets' && (
                    <div style={payDetailsBox}>
                      <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>رقم التحويل</span>
                        <span style={{ fontSize: '0.95rem', fontWeight: '900', color: '#1a1a1a', letterSpacing: '0.5px', direction: 'ltr' }}>01023862436</span>
                      </div>
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
const paymentContainer: any = { display: 'flex', flexDirection: 'column', gap: '10px' };
const paymentCard = (isActive: boolean): any => ({
  display: 'block',
  borderRadius: '14px',
  border: isActive ? '2px solid #15803d' : '1.5px solid #e0e0e0',
  borderRight: isActive ? '4px solid #15803d' : '1.5px solid #e0e0e0',
  background: isActive ? '#f7fff9' : '#fafafa',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  boxShadow: isActive ? '0 4px 16px rgba(21, 128, 61, 0.10)' : 'none',
  overflow: 'hidden',
});
const payCardInner: any = { display: 'flex', flexDirection: 'column', gap: '4px', padding: '14px 16px' };
const payHeader: any = { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' };
const payIconWrapper: any = { width: '40px', height: '40px', borderRadius: '10px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #e8e8e8', flexShrink: 0 };
const payIconWrapperActive: any = { width: '40px', height: '40px', borderRadius: '10px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #bbf7d0', flexShrink: 0 };
const payTextContent: any = { display: 'flex', flexDirection: 'column', gap: '2px' };
const payTitle: any = { fontWeight: '800', fontSize: '0.88rem', color: '#1a1a1a' };
const paySubTitle: any = { fontSize: '0.72rem', color: '#888', fontWeight: '600' };
const hideRadio: any = { display: 'none' };
const payDetailsBox: any = { marginTop: '8px', padding: '10px 12px', background: '#fff', borderRadius: '10px', border: '1px dashed #b6e9c8', display: 'flex', flexDirection: 'column', gap: '8px' };
const actionBtnLink: any = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#1a1a1a', color: '#fff', padding: '9px 12px', borderRadius: '10px', textDecoration: 'none', fontSize: '0.82rem', fontWeight: 'bold', transition: '0.3s ease' };
const uploadArea: any = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: '1.5px dashed #15803d', color: '#15803d', padding: '8px 12px', borderRadius: '10px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '800', transition: '0.3s ease' };
const promoWrapper: any = { marginTop: '20px', padding: '15px', background: '#fff', borderRadius: '20px', border: '1px dashed #ddd', marginBottom: '15px' };
const promoBtnStyle: any = { padding: '0 25px', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', transition: '0.3s ease', fontSize: '0.9rem' };
const promoSuccessText: any = { fontSize: '0.8rem', color: '#15803d', marginTop: '10px', fontWeight: 'bold' };
const logosGrid: any = { display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '2px', paddingRight: '52px' };
const miniLogoImg: any = { height: '26px', width: 'auto', borderRadius: '6px', border: '1px solid #f0f0f0', padding: '2px 4px', backgr