// app/api/easykash-webhook/route.ts
//
// EasyKash calls this URL after a payment is completed.
// Set your webhook URL in the EasyKash dashboard to:
//   https://zaitandfilters.com/api/easykash-webhook
//
// This handler:
//   1. Verifies the payment status from EasyKash
//   2. Updates the order status from 'pending_payment' → 'pending'
//   3. Updates payment_status to 'paid'

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key so RLS doesn't block the update
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('[EasyKash Webhook] Received:', JSON.stringify(body, null, 2));

    // EasyKash sends different field names — handle all known variants
    const transactionStatus =
      body?.transactionStatus ||
      body?.status ||
      body?.paymentStatus ||
      body?.transaction_status ||
      '';

    const customerReference =
      body?.customerReference ||
      body?.customer_reference ||
      body?.orderId ||
      body?.order_id ||
      body?.referenceId ||
      body?.reference_id ||
      '';

    const transactionId =
      body?.transactionId ||
      body?.transaction_id ||
      body?.TransactionId ||
      '';

    // Only act on successful payments
    const isSuccess =
      String(transactionStatus).toLowerCase() === 'success' ||
      String(transactionStatus).toLowerCase() === 'paid' ||
      String(transactionStatus) === '1' ||
      body?.success === true;

    if (!isSuccess) {
      console.log('[EasyKash Webhook] Payment not successful, status:', transactionStatus);
      return NextResponse.json({ received: true, action: 'ignored', reason: 'non-success status' });
    }

    if (!customerReference) {
      console.error('[EasyKash Webhook] No customerReference in payload');
      return NextResponse.json({ received: true, action: 'ignored', reason: 'no reference' });
    }

    // customerReference is the orderId we passed in (last 8 digits as number)
    // We need to find the order — try matching by id ending or by a stored reference
    // First try: find order where id ends with the reference digits
    const refStr = String(customerReference);

    // Look up the order. We stored customerReference as the last 8 digits of the UUID.
    // Find orders with status 'pending_payment' that match this reference.
    const { data: orders, error: fetchError } = await supabase
      .from('orders')
      .select('id, status, payment_status')
      .eq('status', 'pending_payment')
      .order('created_at', { ascending: false })
      .limit(100);

    if (fetchError) {
      console.error('[EasyKash Webhook] Fetch error:', fetchError);
      return NextResponse.json({ received: true, action: 'error', reason: fetchError.message }, { status: 500 });
    }

    // Match by last 8 digits of UUID matching customerReference
    const matchedOrder = orders?.find(o => {
      const lastDigits = o.id.replace(/\D/g, '').slice(-8);
      return lastDigits === refStr || o.id.replace(/-/g, '').includes(refStr);
    });

    if (!matchedOrder) {
      console.warn('[EasyKash Webhook] No matching order found for reference:', refStr);
      // Still return 200 so EasyKash doesn't keep retrying
      return NextResponse.json({ received: true, action: 'not_found', reference: refStr });
    }

    console.log('[EasyKash Webhook] Matched order:', matchedOrder.id);

    // Update order: pending_payment → pending, payment_status → paid
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'pending',
        payment_status: 'paid',
        easykash_transaction_id: transactionId || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', matchedOrder.id);

    if (updateError) {
      console.error('[EasyKash Webhook] Update error:', updateError);
      return NextResponse.json({ received: true, action: 'error', reason: updateError.message }, { status: 500 });
    }

    console.log('[EasyKash Webhook] ✅ Order updated:', matchedOrder.id, '→ pending / paid');

    // Fire-and-forget: send order confirmation email
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://zaitandfilters.com';
    // Admin was already notified when the order was created at checkout, so
    // only send the customer confirmation here (skipAdmin) to avoid duplicates.
    fetch(`${baseUrl}/api/send-order-confirmation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: matchedOrder.id, skipAdmin: true }),
    }).catch((err) => console.error('[EasyKash Webhook] Email send error:', err));

    return NextResponse.json({ received: true, action: 'updated', orderId: matchedOrder.id });

  } catch (err: any) {
    console.error('[EasyKash Webhook] Unexpected error:', err);
    // Always return 200 to EasyKash to prevent retries on our bug
    return NextResponse.json({ received: true, action: 'error', reason: err.message });
  }
}

// EasyKash may also send GET requests to verify the endpoint
export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'easykash-webhook' });
}