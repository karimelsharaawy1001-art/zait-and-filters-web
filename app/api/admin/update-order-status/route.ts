import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function makeAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: Request) {
  try {
    const { orderId, newStatus, forceCashback } = await req.json();

    if (!orderId || !newStatus) {
      return NextResponse.json({ error: 'orderId and newStatus are required' }, { status: 400 });
    }

    const db = makeAdmin();

    // Update order status (skip if forceCashback-only call keeping existing status)
    if (!forceCashback) {
      const { error: orderError } = await db
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);
      if (orderError) throw orderError;
    }

    if (newStatus === 'delivered' || forceCashback) {
      const deliveryDate = new Date().toISOString();
      const releaseDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

      if (!forceCashback) {
        // Move commission to "in_review" and set the 14-day release date
        // (pending_balance was already updated at order placement — no need to add again)
        await db
          .from('affiliate_commissions')
          .update({ delivery_date: deliveryDate, release_date: releaseDate, status: 'in_review' })
          .eq('order_id', orderId);
      }

      // Award cashback — pass forceOverride=true to re-award even if already awarded
      const cashbackAmount = await awardCashbackOnDelivery(orderId, !!forceCashback);
      if (forceCashback) {
        return NextResponse.json({ success: true, cashbackAmount });
      }
    }

    // When an order is cancelled, revert any abandoned cart that was recovered by it
    if (newStatus === 'cancelled') {
      await db
        .from('abandoned_carts')
        .update({ recovered: false, recovered_at: null })
        .eq('recovery_order_id', orderId)
        .eq('recovered', true);
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('update-order-status error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

async function awardCashbackOnDelivery(orderId: string, forceOverride = false): Promise<number> {
  const db = makeAdmin();
  try {
    const { data: order, error: orderErr } = await db
      .from('orders')
      .select('user_id, total_price, shipping_cost, discount_applied, wallet_discount, promo_code, payment_method')
      .eq('id', orderId)
      .single();

    if (orderErr || !order) {
      console.error('[cashback] Could not fetch order:', orderErr?.message);
      return 0;
    }

    const { user_id, total_price, shipping_cost, discount_applied, wallet_discount, promo_code, payment_method } = order as {
      user_id: string | null; total_price: number;
      shipping_cost: number | null; discount_applied: number | null;
      wallet_discount: number | null; promo_code: string | null;
      payment_method: string | null;
    };

    if (!user_id) return 0;
    // No cashback on cash-on-delivery orders
    if (payment_method === 'cash') {
      console.log('[cashback] Skipped — cash on delivery');
      return 0;
    }
    // Skip promo-code orders automatically, but allow admin to force-override
    if (promo_code && !forceOverride) {
      console.log(`[cashback] Auto-skipped — promo "${promo_code}"`);
      return 0;
    }

    // Duplicate check (skip if forceOverride = manual re-apply)
    const orderRef = orderId.slice(0, 8).toUpperCase();
    if (!forceOverride) {
      const { data: existing } = await db
        .from('wallet_transactions').select('id')
        .eq('user_id', user_id).eq('type', 'cashback')
        .ilike('description', `%${orderRef}%`).maybeSingle();
      if (existing) { console.log(`[cashback] Already awarded`); return 0; }
    }

    const { data: settings } = await db
      .from('cashback_settings').select('cashback_percentage, is_enabled').single();
    if (!(settings as any)?.is_enabled) { console.log('[cashback] Disabled'); return 0; }

    const pct: number = (settings as any)?.cashback_percentage ?? 5;
    const finalTotal   = parseFloat(String(total_price))     || 0;
    const shipping     = parseFloat(String(shipping_cost))   || 0;
    const discApplied  = parseFloat(String(discount_applied))|| 0;
    const walletUsed   = parseFloat(String(wallet_discount)) || 0;
    const subtotal     = parseFloat((finalTotal - shipping + discApplied + walletUsed).toFixed(2));
    const base         = subtotal > 0 ? subtotal : finalTotal;
    const cashbackAmount = parseFloat((base * pct / 100).toFixed(2));
    if (cashbackAmount <= 0) return 0;

    const { data: wallet } = await db.from('wallets').select('balance').eq('user_id', user_id).maybeSingle();
    const currentBalance: number = (wallet as any)?.balance ?? 0;
    const newBalance = parseFloat((currentBalance + cashbackAmount).toFixed(2));

    const { error: walletErr } = await db.from('wallets')
      .upsert({ user_id, balance: newBalance }, { onConflict: 'user_id' });
    if (walletErr) { console.error('[cashback] Wallet upsert failed:', walletErr.message); return 0; }

    const { error: txErr } = await db.from('wallet_transactions').insert({
      user_id, amount: cashbackAmount, type: 'cashback',
      description: `كاش باك ${pct}% - طلب #${orderRef}`, balance_after: newBalance,
    });
    if (txErr) { console.error('[cashback] TX insert failed:', txErr.message); return 0; }

    // Save to order record so it shows in admin and customer profile
    await db.from('orders').update({ cashback_amount: cashbackAmount }).eq('id', orderId);
    console.log(`[cashback] ✅ ${cashbackAmount} EGP → user ${user_id} (order ${orderId})`);
    return cashbackAmount;
  } catch (err: any) {
    console.error('[cashback] Unexpected error:', err.message);
    return 0;
  }
}
