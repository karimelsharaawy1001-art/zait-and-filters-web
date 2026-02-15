import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // المفاتيح من لوحة التحكم
    const PUBLIC_API_KEY = "gf8ueul7plkntb5r";
    const HMAC_SECRET_KEY = "87ca3d5640dc3f5809d3dfbf4a5045ad";

    // بناء البيانات بالتنسيق الذي يقبله نظام v1 checkout
    const payload = {
      api_key: PUBLIC_API_KEY,
      amount: Number(body.amount),
      currency: "EGP",
      order_id: String(body.orderId),
      customer_name: body.customerName,
      customer_phone: body.customerPhone,
      customer_email: body.customerEmail,
      callback_url: "https://zaitandfilters.com/order-success",
      payment_methods: ["card", "installments", "valu", "aman"]
    };

    console.log('[EasyKash] Initializing Checkout v1 with Authentication...');

    // استخدمنا الرابط الرسمي لـ v1 checkout مع السيكرت كي في الهيدر
    const response = await fetch('https://api.easykash.net/api/v1/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'authorization': HMAC_SECRET_KEY // إضافة التوثيق كما في الكود القديم
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    console.log('[EasyKash Response Content]:', responseText);

    if (responseText.trim().startsWith('<!DOCTYPE')) {
      throw new Error("السيرفر رد بصفحة HTML. تأكد من تفعيل API Checkout في حسابك.");
    }

    const data = JSON.parse(responseText);

    if (data.status === 'success' && data.checkout_url) {
      return NextResponse.json({ success: true, url: data.checkout_url });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: data.message || 'فشل استخراج رابط الدفع',
        details: data 
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('❌ EasyKash Error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}