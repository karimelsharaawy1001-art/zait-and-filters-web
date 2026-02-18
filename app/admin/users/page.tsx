import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { setUserRole } from '../actions';

async function getServerSupabase() {
  const cookieStore = await cookies(); // FIX: await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
      },
    }
  );
}

export default async function AdminUsersPage() {
  const supabase = await getServerSupabase();

  // only admins should reach this page; you can also protect via /app/admin/layout.tsx
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return <div>يجب تسجيل الدخول</div>;
  }

  const { data: myRoleRow } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (myRoleRow?.role !== 'admin') {
    return <div>غير مسموح لك بالدخول إلى هذه الصفحة</div>;
  }

  // List first 50 users (requires service role in auth helper config; if that fails, we’ll switch to your own profiles table)
  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 50,
  });

  if (usersError) {
    console.error(usersError);
    return <div>حدث خطأ أثناء تحميل المستخدمين</div>;
  }

  const { data: roles } = await supabase
    .from('user_roles')
    .select('user_id, role');

  const roleMap = new Map<string, string>();
  roles?.forEach((r) => roleMap.set(r.user_id, r.role));

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">إدارة الصلاحيات (Admins)</h1>
      <table className="w-full border text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 text-right">البريد</th>
            <th className="p-2 text-right">الصلاحية الحالية</th>
            <th className="p-2 text-right">إجراء</th>
          </tr>
        </thead>
        <tbody>
          {usersData?.users.map((u) => {
            const currentRole = (roleMap.get(u.id) as 'user' | 'admin') || 'user';
            return (
              <tr key={u.id} className="border-t">
                <td className="p-2">{u.email}</td>
                <td className="p-2">{currentRole === 'admin' ? 'أدمن' : 'مستخدم'}</td>
                <td className="p-2">
                  <form
                    action={async (formData) => {
                      'use server';
                      await setUserRole(
                        formData.get('userId') as string,
                        currentRole === 'admin' ? 'user' : 'admin'
                      );
                    }}
                  >
                    <input type="hidden" name="userId" value={u.id} />
                    <button
                      type="submit"
                      className="px-3 py-1 rounded text-white text-xs"
                      style={{
                        backgroundColor:
                          currentRole === 'admin' ? '#e74c3c' : '#27ae60',
                      }}
                    >
                      {currentRole === 'admin' ? 'إزالة الأدمن' : 'جعله أدمن'}
                    </button>
                  </form>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
