'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Wallet, Link as LinkIcon, Ticket, Loader2, Copy, 
  TrendingUp, ShoppingBag 
} from 'lucide-react';
import toast from 'react-hot-toast';



export default function MarketerDashboard() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [stats, setStats] = useState<{ total_orders: number; recent_orders: any[] }>({ 
    total_orders: 0, 
    recent_orders: [] 
  });
  const [loading, setLoading] = useState(true);



  useEffect(() => {
    // Add safety timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        setLoading(false);
        toast.error('انتهت مهلة التحميل، يرجى تحديث الصفحة');
      }
    }, 10000); // 10 seconds max

    async function getMarketerData() {
      setLoading(true);
      
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        // If no user, redirect to login
        if (!user || userError) {
          toast.error('يجب تسجيل الدخول أولاً');
          router.push('/affiliate/login');
          return;
        }


        // Try to fetch marketer data
        const { data: marketer, error: marketerError } = await supabase
          .from('marketers')
          .select('*')
          .eq('id', user.id)
          .single();


        // If marketer doesn't exist, create a default one
        if (marketerError || !marketer) {
          const newMarketer = {
            id: user.id,
            full_name: user.email?.split('@')[0] || 'مسوق جديد',
            email: user.email,
            referral_id: `REF${Date.now().toString().slice(-6)}`,
            promo_code: `PROMO${Date.now().toString().slice(-6)}`,
            balance: 0,
            total_earnings: 0,
            created_at: new Date().toISOString()
          };


          const { data: inserted, error: insertError } = await supabase
            .from('marketers')
            .insert([newMarketer])
            .select()
            .single();


          if (!insertError && inserted) {
            setData(inserted);
            toast.success('تم إنشاء حسابك بنجاح!');
          } else {
            // If insert fails, use default data
            setData(newMarketer);
          }
        } else {
          setData(marketer);
        }


        // Fetch orders
        const { data: orders, count, error: ordersError } = await supabase
          .from('orders')
          .select('*', { count: 'exact' })
          .eq('marketer_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);


        if (!ordersError) {
          setStats({ 
            total_orders: count || 0, 
            recent_orders: orders || [] 
          });
        }
      } catch (error) {
        console.error('Dashboard error:', error);
        toast.error('حدث خطأ في تحميل البيانات');
        
        // Set default data to prevent infinite loading
        setData({
          full_name: 'مسوق جديد',
          referral_id: 'REF000000',
          promo_code: 'PROMO000000',
          balance: 0,
          total_earnings: 0
        });
      } finally {
        setLoading(false);
        clearTimeout(loadingTimeout);
      }
    }
    
    getMarketerData();

    return () => clearTimeout(loadingTimeout);
  }, [router, loading]);



  const referralLink = typeof window !== 'undefined' ? `${window.location.origin}?ref=${data?.referral_id}` : '';



  const copyToClipboard = (text: string, msg: string) => {
    navigator.clipboard.writeText(text);
    toast.success(msg);
  };



  if (loading) return (
    <div style={loaderContainer}>
      <Loader2 className="animate-spin" size={40} color="#27ae60" />
      <p style={{ color: '#64748b', marginTop: '15px' }}>جاري تحميل بياناتك...</p>
    </div>
  );



  return (
    <div style={container}>
      <div style={header}>
        <div>
          <h1 style={title}>مرحباً، {data?.full_name || 'مسوق'} 🎯</h1>
          <p style={subtitle}>لوحة تحكم شريك النجاح</p>
        </div>
        <div style={statusBadge}>مسوق معتمد ✓</div>
      </div>



      <div style={statsGrid}>
        <div style={statCard}>
          <div style={{ ...iconCircle, background: '#f0fdf4' }}>
            <Wallet color="#27ae60" size={24} />
          </div>
          <div>
            <p style={statLabel}>الرصيد الحالي</p>
            <h2 style={statValue}>{data?.balance?.toFixed(2) || '0.00'} ج.م</h2>
          </div>
        </div>
        <div style={statCard}>
          <div style={{ ...iconCircle, background: '#eff6ff' }}>
            <ShoppingBag color="#3b82f6" size={24} />
          </div>
          <div>
            <p style={statLabel}>إجمالي المبيعات</p>
            <h2 style={statValue}>{stats.total_orders} طلب</h2>
          </div>
        </div>
        <div style={statCard}>
          <div style={{ ...iconCircle, background: '#fef2f2' }}>
            <TrendingUp color="#ef4444" size={24} />
          </div>
          <div>
            <p style={statLabel}>إجمالي الأرباح</p>
            <h2 style={statValue}>{data?.total_earnings?.toFixed(2) || '0.00'} ج.م</h2>
          </div>
        </div>
      </div>



      <div style={mainGrid}>
        <div style={toolsCard}>
          <h3 style={sectionTitle}>🔗 أدواتك التسويقية</h3>
          <div style={toolItem}>
            <div style={toolHeader}>
              <LinkIcon size={18} />
              <span>رابط الإحالة الخاص بك</span>
            </div>
            <div style={copyBox}>
              <code style={codeText}>{referralLink}</code>
              <button 
                onClick={() => copyToClipboard(referralLink, 'تم نسخ الرابط!')} 
                style={copyBtn}
              >
                <Copy size={16} />
              </button>
            </div>
          </div>
          <div style={toolItem}>
            <div style={toolHeader}>
              <Ticket size={18} />
              <span>كود الخصم (5%)</span>
            </div>
            <div style={copyBox}>
              <code style={{ ...codeText, color: '#27ae60', fontWeight: 'bold' }}>
                {data?.promo_code || 'LOADING...'}
              </code>
              <button 
                onClick={() => copyToClipboard(data?.promo_code, 'تم نسخ الكود!')} 
                style={copyBtn}
              >
                <Copy size={16} />
              </button>
            </div>
          </div>
        </div>



        <div style={ordersCard}>
          <h3 style={sectionTitle}>📦 آخر الطلبات</h3>
          <div style={tableWrapper}>
            {stats.recent_orders.length > 0 ? (
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>التاريخ</th>
                    <th style={th}>المبلغ</th>
                    <th style={th}>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_orders.map((order: any) => (
                    <tr key={order.id} style={tr}>
                      <td style={td}>
                        {new Date(order.created_at).toLocaleDateString('ar-EG')}
                      </td>
                      <td style={td}>{order.total_price} ج.م</td>
                      <td style={td}>
                        <span style={{
                          color: order.status === 'delivered' ? '#27ae60' : '#f39c12', 
                          fontWeight: 'bold'
                        }}>
                          {order.status === 'delivered' ? 'تمت' : 'قيد التنفيذ'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={emptyText}>لا توجد طلبات مسجلة بعد. ابدأ بمشاركة رابطك!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}



// --- التنسيقات ---
const container: any = { padding: '40px 20px', maxWidth: '1200px', margin: '0 auto', direction: 'rtl', minHeight: '100vh', background: '#f8fafc' };
const header: any = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', flexWrap: 'wrap', gap: '15px' };
const title: any = { fontSize: '2rem', fontWeight: '900', color: '#1e293b', margin: 0 };
const subtitle: any = { color: '#64748b', marginTop: '5px' };
const statusBadge: any = { background: '#f0fdf4', color: '#15803d', padding: '10px 24px', borderRadius: '20px', fontWeight: 'bold', border: '1px solid #dcfce7' };
const statsGrid: any = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '40px' };
const statCard: any = { background: '#fff', padding: '25px', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '20px', transition: '0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
const iconCircle: any = { width: '55px', height: '55px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
const statLabel: any = { color: '#64748b', fontSize: '0.9rem', margin: 0, marginBottom: '8px' };
const statValue: any = { fontSize: '1.5rem', fontWeight: '900', color: '#1e293b', margin: 0 };
const mainGrid: any = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px' };
const toolsCard: any = { background: '#fff', padding: '30px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
const ordersCard: any = { background: '#fff', padding: '30px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
const sectionTitle: any = { fontSize: '1.2rem', fontWeight: '900', marginBottom: '25px', color: '#1e293b' };
const toolItem: any = { marginBottom: '25px' };
const toolHeader: any = { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', fontWeight: 'bold', color: '#1e293b' };
const copyBox: any = { background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' };
const codeText: any = { fontSize: '0.85rem', wordBreak: 'break-all', flex: 1 };
const copyBtn: any = { background: '#fff', border: '1px solid #e2e8f0', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', transition: '0.2s', flexShrink: 0 };
const tableWrapper: any = { overflowX: 'auto' };
const table: any = { width: '100%', borderCollapse: 'collapse', textAlign: 'right' };
const th: any = { padding: '12px 10px', color: '#64748b', fontSize: '0.85rem', borderBottom: '2px solid #f1f5f9', fontWeight: 'bold' };
const tr: any = { borderBottom: '1px solid #f1f5f9', transition: '0.2s' };
const td: any = { padding: '15px 10px', fontSize: '0.9rem', color: '#1e293b' };
const emptyText: any = { textAlign: 'center', color: '#94a3b8', padding: '60px 20px', fontSize: '0.95rem' };
const loaderContainer: any = { height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '15px', background: '#f8fafc' };
