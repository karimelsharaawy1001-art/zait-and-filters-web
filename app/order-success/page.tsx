'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, Package, Home, ShoppingBag, Truck, UserPlus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id') || searchParams.get('orderId');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={card}
    >
      {/* أيقونة النجاح المتحركة */}
      <div style={iconWrapper}>
        <motion.div
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
        >
          <CheckCircle size={90} color="#27ae60" />
        </motion.div>
      </div>

      <h1 style={title}>تم استلام طلبك بنجاح! 🎉</h1>
      <p style={subtitle}>شكراً لثقتك في "زيت أند فلترز". طلبك قيد المراجعة الآن.</p>

      {orderId && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={orderBadge}
        >
          رقم الطلب: <span style={{ fontWeight: '900' }}>#{orderId.slice(-6).toUpperCase()}</span>
        </motion.div>
      )}

      {/* قسم معلومات الشحن */}
      <div style={infoBox}>
        <div style={infoTitle}>
          <Truck size={20} color="#27ae60" />
          <span>موعد التوصيل المتوقع</span>
        </div>
        <p style={infoText}>يستغرق الشحن من **2 إلى 5 أيام عمل**. سيقوم مندوبنا بالتواصل معك لتنسيق موعد الاستلام.</p>
      </div>

      {/* --- قسم دعوة التسجيل (الجديد) --- */}
      <motion.div 
        whileHover={{ scale: 1.02 }}
        style={accountNudgeCard}
      >
        <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
          <div style={nudgeIconBox}><UserPlus size={24} color="#15803d" /></div>
          <div style={{ textAlign: 'right' }}>
            <h4 style={nudgeTitle}>تابع أوردرك لحظة بلحظة!</h4>
            <p style={nudgeDesc}>
              لو معندكش حساب، سجل دلوقتي **بنفس رقم الموبايل** اللي استخدمته في الطلب، وهتلاقي الأوردر ظهر أوتوماتيك في حسابك عشان تتابعه بسهولة.
            </p>
            <Link href="/signup" style={nudgeLink}>سجل حساب جديد الآن <ArrowLeft size={14} /></Link>
          </div>
        </div>
      </motion.div>

      {/* الأزرار النهائية */}
      <div style={actions}>
        <Link href="/my-orders" style={primaryBtn}>
          <Package size={20} /> متابعة طلباتي
        </Link>
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

export default function OrderSuccessPage() {
  return (
    <div style={container}>
      <Suspense fallback={<div style={loaderStyle}><Package className="animate-bounce" /> جاري التحميل...</div>}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}

// --- Styles ---
const container: any = { minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', direction: 'rtl', background: '#f8f9fa' };
const card: any = { background: '#fff', maxWidth: '550px', width: '100%', padding: '40px', borderRadius: '35px', boxShadow: '0 20px 60px rgba(0,0,0,0.08)', textAlign: 'center', border: '1px solid #eee' };
const iconWrapper: any = { marginBottom: '25px', display: 'flex', justifyContent: 'center' };
const title: any = { fontSize: '2rem', fontWeight: '900', color: '#1a1a1a', marginBottom: '12px' };
const subtitle: any = { color: '#666', fontSize: '1.1rem', marginBottom: '30px', lineHeight: '1.5' };
const orderBadge: any = { background: '#f0fdf4', color: '#15803d', padding: '12px 25px', borderRadius: '15px', display: 'inline-block', marginBottom: '30px', fontSize: '1rem', border: '1px solid #dcfce7', fontWeight: 'bold' };

const infoBox: any = { background: '#fcfcfc', padding: '20px', borderRadius: '25px', border: '1px solid #f0f0f0', marginBottom: '20px' };
const infoTitle: any = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: '800', color: '#1a1a1a', marginBottom: '10px' };
const infoText: any = { fontSize: '0.95rem', color: '#555', margin: 0, lineHeight: '1.6' };

const accountNudgeCard: any = { background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', padding: '20px', borderRadius: '25px', border: '1px solid #bbf7d0', marginBottom: '30px', cursor: 'default' };
const nudgeIconBox: any = { background: '#fff', padding: '10px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' };
const nudgeTitle: any = { margin: '0 0 5px 0', fontSize: '1.1rem', fontWeight: '900', color: '#15803d' };
const nudgeDesc: any = { margin: '0 0 15px 0', fontSize: '0.9rem', color: '#166534', lineHeight: '1.6' };
const nudgeLink: any = { color: '#15803d', fontWeight: 'bold', fontSize: '0.9rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'flex-start' };

const actions: any = { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '25px' };
const primaryBtn: any = { background: '#1a1a1a', color: '#fff', padding: '16px', borderRadius: '18px', textDecoration: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: '0.3s' };
const secondaryBtn: any = { background: '#27ae60', color: '#fff', padding: '16px', borderRadius: '18px', textDecoration: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: '0.3s' };
const homeLink: any = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#888', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 'bold' };
const loaderStyle: any = { textAlign: 'center', color: '#27ae60', fontWeight: 'bold' };