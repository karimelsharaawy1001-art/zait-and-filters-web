'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, Package, Home, ShoppingBag, Truck } from 'lucide-react';
import Link from 'next/link';

export default function OrderSuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id') || searchParams.get('orderId');

  return (
    <div style={container}>
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={card}
      >
        <div style={iconWrapper}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
          >
            <CheckCircle size={80} color="#27ae60" />
          </motion.div>
        </div>

        <h1 style={title}>شكراً لثقتك بنا! 🎉</h1>
        <p style={subtitle}>تم استلام طلبك بنجاح وجاري مراجعته الآن.</p>

        {orderId && (
          <div style={orderBadge}>
            رقم الطلب: <span style={{ fontWeight: '900' }}>#{orderId.slice(-6).toUpperCase()}</span>
          </div>
        )}

        <div style={infoBox}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '5px', color: '#1a1a1a', fontWeight: 'bold' }}>
            <Truck size={18} color="#27ae60" />
            <span>معلومات الشحن</span>
          </div>
          <p>يستغرق الشحن من **2 إلى 5 أيام عمل** كحد أقصى.</p>
          <p style={{ fontSize: '0.8rem', marginTop: '5px', color: '#999' }}>سيتم التواصل معك هاتفياً عند خروج الطلب للتسليم.</p>
        </div>

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
    </div>
  );
}

// --- Styles ---
const container: any = { minHeight: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', direction: 'rtl', background: '#fcfcfc' };
const card: any = { background: '#fff', maxWidth: '500px', width: '100%', padding: '40px', borderRadius: '30px', boxShadow: '0 20px 40px rgba(0,0,0,0.05)', textAlign: 'center', border: '1px solid #f0f0f0' };
const iconWrapper: any = { marginBottom: '20px', display: 'flex', justifyContent: 'center' };
const title: any = { fontSize: '1.8rem', fontWeight: '900', color: '#1a1a1a', marginBottom: '10px' };
const subtitle: any = { color: '#666', fontSize: '1.1rem', marginBottom: '25px' };
const orderBadge: any = { background: '#f0fdf4', color: '#15803d', padding: '10px 20px', borderRadius: '12px', display: 'inline-block', marginBottom: '25px', fontSize: '0.95rem', border: '1px solid #dcfce7' };
const infoBox: any = { background: '#f9f9f9', padding: '20px', borderRadius: '20px', fontSize: '0.95rem', color: '#555', marginBottom: '30px', lineHeight: '1.6', border: '1px dashed #eee' };
const actions: any = { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' };
const primaryBtn: any = { background: '#1a1a1a', color: '#fff', padding: '15px', borderRadius: '15px', textDecoration: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: '0.3s' };
const secondaryBtn: any = { background: '#27ae60', color: '#fff', padding: '15px', borderRadius: '15px', textDecoration: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: '0.3s' };
const homeLink: any = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', color: '#888', textDecoration: 'none', fontSize: '0.85rem' };