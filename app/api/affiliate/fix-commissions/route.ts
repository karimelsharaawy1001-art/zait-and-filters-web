import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST() {
  const supabase = db();
  const results = { created: 0, skipped: 0, errors: [] as string[] };

  try {
    // 1. Get all active marketers with their promo codes
    const { data: marketers } = await supabase
      .from('marketers')
      .select('id, promo_code, tier_percentage, pending_balance, total_conversions')
      .not('promo_code', 'is', null);

    if (!marketers?.length) {
      return NextResponse.json({ message: 'No marketers found', ...results });
    }

    // Build a lookup map: promoCode → marketer
    const promoMap = new Map<string, any>();
    for (const m of marketers) {
      if (m.promo_code) promoMap.set(m.promo_code.toUpperCase(), m);
    }

    // 2. Also get promo_codes table entries
    const { data: promoCodes } = await supabase
      .from('promo_codes')
      .select('code, marketer_id, discount_percentage')
      .eq('is_active', true);

    const promoCodesMap = new Map<string, any>();
    for (const p of promoCodes || []) {
      if (p.code) promoCodesMap.set(p.code.toUpperCase(), p);
    }

    // 3. Get all orders that have a promo_code set
    const { data: orders } = await supabase
      .from('orders')
      .select('id, promo_code, total_price, shipping_cost, discount_applied, wallet_discount, status')
      .not('promo_code', 'is', null)
      .neq('promo_code', '')
      .neq('status', 'cancelled');

    if (!orders?.length) {
      return NextResponse.json({ message: 'No orders with promo codes', ...results });
    }

    // 4. Get existing commissions to avoid duplicates
    const { data: existingComms } = await supabase
      .from('affiliate_commissions')
      .select('order_id');
    const existingOrderIds = new Set((existingComms || []).map((c: any) => c.order_id));

    // 5. Process each order
    for (const order of orders) {
      if (existingOrderIds.has(order.id)) { results.skipped++; continue; }

      const code = (order.promo_code || '').toUpperCase();

      // Find marketer
      let marketerId: string | null = null;
      let commissionRate = 5;

      if (promoCodesMap.has(code)) {
        const pc = promoCodesMap.get(code);
        marketerId = pc.marketer_id;
        commissionRate = pc.discount_percentage || 5;
      } else if (promoMap.has(code)) {
        const mkt = promoMap.get(code);
        marketerId = mkt.id;
        commissionRate = mkt.tier_percentage || 5;
      }

      if (!marketerId) { results.skipped++; continue; }

      // Calculate subtotal (excl. shipping)
      const finalTotal   = parseFloat(String(order.total_price))      || 0;
      const shipping     = parseFloat(String(order.shipping_cost))     || 0;
      const discApplied  = parseFloat(String(order.discount_applied))  || 0;
      const walletUsed   = parseFloat(String(order.wallet_discount))   || 0;
      const subtotal     = parseFloat((finalTotal - shipping + discApplied + walletUsed).toFixed(2));
      const base         = subtotal > 0 ? subtotal : finalTotal;
      const commAmt      = parseFloat((base * commissionRate / 100).toFixed(2));
      if (commAmt <= 0) { results.skipped++; continue; }

      // Determine status based on order status
      const commStatus = order.status === 'delivered' ? 'in_review' : 'pending';
      const now        = new Date().toISOString();
      const release    = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

      const { error: insertErr } = await supabase.from('affiliate_commissions').insert({
        marketer_id: marketerId,
        order_id: order.id,
        commission_amount: commAmt,
        order_total: subtotal,
        status: commStatus,
        is_released: false,
        delivery_date: order.status === 'delivered' ? now : null,
        release_date:  order.status === 'delivered' ? release : null,
      });

      if (insertErr) {
        results.errors.push(`Order ${order.id.slice(0,8)}: ${insertErr.message}`);
        continue;
      }

      // Update marketer pending_balance
      const mkt = promoMap.get(code) || marketers.find((m: any) => m.id === marketerId);
      if (mkt) {
        const { data: freshMkt } = await supabase
          .from('marketers').select('pending_balance, total_conversions').eq('id', marketerId).single();
        await supabase.from('marketers').update({
          pending_balance:   parseFloat(((freshMkt?.pending_balance || 0)   + commAmt).toFixed(2)),
          total_conversions: (freshMkt?.total_conversions || 0) + 1,
        }).eq('id', marketerId);
      }

      results.created++;
    }

    return NextResponse.json({
      message: `✅ تم إنشاء ${results.created} عمولة جديدة، تخطي ${results.skipped}`,
      ...results,
    });
  } catch (err: any) {
    console.error('[fix-commissions]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
