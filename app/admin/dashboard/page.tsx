'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import Link from 'next/link';

type UserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
};

type RoleRow = {
  user_id: string;
  role: 'user' | 'admin';
};

export default function AdminDashboard() {
  const [stats, setStats] = useState({ products: 0, messages: 0 });
  const [loading, setLoading] = useState(true);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [adminLoading, setAdminLoading] = useState(true);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Create admin form state
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function getStats() {
      const { count: productCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      const { count: messageCount } = await supabase
        .from('contact_messages')
        .select('*', { count: 'exact', head: true });

      setStats({
        products: productCount || 0,
        messages: messageCount || 0,
      });
      setLoading(false);
    }
    getStats();
  }, []);

  useEffect(() => {
    async function loadAdminData() {
      try {
        setAdminLoading(true);
        setAdminError(null);

        // Retry getting session up to 5 times with 500ms delay
        let session = null;
        for (let i = 0; i < 5; i++) {
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            session = data.session;
            break;
          }
          await new Promise((r) => setTimeout(r, 500));
        }

        const user = session?.user;

        if (!user) {
          setAdminError('لم يتم العثور على جلسة - يرجى تسجيل الخروج والدخول مجددًا');
          setAdminLoading(false);
          return;
        }

        setCurrentUserId(user.id);

        const { data: myRoleRow, error: myRoleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (myRoleError) {
          console.error(myRoleError);
          setAdminError(`خطأ في قراءة الصلاحيات: ${myRoleError.message}`);
          setAdminLoading(false);
          return;
        }

        if (!myRoleRow) {
          setAdminError(`لا يوجد سجل صلاحيات لهذا المستخدم (${user.email}) - يرجى إضافة صف في جدول user_roles`);
          setAdminLoading(false);
          return;
        }

        if (myRoleRow.role !== 'admin') {
          setAdminError(`صلاحيتك الحالية هي: ${myRoleRow.role} - يجب أن تكون admin`);
          setAdminLoading(false);
          return;
        }

        const { data: usersData, error: usersError } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .limit(50);

        if (usersError) {
          console.error(usersError);
          setAdminError('حدث خطأ أثناء تحميل المستخدمين');
          setAdminLoading(false);
          return;
        }

        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id, role');

        if (rolesError) {
          console.error(rolesError);
          setAdminError('حدث خطأ أثناء تحميل الصلاحيات');
          setAdminLoading(false);
          return;
        }

        setUsers((usersData || []) as UserRow[]);
        setRoles((rolesData || []) as RoleRow[]);
        setAdminLoading(false);
      } catch (e) {
        console.error(e);
        setAdminError('حدث خطأ غير متوقع');
        setAdminLoading(false);
      }
    }

    loadAdminData();
  }, []);

  const getRoleForUser = (userId: string): 'user' | 'admin' => {
    const row = roles.find((r) => r.user_id === userId);
    return row?.role || 'user';
  };

  const toggleRole = async (userId: string) => {
    if (userId === currentUserId) {
      setAdminError('لا يمكنك تغيير صلاحيات حسابك الخاص');
      return;
    }

    const currentRole = getRoleForUser(userId);
    const newRole: 'user' | 'admin' = currentRole === 'admin' ? 'user' : 'admin';

    try {
      setAdminLoading(true);
      setAdminError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const res = await fetch('/api/admin/set-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update role');
      }

      setRoles((prev) => {
        const existingIndex = prev.findIndex((r) => r.user_id === userId);
        if (existingIndex === -1) {
          return [...prev, { user_id: userId, role: newRole }];
        }
        const copy = [...prev];
        copy[existingIndex] = { user_id: userId, role: newRole };
        return copy;
      });
    } catch (e: any) {
      console.error(e);
      setAdminError(e.message || 'فشل تحديث الصلاحية');
    } finally {
      setAdminLoading(false);
    }
  };

  const createAdmin = async () => {
    if (!newEmail || !newPassword) {
      setCreateError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    if (newPassword.length < 6) {
      setCreateError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    try {
      setCreateLoading(true);
      setCreateError(null);
      setCreateSuccess(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const res = await fetch('/api/admin/create-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email: newEmail, password: newPassword }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'فشل إنشاء الحساب');
      }

      setCreateSuccess(`تم إنشاء حساب الأدمن بنجاح: ${newEmail}`);
      setNewEmail('');
      setNewPassword('');

      if (data.userId) {
        setUsers((prev) => [...prev, { id: data.userId, email: newEmail, full_name: null }]);
        setRoles((prev) => [...prev, { user_id: data.userId, role: 'admin' }]);
      }
    } catch (e: any) {
      console.error(e);
      setCreateError(e.message || 'حدث خطأ غير متوقع');
    } finally {
      setCreateLoading(false);
    }
  };

  if (loading)
    return (
      <div style={{ padding: '50px', color: '#333', textAlign: 'center', fontWeight: 'bold' }}>
        جاري تحميل الإحصائيات...
      </div>
    );

  return (
    <main style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', padding: '40px', direction: 'rtl', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#27ae60', marginBottom: '40px', fontWeight: '900' }}>لوحة التحكم - ZAIT & FILTERS</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '20px', border: '1px solid #eee', textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
          <h3 style={{ color: '#666', marginBottom: '10px', fontSize: '1rem' }}>إجمالي المنتجات</h3>
          <p style={{ fontSize: '3.5rem', fontWeight: '900', color: '#1a1a1a', margin: '10px 0' }}>{stats.products}</p>
          <Link href="/admin/products" style={{ color: '#27ae60', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem' }}>إدارة المنتجات ←</Link>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '20px', border: '1px solid #eee', textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
          <h3 style={{ color: '#666', marginBottom: '10px', fontSize: '1rem' }}>رسائل العملاء</h3>
          <p style={{ fontSize: '3.5rem', fontWeight: '900', color: '#27ae60', margin: '10px 0' }}>{stats.messages}</p>
          <Link href="/admin/messages" style={{ color: '#333', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem' }}>عرض الرسائل ←</Link>
        </div>
      </div>

      {/* روابط سريعة */}
      <div style={{ marginTop: '50px', padding: '25px', backgroundColor: '#fff', borderRadius: '20px', border: '1px solid #eee', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
        <h4 style={{ color: '#1a1a1a', marginBottom: '20px', fontWeight: '800' }}>روابط سريعة</h4>
        <div style={{ display: 'flex', gap: '20px' }}>
          <button
            onClick={() => supabase.auth.signOut()}
            style={{ backgroundColor: '#ff4d4d', color: '#fff', border: 'none', padding: '12px 25px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', transition: '0.3s' }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#cc0000')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#ff4d4d')}
          >
            تسجيل الخروج
          </button>
        </div>
      </div>

      {/* إنشاء أدمن جديد */}
      <div style={{ marginTop: '30px', padding: '25px', backgroundColor: '#fff', borderRadius: '20px', border: '1px solid #eee', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
        <h4 style={{ color: '#1a1a1a', marginBottom: '20px', fontWeight: '800' }}>إنشاء أدمن جديد</h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px' }}>
          <input
            type="email"
            placeholder="البريد الإلكتروني"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '0.9rem', outline: 'none', direction: 'ltr' }}
          />
          <input
            type="password"
            placeholder="كلمة المرور (6 أحرف على الأقل)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '0.9rem', outline: 'none', direction: 'ltr' }}
          />

          {createError && (
            <p style={{ color: '#e74c3c', fontSize: '0.85rem', margin: 0 }}>{createError}</p>
          )}
          {createSuccess && (
            <p style={{ color: '#27ae60', fontSize: '0.85rem', margin: 0 }}>{createSuccess}</p>
          )}

          <button
            onClick={createAdmin}
            disabled={createLoading}
            style={{
              backgroundColor: createLoading ? '#aaa' : '#27ae60',
              color: '#fff',
              border: 'none',
              padding: '11px 20px',
              borderRadius: '10px',
              cursor: createLoading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              alignSelf: 'flex-start',
            }}
          >
            {createLoading ? 'جاري الإنشاء...' : '+ إنشاء أدمن'}
          </button>
        </div>
      </div>

      {/* إدارة الصلاحيات */}
      <div style={{ marginTop: '30px', padding: '25px', backgroundColor: '#fff', borderRadius: '20px', border: '1px solid #eee', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
        <h4 style={{ color: '#1a1a1a', marginBottom: '20px', fontWeight: '800' }}>إدارة الصلاحيات (Admins)</h4>

        {adminError && (
          <p style={{ color: '#e74c3c', marginBottom: '10px', fontSize: '0.9rem' }}>{adminError}</p>
        )}

        {adminLoading && (
          <p style={{ color: '#666', marginBottom: '10px', fontSize: '0.9rem' }}>جاري تحميل بيانات المستخدمين...</p>
        )}

        {!adminLoading && !adminError && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'right' }}>الاسم</th>
                  <th style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'right' }}>البريد الإلكتروني</th>
                  <th style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'right' }}>الصلاحية الحالية</th>
                  <th style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'right' }}>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const currentRole = getRoleForUser(u.id);
                  const isCurrentUser = u.id === currentUserId;
                  return (
                    <tr key={u.id} style={{ backgroundColor: isCurrentUser ? '#f0fff4' : 'transparent' }}>
                      <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>
                        {u.full_name || '—'}
                        {isCurrentUser && (
                          <span style={{ marginRight: '6px', fontSize: '0.75rem', color: '#27ae60', fontWeight: 'bold' }}>(أنت)</span>
                        )}
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{u.email || '—'}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>
                        <span style={{
                          backgroundColor: currentRole === 'admin' ? '#eafaf1' : '#f5f5f5',
                          color: currentRole === 'admin' ? '#27ae60' : '#666',
                          padding: '3px 10px',
                          borderRadius: '20px',
                          fontWeight: 'bold',
                          fontSize: '0.8rem',
                        }}>
                          {currentRole === 'admin' ? 'أدمن' : 'مستخدم'}
                        </span>
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>
                        {isCurrentUser ? (
                          <span style={{ color: '#aaa', fontSize: '0.8rem' }}>حسابك الرئيسي</span>
                        ) : (
                          <button
                            onClick={() => toggleRole(u.id)}
                            style={{
                              backgroundColor: currentRole === 'admin' ? '#e74c3c' : '#27ae60',
                              color: '#fff',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontWeight: 'bold',
                              fontSize: '0.8rem',
                            }}
                          >
                            {currentRole === 'admin' ? 'إزالة الأدمن' : 'جعله أدمن'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
