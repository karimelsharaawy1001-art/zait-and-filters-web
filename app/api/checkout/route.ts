import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // المفاتيح الجديدة والوحيدة من صورتك
    const PUBLIC_KEY = "gf8ueul7plkntb5r"; 
    const SECRET_KEY = "87ca3d5640dc3f5809d3dfbf4a5045ad";

    // بناء الـ Payload بنفس منطق الكود القديم بس بالمسميات اللي الحساب الجديد بيفهمها
    const payload = {
      api_key: PUBLIC_KEY,
      amount: Number(body.amount),
      currency: "EGP",
      order_id: String(body.orderId),
      customer_name: body.customerName,
      customer_phone: body.customerPhone,
      customer_email: body.customerEmail,
      callback_url: "https://zaitandfilters.com/order-success", //
      payment_methods: ["card", "installments", "valu", "aman"]
    };

    console.log('[EasyKash] Connecting using Legacy-Header style with NEW Keys...');

    // الرابط ده هو الـ fallback الرسمي لما api.easykash.net يفشل
    const response = await fetch('https://api.easykash.net/api/v1/checkout', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'authorization': SECRET_KEY // استخدام المفتاح الجديد هنا للتوثيق
      },
      body: JSON.stringify(payload),
      cache: 'no-store'
    });

    const responseText = await response.text();

    try {
      const data = JSON.parse(responseText);
      if (data.status === 'success' && data.checkout_url) {
        return NextResponse.json({ success: true, url: data.checkout_url });
      }
      return NextResponse.json({ success: false, message: data.message || 'Error from EasyKash', details: data }, { status: 400 });
    } catch (e) {
      // لو لسه السيرفر بيرد بـ HTML (أيرور <)
      console.error("Non-JSON Response received:", responseText);
      return NextResponse.json({ 
        success: false, 
        message: 'The gateway returned HTML instead of data. This is a DNS or Activation issue.',
        debug: responseText.substring(0, 300) 
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('🔥 Fatal Fetch Error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}