// app/api/paymob-webhook/route.ts
//
// Paymob calls this URL after a payment completes (server-to-server).
// Configure in the Paymob dashboard → Webhook URL:
//   https://zaitandfilters.com/api/paymob-webhook
//
// For Unified Checkout, the callback is a POST with form-encoded transaction data.
// The key fields are: id (transaction), order (paymob order id), success, status.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Map Paymob status → our internal payment_status
function mapPaymentStatus(paymobStatus: string): string {
  const s = (paymobStatus || '').toUpperCase().trim();
  if (['SUCCESS', 'PAID', 'APPROVED', 'TRUE'].includes(s)) return 'paid';
  if (['FAILED', 'DECLINED', 'REJECTED', 'ERROR', 'VOIDED', 'FALSE'].includes(s)) return 'failed';
  if (['PENDING', 'PROCESSING', 'INITIATED'].includes(s)) return 'pending';
  if (['REFUNDED', 'REVERSED'].includes(s)) return 'refunded';
  return 'pending';
}

function verifyHmac(body: any, hmacSecret: string): boolean {
  try {
    // Paymob HMAC-SHA512: sort fields lexicographically, concatenate values, hash
    const fields = [
      body.amount_cents,
      body.created,
      body.currency,
      body.error_occured,
      body.has_parent_transaction,
      body.id,
      body.integration_id,
      body.is_3d_secure,
      body.is_auth,
      body.is_capture,
      body.is_refunded,
      body.is_standalone_payment,
      body.is_voided,
      body.order,
      body.owner,
      body.pending,
      body.source_data?.card_first_six || '',
      body.source_data?.card_last_four || '',
      body.source_data?.hpan || '',
      body.source_data?.message || '',
      body.source_data?.name || '',
      body.source_data?.type || '',
      body.status,
      String(body.success),
    ].join('');

    const calculated = crypto.createHmac('sha512', hmacSecret).update(fields).digest('hex');
    return calculated === (body.hmac || '');
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Paymob sends form-encoded data
    const rawText = await req.text();
    const params = new URLSearchParams(rawText);
    const body: Record<string, string> = {};
    params.forEach((v, k) => { body[k] = v; });

    // Also try JSON body
    let jsonBody: any = {};
    try { jsonBody = JSON.parse(rawText); } catch {}

    const payload = { ...jsonBody, ...body };
    console.log('[Paymob Webhook] Received:', JSON.stringify(payload, null, 2));

    const paymobOrderId = payload.order || payload.order_id;
    const transactionId = payload.id || payload.transaction_id;
    const status = payload.status;
    const success = payload.success === 'true' || payload.success === true;

    // ── 1. Verify HMAC (if secret is configured) ────────────────────────────
    const hmacSecret = process.env.PAYMOB_HMAC_SECRET;
    if (hmacSecret && payload.hmac) {
      if (!verifyHmac(payload, hmacSecret)) {
        console.error('[Paymob Webhook] ❌ Invalid HMAC — rejecting');
        return NextResponse.json({ error: 'Invalid HMAC' }, { status: 401 });
      }
      console.log('[Paymob Webhook] ✅ HMAC verified');
    } else if (!hmacSecret) {
      console.warn('[Paymob Webhook] ⚠️ No HMAC secret — skipping verification');
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

    // ── 3. Find matching order by paymob_order_id ──────────────────────────
    const { data: matchedOrder, error: findError } = await supabase
      .from('orders')
      .select('id, status, payment_status')
      .eq('paymob_order_id', String(paymobOrderId))
      .maybeSingle();

    if (findError) {
      console.error('[Paymob Webhook] Fetch error:', findError);
      return NextResponse.json({ received: true, action: 'error', reason: findError.message }, { status: 500 });
    }

    if (!matchedOrder) {
      console.warn('[Paymob Webhook] No matching order found for paymob_order_id:', paymobOrderId);
      // Return 200 to prevent retries
      return NextResponse.json({ received: true, action: 'not_found', paymobOrderId });
    }

    console.log('[Paymob Webhook] Matched order:', matchedOrder.id);

    // ── 4. Update order status ──────────────────────────────────────────────
    const paymentMethod = payload['source_data.type'] || payload.payment_method || null;

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status:                'pending',
        payment_status:        'paid',
        paymob_transaction_id: transactionId || null,
        paymob_payment_method: paymentMethod,
        paymob_status_raw:     status,
        updated_at:            new Date().toISOString(),
      })
      .eq('id', matchedOrder.id);

    if (updateError) {
      console.error('[Paymob Webhook] Update error:', updateError);
      return NextResponse.json({ received: true, action: 'error', reason: updateError.message }, { status: 500 });
    }

    console.log('[Paymob Webhook] ✅ Order updated:', matchedOrder.id, '→ pending / paid');

    // ── 5. Send order confirmation email ────────────────────────────────────
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://zaitandfilters.com';
    fetch(`${baseUrl}/api/send-order-confirmation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: matchedOrder.id }),
    }).catch((err) => console.error('[Paymob Webhook] Email send error:', err));

    return NextResponse.json({ received: true, action: 'updated', orderId: matchedOrder.id });

  } catch (err: any) {
    console.error('[Paymob Webhook] Unexpected error:', err);
    return NextResponse.json({ received: true, action: 'error', reason: err.message });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'paymob-webhook' });
}
