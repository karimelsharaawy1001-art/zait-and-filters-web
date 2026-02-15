import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // المفاتيح الجديدة المؤكدة
    const PUBLIC_KEY = "gf8ueul7plkntb5r";
    const SECRET_KEY = "87ca3d5640dc3f5809d3dfbf4a5045ad";

    const payload = {
      api_key: PUBLIC_KEY,
      amount: Number(parseFloat(body.amount).toFixed(2)),
      currency: "EGP",
      order_id: String(body.orderId),
      customer_name: body.customerName,
      customer_phone: body.customerPhone,
      customer_email: body.customerEmail,
      callback_url: "https://zaitandfilters.com/order-success", //
      payment_methods: ["card", "installments", "valu", "aman"]
    };

    console.log("🚀 Switching to STABLE .io Endpoint...");

    // استخدام .io بدلاً من .net لحل مشكلة ENOTFOUND
    const response = await fetch('https://api.easykash.io/api/v1/checkout', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'authorization': SECRET_KEY 
      },
      body: JSON.stringify(payload),
      cache: 'no-store'
    });

    const responseText = await response.text();

    if (!response.ok || responseText.trim().startsWith('<!DOCTYPE')) {
      console.error("❌ Gateway Error Page:", responseText.substring(0, 300));
      throw new Error(`Gateway Error: ${response.status}`);
    }

    const data = JSON.parse(responseText);
    
    if (data.status === 'success' && data.checkout_url) {
      return NextResponse.json({ success: true, url: data.checkout_url });
    } else {
      return NextResponse.json({ success: false, message: data.message || 'Payment Link Error' }, { status: 400 });
    }

  } catch (error: any) {
    console.error("🔥 Final Route Failure:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}