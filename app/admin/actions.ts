'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

async function getServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

// Service-role client — bypasses RLS, used for auth admin lookups (listing users by email)
function makeAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Throws unless the current caller is a logged-in admin
async function assertCallerIsAdmin() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: callerRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (callerRole?.role !== 'admin') throw new Error('Not authorized');
  return user;
}

// Look up a user id by email across the auth users list (service role required)
async function findUserIdByEmail(email: string): Promise<string | null> {
  const admin = makeAdmin();
  const target = email.trim().toLowerCase();
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error('Failed to look up users');
    const match = data.users.find((u) => u.email?.toLowerCase() === target);
    if (match) return match.id;
    if (data.users.length < 1000) break; // last page reached
  }
  return null;
}

export async function addAdminByEmail(email: string) {
  await assertCallerIsAdmin();

  const clean = (email || '').trim();
  if (!clean) return { ok: false, error: 'يرجى إدخال البريد الإلكتروني' };

  const userId = await findUserIdByEmail(clean);
  if (!userId) {
    return { ok: false, error: 'لا يوجد مستخدم مسجّل بهذا البريد الإلكتروني' };
  }

  await setUserRole(userId, 'admin');
  revalidatePath('/admin/users');
  return { ok: true };
}

export async function removeAdmin(userId: string) {
  const caller = await assertCallerIsAdmin();
  if (caller.id === userId) {
    return { ok: false, error: 'لا يمكنك إزالة صلاحية الأدمن عن نفسك' };
  }
  await setUserRole(userId, 'user');
  revalidatePath('/admin/users');
  return { ok: true };
}

export async function setUserRole(userId: string, role: 'user' | 'admin') {
  const supabase = await getServerSupabase();

  // 1) check caller is logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // 2) check caller is admin
  const { data: callerRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (callerRole?.role !== 'admin') {
    throw new Error('Not authorized');
  }

  // 3) upsert target user role using service-role client (bypasses RLS)
  const admin = makeAdmin();
  const { error } = await admin
    .from('user_roles')
    .upsert({ user_id: userId, role }, { onConflict: 'user_id' });

  if (error) {
    console.error('setUserRole error', error);
    throw new Error('Failed to update role');
  }

  return { ok: true };
}
