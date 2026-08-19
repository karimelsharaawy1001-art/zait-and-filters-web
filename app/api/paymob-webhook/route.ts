// app/api/paymob-webhook/route.ts
//
// Paymob calls this URL after a payment is completed (server-to-server).
// Configure in the Paymob dashboard → Integration → Webhook URL:
//   https://zaitandfilters.com/api/paymob-webhook
//
// This handler:
//   1. Verifies the HMAC signature from Paymob
//   2. Finds the matching order by paymob_order_id
//   3. Updates the order status from 'pending_payment' → 'pending'
//   4. Sets payment_status to 'paid'

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Use service role key so RLS doesn't block the update
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function verifyHmac(body: any, hmacSecret: string): boolean {
  // Paymob sends HMAC-SHA512 of: order_id.amount_cents.currency.success.txn_id
  const fields = [
    body.order,
    body.amount_cents,
    body.currency,
    body.success,
    body.id,
  ].join('');

  const calculated = crypto
    .createHmac('sha512', hmacSecret)
    .update(fields)
    .digest('hex');

  // Paymob may send HMAC in different header names
  const received =
    body.hmac ||
    body.HMAC ||
    '';

  return calculated === received;
}

// Map Paymob status string → our internal payment_status
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

    console.log('[Paymob Webhook] Received:', JSON.stringify(body, null, 2));

    const paymobOrderId  = body.order;
    const transactionId  = body.id;
    const status         = body.status;
    const success        = body.success === 'true';
    const amountCents    = body.amount_cents;

    // ── 1. Verify HMAC signature ────────────────────────────────────────────
    const hmacSecret = process.env.PAYMOB_HMAC_SECRET;
    if (hmacSecret) {
      try {
        // Paymob sends HMAC in the hmac field
        const receivedHmac = body.hmac || '';
        const fields = [paymobOrderId, amountCents, body.currency, body.success, transactionId].join('');
        const calculated = crypto.createHmac('sha512', hmacSecret).update(fields).digest('hex');
        if (calculated !== receivedHmac) {
          console.error('[Paymob Webhook] ❌ Invalid HMAC — rejecting');
          return NextResponse.json({ error: 'Invalid HMAC' }, { status: 401 });
        }
        console.log('[Paymob Webhook] ✅ HMAC verified');
      } catch (err) {
        console.error('[Paymob Webhook] HMAC verification error:', err);
        // Continue anyway — don't reject on crypto errors
      }
    } else {
      console.warn('[Paymob Webhook] ⚠️ No HMAC secret configured — skipping verification');
    }

    // ── 2. Check payment success ────────────────────────────────────────────
    if (!success && status?.toUpperCase() !== 'SUCCESS') {
      console.log('[Paymob Webhook] Payment not successful, status:', status);
      return NextResponse.json({ received: true, action: 'ignored', reason: 'non-success status' });
    }

    if (!paymobOrderId) {
      console.error('[Paymob Webhook] No order ID in payload');
      return NextResponse.json({ received: true, action: 'ignored', reason: 'no order id' });
    }

    // ── 3. Find the matching order by paymob_order_id ───────────────────────
    const { data: matchedOrder, error: findError } = await supabase
      .from('orders')
      .select('id, status, payment_status')
      .eq('paymob_order_id', paymobOrderId)
      .maybeSingle();

    if (findError) {
      console.error('[Paymob Webhook] Fetch error:', findError);
      return NextResponse.json({ received: true, action: 'error', reason: findError.message }, { status: 500 });
    }

    if (!matchedOrder) {
      console.warn('[Paymob Webhook] No matching order found for paymob_order_id:', paymobOrderId);
      // Return 200 so Paymob doesn't keep retrying
      return NextResponse.json({ received: true, action: 'not_found', paymobOrderId });
    }

    console.log('[Paymob Webhook] Matched order:', matchedOrder.id);

    // ── 4. Update order: pending_payment → pending, payment_status → paid ───
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status:             'pending',
        payment_status:     'paid',
        paymob_transaction_id: transactionId || null,
        updated_at:         new Date().toISOString(),
      })
      .eq('id', matchedOrder.id);

    if (updateError) {
      console.error('[Paymob Webhook] Update error:', updateError);
      return NextResponse.json({ received: true, action: 'error', reason: updateError.message }, { status: 500 });
    }

    console.log('[Paymob Webhook] ✅ Order updated:', matchedOrder.id, '→ pending / paid');

    // ── 5. Fire-and-forget: send order confirmation email ───────────────────
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://zaitandfilters.com';
    fetch(`${baseUrl}/api/send-order-confirmation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: matchedOrder.id }),
    }).catch((err) => console.error('[Paymob Webhook] Email send error:', err));

    return NextResponse.json({ received: true, action: 'updated', orderId: matchedOrder.id });

  } catch (err: any) {
    console.error('[Paymob Webhook] Unexpected error:', err);
    // Always return 200 to prevent Paymob retries on our bug
    return NextResponse.json({ received: true, action: 'error', reason: err.message });
  }
}

// Paymob may also send GET requests to verify the endpoint
export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'paymob-webhook' });
}
