// app/api/checkout/route.ts
//
// Paymob Unified Checkout (Hosted Redirection)
// Docs: https://developers.paymob.com/paymob-docs/api-reference/backend-apis/intention/create-intention
//
// Flow:
//   1. POST /intentions  → get client_secret
//   2. Redirect user to https://accept.paymob.com/unifiedcheckout/?publicKey=...&clientSecret=...
//   3. Paymob shows ALL payment methods (cards, wallets, installments) on one page
//   4. After payment → webhook callback + redirect

import { NextRequest, NextResponse } from 'next/server';

const PAYMOB_BASE = 'https://accept.paymob.com';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, orderId, customerName, customerPhone, customerEmail, items } = body;

    const secretKey     = process.env.PAYMOB_SECRET_KEY;
    const publicKey     = process.env.PAYMOB_PUBLIC_KEY;
    const integrationIds = (process.env.PAYMOB_INTEGRATION_IDS || '').split(',').map(Number).filter(Boolean);

    if (!secretKey || !publicKey) {
      console.error('[Paymob] ❌ Missing PAYMOB_SECRET_KEY or PAYMOB_PUBLIC_KEY');
      return NextResponse.json(
        { success: false, message: 'Server config error: missing Paymob keys' },
        { status: 500 }
      );
    }

    if (!integrationIds.length) {
      console.error('[Paymob] ❌ Missing PAYMOB_INTEGRATION_IDS');
      return NextResponse.json(
        { success: false, message: 'Server config error: missing Paymob integration IDs' },
        { status: 500 }
      );
    }

    if (!amount || !orderId || !customerName || !customerPhone) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: amount, orderId, customerName, customerPhone' },
        { status: 400 }
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://zaitandfilters.com';
    const amountCents = Math.round(Number(amount) * 100);

    // Build items for the intention
    const intentionItems = (items || []).map((item: any) => ({
      name:     item.name || 'Product',
      amount:   Math.round(Number(item.price) * 100),
      quantity: item.quantity || 1,
    }));

    // If no items provided, add a single item with the total
    if (intentionItems.length === 0) {
      intentionItems.push({
        name:     'Order',
        amount:   amountCents,
        quantity: 1,
      });
    }

    const firstName = customerName.trim().split(' ')[0] || 'Customer';
    const lastName  = customerName.trim().split(' ').slice(1).join(' ') || 'NA';

    // ── Step 1: Create Intention ────────────────────────────────────────────
    console.log('[Paymob] Creating intention...');
    console.log('[Paymob] payment_methods:', integrationIds, '| amount_cents:', amountCents);

    const intentionRes = await fetch(`${PAYMOB_BASE}/intentions`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Token ${secretKey}`,
      },
      body: JSON.stringify({
        amount:            amountCents,
        currency:          'EGP',
        payment_methods:   integrationIds,
        items:             intentionItems,
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
        special_reference: String(orderId),
        redirection_url:   `${siteUrl}/order-success?orderId=${orderId}`,
        notification_url:  `${siteUrl}/api/paymob-webhook`,
      }),
    });

    const intentionData = await intentionRes.json();
    console.log('[Paymob] Intention response:', JSON.stringify({ status: intentionRes.status, keys: Object.keys(intentionData) }));

    if (!intentionRes.ok || !intentionData.client_secret) {
      console.error('[Paymob] ❌ Intention failed:', JSON.stringify(intentionData));
      return NextResponse.json(
        {
          success: false,
          message: intentionData.detail || intentionData.message || 'Failed to create Paymob intention',
          details: intentionData,
        },
        { status: intentionRes.status || 502 }
      );
    }

    const clientSecret = intentionData.client_secret;
    const intentionOrderId = intentionData.intention_order_id || intentionData.id;
    const checkoutUrl = `${PAYMOB_BASE}/unifiedcheckout/?publicKey=${publicKey}&clientSecret=${clientSecret}`;

    console.log('[Paymob] ✅ Intention created. orderId:', intentionOrderId);
    console.log('[Paymob] Checkout URL:', checkoutUrl);

    return NextResponse.json({
      success:          true,
      url:              checkoutUrl,
      paymobOrderId:    intentionOrderId,
      intentionId:      intentionData.id,
    });

  } catch (err: any) {
    console.error('[Paymob] Unexpected error:', err);
    return NextResponse.json(
      { success: false, message: 'Internal error: ' + err.message },
      { status: 500 }
    );
  }
}
