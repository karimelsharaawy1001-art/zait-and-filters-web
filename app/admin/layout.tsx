import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { redirect } from 'next/navigation';
import AdminLayoutClient from './AdminLayoutClient';



async function getServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}



export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getServerSupabase();

  const { data: { user } } = await supabase.auth.getUser();

  // ✅ غير مسجل → روجعه لصفحة الدخول
  if (!user) redirect('/admin-login');

  const { data: roleRow } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  // ✅ مش أدمن → روجعه لصفحة الدخول
  if (roleRow?.role !== 'admin') redirect('/admin-login');

  // ✅ أدمن متحقق → اعرض اللاي آوت
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
