// app/api/checkout/route.ts
//
// Paymob Accept (Hosted Iframe) API
// Docs: https://docs.paymob.com/docs/accept-payment
//
// Flow:
//   1. POST /api/auth/tokens          → get auth_token
//   2. POST /api/ecommerce/orders     → create Paymob order → get order id
//   3. POST /api/acceptance/payment_keys → get payment_key (token)
//   4. Redirect user to iframe URL with payment_token

import { NextRequest, NextResponse } from 'next/server';

const PAYMOB_BASE = 'https://accept.paymobsolutions.com';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, orderId, customerName, customerPhone, customerEmail } = body;

    const apiKey       = process.env.PAYMOB_API_KEY;
    const integrationId = Number(process.env.PAYMOB_INTEGRATION_ID_CARDS);
    const iframeId     = process.env.PAYMOB_IFRAME_ID_CARDS;

    if (!apiKey) {
      console.error('[Paymob] ❌ Missing PAYMOB_API_KEY');
      return NextResponse.json(
        { success: false, message: 'Server config error: missing PAYMOB_API_KEY' },
        { status: 500 }
      );
    }

    if (!integrationId || !iframeId) {
      console.error('[Paymob] ❌ Missing PAYMOB_INTEGRATION_ID_CARDS or PAYMOB_IFRAME_ID_CARDS');
      return NextResponse.json(
        { success: false, message: 'Server config error: missing Paymob integration/iframe config' },
        { status: 500 }
      );
    }

    if (!amount || !orderId || !customerName || !customerPhone) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: amount, orderId, customerName, customerPhone' },
        { status: 400 }
      );
    }

    // ── Step 1: Auth token ──────────────────────────────────────────────────
    console.log('[Paymob] Step 1: Getting auth token...');
    const authRes = await fetch(`${PAYMOB_BASE}/api/auth/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey }),
    });
    const authData = await authRes.json();
    if (!authData.token) {
      console.error('[Paymob] ❌ Auth token failed:', authData);
      return NextResponse.json(
        { success: false, message: 'Failed to get Paymob auth token' },
        { status: 502 }
      );
    }
    const authToken = authData.token;

    // ── Step 2: Register order ──────────────────────────────────────────────
    console.log('[Paymob] Step2: Creating order...');
    const amountCents = Math.round(Number(amount) * 100);

    const paymobOrderRes = await fetch(`${PAYMOB_BASE}/api/ecommerce/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token:      authToken,
        delivery_needed: 'false',
        amount_cents:    amountCents,
        currency:        'EGP',
        items:           [],
      }),
    });
    const paymobOrderData = await paymobOrderRes.json();
    if (!paymobOrderData.id) {
      console.error('[Paymob] ❌ Create order failed:', paymobOrderData);
      return NextResponse.json(
        { success: false, message: 'Failed to create Paymob order', details: paymobOrderData },
        { status: 502 }
      );
    }
    const paymobOrderId = paymobOrderData.id;
    console.log('[Paymob] Paymob order created, id:', paymobOrderId);

    // ── Step 3: Get payment key ─────────────────────────────────────────────
    console.log('[Paymob] Step3: Getting payment key...');
    const firstName = customerName.trim().split(' ')[0] || 'Customer';
    const lastName  = customerName.trim().split(' ').slice(1).join(' ') || 'NA';

    const keyRes = await fetch(`${PAYMOB_BASE}/api/acceptance/payment_keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token:      authToken,
        amount_cents:    amountCents,
        expiration:      3600,
        order_id:        paymobOrderId,
        currency:        'EGP',
        integration_id:  integrationId,
        billing_data: {
          apartment:       'NA',
          email:           customerEmail?.trim() || 'customer@zaitandfilters.com',
          floor:           'NA',
          first_name:      firstName,
          street:          'NA',
          building:        'NA',
          phone_number:    customerPhone.trim(),
          shipping_method: 'NA',
          postal_code:     'NA',
          city:            'Cairo',
          country:         'EG',
          last_name:       lastName,
          state:           'NA',
        },
      }),
    });
    const keyData = await keyRes.json();
    if (!keyData.token) {
      console.error('[Paymob] ❌ Payment key failed:', keyData);
      return NextResponse.json(
        { success: false, message: 'Failed to get Paymob payment key', details: keyData },
        { status: 502 }
      );
    }

    const paymentToken = keyData.token;
    const iframeUrl    = `${PAYMOB_BASE}/api/acceptance/iframes/${iframeId}?payment_token=${paymentToken}`;

    console.log('[Paymob] ✅ Payment ready. iframe URL:', iframeUrl);
    return NextResponse.json({
      success:       true,
      url:           iframeUrl,
      paymobOrderId: paymobOrderId,
    });

  } catch (err: any) {
    console.error('[Paymob] Unexpected error:', err);
    return NextResponse.json(
      { success: false, message: 'Internal error: ' + err.message },
      { status: 500 }
    );
  }
}
