// app/api/paymob-callback/route.ts
//
// Paymob's iframe POSTs to this URL after every payment attempt.
// Configure in the Paymob dashboard → Integration → Callback URL:
//   https://zaitandfilters.com/api/paymob-callback
//
// This handler:
//   1. Receives the payment result from the iframe
//   2. Finds the pending order by paymob_order_id
//   3. If payment is successful → creates the order from pending_orders
//   4. Sends confirmation email
//   5. Cleans up pending_orders

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Map Paymob status → our internal payment_status
function mapPaymentStatus(paymobStatus: string): string {
  const s = (paymobStatus || '').toUpperCase().trim();
  if (['SUCCESS', 'PAID', 'APPROVED'].includes(s)) return 'paid';
  if (['FAILED', 'DECLINED', 'REJECTED', 'ERROR', 'VOIDED'].includes(s)) return 'failed';
  if (['PENDING', 'PROCESSING', 'INITIATED'].includes(s)) return 'pending';
  if (['REFUNDED', 'REVERSED'].includes(s)) return 'refunded';
  return 'pending';
}

export async function POST(req: NextRequest) {
  try {
    // Paymob sends form-encoded data
    const rawText = await req.text();
    const params  = new URLSearchParams(rawText);
    const body: Record<string, string> = {};
    params.forEach((v, k) => { body[k] = v; });

    console.log('[Paymob Callback] Received:', JSON.stringify(body, null, 2));

    const paymobOrderId = body.order;
    const status        = body.status;
    const success       = body.success === 'true';
    const txnId         = body.id;
    const amountCents   = body.amount_cents;
    const paymentMethod = body['source_data.type'] || body.payment_method || null;

    // ── 1. Find the pending order ───────────────────────────────────────────
    if (!paymobOrderId) {
      console.error('[Paymob Callback] No order ID in payload');
      return NextResponse.json({ received: true, warning: 'No order ID' });
    }

    const { data: pending, error: findError } = await supabaseAdmin
      .from('pending_orders')
      .select('*')
      .eq('paymob_order_id', String(paymobOrderId))
      .maybeSingle();

    if (findError || !pending) {
      console.error('[Paymob Callback] ❌ Pending order not found for paymob_order_id:', paymobOrderId);
      // Return 200 so Paymob doesn't keep retrying
      return NextResponse.json({ received: true, warning: 'Pending order not found' });
    }

    console.log('[Paymob Callback] ✅ Found pending order for paymob_order_id:', paymobOrderId);

    // ── 2. Idempotency — skip if already processed ─────────────────────────
    if (txnId) {
      const { data: existingOrder } = await supabaseAdmin
        .from('orders')
        .select('id')
        .eq('paymob_transaction_id', txnId)
        .maybeSingle();

      if (existingOrder) {
        console.log('[Paymob Callback] ⚠️ Already processed, skipping. txnId:', txnId);
        return NextResponse.json({ received: true, duplicate: true });
      }
    }

    // ── 3. Map Paymob status → our payment_status ───────────────────────────
    const paymentStatus = mapPaymentStatus(status);
    console.log(`[Paymob Callback] Status: "${status}" → payment_status: "${paymentStatus}"`);

    // ── 4. Only create the order when payment is successful ─────────────────
    if (paymentStatus !== 'paid') {
      console.log(`[Paymob Callback] ⏭️ Payment not successful (${paymentStatus}), skipping order creation`);

      // Clean up pending order regardless
      await supabaseAdmin
        .from('pending_orders')
        .delete()
        .eq('paymob_order_id', String(paymobOrderId));

      return NextResponse.json({ received: true, action: 'skipped', paymentStatus });
    }

    const orderData = pending.order_data;

    const { data: newOrder, error: insertError } = await supabaseAdmin
      .from('orders')
      .insert({
        ...orderData,
        status:                'pending',
        payment_status:        'paid',
        payment_method:        'card_installments',
        paymob_ref:            txnId || null,
        paymob_payment_method: paymentMethod,
        paymob_amount:         amountCents ? Number(amountCents) / 100 : null,
        paymob_status_raw:     status,
        paymob_order_id:       String(paymobOrderId),
        created_at:            new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Paymob Callback] ❌ Failed to create order:', insertError.message);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    console.log('[Paymob Callback] ✅ Order created:', newOrder.id);

    // ── 5. Affiliate commission ─────────────────────────────────────────────
    if (orderData.marketer_id) {
      try {
        const { data: marketer } = await supabaseAdmin
          .from('marketers')
          .select('tier_percentage, total_conversions, total_earnings, pending_balance')
          .eq('id', orderData.marketer_id)
          .single();

        const subtotal = (orderData.items || []).reduce(
          (sum: number, i: any) => sum + parseFloat(i.price) * i.quantity, 0
        );
        const commissionRate = marketer?.tier_percentage || 5;
        const commissionAmount = subtotal * (commissionRate / 100);

        await supabaseAdmin.from('affiliate_commissions').insert({
          marketer_id:       orderData.marketer_id,
          order_id:          newOrder.id,
          commission_amount: commissionAmount,
          order_total:       subtotal,
          status:            'pending',
          is_released:       false,
        });

        await supabaseAdmin.from('marketers').update({
          total_earnings:    (marketer?.total_earnings || 0) + commissionAmount,
          total_conversions: (marketer?.total_conversions || 0) + 1,
          pending_balance:   (marketer?.pending_balance || 0) + commissionAmount,
        }).eq('id', orderData.marketer_id);

        console.log('[Paymob Callback] ✅ Commission tracked for marketer:', orderData.marketer_id);
      } catch (err) {
        console.error('[Paymob Callback] ⚠️ Commission error (non-fatal):', err);
      }
    }

    // ── 6. Send order confirmation email ────────────────────────────────────
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://zaitandfilters.com';
    fetch(`${baseUrl}/api/send-order-confirmation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: newOrder.id }),
    }).catch((err) => console.error('[Paymob Callback] Email send error:', err));

    // ── 7. Clean up pending order ───────────────────────────────────────────
    await supabaseAdmin
      .from('pending_orders')
      .delete()
      .eq('paymob_order_id', String(paymobOrderId));

    console.log('[Paymob Callback] ✅ Pending order cleaned up');

    return NextResponse.json({ received: true, orderId: newOrder.id, paymentStatus });

  } catch (err: any) {
    console.error('[Paymob Callback] Unexpected error:', err);
    // Always return 200 — don't let Paymob retry for our own bugs
    return NextResponse.json({ received: true, error: err.message });
  }
}
