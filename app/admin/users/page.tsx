import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { addAdminByEmail, removeAdmin } from '../actions';

async function getServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          // Ignore cookie writes during Server Component render (Next.js
          // disallows them); session refresh still works in Server Actions.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            /* called from a Server Component render — safe to ignore */
          }
        },
      },
    }
  );
}

function makeAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const { ok, err } = await searchParams;
  const supabase = await getServerSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div style={{ padding: 24 }} dir="rtl">يجب تسجيل الدخول</div>;

  const { data: myRoleRow } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (myRoleRow?.role !== 'admin') {
    return <div style={{ padding: 24 }} dir="rtl">غير مسموح لك بالدخول إلى هذه الصفحة</div>;
  }

  // Current admins
  const { data: adminRoles } = await supabase
    .from('user_roles')
    .select('user_id, role')
    .eq('role', 'admin');

  // Resolve emails via service role
  const admin = makeAdmin();
  const admins = await Promise.all(
    (adminRoles ?? []).map(async (r) => {
      try {
        const { data } = await admin.auth.admin.getUserById(r.user_id);
        return { id: r.user_id, email: data.user?.email ?? '—' };
      } catch {
        return { id: r.user_id, email: '—' };
      }
    })
  );
  admins.sort((a, b) => a.email.localeCompare(b.email));

  return (
    <div style={{ padding: '24px', maxWidth: '760px', margin: '0 auto' }} dir="rtl">
      <h1 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '6px', color: '#1a1a1a' }}>
        👤 إدارة المشرفين (Admins)
      </h1>
      <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '20px' }}>
        أضف مشرفاً جديداً عن طريق بريده الإلكتروني (يجب أن يكون لديه حساب مسجّل على الموقع).
      </p>

      {(ok || err) && (
        <div
          style={{
            marginBottom: '16px', padding: '12px 16px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700,
            background: ok ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${ok ? '#bbf7d0' : '#fecaca'}`,
            color: ok ? '#15803d' : '#dc2626',
          }}
        >
          {ok ? `✅ ${ok}` : `⚠️ ${err}`}
        </div>
      )}

      {/* Add admin form */}
      <form
        action={async (formData) => {
          'use server';
          const res = await addAdminByEmail(formData.get('email') as string);
          redirect(res.ok ? '/admin/users?ok=تمت إضافة المشرف بنجاح' : `/admin/users?err=${encodeURIComponent(res.error ?? 'حدث خطأ')}`);
        }}
        style={{
          display: 'flex', gap: '10px', flexWrap: 'wrap',
          background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px',
          padding: '16px', marginBottom: '24px',
        }}
      >
        <input
          type="email"
          name="email"
          required
          placeholder="البريد الإلكتروني للمشرف الجديد"
          style={{
            flex: 1, minWidth: '220px', padding: '11px 14px',
            border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '0.9rem',
            fontFamily: 'inherit', outline: 'none',
          }}
        />
        <button
          type="submit"
          style={{
            padding: '11px 22px', background: 'linear-gradient(135deg, #15803d, #166534)',
            color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800,
            fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          ➕ إضافة مشرف
        </button>
      </form>

      {/* Current admins */}
      <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '12px', color: '#1a1a1a' }}>
        المشرفون الحاليون ({admins.length})
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {admins.map((a) => (
          <div
            key={a.id}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
              background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '12px 16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <span style={{ fontSize: '1.1rem' }}>🛡️</span>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1a1a1a', wordBreak: 'break-all' }}>
                {a.email}
                {a.id === user.id && (
                  <span style={{ marginRight: '8px', fontSize: '0.7rem', color: '#15803d', fontWeight: 800 }}>(أنت)</span>
                )}
              </span>
            </div>
            {a.id !== user.id && (
              <form
                action={async (formData) => {
                  'use server';
                  const res = await removeAdmin(formData.get('userId') as string);
                  redirect(res.ok ? '/admin/users?ok=تمت إزالة المشرف' : `/admin/users?err=${encodeURIComponent(res.error ?? 'حدث خطأ')}`);
                }}
              >
                <input type="hidden" name="userId" value={a.id} />
                <button
                  type="submit"
                  style={{
                    padding: '7px 14px', background: '#fef2f2', color: '#dc2626',
                    border: '1px solid #fecaca', borderRadius: '9px', fontWeight: 700,
                    fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                  }}
                >
                  إزالة الأدمن
                </button>
              </form>
            )}
          </div>
        ))}
        {admins.length === 0 && (
          <div style={{ color: '#888', fontSize: '0.85rem' }}>لا يوجد مشرفون.</div>
        )}
      </div>
    </div>
  );
}
