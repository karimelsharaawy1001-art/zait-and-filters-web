'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import Link from 'next/link';

type UserRow = { id: string; email: string | null; full_name: string | null; };
type RoleRow = { user_id: string; role: 'user' | 'admin'; };

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    products: 0, messages: 0, orders: 0, ordersRevenue: 0,
    pendingOrders: 0, abandonedCarts: 0, activeProducts: 0,
    todayOrders: 0, todayRevenue: 0, users: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [adminLoading, setAdminLoading] = useState(true);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function getStats() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [
        { count: productCount },
        { count: activeCount },
        { count: messageCount },
        { count: orderCount },
        { count: pendingCount },
        { count: cartCount },
        { count: userCount },
        { data: ordersData },
        { data: todayOrdersData },
        { data: recentOrdersData },
      ] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('messages').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('abandoned_carts').select('*', { count: 'exact', head: true }).eq('contacted', false),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('total_price'),
        supabase.from('orders').select('total_price').gte('created_at', today.toISOString()),
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(5),
      ]);

      const totalRevenue = (ordersData || []).reduce((sum: number, o: any) => sum + (o.total_price || 0), 0);
      const todayRevenue = (todayOrdersData || []).reduce((sum: number, o: any) => sum + (o.total_price || 0), 0);

      setStats({
        products: productCount || 0,
        activeProducts: activeCount || 0,
        messages: messageCount || 0,
        orders: orderCount || 0,
        ordersRevenue: totalRevenue,
        pendingOrders: pendingCount || 0,
        abandonedCarts: cartCount || 0,
        todayOrders: (todayOrdersData || []).length,
        todayRevenue,
        users: userCount || 0,
      });
      setRecentOrders(recentOrdersData || []);
      setLoading(false);
    }
    getStats();
  }, []);

  useEffect(() => {
    async function loadAdminData() {
      try {
        setAdminLoading(true);
        setAdminError(null);
        let session = null;
        for (let i = 0; i < 5; i++) {
          const { data } = await supabase.auth.getSession();
          if (data.session) { session = data.session; break; }
          await new Promise((r) => setTimeout(r, 500));
        }
        const user = session?.user;
        if (!user) { setAdminError('لم يتم العثور على جلسة'); setAdminLoading(false); return; }
        setCurrentUserId(user.id);

        const { data: myRoleRow, error: myRoleError } = await supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle();
        if (myRoleError || !myRoleRow) { setAdminError('خطأ في قراءة الصلاحيات'); setAdminLoading(false); return; }
        if (myRoleRow.role !== 'admin') { setAdminError('صلاحيتك الحالية ليست admin'); setAdminLoading(false); return; }

        const [{ data: usersData }, { data: rolesData }] = await Promise.all([
          supabase.from('profiles').select('id, email, full_name').limit(50),
          supabase.from('user_roles').select('user_id, role'),
        ]);

        setUsers((usersData || []) as UserRow[]);
        setRoles((rolesData || []) as RoleRow[]);
        setAdminLoading(false);
      } catch { setAdminError('حدث خطأ غير متوقع'); setAdminLoading(false); }
    }
    loadAdminData();
  }, []);

  const getRoleForUser = (userId: string): 'user' | 'admin' => roles.find((r) => r.user_id === userId)?.role || 'user';

  const toggleRole = async (userId: string) => {
    if (userId === currentUserId) { setAdminError('لا يمكنك تغيير صلاحيات حسابك الخاص'); return; }
    const newRole: 'user' | 'admin' = getRoleForUser(userId) === 'admin' ? 'user' : 'admin';
    try {
      setAdminLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');
      const res = await fetch('/api/admin/set-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed');
      setRoles((prev) => {
        const idx = prev.findIndex((r) => r.user_id === userId);
        if (idx === -1) return [...prev, { user_id: userId, role: newRole }];
        const copy = [...prev]; copy[idx] = { user_id: userId, role: newRole }; return copy;
      });
    } catch (e: any) { setAdminError(e.message); }
    finally { setAdminLoading(false); }
  };

  const createAdmin = async () => {
    if (!newEmail || !newPassword) { setCreateError('يرجى إدخال البريد وكلمة المرور'); return; }
    if (newPassword.length < 6) { setCreateError('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
    try {
      setCreateLoading(true); setCreateError(null); setCreateSuccess(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');
      const res = await fetch('/api/admin/create-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ email: newEmail, password: newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'فشل إنشاء الحساب');
      setCreateSuccess(`تم إنشاء حساب الأدمن: ${newEmail}`);
      setNewEmail(''); setNewPassword('');
      if (data.userId) {
        setUsers((prev) => [...prev, { id: data.userId, email: newEmail, full_name: null }]);
        setRoles((prev) => [...prev, { user_id: data.userId, role: 'admin' }]);
      }
    } catch (e: any) { setCreateError(e.message); }
    finally { setCreateLoading(false); }
  };

  const formatCurrency = (n: number) => `${n.toLocaleString('ar-EG')} ج.م`;

  const statusLabel: Record<string, { text: string; color: string; bg: string }> = {
    pending:    { text: 'معلق',    color: '#d97706', bg: '#fef3c7' },
    confirmed:  { text: 'مؤكد',    color: '#2563eb', bg: '#dbeafe' },
    shipped:    { text: 'شحن',     color: '#7c3aed', bg: '#ede9fe' },
    delivered:  { text: 'تم',      color: '#16a34a', bg: '#dcfce7' },
    cancelled:  { text: 'ملغي',    color: '#dc2626', bg: '#fee2e2' },
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '12px', color: '#64748b', fontFamily: "'Cairo', sans-serif" }}>
      <div style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: '#16a34a', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      جاري تحميل الإحصائيات...
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ direction: 'rtl', fontFamily: "'Cairo', sans-serif", color: '#1e293b' }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .stat-card {
          background: #fff;
          border-radius: 14px;
          padding: 20px 22px;
          border: 1px solid #f1f5f9;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
          animation: fadeUp 0.4s ease both;
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .stat-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); transform: translateY(-2px); }
        .section-card {
          background: #fff;
          border-radius: 14px;
          padding: 24px;
          border: 1px solid #f1f5f9;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
          margin-top: 20px;
        }
        .section-title {
          font-size: 0.95rem;
          font-weight: 800;
          color: #1e293b;
          margin-bottom: 18px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .input-field {
          padding: 9px 13px;
          border-radius: 9px;
          border: 1.5px solid #e2e8f0;
          font-size: 0.85rem;
          outline: none;
          transition: border-color 0.15s;
          font-family: 'Cairo', sans-serif;
          width: 100%;
          direction: ltr;
        }
        .input-field:focus { border-color: #16a34a; }
        .btn-green {
          background: linear-gradient(135deg, #16a34a, #15803d);
          color: #fff;
          border: none;
          padding: 9px 20px;
          border-radius: 9px;
          cursor: pointer;
          font-weight: 700;
          font-size: 0.85rem;
          font-family: 'Cairo', sans-serif;
          transition: opacity 0.15s;
        }
        .btn-green:hover { opacity: 0.9; }
        .btn-green:disabled { opacity: 0.5; cursor: not-allowed; }
        .table-row:hover { background: #f8fafc; }
        .status-pill {
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 0.72rem;
          font-weight: 700;
        }
      `}</style>

      {/* ── Page header ── */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>لوحة التحكم</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.78rem', margin: '3px 0 0', fontWeight: '600' }}>
            {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Link href="/admin/orders" style={{ background: '#f0fdf4', color: '#16a34a', padding: '7px 13px', borderRadius: '9px', textDecoration: 'none', fontSize: '0.78rem', fontWeight: '700', border: '1px solid #bbf7d0', whiteSpace: 'nowrap' }}>
            الطلبات {stats.pendingOrders > 0 && `(${stats.pendingOrders})`}
          </Link>
          <Link href="/admin/messages" style={{ background: '#f0f9ff', color: '#0284c7', padding: '7px 13px', borderRadius: '9px', textDecoration: 'none', fontSize: '0.78rem', fontWeight: '700', border: '1px solid #bae6fd', whiteSpace: 'nowrap' }}>
            الرسائل {stats.messages > 0 && `(${stats.messages})`}
          </Link>
        </div>
      </div>

      {/* ── KPI row 1: Revenue & Orders ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: '12px' }}>

        {/* Total Revenue */}
        <div className="stat-card" style={{ animationDelay: '0ms', borderTop: '3px solid #16a34a' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>إجمالي الإيرادات</div>
          <div style={{ fontSize: 'clamp(1.1rem, 4vw, 1.6rem)', fontWeight: '900', color: '#0f172a', lineHeight: 1 }}>{formatCurrency(stats.ordersRevenue)}</div>
          <div style={{ marginTop: '10px', fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>من {stats.orders} طلب</div>
        </div>

        {/* Today Revenue */}
        <div className="stat-card" style={{ animationDelay: '60ms', borderTop: '3px solid #0ea5e9' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>إيرادات اليوم</div>
          <div style={{ fontSize: 'clamp(1.1rem, 4vw, 1.6rem)', fontWeight: '900', color: '#0f172a', lineHeight: 1 }}>{formatCurrency(stats.todayRevenue)}</div>
          <div style={{ marginTop: '10px', fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>{stats.todayOrders} طلب اليوم</div>
        </div>

        {/* Pending Orders */}
        <div className="stat-card" style={{ animationDelay: '120ms', borderTop: '3px solid #f59e0b' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>طلبات معلقة</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '900', color: stats.pendingOrders > 0 ? '#d97706' : '#0f172a', lineHeight: 1 }}>{stats.pendingOrders}</div>
          <Link href="/admin/orders" style={{ marginTop: '10px', display: 'block', fontSize: '0.75rem', color: '#f59e0b', fontWeight: '700', textDecoration: 'none' }}>معالجة الطلبات ←</Link>
        </div>

        {/* Abandoned Carts */}
        <div className="stat-card" style={{ animationDelay: '180ms', borderTop: '3px solid #ef4444' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>سلات متروكة</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '900', color: stats.abandonedCarts > 0 ? '#ef4444' : '#0f172a', lineHeight: 1 }}>{stats.abandonedCarts}</div>
          <Link href="/admin/abandoned-carts" style={{ marginTop: '10px', display: 'block', fontSize: '0.75rem', color: '#ef4444', fontWeight: '700', textDecoration: 'none' }}>متابعة ←</Link>
        </div>

        {/* Products */}
        <div className="stat-card" style={{ animationDelay: '240ms', borderTop: '3px solid #8b5cf6' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>المنتجات</div>
          <div style={{ fontSize: 'clamp(1.1rem, 4vw, 1.6rem)', fontWeight: '900', color: '#0f172a', lineHeight: 1 }}>{stats.products}</div>
          <div style={{ marginTop: '10px', fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>{stats.activeProducts} منتج نشط</div>
        </div>

        {/* Messages */}
        <div className="stat-card" style={{ animationDelay: '300ms', borderTop: '3px solid #06b6d4' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>رسائل العملاء</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '900', color: stats.messages > 0 ? '#0891b2' : '#0f172a', lineHeight: 1 }}>{stats.messages}</div>
          <Link href="/admin/messages" style={{ marginTop: '10px', display: 'block', fontSize: '0.75rem', color: '#06b6d4', fontWeight: '700', textDecoration: 'none' }}>عرض الرسائل ←</Link>
        </div>

        {/* Users */}
        <div className="stat-card" style={{ animationDelay: '360ms', borderTop: '3px solid #64748b' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>العملاء المسجلين</div>
          <div style={{ fontSize: 'clamp(1.1rem, 4vw, 1.6rem)', fontWeight: '900', color: '#0f172a', lineHeight: 1 }}>{stats.users}</div>
          <div style={{ marginTop: '10px', fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>حساب مسجل</div>
        </div>

      </div>

      {/* ── Recent Orders ── */}
      <div className="section-card">
        <div className="section-title">
          🛍️ آخر الطلبات
          <Link href="/admin/orders" style={{ marginRight: 'auto', fontSize: '0.75rem', color: '#16a34a', fontWeight: '700', textDecoration: 'none' }}>عرض الكل ←</Link>
        </div>
        {recentOrders.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '20px' }}>لا توجد طلبات بعد</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                  {['رقم الطلب', 'العميل', 'المبلغ', 'الحالة', 'التاريخ'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'right', color: '#64748b', fontWeight: '700', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => {
                  const st = statusLabel[order.status] || { text: order.status, color: '#64748b', bg: '#f1f5f9' };
                  return (
                    <tr key={order.id} className="table-row" style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '10px 12px', fontWeight: '700', color: '#0f172a' }}>
                        #{String(order.id).slice(0, 8).toUpperCase()}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#475569' }}>{order.customer_name || order.full_name || '—'}</td>
                      <td style={{ padding: '10px 12px', fontWeight: '800', color: '#16a34a' }}>{formatCurrency(order.total_price || 0)}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span className="status-pill" style={{ background: st.bg, color: st.color }}>{st.text}</span>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#94a3b8', fontSize: '0.75rem' }}>
                        {new Date(order.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Quick Links ── */}
      <div className="section-card">
        <div className="section-title">⚡ روابط سريعة</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {[
            { href: '/admin/add-product', label: '+ إضافة منتج', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
            { href: '/admin/products',    label: '📦 المنتجات',   color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
            { href: '/admin/orders',      label: '🛍️ الطلبات',   color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
            { href: '/admin/promo-codes', label: '🎫 أكواد الخصم', color: '#0891b2', bg: '#f0f9ff', border: '#bae6fd' },
            { href: '/admin/marketers',   label: '👥 المسوقين',   color: '#475569', bg: '#f8fafc', border: '#e2e8f0' },
          ].map(link => (
            <Link key={link.href} href={link.href} style={{
              padding: '9px 18px', borderRadius: '9px', background: link.bg,
              color: link.color, border: `1px solid ${link.border}`,
              textDecoration: 'none', fontSize: '0.82rem', fontWeight: '700', transition: 'opacity 0.15s',
            }}>
              {link.label}
            </Link>
          ))}
          <button onClick={() => supabase.auth.signOut()} style={{
            padding: '9px 18px', borderRadius: '9px', background: '#fff5f5',
            color: '#ef4444', border: '1px solid #fecaca',
            fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer',
          }}>
            ⎋ تسجيل الخروج
          </button>
        </div>
      </div>

      {/* ── Create Admin ── */}
      <div className="section-card">
        <div className="section-title">🔐 إنشاء أدمن جديد</div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: '700', marginBottom: '5px' }}>البريد الإلكتروني</label>
            <input className="input-field" type="email" placeholder="admin@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: '700', marginBottom: '5px' }}>كلمة المرور</label>
            <input className="input-field" type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <button className="btn-green" onClick={createAdmin} disabled={createLoading} style={{ flexShrink: 0, height: '38px' }}>
            {createLoading ? 'جاري الإنشاء...' : '+ إنشاء'}
          </button>
        </div>
        {createError   && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '10px', fontWeight: '600' }}>{createError}</p>}
        {createSuccess && <p style={{ color: '#16a34a', fontSize: '0.8rem', marginTop: '10px', fontWeight: '600' }}>✅ {createSuccess}</p>}
      </div>

    </div>
  );
}