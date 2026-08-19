// app/api/checkout/route.ts
//
// EasyKash Direct Payment (Hosted) API
// Docs: https://easykash.gitbook.io/easykash-apis-documentation/direct-payment-hosted/pay-api
//
// POST https://back.easykash.net/api/directpayv1/pay
// Header: authorization: <API_KEY>
// Returns: { redirectUrl: "https://www.easykash.net/DirectPayV1/{productCode}" }

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, orderId, customerName, customerPhone, customerEmail } = body;

    const apiKey  = process.env.EASYKASH_API_KEY;
    const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://zaitandfilters.com';

    if (!apiKey) {
      console.error('[EasyKash] ❌ Missing EASYKASH_API_KEY');
      return NextResponse.json(
        { success: false, message: 'Server config error: missing EASYKASH_API_KEY' },
        { status: 500 }
      );
    }

    if (!amount || !orderId || !customerName || !customerPhone) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: amount, orderId, customerName, customerPhone' },
        { status: 400 }
      );
    }

    // ── Build payload exactly as per EasyKash docs ───────────────────────────
    const payload = {
      amount:            Number(amount),       // in EGP
      currency:          'EGP',
      name:              customerName.trim(),
      email:             customerEmail?.trim() || 'customer@zaitandfilters.com',
      mobile:            customerPhone.trim(),
      redirectUrl:       `${siteUrl}/order-success?orderId=${orderId}`,
      customerReference: Number(String(orderId).replace(/\D/g, '').slice(-8)) || Date.now(),
      // Show all payment options available on your account
      paymentOptions:    [1, 2, 3, 4, 5, 6, 8, 9, 10, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 31, 32, 34],
      cashExpiry:        24, // hours
    };

    console.log('[EasyKash] POST https://back.easykash.net/api/directpayv1/pay');
    console.log('[EasyKash] Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch('https://back.easykash.net/api/directpayv1/pay', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authorization': apiKey,   // ← exactly as documented: "authorization" header
        'Accept':        'application/json',
      },
      body: JSON.stringify(payload),
    });

    const rawText = await response.text();
    console.log('[EasyKash] Status:', response.status);
    console.log('[EasyKash] Response:', rawText);

    // Parse JSON
    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch {
      console.error('[EasyKash] Non-JSON response:', rawText.slice(0, 300));
      return NextResponse.json(
        { success: false, message: 'EasyKash returned an invalid response', raw: rawText.slice(0, 200) },
        { status: 502 }
      );
    }

    if (!response.ok) {
      console.error('[EasyKash] ❌ Error:', data);
      return NextResponse.json(
        {
          success: false,
          message: data?.message || data?.error || `EasyKash error ${response.status}`,
          details: data,
        },
        { status: response.status }
      );
    }

    // ── Docs say response is: { redirectUrl: "https://www.easykash.net/DirectPayV1/{productCode}" }
    const paymentUrl = data?.redirectUrl || data?.url || data?.paymentUrl || data?.data?.redirectUrl || null;

    if (!paymentUrl) {
      console.error('[EasyKash] ❌ No redirectUrl in response:', data);
      return NextResponse.json(
        { success: false, message: 'EasyKash did not return a payment URL', raw: data },
        { status: 502 }
      );
    }

    console.log('[EasyKash] ✅ Payment URL:', paymentUrl);
    return NextResponse.json({ success: true, url: paymentUrl });

  } catch (err: any) {
    console.error('[EasyKash] Unexpected error:', err);
    return NextResponse.json(
      { success: false, message: 'Internal error: ' + err.message },
      { status: 500 }
    );
  }
}