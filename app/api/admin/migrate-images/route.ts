import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Everything is migrated INTO this public Supabase Storage bucket.
const STORAGE_BUCKET = 'product-images';

// All tables/columns that may hold a Cloudinary image URL. Each target is
// processed independently; a target whose table/column doesn't exist is
// skipped gracefully so one bad target never blocks the rest.
const TARGETS: { table: string; col: string; label: string }[] = [
  { table: 'products',        col: 'image_url', label: 'صور المنتجات' },
  { table: 'category_images', col: 'image_url', label: 'صور الأقسام' },
  { table: 'car_images',      col: 'image_url', label: 'صور السيارات' },
  { table: 'car_brands',      col: 'logo',      label: 'شعارات ماركات السيارات' },
  { table: 'part_brands',     col: 'logo',      label: 'شعارات ماركات القطع' },
  { table: 'home_banners',    col: 'image_url', label: 'بانرات الصفحة الرئيسية' },
  { table: 'hero_settings',   col: 'image_url', label: 'صور الهيرو' },
  { table: 'promo_popups',    col: 'image_url', label: 'صور الإعلانات المنبثقة' },
  { table: 'product_reviews', col: 'image_url', label: 'صور تقييمات العملاء' },
];

function makeAdmin(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll(c) { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle();
  return data?.role === 'admin';
}

// Pending = the column still points at a Cloudinary URL.
function pending(q: any, col: string) {
  return q.ilike(col, '%res.cloudinary.com%');
}

async function ensureBucket(admin: SupabaseClient) {
  const { data } = await admin.storage.getBucket(STORAGE_BUCKET);
  if (!data) await admin.storage.createBucket(STORAGE_BUCKET, { public: true }).catch(() => {});
}

// Some values contain two URLs glued together — keep only the first.
function cleanUrl(raw: string): string {
  let u = String(raw).trim();
  const i = u.search(/(%20|\s)https?:\/\//i);
  if (i !== -1) u = u.slice(0, i);
  return u.replace(/(%20|\s)+$/i, '');
}

async function uploadByUrl(admin: SupabaseClient, imageUrl: string): Promise<string> {
  const clean = cleanUrl(imageUrl);

  const imgRes = await fetch(clean);
  if (!imgRes.ok) throw new Error(`Failed to fetch image: HTTP ${imgRes.status}`);
  const blob = await imgRes.blob();

  const rawExt = clean.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
  const ext = rawExt === 'jpg' ? 'jpeg' : (/^[a-z0-9]{2,5}$/.test(rawExt) ? rawExt : 'jpeg');
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const contentType = blob.type || `image/${ext}`;

  const { error } = await admin.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, blob, { contentType, cacheControl: '31536000', upsert: false });
  if (error) throw new Error(error.message);

  const { data: { publicUrl } } = admin.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
  return publicUrl;
}

// Count pending rows for one target; returns null if the target is unusable.
async function countTarget(admin: SupabaseClient, t: typeof TARGETS[number]): Promise<number | null> {
  const { count, error } = await pending(admin.from(t.table).select('id', { count: 'exact', head: true }), t.col);
  if (error) return null;
  return count ?? 0;
}

// GET → total remaining across every target, plus a per-target breakdown.
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'غير مصرّح' }, { status: 200 });
  const admin = makeAdmin();
  const perTarget = await Promise.all(TARGETS.map(async (t) => ({
    table: t.table, label: t.label, remaining: await countTarget(admin, t),
  })));
  const remaining = perTarget.reduce((s, x) => s + (x.remaining ?? 0), 0);
  return NextResponse.json({ ok: true, remaining, targets: perTarget });
}

// POST → migrate one batch of a specific target.
// Body: { targetIndex?: number, afterId?: string, limit?: number }
export async function POST(req: NextRequest) {
  try {
    if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'غير مصرّح' }, { status: 200 });
    const { targetIndex = 0, afterId = '', limit = 8 } = await req.json().catch(() => ({}));

    const t = TARGETS[targetIndex];
    if (!t) return NextResponse.json({ ok: true, done: true, processed: 0, migrated: 0, failed: 0, results: [], hasMore: false });

    const batch = Math.min(Math.max(1, limit), 25);
    const admin = makeAdmin();
    await ensureBucket(admin);

    let q = pending(admin.from(t.table).select(`id, ${t.col}`), t.col).order('id', { ascending: true });
    if (afterId) q = q.gt('id', afterId);
    const { data: rows, error } = await q.limit(batch);
    // Target unusable (missing table/column) → skip it, let the client advance.
    if (error) return NextResponse.json({ ok: true, targetIndex, targetLabel: t.label, skipped: true, processed: 0, migrated: 0, failed: 0, results: [], hasMore: false });

    const results = await Promise.all((rows ?? []).map(async (r: any) => {
      const oldUrl = r[t.col] as string;
      try {
        const newUrl = await uploadByUrl(admin, oldUrl);
        const { error: upErr } = await admin.from(t.table).update({ [t.col]: newUrl }).eq('id', r.id);
        if (upErr) throw new Error('DB: ' + upErr.message);
        return { id: String(r.id), name: `${t.label}`, oldUrl, newUrl, ok: true };
      } catch (e: any) {
        return { id: String(r.id), name: `${t.label}`, oldUrl, ok: false, error: e?.message || 'فشل' };
      }
    }));

    const lastId = rows && rows.length ? rows[rows.length - 1].id : afterId;
    return NextResponse.json({
      ok: true,
      targetIndex,
      targetLabel: t.label,
      processed: results.length,
      migrated: results.filter(r => r.ok).length,
      failed: results.filter(r => !r.ok).length,
      results,
      lastId,
      hasMore: (rows?.length ?? 0) === batch,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'خطأ غير متوقع' });
  }
}
