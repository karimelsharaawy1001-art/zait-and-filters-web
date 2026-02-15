'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, User, Home, ShoppingBag, Truck, UserPlus, ArrowLeft, Package, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase';
import { useCart } from '@/context/CartContext';
import toast from 'react-hot-toast';

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { clearCart } = useCart();
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'failed' | 'pending'>('pending');

  const orderId = searchParams.get('order_id') || searchParams.get('orderId');
  const easykashStatus = searchParams.get('status'); // EasyKash returns this
  const transactionId = searchParams.get('transaction_id'); // EasyKash transaction reference

  useEffect(() => {
    async function verifyPayment() {
      if (!orderId) {
        setPaymentStatus('failed');
        setLoading(false);
        return;
      }

      try {
        // Check if payment was successful
        if (easykashStatus === 'success' || easykashStatus === 'paid' || easykashStatus === 'completed') {
          // Update order to confirmed
          const { error } = await supabase
            .from('orders')
            .update({ 
              status: 'confirmed',
              payment_status: 'paid',
              transaction_id: transactionId || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', orderId);

          if (error) throw error;

          setPaymentStatus('success');
          clearCart();
          toast.success('تم الدفع بنجاح! 🎉');
        } 
        // Payment failed or cancelled
        else if (easykashStatus === 'failed' || easykashStatus === 'cancelled' || easykashStatus === 'error') {
          const { error } = await supabase
            .from('orders')
            .update({ 
              status: 'cancelled',
              payment_status: 'failed',
              updated_at: new Date().toISOString()
            })
            .eq('id', orderId);

          if (error) throw error;

          setPaymentStatus('failed');
          toast.error('فشل الدفع. يرجى المحاولة مرة أخرى.');
        } 
        // No status from EasyKash (manual payment or direct access)
        else {
          // Check order payment method
          const { data: order } = await supabase
            .from('orders')
            .select('payment_method, status')
            .eq('id', orderId)
            .single();

          if (order?.payment_method === 'card_installments') {
            // If it was online payment but no status, keep as pending
            setPaymentStatus('pending');
          } else {
            // Manual payment methods (instapay, wallets) are always success
            setPaymentStatus('success');
            clearCart();
          }
        }
      } catch (error: any) {
        console.error('Error verifying payment:', error);
        toast.error('حدث خطأ أثناء التحقق من الدفع');
        setPaymentStatus('failed');
      } finally {
        setLoading(false);
      }
    }

    verifyPayment();
  }, [orderId, easykashStatus, transactionId]);

  // Loading state
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={loaderContainer}
      >
        <Loader2 className="animate-spin" size={60} color="#27ae60" />
        <p style={loadingText}>جاري التحقق من الدفع...</p>
      </motion.div>
    );
  }

  // Payment Failed
  if (paymentStatus === 'failed') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={failCard}
      >
        <div style={iconWrapper}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <div style={circleFailBg}>
              <XCircle size={80} color="#dc2626" strokeWidth={3} />
            </div>
          </motion.div>
        </div>

        <h1 style={failTitle}>فشل الدفع</h1>
        <p style={subtitle}>عذراً، لم تكتمل عملية الدفع. يمكنك المحاولة مرة أخرى.</p>

        {orderId && (
          <div style={orderBadge}>
            رقم الطلب: <span style={{ fontWeight: '900' }}>#{orderId.slice(-6).toUpperCase()}</span>
          </div>
        )}

        <div style={actions}>
          <button onClick={() => router.push('/checkout')} style={retryBtn}>
            إعادة المحاولة
          </button>
          <Link href="/store" style={secondaryBtn}>
            <ShoppingBag size={20} /> العودة للمتجر
          </Link>
        </div>

        <Link href="/" style={homeLink}>
          <Home size={16} /> العودة للرئيسية
        </Link>
      </motion.div>
    );
  }

  // Payment Pending
  if (paymentStatus === 'pending') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={pendingCard}
      >
        <div style={iconWrapper}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <div style={circlePendingBg}>
              <Loader2 className="animate-spin" size={60} color="#f59e0b" />
            </div>
          </motion.div>
        </div>

        <h1 style={pendingTitle}>الدفع قيد المراجعة</h1>
        <p style={subtitle}>طلبك قيد المعالجة. سيتم تأكيده خلال ساعات قليلة.</p>

        {orderId && (
          <div style={orderBadge}>
            رقم الطلب: <span style={{ fontWeight: '900' }}>#{orderId.slice(-6).toUpperCase()}</span>
          </div>
        )}

        <div style={actions}>
          <Link href="/profile" style={primaryBtn}>
            <User size={20} /> متابعة حالة الطلب
          </Link>
          <Link href="/store" style={secondaryBtn}>
            <ShoppingBag size={20} /> استكمال التسوق
          </Link>
        </div>

        <Link href="/" style={homeLink}>
          <Home size={16} /> العودة للرئيسية
        </Link>
      </motion.div>
    );
  }

  // Payment Success (your original design)
  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      style={card}
    >
      <div style={iconWrapper}>
        <motion.div
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
        >
          <div style={circleBg}>
            <CheckCircle size={80} color="#27ae60" strokeWidth={3} />
          </div>
        </motion.div>
      </div>

      <h1 style={title}>تم استلام طلبك بنجاح! 🎉</h1>
      <p style={subtitle}>شكراً لثقتك في "زيت أند فلترز". نحن الآن نجهز طلبك بكل عناية.</p>

      {orderId && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          style={orderBadge}
        >
          رقم الطلب: <span style={{ fontWeight: '900' }}>#{orderId.slice(-6).toUpperCase()}</span>
        </motion.div>
      )}

      <div style={infoBox}>
        <div style={infoTitle}>
          <Truck size={20} color="#27ae60" />
          <span>مدة التوصيل المتوقعة</span>
        </div>
        <p style={infoText}>يستغرق الشحن من **2 إلى 5 أيام عمل**. سيتم التواصل معك لتأكيد الموعد.</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.6 }}
        whileHover={{ translateY: -5 }}
        style={accountNudgeCard}
      >
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div style={nudgeIconBox}><UserPlus size={24} color="#15803d" /></div>
          <div style={{ textAlign: 'right', flex: 1 }}>
            <h4 style={nudgeTitle}>تابع حالة أوردرك</h4>
            <p style={nudgeDesc}>
              لو مكنتش مسجل، تقدر تعمل حساب **بنفس رقم الموبايل**، وهتلاقي الأوردر ظهر فوراً في حسابك لمتابعته.
            </p>
            <Link href="/signup" style={nudgeLink}>إنشاء حساب جديد الآن <ArrowLeft size={14} /></Link>
          </div>
        </div>
      </motion.div>

      <div style={actions}>
        <Link href="/profile" style={primaryBtn}>
          <User size={20} /> متابعة طلبي من حسابي
        </Link>
        <Link href="/store" style={secondaryBtn}>
          <ShoppingBag size={20} /> استكمال التسوق
        </Link>
      </div>

      <Link href="/" style={homeLink}>
        <Home size={16} /> العودة للرئيسية
      </Link>
    </motion.div>
  );
}

