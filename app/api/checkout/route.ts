import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // المفاتيح من صورتك
    const PUBLIC_API_KEY = "gf8ueul7plkntb5r";
    const HMAC_SECRET_KEY = "87ca3d5640dc3f5809d3dfbf4a5045ad";

    // بناء الـ Payload بنفس مسميات الكود القديم مع تعديل ما يلزم للـ API الجديد
    const payload = {
      api_key: PUBLIC_API_KEY, // الربط الجديد يحتاج المفتاح داخل الـ JSON
      amount: Number(body.amount),
      currency: "EGP",
      order_id: String(body.orderId),
      customer_name: body.customerName,
      customer_phone: body.customerPhone,
      customer_email: body.customerEmail,
      callback_url: "https://zaitandfilters.com/order-success",
      payment_methods: ["card", "installments", "valu", "aman"]
    };

    console.log('[EasyKash] Attempting Secure Connection...');

    // استخدام الرابط الرسمي مع الهيدر 'authorization' كما في كودك القديم
    const response = await fetch('https://api.easykash.net/api/v1/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'authorization': HMAC_SECRET_KEY // نفس طريقة الكود القديم
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    console.log('[EasyKash Raw Response]:', responseText);

    // لو الرد HTML (يعني لسه فيه مشكلة في المسار)
    if (responseText.trim().startsWith('<!DOCTYPE')) {
       return NextResponse.json({ 
         status: 'error', 
         message: 'Gateway returned HTML. Contact Support to enable API Checkout.' 
       }, { status: 500 });
    }

    const data = JSON.parse(responseText);

    // لو الرد نجح
    if (data.status === 'success' && data.checkout_url) {
      return NextResponse.json({ success: true, url: data.checkout_url });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: data.message || 'Error from gateway',
        details: data 
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('🔥 Fatal Fetch Error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}