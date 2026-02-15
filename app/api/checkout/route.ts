import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // المفاتيح الجديدة والوحيدة من لوحة تحكمك
    const PUBLIC_KEY = "gf8ueul7plkntb5r";
    const SECRET_KEY = "87ca3d5640dc3f5809d3dfbf4a5045ad";

    // بناء الـ Payload بمسميات الحقول الصحيحة للنظام الجديد
    const payload = {
      api_key: PUBLIC_KEY, // المفتاح العام هنا
      amount: Number(body.amount),
      currency: "EGP",
      order_id: String(body.orderId),
      customer_name: body.customerName,
      customer_phone: body.customerPhone,
      customer_email: body.customerEmail,
      callback_url: "https://zaitandfilters.com/order-success", //
      payment_methods: ["card", "installments", "valu", "aman"]
    };

    console.log('[EasyKash] Initializing with NEW Keys and Official Endpoint...');

    // الرابط الرسمي لنظام Checkout v1 المخصص لمفاتيحك
    const response = await fetch('https://api.easykash.net/api/v1/checkout', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'authorization': SECRET_KEY // المفتاح السري هنا كما طلبت
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    console.log('[EasyKash Raw Response]:', responseText);

    try {
      const data = JSON.parse(responseText);
      if (data.status === 'success' && data.checkout_url) {
        return NextResponse.json({ success: true, url: data.checkout_url });
      }
      return NextResponse.json({ success: false, message: data.message || 'Error from Gateway' }, { status: 400 });
    } catch (e) {
      return NextResponse.json({ 
        success: false, 
        message: 'السيرفر رد بصفحة HTML. تأكد من تفعيل الحساب للـ API.',
        debug: responseText.substring(0, 100) 
      }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}