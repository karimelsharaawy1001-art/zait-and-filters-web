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

  if (loading) return <div style={{ padding: '50px', color: '#fff' }}>جاري تحميل الإحصائيات...</div>;

  return (
    <main style={{ backgroundColor: '#000', minHeight: '100vh', padding: '40px', direction: 'rtl', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#2ecc71', marginBottom: '40px', fontWeight: '900' }}>لوحة التحكم - ZAIT & FILTERS</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        
        {/* كارت المنتجات */}
        <div style={{ backgroundColor: '#0a0a0a', padding: '30px', borderRadius: '15px', border: '1px solid #222', textAlign: 'center' }}>
          <h3 style={{ color: '#888', marginBottom: '10px' }}>إجمالي المنتجات</h3>
          <p style={{ fontSize: '3rem', fontWeight: 'bold', color: '#fff', margin: '10px 0' }}>{stats.products}</p>
          <Link href="/admin/products" style={{ color: '#2ecc71', textDecoration: 'none', fontWeight: 'bold' }}>إدارة المنتجات ←</Link>
        </div>

        {/* كارت الرسائل */}
        <div style={{ backgroundColor: '#0a0a0a', padding: '30px', borderRadius: '15px', border: '1px solid #222', textAlign: 'center' }}>
          <h3 style={{ color: '#888', marginBottom: '10px' }}>رسائل العملاء</h3>
          <p style={{ fontSize: '3rem', fontWeight: 'bold', color: '#2ecc71', margin: '10px 0' }}>{stats.messages}</p>
          <Link href="/admin/messages" style={{ color: '#fff', textDecoration: 'none', fontWeight: 'bold' }}>عرض الرسائل ←</Link>
        </div>

      </div>

      <div style={{ marginTop: '50px', padding: '20px', backgroundColor: '#111', borderRadius: '10px', border: '1px solid #333' }}>
        <h4 style={{ color: '#666', marginBottom: '15px' }}>روابط سريعة</h4>
        <div style={{ display: 'flex', gap: '20px' }}>
          <button onClick={() => supabase.auth.signOut()} style={{ backgroundColor: '#ff4d4d', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
            تسجيل الخروج
          </button>
        </div>
      </div>
    </main>
  );
}