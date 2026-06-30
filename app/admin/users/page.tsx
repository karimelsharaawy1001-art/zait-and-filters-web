import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import AdminUsersManager from './AdminUsersManager';

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
          // disallows them); session refresh still works in middleware/routes.
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

export default async function AdminUsersPage() {
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

  // Current admins — query with the service-role client so RLS doesn't hide
  // other admins' rows (the anon policy only exposes the caller's own row).
  const admin = makeAdmin();
  const { data: adminRoles } = await admin
    .from('user_roles')
    .select('user_id, role')
    .eq('role', 'admin');

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

      <AdminUsersManager admins={admins} currentUserId={user.id} />
    </div>
  );
}
