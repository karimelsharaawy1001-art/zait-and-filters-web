// app/api/paymob-webhook/route.ts
//
// Paymob calls this URL after a payment completes (server-to-server).
// Configure in Paymob dashboard → Webhook URL:
//   https://zaitandfilters.com/api/paymob-webhook
//
// Accept Iframe sends form-encoded transaction data.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function mapPaymentStatus(s: string): string {
  const u = (s || '').toUpperCase().trim();
  if (['SUCCESS', 'PAID', 'APPROVED', 'TRUE'].includes(u)) return 'paid';
  if (['FAILED', 'DECLINED', 'REJECTED', 'ERROR', 'VOIDED', 'FALSE'].includes(u)) return 'failed';
  if (['PENDING', 'PROCESSING', 'INITIATED'].includes(u)) return 'pending';
  if (['REFUNDED', 'REVERSED'].includes(u)) return 'refunded';
  return 'pending';
}

export async function POST(req: NextRequest) {
  try {
    const rawText = await req.text();
    const params = new URLSearchParams(rawText);
    const body: Record<string, string> = {};
    params.forEach((v, k) => { body[k] = v; });

    // Also try JSON
    let jsonBody: any = {};
    try { jsonBody = JSON.parse(rawText); } catch {}
    const payload = { ...jsonBody, ...body };

    console.log('[Paymob Webhook] Received:', JSON.stringify(payload, null, 2));

    const paymobOrderId = payload.order || payload.order_id || payload.intention_order_id;
    const transactionId = payload.id || payload.transaction_id;
    const status = payload.status;
    const success = payload.success === 'true' || payload.success === true;

    // ── Verify HMAC if configured ───────────────────────────────────────────
    const hmacSecret = process.env.PAYMOB_HMAC_SECRET;
    if (hmacSecret && payload.hmac) {
      try {
        const fields = [
          payload.amount_cents, payload.created, payload.currency,
          payload.error_occured, payload.has_parent_transaction,
          payload.id, payload.integration_id, payload.is_3d_secure,
          payload.is_auth, payload.is_capture, payload.is_refunded,
          payload.is_standalone_payment, payload.is_voided,
          payload.order, payload.owner, payload.pending,
          payload.source_data?.card_first_six || '',
          payload.source_data?.card_last_four || '',
          payload.source_data?.hpan || '',
          payload.source_data?.message || '',
          payload.source_data?.name || '',
          payload.source_data?.type || '',
          payload.status, String(payload.success),
        ].join('');
        const calculated = crypto.createHmac('sha512', hmacSecret).update(fields).digest('hex');
        if (calculated !== payload.hmac) {
          console.error('[Paymob Webhook] ❌ Invalid HMAC');
          return NextResponse.json({ error: 'Invalid HMAC' }, { status: 401 });
        }
        console.log('[Paymob Webhook] ✅ HMAC verified');
      } catch (err) {
        console.warn('[Paymob Webhook] HMAC check error:', err);
      }
    }

    // ── Check success ───────────────────────────────────────────────────────
    if (!success && status?.toUpperCase() !== 'SUCCESS') {
      console.log('[Paymob Webhook] Non-success status:', status);
      return NextResponse.json({ received: true, action: 'ignored' });
    }

    if (!paymobOrderId) {
      console.error('[Paymob Webhook] No order ID');
      return NextResponse.json({ received: true, action: 'ignored', reason: 'no order id' });
    }

    // ── Find matching order ─────────────────────────────────────────────────
    const { data: matchedOrder, error: findErr } = await supabase
      .from('orders')
      .select('id, status, payment_status')
      .eq('paymob_order_id', String(paymobOrderId))
      .maybeSingle();

    if (findErr || !matchedOrder) {
      console.warn('[Paymob Webhook] No matching order for:', paymobOrderId);
      return NextResponse.json({ received: true, action: 'not_found' });
    }

    console.log('[Paymob Webhook] Matched order:', matchedOrder.id);

    // ── Update order ────────────────────────────────────────────────────────
    const paymentMethod = payload['source_data.type'] || payload.payment_method || null;

    const { error: updateErr } = await supabase
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

    if (updateErr) {
      console.error('[Paymob Webhook] Update error:', updateErr);
      return NextResponse.json({ received: true, action: 'error' }, { status: 500 });
    }

    console.log('[Paymob Webhook] ✅ Order updated:', matchedOrder.id);

    // ── Send email ──────────────────────────────────────────────────────────
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://zaitandfilters.com';
    fetch(`${baseUrl}/api/send-order-confirmation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: matchedOrder.id }),
    }).catch((err) => console.error('[Paymob Webhook] Email error:', err));

    return NextResponse.json({ received: true, action: 'updated', orderId: matchedOrder.id });

  } catch (err: any) {
    console.error('[Paymob Webhook] Error:', err);
    return NextResponse.json({ received: true, action: 'error', reason: err.message });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'paymob-webhook' });
}
