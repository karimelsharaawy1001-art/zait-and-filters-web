'use client';
import Link from 'next/link';
import { Trophy, Rocket, DollarSign, ShieldCheck } from 'lucide-react';

export default function AffiliateLanding() {
  return (
    <div style={container}>
      <div style={hero}>
        <Trophy size={60} color="#27ae60" />
        <h1 style={title}>كن شريكاً في نجاح "زيت أند فلترز"</h1>
        <p style={subtitle}>انضم لأقوى نظام تسويق بالعمولة في مصر وابدأ في تحقيق أرباح حقيقية مع كل أوردر</p>
        
        <div style={actions}>
          <Link href="/affiliate/signup" style={primaryBtn}>سجل كمسوق الآن</Link>
          <Link href="/affiliate/login" style={secondaryBtn}>لديك حساب؟ دخول</Link>
        </div>
      </div>

      <div style={featuresGrid}>
        <div style={featureCard}>
          <DollarSign size={30} color="#27ae60" />
          <h3>عمولات مجزية</h3>
          <p>احصل على عمولة 5% فورية على كل طلب يتم عن طريقك.</p>
        </div>
        <div style={Rocket size={30} color="#27ae60" />
        <h3>كود خصم خاص</h3>
        <p>كود خصم 5% باسمك لعملائك لزيادة مبيعاتك.</p>
      </div>
    </div>
  );
}

// تنسيقات سريعة (Light Mode)
const container: any = { padding: '80px 20px', maxWidth: '1000px', margin: '0 auto', textAlign: 'center', direction: 'rtl' };
const hero: any = { marginBottom: '60px' };
const title: any = { fontSize: '2.5rem', fontWeight: '900', color: '#1a1a1a', marginBottom: '20px' };
const subtitle: any = { fontSize: '1.2rem', color: '#666', lineHeight: '1.6' };
const actions: any = { display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '40px' };
const primaryBtn: any = { padding: '15px 35px', background: '#27ae60', color: '#fff', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold', fontSize: '1.1rem' };
const secondaryBtn: any = { padding: '15px 35px', background: '#f8f9fa', color: '#1a1a1a', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold', border: '1px solid #ddd' };
const featuresGrid: any = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '30px', marginTop: '50px' };
const featureCard: any = { padding: '30px', background: '#fff', borderRadius: '20px', border: '1px solid #eee' };