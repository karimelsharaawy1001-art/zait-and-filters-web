import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Uses service role key to bypass RLS — anon key cannot write to affiliate_commissions
function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: NextRequest) {
  try {
    const { orderId, promoCode, subtotal } = await req.json();

    if (!orderId || !promoCode || !subtotal) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = db();

    // ── Find marketer by promo code ─────────────────────────────────────────
    // 1. Check promo_codes table first (affiliate-specific codes linked to marketer)
    let marketerId: string | null = null;
    let commissionRate = 5;

    const { data: promoRow } = await supabase
      .from('promo_codes')
      .select('marketer_id, discount_percentage')
      .eq('code', promoCode.toUpperCase())
      .eq('is_active', true)
      .maybeSingle();

    if (promoRow?.marketer_id) {
      marketerId = promoRow.marketer_id;
      commissionRate = promoRow.discount_percentage || 5;
    } else {
      // 2. Fallback: check marketers.promo_code field directly
      const { data: mkt } = await supabase
        .from('marketers')
        .select('id, tier_percentage')
        .eq('promo_code', promoCode.toUpperCase())
        .maybeSingle();

      if (mkt?.id) {
        marketerId = mkt.id;
        commissionRate = mkt.tier_percentage || 5;
      }
    }

    if (!marketerId) {
      return NextResponse.json({ skipped: true, reason: 'No affiliate found for this promo code' });
    }

    // ── Prevent duplicate commission for same order ─────────────────────────
    const { data: existing } = await supabase
      .from('affiliate_commissions')
      .select('id')
      .eq('order_id', orderId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ skipped: true, reason: 'Commission already exists for this order' });
    }

    // ── Calculate commission ────────────────────────────────────────────────
    const commissionAmount = parseFloat((subtotal * commissionRate / 100).toFixed(2));

    // ── Insert commission record ────────────────────────────────────────────
    const { error: insertErr } = await supabase
      .from('affiliate_commissions')
      .insert({
        marketer_id: marketerId,
        order_id: orderId,
        commission_amount: commissionAmount,
        order_total: subtotal,
        status: 'pending',
        is_released: false,
        delivery_date: null,
        release_date: null,
      });

    if (insertErr) {
      console.error('[track-commission] Insert failed:', insertErr.message);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    // ── Update marketer pending_balance + conversions ───────────────────────
    const { data: marketer } = await supabase
      .from('marketers')
      .select('pending_balance, total_conversions')
      .eq('id', marketerId)
      .single();

    await supabase.from('marketers').update({
      pending_balance: parseFloat(((marketer?.pending_balance || 0) + commissionAmount).toFixed(2)),
      total_conversions: (marketer?.total_conversions || 0) + 1,
    }).eq('id', marketerId);

    console.log(`[track-commission] ✅ ${commissionAmount} EGP for marketer ${marketerId} (order ${orderId})`);
    return NextResponse.json({ success: true, commissionAmount, marketerId });

  } catch (err: any) {
    console.error('[track-commission] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