export default function OrderSuccessPage() {
  return (
    <div style={container}>
      <Suspense fallback={<div style={loaderStyle}><Package className="animate-spin" /> جاري التحميل...</div>}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}

// --- Styles ---
const container: any = { minHeight: '95vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', direction: 'rtl', background: '#fcfcfc' };
const card: any = { background: '#fff', maxWidth: '500px', width: '100%', padding: '40px', borderRadius: '40px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.08)', textAlign: 'center', border: '1px solid #f0f0f0' };
const failCard: any = { background: '#fff', maxWidth: '500px', width: '100%', padding: '40px', borderRadius: '40px', boxShadow: '0 25px 50px -12px rgba(220, 38, 38, 0.1)', textAlign: 'center', border: '2px solid #fecaca' };
const pendingCard: any = { background: '#fff', maxWidth: '500px', width: '100%', padding: '40px', borderRadius: '40px', boxShadow: '0 25px 50px -12px rgba(245, 158, 11, 0.1)', textAlign: 'center', border: '2px solid #fde68a' };

const iconWrapper: any = { marginBottom: '25px', display: 'flex', justifyContent: 'center' };
const circleBg: any = { background: '#f0fdf4', padding: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const circleFailBg: any = { background: '#fef2f2', padding: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const circlePendingBg: any = { background: '#fffbeb', padding: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' };

const title: any = { fontSize: '1.8rem', fontWeight: '900', color: '#1a1a1a', marginBottom: '10px' };
const failTitle: any = { fontSize: '1.8rem', fontWeight: '900', color: '#dc2626', marginBottom: '10px' };
const pendingTitle: any = { fontSize: '1.8rem', fontWeight: '900', color: '#f59e0b', marginBottom: '10px' };
const subtitle: any = { color: '#666', fontSize: '1rem', marginBottom: '25px', lineHeight: '1.6' };
const orderBadge: any = { background: '#f8f9fa', color: '#1a1a1a', padding: '10px 20px', borderRadius: '15px', display: 'inline-block', marginBottom: '25px', fontSize: '0.95rem', border: '1px solid #eee' };

const infoBox: any = { background: '#fff', padding: '18px', borderRadius: '25px', border: '1px solid #f0f0f0', marginBottom: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' };
const infoTitle: any = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: '800', color: '#1a1a1a', marginBottom: '8px' };
const infoText: any = { fontSize: '0.9rem', color: '#555', margin: 0, lineHeight: '1.5' };

const accountNudgeCard: any = { background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)', padding: '20px', borderRadius: '25px', border: '1px solid #dcfce7', marginBottom: '30px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.04)' };
const nudgeIconBox: any = { background: '#fff', padding: '12px', borderRadius: '15px', border: '1px solid #e2e8f0' };
const nudgeTitle: any = { margin: '0 0 5px 0', fontSize: '1.05rem', fontWeight: '900', color: '#15803d' };
const nudgeDesc: any = { margin: '0 0 12px 0', fontSize: '0.85rem', color: '#444', lineHeight: '1.6' };
const nudgeLink: any = { color: '#15803d', fontWeight: '900', fontSize: '0.85rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'flex-start' };

const actions: any = { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' };
const primaryBtn: any = { background: '#1a1a1a', color: '#fff', padding: '18px', borderRadius: '20px', textDecoration: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'all 0.3s ease' };
const secondaryBtn: any = { background: '#27ae60', color: '#fff', padding: '18px', borderRadius: '20px', textDecoration: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'all 0.3s ease' };
const retryBtn: any = { background: '#dc2626', color: '#fff', padding: '18px', borderRadius: '20px', textDecoration: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'all 0.3s ease', border: 'none', cursor: 'pointer', width: '100%' };
const homeLink: any = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#999', textDecoration: 'none', fontSize: '0.85rem' };

const loaderContainer: any = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '60px' };
const loadingText: any = { fontSize: '1.2rem', fontWeight: 'bold', color: '#27ae60' };
const loaderStyle: any = { display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', color: '#27ae60' };
