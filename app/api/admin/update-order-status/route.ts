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
    const { orderId, newStatus } = await req.json();

    if (!orderId || !newStatus) {
      return NextResponse.json({ error: 'orderId and newStatus are required' }, { status: 400 });
    }

    const db = makeAdmin();

    // Update order status
    const { error: orderError } = await db
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (orderError) throw orderError;

    if (newStatus === 'delivered') {
      const deliveryDate = new Date().toISOString();
      const releaseDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

      // Update affiliate commission dates
      await db
        .from('affiliate_commissions')
        .update({ delivery_date: deliveryDate, release_date: releaseDate })
        .eq('order_id', orderId);

      // Award cashback (non-fatal — logged but won't break the status update)
      await awardCashbackOnDelivery(orderId);
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

async function awardCashbackOnDelivery(orderId: string) {
  const db = makeAdmin();
  try {
    // Fetch the order
    const { data: order, error: orderErr } = await db
      .from('orders')
      .select('user_id, total_price, promo_code')
      .eq('id', orderId)
      .single();

    if (orderErr || !order) {
      console.error('[cashback] Could not fetch order:', orderErr?.message);
      return;
    }

    const { user_id, total_price, promo_code } = order as {
      user_id: string | null;
      total_price: number;
      promo_code: string | null;
    };

    // No cashback for guest orders
    if (!user_id) return;

    // No cashback when a promo code was used
    if (promo_code) {
      console.log(`[cashback] Skipped — order ${orderId} used promo "${promo_code}"`);
      return;
    }

    // Prevent double-awarding
    const orderRef = orderId.slice(0, 8).toUpperCase();
    const { data: existing } = await db
      .from('wallet_transactions')
      .select('id')
      .eq('user_id', user_id)
      .eq('type', 'cashback')
      .ilike('description', `%${orderRef}%`)
      .maybeSingle();

    if (existing) {
      console.log(`[cashback] Already awarded for order ${orderId}`);
      return;
    }

    // Fetch cashback settings
    const { data: settings } = await db
      .from('cashback_settings')
      .select('cashback_percentage, is_enabled')
      .single();

    const enabled = (settings as any)?.is_enabled ?? false;
    if (!enabled) {
      console.log('[cashback] Disabled in settings');
      return;
    }

    const pct: number = (settings as any)?.cashback_percentage ?? 5;
    const totalPaid: number = parseFloat(String(total_price)) || 0;
    const cashbackAmount = parseFloat((totalPaid * pct / 100).toFixed(2));
    if (cashbackAmount <= 0) return;

    // Get or create wallet
    const { data: wallet } = await db
      .from('wallets')
      .select('balance')
      .eq('user_id', user_id)
      .maybeSingle();

    const currentBalance: number = (wallet as any)?.balance ?? 0;
    const newBalance = parseFloat((currentBalance + cashbackAmount).toFixed(2));

    // Upsert wallet
    const { error: walletErr } = await db
      .from('wallets')
      .upsert({ user_id, balance: newBalance }, { onConflict: 'user_id' });

    if (walletErr) {
      console.error('[cashback] Wallet upsert failed:', walletErr.message);
      return;
    }

    // Record transaction
    const { error: txErr } = await db
      .from('wallet_transactions')
      .insert({
        user_id,
        amount: cashbackAmount,
        type: 'cashback',
        description: `كاش باك ${pct}% - طلب #${orderRef}`,
        balance_after: newBalance,
      });

    if (txErr) {
      console.error('[cashback] Transaction insert failed:', txErr.message);
      return;
    }

    console.log(`[cashback] ✅ Awarded ${cashbackAmount} EGP to user ${user_id} (order ${orderId})`);
  } catch (err: any) {
    console.error('[cashback] Unexpected error:', err.message);
  }
}
