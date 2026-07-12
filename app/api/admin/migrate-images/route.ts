import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Images are migrated INTO Supabase Storage (product-images bucket).
const STORAGE_BUCKET = 'product-images';

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

// Filter: real http(s) URL that is NOT already in our Supabase Storage bucket.
// (Includes Cloudinary + external images so everything ends up on Storage.)
function pending(q: any) {
  return q.ilike('image_url', 'http%').not('image_url', 'ilike', `%/storage/v1/object/public/${STORAGE_BUCKET}/%`);
}

// Make sure the public bucket exists (no-op if it already does).
async function ensureBucket(admin: SupabaseClient) {
  const { data } = await admin.storage.getBucket(STORAGE_BUCKET);
  if (!data) {
    await admin.storage.createBucket(STORAGE_BUCKET, { public: true }).catch(() => {});
  }
}

// Some image_url values contain two URLs glued together (e.g.
// "...jpg%20https://..."). Keep only the first URL.
function cleanUrl(raw: string): string {
  let u = String(raw).trim();
  const i = u.search(/(%20|\s)https?:\/\//i);
  if (i !== -1) u = u.slice(0, i);
  return u.replace(/(%20|\s)+$/i, '');
}

async function uploadByUrl(imageUrl: string): Promise<string> {
  const admin = makeAdmin();
  const clean = cleanUrl(imageUrl);

  // Fetch the image from the remote URL as a Buffer
  const imgRes = await fetch(clean);
  if (!imgRes.ok) throw new Error(`Failed to fetch image: HTTP ${imgRes.status}`);
  const blob = await imgRes.blob();

  // Generate a unique filename
  const rawExt = clean.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
  // Normalise jpg → jpeg for correct Content-Type
  const ext = rawExt === 'jpg' ? 'jpeg' : rawExt;
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const contentType = blob.type || `image/${ext}`;

  // Upload to Supabase Storage
  const { data, error } = await admin.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, blob, {
      contentType,
      cacheControl: '31536000',
      upsert: false,
    });

  if (error) throw new Error(error.message);

  const { data: { publicUrl } } = admin.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(fileName);

  return publicUrl;
}

// GET → how many products still need migrating.
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'غير مصرّح' }, { status: 200 });
  const admin = makeAdmin();
  const { count, error } = await pending(admin.from('products').select('id', { count: 'exact', head: true }));
  if (error) return NextResponse.json({ ok: false, error: error.message });
  return NextResponse.json({ ok: true, remaining: count ?? 0 });
}

// POST → migrate one batch. Body: { limit?: number, afterId?: string }
// Uses a keyset cursor (id > afterId) so rows that fail to migrate are not
// re-selected on the next batch (avoids looping on the same failures).
export async function POST(req: NextRequest) {
  try {
    if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'غير مصرّح' }, { status: 200 });
    const { limit = 10, afterId = '' } = await req.json().catch(() => ({}));
    const batch = Math.min(Math.max(1, limit), 25);
    const admin = makeAdmin();
    await ensureBucket(admin);

    let q = pending(admin.from('products').select('id, name, image_url')).order('id', { ascending: true });
    if (afterId) q = q.gt('id', afterId);
    const { data: rows, error } = await q.limit(batch);
    if (error) return NextResponse.json({ ok: false, error: error.message });

    const results = await Promise.all((rows ?? []).map(async (p: any) => {
      const oldUrl = p.image_url as string;
      try {
        const newUrl = await uploadByUrl(oldUrl);
        const { error: upErr } = await admin.from('products').update({ image_url: newUrl }).eq('id', p.id);
        if (upErr) throw new Error('DB: ' + upErr.message);
        return { id: p.id, name: p.name, oldUrl, newUrl, ok: true };
      } catch (e: any) {
        return { id: p.id, name: p.name, oldUrl, ok: false, error: e?.message || 'فشل' };
      }
    }));

    const lastId = rows && rows.length ? rows[rows.length - 1].id : afterId;
    return NextResponse.json({
      ok: true,
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
