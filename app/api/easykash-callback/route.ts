// app/api/easykash-callback/route.ts
//
// EasyKash calls this URL after every payment attempt.
// Configure in EasyKash Integration Settings:
//   Callback URL: https://zaitandfilters.com/api/easykash-callback
//
// Change from previous version:
//   - No longer gatekeeps on status === 'PAID'
//   - ALL statuses create an order, with payment_status reflecting what EasyKash sent
//   - This prevents orders getting silently swallowed if EasyKash sends a different status string

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

// Map any EasyKash status string → our internal payment_status
function mapPaymentStatus(easykashStatus: string): string {
  const s = (easykashStatus || '').toUpperCase().trim();
  if (['PAID', 'SUCCESS', 'SUCCESSFUL', 'COMPLETED', 'APPROVED'].includes(s)) return 'paid';
  if (['FAILED', 'FAILURE', 'DECLINED', 'REJECTED', 'ERROR'].includes(s)) return 'failed';
  if (['PENDING', 'PROCESSING', 'INITIATED'].includes(s)) return 'pending';
  if (['REFUNDED', 'REVERSED'].includes(s)) return 'refunded';
  // Unknown status — still create the order, store raw status
  return 'pending';
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    console.log('[EasyKash Callback] Received:', JSON.stringify(payload, null, 2));

    const { status, customerReference, Amount, easykashRef, PaymentMethod } = payload;

    // ── 1. Verify signature (non-blocking — just logs a warning if missing) ──
    const hmacSecret = process.env.EASYKASH_HMAC_SECRET;
    if (hmacSecret) {
      const valid = verifySignature(payload, hmacSecret);
      if (!valid) {
        console.error('[EasyKash Callback] ❌ Invalid signature — rejecting');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
      console.log('[EasyKash Callback] ✅ Signature verified');
    } else {
      console.warn('[EasyKash Callback] ⚠️ No HMAC secret — skipping signature check');
    }

    // ── 2. Find the pending order ─────────────────────────────────────────────
    const { data: pending, error: findError } = await supabaseAdmin
      .from('pending_orders')
      .select('*')
      .eq('reference', String(customerReference))
      .maybeSingle();

    if (findError || !pending) {
      console.error('[EasyKash Callback] ❌ Pending order not found for ref:', customerReference);
      // Return 200 so EasyKash doesn't keep retrying
      return NextResponse.json({ received: true, warning: 'Pending order not found' });
    }

    console.log('[EasyKash Callback] ✅ Found pending order for ref:', customerReference);

    // ── 3. Idempotency — skip if already processed ───────────────────────────
    if (easykashRef) {
      const { data: existingOrder } = await supabaseAdmin
        .from('orders')
        .select('id')
        .eq('easykash_ref', easykashRef)
        .maybeSingle();

      if (existingOrder) {
        console.log('[EasyKash Callback] ⚠️ Already processed, skipping. easykashRef:', easykashRef);
        return NextResponse.json({ received: true, duplicate: true });
      }
    }

    // ── 4. Map EasyKash status → our payment_status ───────────────────────────
    const paymentStatus = mapPaymentStatus(status);
    console.log(`[EasyKash Callback] Status: "${status}" → payment_status: "${paymentStatus}"`);

    // ── 5. Create the real order regardless of status ─────────────────────────
    const orderData = pending.order_data;

    const { data: newOrder, error: insertError } = await supabaseAdmin
      .from('orders')
      .insert({
        ...orderData,
        status: paymentStatus === 'paid' ? 'pending' : 'cancelled',
        payment_status: paymentStatus,
        payment_method: 'card_installments',
        easykash_ref: easykashRef || null,
        easykash_payment_method: PaymentMethod || null,
        easykash_amount: Amount || null,
        easykash_status_raw: status,           // store the raw status for debugging
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('[EasyKash Callback] ❌ Failed to create order:', insertError.message);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    console.log('[EasyKash Callback] ✅ Order created:', newOrder.id, '| payment_status:', paymentStatus);

    // ── 6. Affiliate commission (only for paid orders) ───────────────────────
    if (paymentStatus === 'paid' && orderData.marketer_id) {
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

        console.log('[EasyKash Callback] ✅ Commission tracked for marketer:', orderData.marketer_id);
      } catch (err) {
        console.error('[EasyKash Callback] ⚠️ Commission error (non-fatal):', err);
      }
    }

    // ── 7. Clean up pending order ─────────────────────────────────────────────
    await supabaseAdmin
      .from('pending_orders')
      .delete()
      .eq('reference', String(customerReference));

    console.log('[EasyKash Callback] ✅ Pending order cleaned up');

    return NextResponse.json({ received: true, orderId: newOrder.id, paymentStatus });

  } catch (err: any) {
    console.error('[EasyKash Callback] Unexpected error:', err);
    // Always return 200 — don't let EasyKash retry for our own bugs
    return NextResponse.json({ received: true, error: err.message });
  }
}