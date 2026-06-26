import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[PromoPopup] Missing Supabase env vars');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
      .from('promo_popups')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[PromoPopup] DB error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[PromoPopup] data found:', !!data);
    return NextResponse.json(data || null);
  } catch (err: any) {
    console.error('[PromoPopup] unexpected error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
