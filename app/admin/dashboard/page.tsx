'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import Link from 'next/link';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ products: 0, messages: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getStats() {
      // جلب عدد المنتجات
      const { count: productCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      // جلب عدد الرسائل
      const { count: messageCount } = await supabase
        .from('contact_messages')
        .select('*', { count: 'exact', head: true });

      setStats({
        products: productCount || 0,
        messages: messageCount || 0
      });
      setLoading(false);
    }
    getStats();
  }, []);

  if (loading) return <div style={{ padding: '50px', color: '#333', textAlign: 'center', fontWeight: 'bold' }}>جاري تحميل الإحصائيات...</div>;

  return (
    <main style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', padding: '40px', direction: 'rtl', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#27ae60', marginBottom: '40px', fontWeight: '900' }}>لوحة التحكم - ZAIT & FILTERS</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        
        {/* كارت المنتجات - Light Mode */}
        <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '20px', border: '1px solid #eee', textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
          <h3 style={{ color: '#666', marginBottom: '10px', fontSize: '1rem' }}>إجمالي المنتجات</h3>
          <p style={{ fontSize: '3.5rem', fontWeight: '900', color: '#1a1a1a', margin: '10px 0' }}>{stats.products}</p>
          <Link href="/admin/products" style={{ color: '#27ae60', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem' }}>إدارة المنتجات ←</Link>
        </div>

        {/* كارت الرسائل - Light Mode */}
        <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '20px', border: '1px solid #eee', textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
          <h3 style={{ color: '#666', marginBottom: '10px', fontSize: '1rem' }}>رسائل العملاء</h3>
          <p style={{ fontSize: '3.5rem', fontWeight: '900', color: '#27ae60', margin: '10px 0' }}>{stats.messages}</p>
          <Link href="/admin/messages" style={{ color: '#333', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem' }}>عرض الرسائل ←</Link>
        </div>

      </div>

      {/* روابط سريعة - Light Mode */}
      <div style={{ marginTop: '50px', padding: '25px', backgroundColor: '#fff', borderRadius: '20px', border: '1px solid #eee', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
        <h4 style={{ color: '#1a1a1a', marginBottom: '20px', fontWeight: '800' }}>روابط سريعة</h4>
        <div style={{ display: 'flex', gap: '20px' }}>
          <button 
            onClick={() => supabase.auth.signOut()} 
            style={{ backgroundColor: '#ff4d4d', color: '#fff', border: 'none', padding: '12px 25px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', transition: '0.3s' }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#cc0000'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ff4d4d'}
          >
            تسجيل الخروج
          </button>
        </div>
      </div>
    </main>
  );
}