// app/api/checkout/route.ts
//
// Paymob Accept (Hosted Iframe) API
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
    const { amount, orderId, customerName, customerPhone, customerEmail, items } = body;

    const apiKey        = process.env.PAYMOB_API_KEY;
    const integrationId = Number(process.env.PAYMOB_INTEGRATION_ID);
    const iframeId      = process.env.PAYMOB_IFRAME_ID;

    if (!apiKey) {
      return NextResponse.json({ success: false, message: 'Missing PAYMOB_API_KEY' }, { status: 500 });
    }
    if (!integrationId || !iframeId) {
      return NextResponse.json({ success: false, message: 'Missing PAYMOB_INTEGRATION_ID or PAYMOB_IFRAME_ID' }, { status: 500 });
    }
    if (!amount || !orderId || !customerName || !customerPhone) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    // ── Step 1: Auth token ──────────────────────────────────────────────────
    console.log('[Paymob] Step1: Getting auth token...');
    const authRes = await fetch(`${PAYMOB_BASE}/api/auth/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey }),
    });
    const authData = await authRes.json();
    if (!authData.token) {
      console.error('[Paymob] Auth failed:', authData);
      return NextResponse.json({ success: false, message: 'Paymob auth failed' }, { status: 502 });
    }
    const authToken = authData.token;
    console.log('[Paymob] Auth OK');

    // ── Step 2: Create order ────────────────────────────────────────────────
    const amountCents = Math.round(Number(amount) * 100);
    const intentionItems = (items || []).map((item: any) => ({
      name:     item.name || 'Product',
      amount:   Math.round(Number(item.price) * 100),
      quantity: item.quantity || 1,
    }));
    if (intentionItems.length === 0) {
      intentionItems.push({ name: 'Order', amount: amountCents, quantity: 1 });
    }

    console.log('[Paymob] Step2: Creating order, amount_cents:', amountCents);
    const paymobOrderRes = await fetch(`${PAYMOB_BASE}/api/ecommerce/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token:      authToken,
        delivery_needed: 'false',
        amount_cents:    amountCents,
        currency:        'EGP',
        items:           intentionItems,
      }),
    });
    const paymobOrderData = await paymobOrderRes.json();
    if (!paymobOrderData.id) {
      console.error('[Paymob] Order failed:', paymobOrderData);
      return NextResponse.json({ success: false, message: 'Paymob order failed', details: paymobOrderData }, { status: 502 });
    }
    const paymobOrderId = paymobOrderData.id;
    console.log('[Paymob] Order created, id:', paymobOrderId);

    // ── Step 3: Payment key ─────────────────────────────────────────────────
    const firstName = customerName.trim().split(' ')[0] || 'Customer';
    const lastName  = customerName.trim().split(' ').slice(1).join(' ') || 'NA';

    console.log('[Paymob] Step3: Getting payment key, integration_id:', integrationId);
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
          apartment: 'NA', email: customerEmail?.trim() || 'customer@zaitandfilters.com',
          floor: 'NA', first_name: firstName, street: 'NA', building: 'NA',
          phone_number: customerPhone.trim(), shipping_method: 'NA',
          postal_code: 'NA', city: 'Cairo', country: 'EG',
          last_name: lastName, state: 'NA',
        },
      }),
    });
    const keyData = await keyRes.json();
    if (!keyData.token) {
      console.error('[Paymob] Payment key failed:', keyData);
      return NextResponse.json({ success: false, message: 'Paymob payment key failed', details: keyData }, { status: 502 });
    }

    const paymentToken = keyData.token;
    const iframeBase   = process.env.PAYMOB_IFRAME_BASE || PAYMOB_BASE;
    const iframeUrl    = `${iframeBase}/api/acceptance/iframes/${iframeId}?payment_token=${paymentToken}`;

    console.log('[Paymob] ✅ Ready. iframe:', iframeUrl);
    return NextResponse.json({
      success:       true,
      url:           iframeUrl,
      paymobOrderId: paymobOrderId,
    });

  } catch (err: any) {
    console.error('[Paymob] Error:', err);
    return NextResponse.json({ success: false, message: 'Internal error: ' + err.message }, { status: 500 });
  }
}
