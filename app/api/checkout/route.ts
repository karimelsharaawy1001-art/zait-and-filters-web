import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // المفاتيح الجديدة من صورتك
    const PUBLIC_KEY = "gf8ueul7plkntb5r";
    const SECRET_KEY = "87ca3d5640dc3f5809d3dfbf4a5045ad";

    // بناء الـ Payload بنفس مسميات طلبك القديم الناجح
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

    console.log('[EasyKash] Sending payload to checkout v1 endpoint...');

    // الرابط المخصص للمفاتيح الجديدة مع استخدام الهيدر authorization كما طلبت
    const response = await fetch('https://api.easykash.net/api/v1/checkout', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'authorization': SECRET_KEY 
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
      return NextResponse.json({ success: false, message: 'Invalid Response from Gateway', debug: responseText.substring(0, 100) }, { status: 500 });
    }

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}