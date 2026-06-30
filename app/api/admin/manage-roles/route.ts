import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Service-role client — bypasses RLS for auth admin lookups + role writes.
function makeAdmin(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Returns the logged-in user if they are an admin, otherwise null.
async function getAdminCaller() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          // Allowed inside a Route Handler.
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: roleRow } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  return roleRow?.role === 'admin' ? user : null;
}

async function findUserIdByEmail(admin: SupabaseClient, email: string): Promise<string | null> {
  const target = email.trim().toLowerCase();
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error('تعذّر البحث في المستخدمين: ' + error.message);
    const match = data.users.find((u) => u.email?.toLowerCase() === target);
    if (match) return match.id;
    if (data.users.length < 1000) break;
  }
  return null;
}

// Set a user's role without relying on a UNIQUE constraint (select-then-write).
// user_roles is keyed by user_id and has no `id` column.
async function setRole(admin: SupabaseClient, userId: string, role: 'user' | 'admin') {
  const { data: existing, error: selErr } = await admin
    .from('user_roles')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (selErr) throw new Error('تعذّر قراءة صلاحيات المستخدم: ' + selErr.message);

  const { error: writeErr } = existing
    ? await admin.from('user_roles').update({ role }).eq('user_id', userId)
    : await admin.from('user_roles').insert({ user_id: userId, role });
  if (writeErr) throw new Error('تعذّر تحديث الصلاحية: ' + writeErr.message);
}

export async function POST(req: NextRequest) {
  // Always return 200 with { ok } so the client can read the message
  // instead of hitting an unhandled 500.
  try {
    const caller = await getAdminCaller();
    if (!caller) return NextResponse.json({ ok: false, error: 'غير مصرّح لك بهذا الإجراء' });

    const body = await req.json().catch(() => ({}));
    const action = body.action as 'add' | 'remove' | undefined;
    const admin = makeAdmin();

    if (action === 'add') {
      const email = (body.email || '').trim();
      if (!email) return NextResponse.json({ ok: false, error: 'يرجى إدخال البريد الإلكتروني' });
      const targetId = await findUserIdByEmail(admin, email);
      if (!targetId) return NextResponse.json({ ok: false, error: 'لا يوجد مستخدم مسجّل بهذا البريد الإلكتروني' });
      await setRole(admin, targetId, 'admin');
      return NextResponse.json({ ok: true, message: 'تمت إضافة المشرف بنجاح' });
    }

    if (action === 'remove') {
      const userId = body.userId as string;
      if (!userId) return NextResponse.json({ ok: false, error: 'مستخدم غير محدد' });
      if (userId === caller.id) return NextResponse.json({ ok: false, error: 'لا يمكنك إزالة صلاحية الأدمن عن نفسك' });
      await setRole(admin, userId, 'user');
      return NextResponse.json({ ok: true, message: 'تمت إزالة المشرف' });
    }

    return NextResponse.json({ ok: false, error: 'إجراء غير معروف' });
  } catch (e: any) {
    console.error('[manage-roles] error:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'حدث خطأ غير متوقع' });
  }
}
