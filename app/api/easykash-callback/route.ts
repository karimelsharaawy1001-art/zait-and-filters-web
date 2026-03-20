// app/api/easykash-callback/route.ts
//
// EasyKash calls this URL after every successful payment.
// Configure this URL in your EasyKash Integration Settings:
//   https://www.easykash.net/seller/cash-api
//   → Callback URL: https://zaitandfilters.com/api/easykash-callback
//
// Flow:
//   1. Verify signatureHash with HMAC-SHA512
//   2. Look up the pending order data stored in Supabase `pending_orders` table
//   3. Create the real order in `orders` table
//   4. Delete the pending row
//   5. Return 200 OK (EasyKash expects 2xx or it retries)

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Use service role to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function verifySignature(payload: any, secretKey: string): boolean {
  const {
    ProductCode, Amount, ProductType, PaymentMethod,
    status, easykashRef, customerReference, signatureHash,
  } = payload;

  const dataStr = [
    ProductCode, Amount, ProductType, PaymentMethod,
    status, easykashRef, customerReference,
  ].join('');

  const calculated = crypto
    .createHmac('sha512', secretKey)
    .update(dataStr)
    .digest('hex');

  return calculated === signatureHash;
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    console.log('[EasyKash Callback] Received:', JSON.stringify(payload, null, 2));

    const { status, customerReference, Amount, easykashRef, PaymentMethod } = payload;

    // ── 1. Verify signature ───────────────────────────────────────────────────
    const hmacSecret = process.env.EASYKASH_HMAC_SECRET;
    if (hmacSecret) {
      const valid = verifySignature(payload, hmacSecret);
      if (!valid) {
        console.error('[EasyKash Callback] ❌ Invalid signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
      console.log('[EasyKash Callback] ✅ Signature verified');
    } else {
      console.warn('[EasyKash Callback] ⚠️ No HMAC secret set — skipping verification');
    }

    // ── 2. Only process PAID callbacks ───────────────────────────────────────
    if (status !== 'PAID') {
      console.log(`[EasyKash Callback] Ignoring status: ${status}`);
      return NextResponse.json({ received: true, skipped: true });
    }

    // ── 3. Find the pending order data ────────────────────────────────────────
    // customerReference is what we stored as the lookup key
    const { data: pending, error: findError } = await supabaseAdmin
      .from('pending_orders')
      .select('*')
      .eq('reference', String(customerReference))
      .maybeSingle();

    if (findError || !pending) {
      console.error('[EasyKash Callback] ❌ Pending order not found for ref:', customerReference);
      // Still return 200 so EasyKash doesn't keep retrying
      return NextResponse.json({ received: true, warning: 'Pending order not found' });
    }

    // ── 4. Check not already processed (idempotency) ─────────────────────────
    const { data: existingOrder } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('easykash_ref', easykashRef)
      .maybeSingle();

    if (existingOrder) {
      console.log('[EasyKash Callback] ⚠️ Order already created for ref:', easykashRef);
      return NextResponse.json({ received: true, duplicate: true });
    }

    // ── 5. Create the real order ──────────────────────────────────────────────
    const orderData = pending.order_data;
    const { data: newOrder, error: insertError } = await supabaseAdmin
      .from('orders')
      .insert({
        ...orderData,
        status: 'pending',                   // payment confirmed → pending fulfillment
        payment_method: 'card_installments',
        easykash_ref: easykashRef,
        easykash_payment_method: PaymentMethod,
        easykash_amount: Amount,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('[EasyKash Callback] ❌ Failed to create order:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    console.log('[EasyKash Callback] ✅ Order created:', newOrder.id);

    // ── 6. Handle affiliate commission if needed ──────────────────────────────
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
          marketer_id: orderData.marketer_id,
          order_id: newOrder.id,
          commission_amount: commissionAmount,
          order_total: subtotal,
          status: 'pending',
          is_released: false,
        });

        await supabaseAdmin.from('marketers').update({
          total_earnings: (marketer?.total_earnings || 0) + commissionAmount,
          total_conversions: (marketer?.total_conversions || 0) + 1,
          pending_balance: (marketer?.pending_balance || 0) + commissionAmount,
        }).eq('id', orderData.marketer_id);
      } catch (err) {
        console.error('[EasyKash Callback] ⚠️ Commission error (non-fatal):', err);
      }
    }

    // ── 7. Delete the pending order row ───────────────────────────────────────
    await supabaseAdmin
      .from('pending_orders')
      .delete()
      .eq('reference', String(customerReference));

    console.log('[EasyKash Callback] ✅ Pending order cleaned up');

    return NextResponse.json({ received: true, orderId: newOrder.id });

  } catch (err: any) {
    console.error('[EasyKash Callback] Unexpected error:', err);
    // Return 200 anyway — we don't want EasyKash to retry for our own bugs
    return NextResponse.json({ received: true, error: err.message });
  }
}