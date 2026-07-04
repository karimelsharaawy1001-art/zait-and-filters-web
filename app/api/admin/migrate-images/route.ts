import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Cloudinary account images are migrated INTO (same as the product uploader).
const CLOUD = 'dht6kx2jx';
const PRESET = 'zaitandfilters_preset';

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

// Filter: real http(s) URL that is NOT already on Cloudinary.
function pending(q: any) {
  return q.ilike('image_url', 'http%').not('image_url', 'ilike', '%cloudinary.com%');
}

async function uploadByUrl(imageUrl: string): Promise<string> {
  const body = new URLSearchParams();
  body.append('file', imageUrl);
  body.append('upload_preset', PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: 'POST', body });
  const data: any = await res.json();
  if (!data.secure_url) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  return data.secure_url as string;
}

// GET → how many products still need migrating.
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'غير مصرّح' }, { status: 200 });
  const admin = makeAdmin();
  const { count, error } = await pending(admin.from('products').select('id', { count: 'exact', head: true }));
  if (error) return NextResponse.json({ ok: false, error: error.message });
  return NextResponse.json({ ok: true, remaining: count ?? 0 });
}

// POST → migrate one batch. Body: { limit?: number }
export async function POST(req: NextRequest) {
  try {
    if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'غير مصرّح' }, { status: 200 });
    const { limit = 10 } = await req.json().catch(() => ({}));
    const admin = makeAdmin();

    const { data: rows, error } = await pending(
      admin.from('products').select('id, name, image_url').order('id', { ascending: true })
    ).limit(Math.min(Math.max(1, limit), 25));
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

    const { count: remaining } = await pending(admin.from('products').select('id', { count: 'exact', head: true }));
    return NextResponse.json({
      ok: true,
      processed: results.length,
      migrated: results.filter(r => r.ok).length,
      failed: results.filter(r => !r.ok).length,
      results,
      remaining: remaining ?? 0,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'خطأ غير متوقع' });
  }
}
