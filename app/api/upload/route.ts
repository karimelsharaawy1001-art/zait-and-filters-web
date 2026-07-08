import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

const ALLOWED_BUCKETS = ['product-images', 'payment-screenshots', 'promo-images'] as const;
const ADMIN_BUCKETS = ['product-images', 'promo-images'];

async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesList) {
          cookiesList.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle();
  return data?.role === 'admin';
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const bucket = formData.get('bucket') as string | null;

    if (!file || !bucket) {
      return NextResponse.json({ error: 'يرجى تحديد الملف والمجلد' }, { status: 400 });
    }

    if (!ALLOWED_BUCKETS.includes(bucket as any)) {
      return NextResponse.json({ error: 'مجلد غير مسموح به' }, { status: 400 });
    }

    // Admin-only buckets require admin role
    if (ADMIN_BUCKETS.includes(bucket) && !(await isAdmin())) {
      return NextResponse.json({ error: 'غير مصرّح — تسجيل الدخول مطلوب' }, { status: 401 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'يُسمح فقط بملفات الصور' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'حجم الملف كبير جداً — الحد الأقصى 10MB' }, { status: 400 });
    }

    // Upload using service role key for full access
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await adminClient.storage
      .from(bucket)
      .upload(fileName, file, {
        contentType: file.type,
        cacheControl: '31536000',
        upsert: false,
      });

    if (uploadError) throw new Error(uploadError.message);

    const { data: { publicUrl } } = adminClient.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return NextResponse.json({ url: publicUrl });
  } catch (e: any) {
    console.error('[upload] Error:', e);
    return NextResponse.json({ error: e?.message || 'فشل رفع الملف' }, { status: 500 });
  }
}
