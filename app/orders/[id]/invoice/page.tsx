'use client';

// ============================================================
// FILE: /app/orders/[id]/invoice/page.tsx
//
// Route: /orders/[id]/invoice
// - Customer can access their own order invoice
// - Admin can access any order invoice
// ============================================================

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';
import OrderInvoice from '@/components/OrderInvoice';
import { Loader2 } from 'lucide-react';

export default function InvoicePage() {
  const { id } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('id', id)
          .single();

        if (error || !data) {
          setError('لم يتم العثور على الطلب');
          return;
        }

        // Security: only allow if order belongs to user OR user is admin
        // Adjust this check based on your auth setup
        const isAdmin = user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;
        const isOwner = data.user_id === user?.id || data.customer_email === user?.email;

        if (!isAdmin && !isOwner) {
          setError('غير مصرح بالوصول لهذا الطلب');
          return;
        }

        setOrder(data);
      } catch (err) {
        setError('حدث خطأ في تحميل الطلب');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <Loader2 size={50} color="#e50914" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#9ca3af', fontWeight: '700' }}>جاري تحميل الطلب...</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', direction: 'rtl' }}>
        <div style={{ fontSize: '3rem' }}>⚠️</div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#f5f5f5' }}>{error}</h2>
      </div>
    );
  }

  return <OrderInvoice order={order} />;
}