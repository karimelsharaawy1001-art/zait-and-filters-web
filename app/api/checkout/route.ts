import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // المفاتيح الجديدة من صورتك
    const PUBLIC_KEY = "gf8ueul7plkntb5r";
    const SECRET_KEY = "87ca3d5640dc3f5809d3dfbf4a5045ad";

    // بناء الـ Payload بمزيج من استقرار الكود القديم ومتطلبات المفاتيح الجديدة
    const payload = {
      api_key: PUBLIC_KEY,
      amount: Number(body.amount),
      currency: "EGP",
      order_id: String(body.orderId),
      customer_name: body.customerName,
      customer_phone: body.customerPhone,
      customer_email: body.customerEmail,
      callback_url: "https://zaitandfilters.com/order-success",
      payment_methods: ["card", "installments", "valu", "aman"]
    };

    console.log('[EasyKash] Connecting using Legacy-Logic with NEW Keys...');

    // الرابط الرسمي الوحيد للنظام الجديد (بدون www وبدون back)
    const response = await fetch('https://api.easykash.net/api/v1/checkout', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'authorization': SECRET_KEY // استخدام السيكرت كي للتوثيق كما في كودك القديم
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();

    try {
      const data = JSON.parse(responseText);
      if (data.status === 'success' && data.checkout_url) {
        return NextResponse.json({ success: true, url: data.checkout_url });
      }
      return NextResponse.json({ success: false, message: data.message || 'Error from EasyKash', details: data }, { status: 400 });
    } catch (e) {
      // لو لسه السيرفر بيرد بـ HTML (أيرور <) هنطلعه في اللوج عشان نشوفه
      console.error("Non-JSON Response:", responseText);
      return NextResponse.json({ success: false, message: 'EasyKash returned HTML error page', debug: responseText.substring(0, 200) }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}