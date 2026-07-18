'use client';
import { useState, useEffect, useMemo } from 'react';
import { useCart } from '@/context/CartContext'; 
import { supabase } from '@/app/lib/supabase';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAbandonedCart } from '@/hooks/useAbandonedCart';
import { optimizeImageUrl } from '@/lib/images';
import { uploadFile } from '@/lib/storage';
import { useExitWarning } from '@/app/hooks/useExitWarning';
import Link from 'next/link';
import { 
  User, MapPin, ShoppingCart, Loader2, CheckCircle, Car, Globe, Mail,
  Settings2, Calendar, Tags, Upload, ExternalLink, Plus, Gauge, 
  Banknote, CreditCard, Wallet, SmartphoneNfc, Ticket, FileText, Download, Truck,
  AlertCircle
} from 'lucide-react';

export default function CheckoutPage() {
  const { cart, clearCart, addToCart, removeFromCart, isInitialized } = useCart();
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
  const [codBanned, setCodBanned] = useState(false);

  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    secondary_phone: '',
    email: '', 
    address: ''
  });

  const UPLOAD_BUCKET = 'payment-screenshots';

  const EXPRESS_COST = 150;
  const COD_FEE = 20; // Cash-on-delivery collection fee (رسوم تحصيل)
  const EXPRESS_CITIES = ['القاهرة', 'الجيزة'];
  const isExpressAvailable = EXPRESS_CITIES.includes(selectedCity?.city_name || '');

  useEffect(() => {
    if (!isExpressAvailable && expressShipping) setExpressShipping(false);
    if (expressShipping && paymentMethod === 'card_installments') setPaymentMethod('instapay');
    if (expressShipping && paymentMethod === 'cash') setPaymentMethod('instapay');
  }, [selectedCity, expressShipping, paymentMethod, isExpressAvailable]);

  useExitWarning(cart.length > 0 && !completedOrderId);

  async function checkCodBan(phone: string, userId?: string) {
    if (!phone && !userId) { setCodBanned(false); return; }
    try {
      let query = supabase.from('cod_bans').select('id');
      if (userId) {
        query = query.eq('user_id', userId);
      } else {
        query = query.eq('customer_phone', phone);
      }
      const { data } = await query.maybeSingle();
      const banned = !!data;
      setCodBanned(banned);
      if (banned && paymentMethod === 'cash') setPaymentMethod('instapay');
    } catch { /* ignore */ }
  }

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
        checkCodBan('', u.id);
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

  const codFee = paymentMethod === 'cash' ? COD_FEE : 0;
  const finalTotal = useMemo(() => {
    const shipping = expressShipping ? EXPRESS_COST : (selectedCity?.price || 0);
    let currentDiscount = discountAmount;
    if (appliedPromoType === 'free_shipping') currentDiscount = shipping;
    const total = (subtotal + shipping) - currentDiscount - walletDiscount + codFee;
    return total > 0 ? total : 0;
  }, [subtotal, selectedCity, discountAmount, appliedPromoType, expressShipping, walletDiscount, codFee]);

  useEffect(() => { if (isInitialized) setTimeout(() => setIsReady(true), 800); }, [isInitialized]);

  const trackAbandonedCart = async () => {
    const email = customerInfo.email?.trim();
    const phone = customerInfo.phone?.trim();
    // Capture as soon as the customer starts filling in contact info —
    // either an email OR a phone is enough (guest carts are matched by phone).
    if ((!email && !phone) || cart.length === 0) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Persistent session id — same key the global AbandonedCartTracker uses.
      let sessionId = localStorage.getItem('zf_session_id');
      if (!sessionId) {
        sessionId = crypto.randomUUID?.() || `zf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('zf_session_id', sessionId);
      }

      const cartSubtotal = cart.reduce((sum: number, item: any) => sum + (parseFloat(item.price) * item.quantity), 0);
      const detailedCartItems = cart.map((item: any) => ({
        id: item.id,
        name: item.name,
        price: parseFloat(item.price),
        quantity: item.quantity,
        brand: item.brand || 'غير محدد',
        car_make: item.car_make || item.make || 'غير محدد',
        car_model: item.car_model || item.model || 'غير محدد',
        car_model_year: item.car_model_year || item.year || item.model_year || 'غير محدد',
        image_url: item.image_url || item.image || '',
        country_origin: item.country_origin || item.country_of_origin || 'أصلي',
        category: item.category || '',
        part_number: item.part_number || '',
        line_total: parseFloat(item.price) * item.quantity,
      }));

      const contact = {
        customer_email: email || user?.email || '',
        customer_name: customerInfo.name || '',
        customer_phone: phone || '',
        cart_items: detailedCartItems,
        cart_subtotal: cartSubtotal,
        cart_total: cartSubtotal,
        last_activity_at: new Date().toISOString(),
      };

      // Update this session's existing (non-recovered) cart, else create it.
      const { data: existing } = await supabase
        .from('abandoned_carts')
        .select('id')
        .eq(user ? 'user_id' : 'session_id', user ? user.id : sessionId)
        .eq('recovered', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        await supabase.from('abandoned_carts').update(contact).eq('id', existing.id);
      } else {
        await supabase.from('abandoned_carts').insert([{
          user_id: user?.id || null,
          session_id: sessionId,
          ...contact,
          page_url: typeof window !== 'undefined' ? window.location.href : '',
          device_type: /Mobile|Android|iPhone|iPad|iPod/.test(navigator.userAgent) ? 'mobile' : 'desktop',
        }]);
      }
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
        toast.success(`تم تطبيق Promoter Code "${marketerData?.full_name || 'المسوق'}" - خصم ${discountPercentage}%! 🎉`);
        toast(`⚠️ الطلبات التي تستخدم كود خصم لا تحصل على كاش باك`, { duration: 5000, icon: '💡' });
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
      toast(`⚠️ الطلبات التي تستخدم كود خصم لا تحصل على كاش باك`, { duration: 5000, icon: '💡' });
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

  const uploadPaymentScreenshot = async (file: File) => {
    return uploadFile(file, UPLOAD_BUCKET);
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

  // Commission tracking via server-side API (uses service role key to bypass RLS)
  const trackAffiliateCommission = async (orderId: string, _marketerId: string) => {
    if (!appliedPromo) return;
    try {
      const res = await fetch('/api/affiliate/track-commission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, promoCode: appliedPromo, subtotal }),
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        console.error('[affiliate] Commission tracking failed:', result.error);
      } else if (!result.skipped) {
        console.log(`[affiliate] Commission tracked: ${result.commissionAmount} EGP`);
      }
    } catch (error) {
      console.error('[affiliate] Commission tracking error:', error);
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

    if (!['card_installments', 'cash'].includes(paymentMethod) && !screenshot) {
      return toast.error('يرجى رفع سكرين شوت التحويل');
    }

    if (expressShipping && !['instapay', 'wallets'].includes(paymentMethod)) {
      setPaymentMethod('instapay');
      return toast.error('الشحن السريع متاح فقط لـ InstaPay والمحافظ الإلكترونية');
    }

    if (codBanned && paymentMethod === 'cash') {
      setPaymentMethod('instapay');
      return toast.error('الدفع عند الاستلام غير متاح لك. يرجى استخدام طريقة دفع أخرى');
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let uploadedImageUrl = screenshot ? await uploadPaymentScreenshot(screenshot) : null;

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

      // ── Once-per-customer check ──
      if (appliedPromo && customerInfo.email) {
        const { data: couponData } = await supabase
          .from('coupons')
          .select('once_per_customer')
          .eq('code', appliedPromo)
          .maybeSingle();

        if (couponData?.once_per_customer) {
          const { count } = await supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('customer_email', customerInfo.email)
            .eq('promo_code', appliedPromo);

          if (count && count > 0) {
            toast.error('عذراً، لقد استخدمت هذا الكود من قبل. لا يمكن استخدامه مرة أخرى');
            setLoading(false);
            return;
          }
        }
      }

      if (paymentMethod === 'card_installments') {
        const { data: newOrder, error } = await supabase.from('orders').insert([orderData]).select().single();
        if (error) throw error;

        if (finalMarketerId) await trackAffiliateCommission(newOrder.id, finalMarketerId);

        if (customerInfo.email) {
          await supabase.from('abandoned_carts').update({ status: 'recovered' }).eq('email', customerInfo.email);
        }
        await markAsRecovered(newOrder.id);
        localStorage.removeItem('zf_marketer_ref');

        // Admin + customer notifications for card orders are sent by the
        // EasyKash webhook once the payment is approved.
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

        if (customerInfo.email) {
          await supabase.from('abandoned_carts').update({ status: 'recovered' }).eq('email', customerInfo.email);
        }

        await markAsRecovered(newOrder.id);
        localStorage.removeItem('zf_marketer_ref');

        setCompletedOrderItems([...cart]);
        setCompletedSubtotal(subtotal);
        setCompletedFinalTotal(finalTotal);
        setCompletedOrderId(newOrder.id);

        // Send order confirmation email
        if (customerInfo.email) {
          try {
            const emailRes = await fetch('/api/send-order-confirmation', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: newOrder.id,
                orderData: {
                  id: newOrder.id,
                  created_at: newOrder.created_at,
                  customer_name: customerInfo.name,
                  customer_email: customerInfo.email,
                  customer_phone: customerInfo.phone,
                  customer_address: customerInfo.address,
                  city: selectedCity?.city_name,
                  shipping_cost: expressShipping ? EXPRESS_COST : selectedCity?.price,
                  shipping_type: expressShipping ? 'express' : 'standard',
                  discount_applied: appliedPromoType === 'free_shipping' ? (expressShipping ? EXPRESS_COST : selectedCity?.price) : discountAmount,
                  wallet_discount: walletDiscount || 0,
                  total_price: finalTotal,
                  payment_method: paymentMethod,
                  items: cart,
                },
              }),
            });
            const emailData = await emailRes.json();
            if (emailRes.ok) {
              console.log('✅ Order confirmation email sent:', emailData);
            } else {
              console.error('❌ Order confirmation email failed:', emailRes.status, emailData);
            }
          } catch (err) {
            console.error('❌ Order confirmation email error:', err);
          }
        }

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
      <div style={{ direction: 'rtl', padding: '20px 16px', maxWidth: '820px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif', boxSizing: 'border-box', width: '100%' }}>
        {/* ── Mobile-safe global reset for this subtree ── */}
        <style dangerouslySetInnerHTML={{ __html: `
          * { box-sizing: border-box; }
          #order-invoice-preview { overflow: hidden; }
          @media (max-width: 640px) {
            .invoice-header-inner { flex-direction: column !important; gap: 12px !important; }
            .invoice-meta-grid { grid-template-columns: 1fr !important; }
            .invoice-meta-cell { border-right: none !important; border-bottom: 1px solid #f3f4f6; }
            .invoice-meta-cell:last-child { border-bottom: none !important; }
            .invoice-address-grid { grid-template-columns: 1fr !important; }
            .invoice-table-header { display: none !important; }
            .invoice-table-row { grid-template-columns: 1fr !important; padding: 12px 16px !important; }
            .invoice-table-row > div { text-align: right !important; }
            .invoice-table-qty { display: inline-flex; margin-top: 4px; }
            .invoice-table-unit { display: none !important; }
            .invoice-table-total { font-weight: 900; color: #15803d !important; }
            .invoice-summary-wrap { justify-content: flex-start !important; }
            .invoice-summary-inner { width: 100% !important; }
            .invoice-footer-inner { flex-direction: column !important; gap: 12px !important; align-items: flex-start !important; text-align: right !important; }
            .invoice-footer-badge { align-self: flex-start; }
            .success-action-btns { flex-direction: column !important; }
            .success-action-btns a,
            .success-action-btns button { min-width: unset !important; width: 100% !important; }
          }
        `}} />

        <div style={{
          background: 'linear-gradient(135deg, #e5e7eb, #166534)',
          borderRadius: '20px', padding: '24px 20px', textAlign: 'center',
          marginBottom: '20px', color: '#fff',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🎉</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '6px' }}>تم تسجيل طلبك بنجاح!</h1>
          <p style={{ color: 'rgba(0,0,0,0.06)', fontSize: '0.9rem', margin: 0 }}>
            رقم الطلب: <span style={{ color: '#22c55e', fontWeight: '900' }}>#{orderNum}</span>
          </p>
        </div>

        {['instapay', 'wallets'].includes(paymentMethod) && (
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #166534',
            borderRadius: '14px',
            padding: '16px 20px',
            marginBottom: '20px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#15803d', marginBottom: '6px' }}>
              ⏳ قيد المراجعة
            </div>
            <div style={{ fontSize: '0.82rem', color: '#15803d', lineHeight: '1.7' }}>
              سيتم مراجعة عملية الدفع خلال <strong>24 ساعة</strong>. بعد تأكيد الدفع، سيتم تحديث حالة الطلب وإعلامك.
            </div>
          </div>
        )}

        {/* ── Action Buttons — stack on mobile ── */}
        <div className="success-action-btns" style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button
            onClick={() => handleDownloadInvoice(completedOrderId)}
            disabled={isDownloadingPdf}
            style={{
              flex: 1, minWidth: '200px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              padding: '14px 20px',
              background: isDownloadingPdf ? '#9ca3af' : 'linear-gradient(135deg, #22c55e, #16a34a)',
              color: '#fff', border: 'none', borderRadius: '14px',
              fontWeight: '800', fontSize: '0.92rem',
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
              padding: '14px 20px',
              background: '#ffffff',
              color: '#1a1a1a', borderRadius: '14px',
              fontWeight: '800', fontSize: '0.92rem',
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
              padding: '14px 20px',
              background: '#ffffff', color: '#1a1a1a',
              border: '1.5px solid #e5e7eb', borderRadius: '14px',
              fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer',
            }}
          >
            العودة للرئيسية
          </button>
        </div>

        {/* ── Invoice Preview ── */}
        <div
          id="order-invoice-preview"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 10px 40px rgba(0,0,0,0.10)',
            border: '1px solid #f3f4f6',
            width: '100%',
          }}
        >
          {/* ── Invoice Header ── */}
          <div style={{
            background: 'linear-gradient(135deg, #e5e7eb 0%, #6b7280 60%, #0f4c2a 100%)',
            padding: '28px 20px', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: '-60px', left: '-60px', width: '200px', height: '200px', borderRadius: '50%', backgroundColor: 'rgba(34,197,94,0.07)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '-40px', right: '10%', width: '150px', height: '150px', borderRadius: '50%', backgroundColor: 'rgba(34,197,94,0.05)', pointerEvents: 'none' }} />
            {/* Brand + ORDER number row */}
            <div className="invoice-header-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
              <div>
                <div style={{ fontSize: '1.6rem', fontWeight: '900', fontStyle: 'italic', color: '#fff', letterSpacing: '-1px', marginBottom: '4px' }}>
                  ZAIT <span style={{ color: '#22c55e' }}>& FILTERS</span>
                </div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.72rem', fontWeight: '600', letterSpacing: '2px' }}>
                  AUTO PARTS · قطع غيار
                </div>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '2.2rem', fontWeight: '900', color: '#22c55e', letterSpacing: '-1px', lineHeight: 1 }}>ORDER</div>
                <div style={{ color: 'rgba(0,0,0,0.2)', fontSize: '0.78rem', fontWeight: '700', marginTop: '4px', letterSpacing: '1px' }}>#{orderNum}</div>
              </div>
            </div>
            {/* Status badge */}
            <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', position: 'relative', zIndex: 1 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                backgroundColor: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)',
                padding: '5px 12px', borderRadius: '20px',
              }}>
                <CheckCircle size={13} color="#22c55e" />
                <span style={{ color: '#22c55e', fontSize: '0.75rem', fontWeight: '800' }}>تم تأكيد الطلب. يتم تجهيز الطلب في خلال 24 ساعة. و يتم التسليم في خلال 2-5أيام عمل</span>
              </div>
              <span style={{ color: 'rgba(0,0,0,0.15)', fontSize: '0.75rem' }}>{orderDate}</span>
            </div>
          </div>

          {/* ── Order Meta Row ── */}
          <div className="invoice-meta-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid #f3f4f6' }}>
            {[
              { label: 'رقم الطلب', value: `#${orderNum}` },
              { label: 'تاريخ الطلب', value: orderDate },
              { label: 'عدد المنتجات', value: `${completedOrderItems.length} منتج` },
            ].map((item, i) => (
              <div key={i} className="invoice-meta-cell" style={{ padding: '16px 18px', borderRight: i < 2 ? '1px solid #f3f4f6' : 'none' }}>
                <div style={{ fontSize: '0.66rem', color: '#6b7280', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '4px' }}>{item.label}</div>
                <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#1a1a1a' }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* ── Body ── */}
          <div style={{ padding: '24px 20px' }}>

            {/* Customer + Address Grid */}
            <div className="invoice-address-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
              <div style={{ backgroundColor: '#f9fafb', borderRadius: '14px', padding: '18px', border: '1px solid #f3f4f6' }}>
                <div style={{ fontSize: '0.66rem', fontWeight: '900', color: '#9ca3af', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>بيانات العميل</div>
                <div style={{ fontSize: '0.92rem', fontWeight: '800', color: '#1a1a1a', marginBottom: '6px' }}>{customerInfo.name}</div>
                <div style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: '600', direction: 'ltr', marginBottom: '4px' }}>{customerInfo.phone}</div>
                {customerInfo.email && <div style={{ fontSize: '0.78rem', color: '#9ca3af', wordBreak: 'break-all' }}>{customerInfo.email}</div>}
              </div>
              <div style={{ backgroundColor: '#f9fafb', borderRadius: '14px', padding: '18px', border: '1px solid #f3f4f6' }}>
                <div style={{ fontSize: '0.66rem', fontWeight: '900', color: '#9ca3af', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>عنوان التوصيل</div>
                <div style={{ fontSize: '0.82rem', color: '#1a1a1a', fontWeight: '700', lineHeight: '1.5', marginBottom: '6px' }}>{customerInfo.address}</div>
                <div style={{ fontSize: '0.78rem', color: '#22c55e', fontWeight: '700' }}>{selectedCity?.city_name}</div>
                <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
                  طريقة الدفع: <span style={{ fontWeight: '800', color: '#1a1a1a' }}>
                    {paymentMethod === 'card_installments' ? 'بطاقة / تقسيط' : paymentMethod === 'instapay' ? 'InstaPay' : paymentMethod === 'cash' ? 'الدفع عند الاستلام' : 'محفظة إلكترونية'}
                    {expressShipping && <span style={{ marginRight: '6px', color: '#f59e0b', fontSize: '0.68rem' }}>⚡ شحن سريع 48 ساعة</span>}
                  </span>
                </div>
              </div>
            </div>

            {/* Products Table */}
            <div style={{ marginBottom: '22px' }}>
              <div style={{ fontSize: '0.66rem', fontWeight: '900', color: '#9ca3af', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>تفاصيل المنتجات</div>
              {/* Table header — hidden on mobile via CSS class */}
              <div className="invoice-table-header" style={{ backgroundColor: '#ffffff', borderRadius: '10px 10px 0 0', padding: '10px 16px', display: 'grid', gridTemplateColumns: '2.5fr 0.7fr 1fr 1fr' }}>
                {['المنتج', 'الكمية', 'سعر الوحدة', 'الإجمالي'].map((h, i) => (
                  <div key={i} style={{ fontSize: '0.66rem', fontWeight: '800', color: '#6b7280', textAlign: i === 0 ? 'right' : 'center', textTransform: 'uppercase' }}>{h}</div>
                ))}
              </div>
              {completedOrderItems.map((item: any, i: number) => (
                <div key={item.id} className="invoice-table-row" style={{
                  display: 'grid', gridTemplateColumns: '2.5fr 0.7fr 1fr 1fr',
                  padding: '12px 16px', backgroundColor: i % 2 === 0 ? '#fff' : '#f9fafb',
                  borderBottom: '1px solid #f3f4f6', borderRight: '1px solid #f3f4f6', borderLeft: '1px solid #f3f4f6',
                  alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#1a1a1a' }}>{item.name}</div>
                    {item.brand && <div style={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: '700' }}>{item.brand}</div>}
                    {/* On mobile: show qty + total inline under name */}
                    <div style={{ display: 'none' }} className="invoice-table-qty">
                      <span style={{ backgroundColor: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '800', marginLeft: '8px' }}>×{item.quantity}</span>
                      <span style={{ fontSize: '0.88rem', fontWeight: '900', color: '#15803d' }}>{(parseFloat(item.price) * item.quantity).toLocaleString('ar-EG')} ج.م</span>
                    </div>
                  </div>
                  <div className="invoice-table-qty" style={{ textAlign: 'center' }}>
                    <span style={{ backgroundColor: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '800' }}>×{item.quantity}</span>
                  </div>
                  <div className="invoice-table-unit" style={{ textAlign: 'center', fontSize: '0.83rem', fontWeight: '700', color: '#374151' }}>{parseFloat(item.price).toLocaleString('ar-EG')} ج.م</div>
                  <div className="invoice-table-total" style={{ textAlign: 'center', fontSize: '0.88rem', fontWeight: '900', color: '#1a1a1a' }}>{(parseFloat(item.price) * item.quantity).toLocaleString('ar-EG')} ج.م</div>
                </div>
              ))}
              <div style={{ height: '4px', backgroundColor: '#ffffff', borderRadius: '0 0 10px 10px' }} />
            </div>

            {/* Totals Summary */}
            <div className="invoice-summary-wrap" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div className="invoice-summary-inner" style={{ width: '270px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px dashed #e5e7eb', fontSize: '0.84rem' }}>
                  <span style={{ color: '#9ca3af', fontWeight: '700' }}>المجموع الجزئي</span>
                  <span style={{ fontWeight: '800' }}>{completedSubtotal.toFixed(2)} ج.م</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px dashed #e5e7eb', fontSize: '0.84rem' }}>
                  <span style={{ color: '#9ca3af', fontWeight: '700' }}>الشحن</span>
                  {appliedPromoType === 'free_shipping'
                    ? <span style={{ color: '#22c55e', fontWeight: '800' }}>مجاني 🚚</span>
                    : <span style={{ fontWeight: '800' }}>{shipping.toFixed(2)} ج.م</span>
                  }
                </div>
                {discount > 0 && appliedPromoType !== 'free_shipping' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px dashed #e5e7eb', fontSize: '0.84rem' }}>
                    <span style={{ color: '#9ca3af', fontWeight: '700' }}>الخصم</span>
                    <span style={{ color: '#16a34a', fontWeight: '800' }}>- {discount.toFixed(2)} ج.م</span>
                  </div>
                )}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginTop: '12px', padding: '14px 16px',
                  background: 'linear-gradient(135deg, #e5e7eb, #6b7280)', borderRadius: '12px',
                }}>
                  <span style={{ color: 'rgba(0,0,0,0.35)', fontSize: '0.8rem', fontWeight: '700' }}>الإجمالي الكلي</span>
                  <span style={{ color: '#22c55e', fontSize: '1.25rem', fontWeight: '900' }}>{completedFinalTotal.toFixed(2)} ج.م</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Invoice Footer — FIXED for mobile ── */}
          <div style={{
            background: 'linear-gradient(135deg, #e5e7eb, #6b7280)',
            padding: '20px', /* was 24px 44px — caused overflow */
          }}>
            <div className="invoice-footer-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: '900', fontStyle: 'italic', color: '#fff' }}>
                  ZAIT <span style={{ color: '#22c55e' }}>& FILTERS</span>
                </div>
                <div style={{ color: 'rgba(0,0,0,0.15)', fontSize: '0.68rem', marginTop: '3px' }}>zaitandfilters.com</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#22c55e', fontSize: '0.76rem', fontWeight: '800' }}>شكراً لثقتكم بنا</div>
                <div style={{ color: 'rgba(0,0,0,0.15)', fontSize: '0.66rem', marginTop: '2px' }}>Thank you for your order</div>
              </div>
              <div className="invoice-footer-badge" style={{
                backgroundColor: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)',
                borderRadius: '8px', padding: '6px 12px',
                color: '#22c55e', fontSize: '0.7rem', fontWeight: '800', letterSpacing: '1px',
                whiteSpace: 'nowrap',
              }}>
                ORDER #{orderNum}
              </div>
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
        * { box-sizing: border-box; }
        .btn-hover:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(21,128,61,0.45) !important; }
        .action-hover:hover { background: #16a34a !important; transform: translateY(-1px); }
        .upload-hover:hover { background: #f0fdf4 !important; border-color: #15803d !important; }
        .promo-btn:hover:not(:disabled) { background: #f0fdf4 !important; color: #16a34a !important; border-color: #22c55e !important; }
        .co-input:focus { border-color: #22c55e !important; box-shadow: 0 0 0 3px rgba(34,197,94,0.12) !important; outline: none; }
        .pay-card-label:hover { border-color: #22c55e !important; box-shadow: 0 4px 20px rgba(34,197,94,0.12) !important; }
        .co-section { background:#ffffff; border-radius:20px; border:1px solid #f3f4f6; padding:24px; margin-bottom:16px; box-shadow:0 2px 12px rgba(0,0,0,0.04); }
        @media(max-width:768px){
          .co-section { padding:18px 16px; border-radius:16px; margin-bottom:12px; }
          .co-layout { grid-template-columns: 1fr !important; }
          .co-summary { order: 2; }
          .co-form    { order: 1; }
        }
      `}} />

      {/* ── Header ── */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#f0fdf4', border: '1px solid #166534', borderRadius: '20px', padding: '6px 16px', marginBottom: '12px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulseDot 2s ease-in-out infinite' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#15803d' }}>آمن ومشفر 100%</span>
        </div>
        <h1 style={{ fontSize: 'clamp(1.5rem,5vw,2.2rem)', fontWeight: '900', color: '#1a1a1a', margin: 0, letterSpacing: '-0.5px' }}>إتمام الطلب</h1>
        <p style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '6px', fontWeight: '600' }}>خطوة واحدة وطلبك في طريقه إليك</p>
        <style>{`@keyframes pulseDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.8)} }`}</style>
      </div>

      <div className="co-layout" style={layoutGrid}>

        <div className="co-summary" style={summarySide}>
          <h3 style={sectionTitle}><ShoppingCart size={18} /> ملخص طلبك</h3>
          <div style={itemsList}>
            {cart.map((item: any) => {
               const country = item.country_origin || item.country_of_origin || 'أصلي';
               return (
                <div key={item.id} style={cartItem}>
                  <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={imageBox}><img src={optimizeImageUrl(item.image_url || item.image)} alt="" style={imgFluid} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ fontWeight: '900', fontSize: '0.92rem', wordBreak: 'break-word' }}>{item.name}</span>
                        <span style={{ fontWeight: '900', whiteSpace: 'nowrap' }}>{(parseFloat(item.price) * item.quantity).toFixed(2)} ج.م</span>
                      </div>
                      <div style={detailsGrid}>
                        <div style={detailItem}><Tags size={11} color="#15803d" /> <span>البراند: <b>{item.brand}</b></span></div>
                        <div style={detailItem}><Settings2 size={11} color="#15803d" /> <span>لسيارة: <b>{item.car_make} {item.car_model}</b></span></div>
                        {item.car_model_year && <div style={detailItem}><Calendar size={11} color="#15803d" /> <span>سنة الموديل: <b>{item.car_model_year}</b></span></div>}
                        <div style={detailItem}><Globe size={11} color="#15803d" /> <span>بلد المنشأ: <b>{country}</b></span></div>
                      </div>
                      {/* Qty stepper + remove */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
                          <button type="button" onClick={() => addToCart(item, 1)}
                            style={{ width: '30px', height: '30px', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: '1rem', fontWeight: '900' }}>+</button>
                          <span style={{ width: '32px', textAlign: 'center', fontWeight: '900', fontSize: '0.9rem', color: '#1a1a1a' }}>{item.quantity}</span>
                          <button type="button" onClick={() => item.quantity > 1 && removeFromCart(item.id, true)}
                            style={{ width: '30px', height: '30px', border: 'none', background: 'none', cursor: item.quantity > 1 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.quantity > 1 ? '#6b7280' : '#374151', fontSize: '1rem', fontWeight: '900' }}>−</button>
                        </div>
                        <button type="button" onClick={() => removeFromCart(item.id)}
                          style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '0.72rem', fontWeight: '700', padding: '4px 6px', borderRadius: '6px', transition: 'all 0.15s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#16a34a'; (e.currentTarget as HTMLButtonElement).style.background = '#f0fdf4'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#6b7280'; (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}>
                          حذف
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Wallet Section ── */}
          {walletBalance > 0 && (
            <div style={{ marginBottom: '15px', padding: '15px', background: '#ffffff', borderRadius: '20px', border: '1px solid #f0fdf4' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <label style={{ ...lab, marginBottom: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Wallet size={14} color="#15803d" /> رصيد محفظتك
                </label>
                <span style={{ background: '#f0fdf4', color: '#15803d', fontWeight: '900', fontSize: '0.92rem', padding: '4px 12px', borderRadius: '10px', border: '1px solid #f0fdf4' }}>
                  {walletBalance.toFixed(2)} ج.م
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '10px' }}>
                يمكنك استخدام حتى 75% من قيمة الطلب كخصم من محفظتك
              </div>
              {!walletApplied ? (
                <button
                  type="button"
                  onClick={applyWallet}
                  disabled={walletLoading}
                  style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg, #15803d, #14532d)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {walletLoading ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
                  {walletLoading ? 'جاري التحقق...' : 'استخدام رصيد المحفظة'}
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', padding: '10px 14px', borderRadius: '12px', border: '1px solid #166534' }}>
                  <span style={{ color: '#15803d', fontWeight: '800', fontSize: '0.85rem' }}>✅ تم خصم {walletDiscount.toFixed(2)} ج.م من المحفظة</span>
                  <button type="button" onClick={removeWallet} style={{ background: 'none', border: 'none', color: '#16a34a', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700' }}>إلغاء</button>
                </div>
              )}
            </div>
          )}

          <div style={promoWrapper}>
            <label style={lab}><Ticket size={14} color="#15803d" /> هل لديك كود خصم أو Promoter Code؟</label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '5px' }}>
              <input placeholder="ادخل الكود هنا" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} style={{ ...inp, marginBottom: 0, flex: 1 }} disabled={!!appliedPromo} />
              <button type="button" onClick={applyPromoCode} disabled={promoLoading || !!appliedPromo || !promoCode} className="promo-btn" style={promoBtnStyle}>
                {promoLoading ? <Loader2 size={16} className="animate-spin" /> : appliedPromo ? 'تم التطبيق' : 'تطبيق'}
              </button>
            </div>
            {appliedPromo && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '6px' }}>
                <p style={{ ...promoSuccessText, margin: 0, flex: 1 }}>
                  ✅ تم تطبيق "{appliedPromo}"
                  {appliedPromoType === 'free_shipping' ? ' — شحن مجاني 🚚' : ` — خصم ${discountAmount.toFixed(2)} ج.م`}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setAppliedPromo(null);
                    setAppliedPromoType(null);
                    setDiscountAmount(0);
                    setAffiliateMarketerId(null);
                    setPromoCode('');
                  }}
                  style={{ background: 'none', border: 'none', color: '#16a34a', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '700', flexShrink: 0, padding: '2px 6px' }}
                >
                  إلغاء
                </button>
              </div>
            )}
          </div>
          <div style={totalBox}>
            <div style={rowPrice}><span>إجمالي المنتجات:</span><span>{subtotal.toFixed(2)} ج.م</span></div>
            <div style={rowPrice}>
              <span>الشحن ({expressShipping ? 'سريع 48 ساعة' : selectedCity?.city_name}):</span>
              <span style={{ textDecoration: appliedPromoType === 'free_shipping' ? 'line-through' : 'none', color: appliedPromoType === 'free_shipping' ? '#6b7280' : expressShipping ? '#f59e0b' : 'inherit' }}>
                {expressShipping ? `${EXPRESS_COST}` : (selectedCity?.price || 0).toFixed(2)} ج.م
              </span>
            </div>
            {appliedPromoType === 'free_shipping' && <div style={{ ...rowPrice, color: '#22c55e', fontWeight: 'bold' }}><span>خصم الشحن المجاني:</span><span>-{(selectedCity?.price || 0).toFixed(2)} ج.م</span></div>}
            {discountAmount > 0 && (
              <div style={{ ...rowPrice, color: '#e74c3c', fontWeight: 'bold' }}>
                <span>{appliedPromoType === 'affiliate_percentage' ? 'خصم Promoter Code:' : 'خصم كود الخصم:'}</span>
                <span>-{discountAmount.toFixed(2)} ج.م</span>
              </div>
            )}
            {walletDiscount > 0 && (
              <div style={{ ...rowPrice, color: '#15803d', fontWeight: 'bold' }}>
                <span>💰 خصم المحفظة:</span>
                <span>-{walletDiscount.toFixed(2)} ج.م</span>
              </div>
            )}
            {codFee > 0 && (
              <div style={{ ...rowPrice, color: '#f59e0b', fontWeight: 'bold' }}>
                <span>رسوم التحصيل (الدفع عند الاستلام):</span>
                <span>+{codFee.toFixed(2)} ج.م</span>
              </div>
            )}
            <div style={finalRow}><span>الإجمالي النهائي:</span><span>{finalTotal.toFixed(2)} ج.م</span></div>

            {/* Cashback notice — hidden when a promo code is active or paying cash on delivery */}
            {appliedPromo ? (
              <div style={{ marginTop: '10px', padding: '8px 12px', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.76rem', color: '#16a34a', fontWeight: '700' }}>
                  ❌ لن تحصل على كاش باك لأنك استخدمت كود خصم
                </span>
              </div>
            ) : paymentMethod === 'cash' ? (
              <div style={{ marginTop: '10px', padding: '8px 12px', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.76rem', color: '#16a34a', fontWeight: '700' }}>
                  ❌ لن تحصل على كاش باك مع الدفع عند الاستلام
                </span>
              </div>
            ) : (
              <div style={{ marginTop: '10px', padding: '8px 12px', background: '#ffffff', borderRadius: '10px', border: '1px solid #166534', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.76rem', color: '#fbbf24', fontWeight: '700' }}>🎁 كاش باك ستحصل عليه بعد تسليم الطلب</span>
                <span style={{ fontSize: '0.88rem', fontWeight: '900', color: '#d97706' }}>+{(subtotal * cashbackPct / 100).toFixed(2)} ج.م</span>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="co-form" style={formSide}>
          <h3 style={sectionTitle}><User size={18} /> بيانات المستلم</h3>
          <div style={inputGroup}>
            <label style={lab}>الاسم بالكامل</label>
            <input value={customerInfo.name} onChange={(e) => { setCustomerInfo({...customerInfo, name: e.target.value}); localStorage.setItem('checkout_name', e.target.value); }} onBlur={trackAbandonedCart} required className="co-input" style={inp} />
          </div>
          <div style={inputGroup}>
            <label style={lab}>رقم الموبايل</label>
            <input value={customerInfo.phone} onChange={(e) => { setCustomerInfo({...customerInfo, phone: e.target.value}); localStorage.setItem('checkout_phone', e.target.value); }} onBlur={(e) => { trackAbandonedCart(); checkCodBan(e.target.value); }} required className="co-input" style={inp} />
          </div>
          <div style={inputGroup}>
            <label style={lab}><Mail size={14} /> البريد الإلكتروني</label>
            <input type="email" placeholder="example@mail.com" value={customerInfo.email} onChange={(e) => { setCustomerInfo({...customerInfo, email: e.target.value}); localStorage.setItem('checkout_email', e.target.value); }} onBlur={trackAbandonedCart} required className="co-input" style={inp} />
          </div>
          <div style={inputGroup}>
            <label style={lab}><Gauge size={14} /> قراءة العداد (اختياري)</label>
            <input type="number" value={carMileage} onChange={(e) => setCarMileage(e.target.value)} className="co-input" style={inp} />
          </div>
          <div style={inputGroup}>
            <label style={lab}>المحافظة</label>
            <select className="co-input" style={inp} value={selectedCity?.city_name} onChange={(e) => setSelectedCity(shippingRates.find(c => c.city_name === e.target.value))}>
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
                  background: !expressShipping ? '#f0fdf4' : '#f9fafb',
                  transition: 'all 0.2s',
                }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${!expressShipping ? '#15803d' : '#9ca3af'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {!expressShipping && <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#15803d' }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '800', fontSize: '0.88rem', color: '#1a1a1a' }}>شحن عادي</div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '2px' }}>توصيل خلال 2-5 أيام عمل</div>
                  </div>
                  <div style={{ fontWeight: '900', fontSize: '0.9rem', color: '#15803d' }}>{(selectedCity?.price || 0).toFixed(0)} ج.م</div>
                </label>

                {/* Express shipping */}
                <label onClick={() => { setExpressShipping(true); if (paymentMethod === 'card_installments') setPaymentMethod('instapay'); }} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '12px',
                  padding: '12px 16px', borderRadius: '12px', cursor: 'pointer',
                  border: expressShipping ? '2px solid #f59e0b' : '1px solid #e0e0e0',
                  background: expressShipping ? '#ffffff' : '#f9fafb',
                  transition: 'all 0.2s',
                }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${expressShipping ? '#f59e0b' : '#9ca3af'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                    {expressShipping && <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#f59e0b' }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: '800', fontSize: '0.88rem', color: '#1a1a1a' }}>شحن سريع خلال 48 ساعة</span>
                      <span style={{ background: '#f59e0b', color: '#fff', fontSize: '0.65rem', fontWeight: '900', padding: '2px 7px', borderRadius: '6px' }}>داخل القاهرة والجيزة</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '3px' }}>توصيل سريع خلال 48 ساعة من تأكيد الطلب</div>
                    <div style={{ marginTop: '6px', padding: '7px 10px', background: '#f3f4f6', borderRadius: '8px', border: '1px solid #166534', fontSize: '0.72rem', color: '#fbbf24', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                      ⚠️ الشحن السريع يقبل فقط: <strong>InstaPay</strong> و <strong>المحافظ الإلكترونية</strong>
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

            <div style={paymentContainer}>

              {/* ── 1st: InstaPay ── */}
              <label className="pay-card-label" style={paymentCard(paymentMethod === 'instapay')}>
                <input type="radio" value="instapay" checked={paymentMethod === 'instapay'} onChange={(e) => setPaymentMethod(e.target.value)} style={hideRadio}/>
                <div style={payCardInner}>
                  <div style={payHeader}>
                    <div style={paymentMethod === 'instapay' ? payIconWrapperActive : payIconWrapper}>
                      <SmartphoneNfc size={18} color={paymentMethod === 'instapay' ? '#15803d' : '#9ca3af'} />
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
                      <CreditCard size={18} color={paymentMethod === 'card_installments' ? '#15803d' : '#9ca3af'} />
                    </div>
                    <div style={{ ...payTextContent, flex: 1 }}>
                      <span style={payTitle}>بطاقات بنكية و شركات التقسيط</span>
                      <span style={paySubTitle}>جميع أنواع البطاقات البنكية و شركات التقسيط</span>
                    </div>
                    <span style={paymentMethod === 'card_installments' ? payBadgeAmber : payBadgeGray}>التقسيط متاح</span>
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
                      <Wallet size={18} color={paymentMethod === 'wallets' ? '#15803d' : '#9ca3af'} />
                    </div>
                    <div style={{ ...payTextContent, flex: 1 }}>
                      <span style={payTitle}>محافظ إلكترونية </span>
                      <span style={paySubTitle}>فودافون كاش · أورنج كاش · إتصالات كاش</span>
                    </div>
                  </div>
                  <div style={logosGrid}>
                    <img src="https://i.postimg.cc/ryjgPj7K/VODAFONE.jpg" alt="Vodafone Cash" style={miniLogoImg} />
                    <img src="https://i.postimg.cc/Y2R8sRTj/ORANGE.jpg" alt="Orange Money" style={miniLogoImg} />
                    <img src="https://i.postimg.cc/59gpRgDy/ETTISALAT.jpg" alt="Etisalat Cash" style={miniLogoImg} />
                  </div>
                  {paymentMethod === 'wallets' && (
                    <div style={payDetailsBox}>
                      <div style={{ padding: '10px 14px', background: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: '600' }}>رقم التحويل</span>
                        <span style={{ fontSize: '0.95rem', fontWeight: '900', color: '#1a1a1a', letterSpacing: '0.5px', direction: 'ltr' }}>01023862436</span>
                      </div>
                      <label htmlFor="u-cash" className="upload-hover" style={uploadArea}><Upload size={14}/> {screenshot ? '✅ تم اختيار الإثبات' : 'رفع إثبات التحويل'}</label>
                      <input id="u-cash" type="file" accept="image/*" onChange={handleFileUpload} style={{display:'none'}}/>
                    </div>
                  )}
                </div>
              </label>

              {/* ── 4th: Cash on Delivery — hidden for express shipping or COD-banned customers ── */}
              {!expressShipping && !codBanned && (
              <label className="pay-card-label" style={paymentCard(paymentMethod === 'cash')}>
                <input type="radio" value="cash" checked={paymentMethod === 'cash'} onChange={(e) => setPaymentMethod(e.target.value)} style={hideRadio}/>
                <div style={payCardInner}>
                  <div style={payHeader}>
                    <div style={paymentMethod === 'cash' ? payIconWrapperActive : payIconWrapper}>
                      <Truck size={18} color={paymentMethod === 'cash' ? '#15803d' : '#9ca3af'} />
                    </div>
                    <div style={{ ...payTextContent, flex: 1 }}>
                      <span style={payTitle}>الدفع عند الاستلام</span>
                      <span style={paySubTitle}>ادفع نقداً عند استلام طلبك</span>
                    </div>
                  </div>
                  {paymentMethod === 'cash' && (
                    <div style={payDetailsBox}>
                      <div style={{ padding: '10px 14px', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #166534' }}>
                        <span style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: '700', lineHeight: '1.6' }}>سيتم تحصيل قيمة الطلب نقداً عند استلامه. لا حاجة لرفع أي إثبات دفع.</span>
                      </div>
                    </div>
                  )}
                </div>
              </label>
              )}
              {codBanned && (
                <div style={{ padding: '14px 16px', background: '#f0fdf4', borderRadius: '14px', border: '1.5px solid #166534', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <AlertCircle size={20} color="#15803d" style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.88rem', color: '#15803d', fontWeight: '800' }}>الدفع عند الاستلام غير متاح لك</div>
                    <div style={{ fontSize: '0.76rem', color: '#9ca3b8', fontWeight: '600', marginTop: '2px' }}>يرجى استخدام طريقة دفع أخرى (InstaPay، بطاقة بنكية، أو محافظ إلكترونية)</div>
                  </div>
                </div>
              )}

            </div>
          </div>

          <button disabled={loading} type="submit" className="btn-hover" style={btnStyle}>
            {loading ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle size={20} /> {paymentMethod === 'card_installments' ? 'الانتقال للدفع والتقسيط' : `تأكيد الطلب — ${finalTotal.toFixed(0)} ج.م`}</>}
          </button>

          {/* Trust row */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '14px', flexWrap: 'wrap' as const }}>
            {[
              { icon: '🔒', text: 'دفع آمن ومشفر' },
              { icon: '🚚', text: 'توصيل سريع' },
              { icon: '✅', text: 'قطع أصلية مضمونة' },
            ].map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: '#6b7280', fontWeight: '700' }}>
                <span>{b.icon}</span>{b.text}
              </div>
            ))}
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Shared style constants ─────────────────────────────────────────────────
const container: any = { padding: '20px 16px 48px', maxWidth: '1100px', margin: '0 auto', direction: 'rtl', boxSizing: 'border-box', width: '100%' };
const title: any = { marginBottom: '28px', fontWeight: '900', textAlign: 'center', fontSize: 'clamp(1.4rem,5vw,2rem)' };
const layoutGrid: any = { display: 'grid', gridTemplateColumns: '1fr 420px', gap: '24px', alignItems: 'start' };
const sectionTitle: any = { marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem', fontWeight: '900', color: '#1a1a1a', paddingBottom: '14px', borderBottom: '1.5px solid #f3f4f6' };
const formSide: any = { background: '#ffffff', borderRadius: '24px', border: '1px solid #f3f4f6', boxShadow: '0 4px 24px rgba(0,0,0,0.05)', padding: '28px' };
const summarySide: any = { background: '#ffffff', borderRadius: '24px', border: '1px solid #f3f4f6', boxShadow: '0 4px 24px rgba(0,0,0,0.05)', padding: '24px', position: 'sticky' as const, top: '90px' };
const inp: any = { width: '100%', height: '52px', padding: '0 16px', borderRadius: '14px', border: '1.5px solid #e5e7eb', marginBottom: '0', outline: 'none', fontSize: '0.95rem', boxSizing: 'border-box', fontFamily: 'inherit', background: '#f9fafb', color: '#1a1a1a', transition: 'border-color 0.15s, box-shadow 0.15s' };
const lab: any = { display: 'block', marginBottom: '7px', fontWeight: '700', fontSize: '0.85rem', color: '#6b7280' };
const inputGroup: any = { marginBottom: '16px' };
const cartItem: any = { padding: '12px 0', borderBottom: '1px solid #f3f4f6', marginBottom: '0' };
const imageBox: any = { width: '60px', height: '60px', borderRadius: '12px', overflow: 'hidden', background: '#f9fafb', border: '1px solid #f3f4f6', flexShrink: 0 };
const imgFluid: any = { width: '100%', height: '100%', objectFit: 'cover' };
const totalBox: any = { background: '#f9fafb', padding: '16px', borderRadius: '16px', marginTop: '12px', border: '1px solid #f3f4f6' };
const rowPrice: any = { display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.88rem', gap: '8px', color: '#6b7280' };
const finalRow: any = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '900', fontSize: 'clamp(1.1rem,4vw,1.3rem)', color: '#1a1a1a', borderTop: '1.5px solid #e5e7eb', paddingTop: '12px', marginTop: '8px' };
const btnStyle: any = { width: '100%', padding: '18px', background: 'linear-gradient(135deg,#22c55e 0%,#16a34a 100%)', color: '#fff', border: 'none', borderRadius: '16px', fontWeight: '900', cursor: 'pointer', fontSize: '1.05rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', transition: 'all 0.2s', boxShadow: '0 8px 24px rgba(34,197,94,0.35)', letterSpacing: '0.3px' };
const loaderStyle: any = { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', gap: '10px', color: '#15803d', fontWeight: 'bold' };
const itemsList: any = { maxHeight: '360px', overflowY: 'auto' };
const detailsGrid = { display: 'flex', flexDirection: 'column' as const, gap: '2px', marginTop: '6px' };
const detailItem = { display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: '#6b7280' };
const paymentContainer: any = { display: 'flex', flexDirection: 'column', gap: '10px' };
const paymentCard = (isActive: boolean): any => ({
  display: 'block',
  borderRadius: '16px',
  border: isActive ? '2px solid #22c55e' : '1.5px solid #e5e7eb',
  background: isActive ? '#f0fdf4' : '#f9fafb',
  cursor: 'pointer',
  transition: 'all 0.18s',
  boxShadow: isActive ? '0 4px 20px rgba(34,197,94,0.15)' : 'none',
  overflow: 'hidden',
});
const payCardInner: any = { display: 'flex', flexDirection: 'column', gap: '4px', padding: '16px' };
const payHeader: any = { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' };
const payIconWrapper: any = { width: '42px', height: '42px', borderRadius: '12px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e5e7eb', flexShrink: 0 };
const payIconWrapperActive: any = { width: '42px', height: '42px', borderRadius: '12px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #166534', flexShrink: 0 };
const payTextContent: any = { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 };
const payTitle: any = { fontWeight: '800', fontSize: '0.9rem', color: '#1a1a1a' };
const paySubTitle: any = { fontSize: '0.72rem', color: '#6b7280', fontWeight: '600' };
const hideRadio: any = { display: 'none' };
const payDetailsBox: any = { marginTop: '10px', padding: '12px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '10px' };
const actionBtnLink: any = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#ffffff', color: '#15803d', padding: '14px 16px', borderRadius: '12px', textDecoration: 'none', fontSize: '0.92rem', fontWeight: '800', transition: '0.2s', minHeight: '52px', border: '1px solid #e5e7eb' };
const uploadArea: any = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: '1.5px dashed #22c55e', color: '#15803d', padding: '14px 16px', borderRadius: '12px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: '800', transition: '0.2s', minHeight: '52px', background: '#f9fafb' };
const promoWrapper: any = { marginTop: '16px', padding: '16px', background: '#f9fafb', borderRadius: '16px', border: '1px solid #f3f4f6', marginBottom: '16px' };
const promoBtnStyle: any = { padding: '0 18px', height: '52px', background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', cursor: 'pointer', fontWeight: '800', transition: '0.2s', fontSize: '0.88rem', color: '#15803d', whiteSpace: 'nowrap', fontFamily: 'inherit' };
const promoSuccessText: any = { fontSize: '0.8rem', color: '#15803d', marginTop: '10px', fontWeight: '800' };
const logosGrid: any = { display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px', paddingRight: '54px' };
const miniLogoImg: any = { height: '28px', width: 'auto', borderRadius: '8px', border: '1px solid #f3f4f6', padding: '2px 4px', background: '#ffffff' };
const cardOptionsGrid: any = { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px', paddingRight: '54px' };
const cardOptionBadge: any = { display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: '700', border: '1px solid #e5e7eb', whiteSpace: 'nowrap', background: '#ffffff', color: '#6b7280' };
const payBadgeGreen: any = { fontSize: '0.65rem', fontWeight: '800', padding: '3px 9px', borderRadius: '20px', background: '#f0fdf4', color: '#15803d', whiteSpace: 'nowrap', border: '1px solid #166534' };
const payBadgeAmber: any = { fontSize: '0.65rem', fontWeight: '800', padding: '3px 9px', borderRadius: '20px', background: '#f3f4f6', color: '#fbbf24', whiteSpace: 'nowrap', border: '1px solid #166534' };
const payBadgeGray: any = { fontSize: '0.65rem', fontWeight: '700', padding: '3px 9px', borderRadius: '20px', background: '#f3f4f6', color: '#6b7280', whiteSpace: 'nowrap', border: '1px solid #e5e7eb' };