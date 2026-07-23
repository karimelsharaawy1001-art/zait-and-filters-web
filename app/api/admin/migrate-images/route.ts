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

// A Cloudinary "fetch" URL embeds the original remote image URL, e.g.
//   res.cloudinary.com/<cloud>/image/fetch/f_auto/https://source.com/x.jpg
// Extract that original so we can download straight from the source and skip
// Cloudinary (whose fetch delivery is restricted → 401).
function extractFetchOriginal(url: string): string | null {
  const idx = url.search(/\/image\/fetch\//i);
  if (idx === -1) return null;
  const rest = url.slice(idx + '/image/fetch/'.length);
  const m = rest.match(/https?(?::\/\/|%3A%2F%2F).+$/i);
  if (!m) return null;
  let remote = m[0];
  if (/%3A%2F%2F/i.test(remote)) { try { remote = decodeURIComponent(remote); } catch { /* keep as-is */ } }
  return remote;
}

// Rebuild a Cloudinary URL pointing at the ORIGINAL asset (no transformations).
// If "strict transformations" is on, transformed URLs 401 but the original works.
function cloudinaryOriginal(url: string): string {
  const m = url.match(/^(https?:\/\/res\.cloudinary\.com\/[^/]+\/(?:image|video|raw)\/upload\/)(.*)$/i);
  if (!m) return url;
  const segs = m[2].split('/');
  // Drop leading transformation segments (e.g. "f_auto,q_auto", "w_500,c_fill"),
  // stop at the version (v123...) or the public id / folder.
  while (segs.length > 1 && /(^|,)[a-z]{1,3}_[^/,]+/.test(segs[0]) && !/^v\d+$/i.test(segs[0])) {
    segs.shift();
  }
  return m[1] + segs.join('/');
}

// Fetch an image, sending browser-like headers so Cloudinary's hotlink/bot
// protection (which returns 401/403 to bare server requests) lets it through.
async function fetchImage(url: string): Promise<Response> {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
    'Referer': 'https://zaitandfilters.com/',
    'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
  };
  let res = await fetch(url, { headers });
  if (!res.ok && (res.status === 401 || res.status === 403 || res.status >= 500)) {
    // Retry once after a short pause (transient / rate-limit)
    await new Promise(r => setTimeout(r, 400));
    res = await fetch(url, { headers });
  }
  return res;
}

async function uploadByUrl(admin: SupabaseClient, imageUrl: string): Promise<string> {
  const clean = cleanUrl(imageUrl);

  // Prefer the embedded original source (bypasses restricted Cloudinary fetch),
  // then the transformation-free Cloudinary asset, then the stored URL as-is.
  const fetchOrig = extractFetchOriginal(clean);
  const candidates = Array.from(new Set([
    ...(fetchOrig ? [fetchOrig] : []),
    cloudinaryOriginal(clean),
    clean,
  ]));
  let imgRes: Response | null = null;
  let lastStatus = 0;
  for (const c of candidates) {
    imgRes = await fetchImage(c);
    if (imgRes.ok) break;
    lastStatus = imgRes.status;
  }
  if (!imgRes || !imgRes.ok) throw new Error(`Failed to fetch image: HTTP ${lastStatus}`);
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

    // Dedupe by URL: a reused image is downloaded & uploaded only ONCE, then
    // EVERY row referencing that exact URL is updated together. This keeps
    // Cloudinary delivery hits (and Supabase uploads) to the number of unique
    // images, not the number of rows — critical when the quota is tight.
    const uniqueUrls = Array.from(new Set((rows ?? []).map((r: any) => r[t.col]).filter(Boolean))) as string[];
    const results = await Promise.all(uniqueUrls.map(async (oldUrl) => {
      try {
        const newUrl = await uploadByUrl(admin, oldUrl);
        const { error: upErr } = await admin.from(t.table).update({ [t.col]: newUrl }).eq(t.col, oldUrl);
        if (upErr) throw new Error('DB: ' + upErr.message);
        return { id: oldUrl.slice(-28), name: `${t.label}`, oldUrl, newUrl, ok: true };
      } catch (e: any) {
        return { id: oldUrl.slice(-28), name: `${t.label}`, oldUrl, ok: false, error: e?.message || 'فشل' };
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
