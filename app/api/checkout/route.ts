import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // المفاتيح الجديدة الخاصة بك
    const HMAC_SECRET_KEY = "87ca3d5640dc3f5809d3dfbf4a5045ad";

    // بناء الـ Payload بناءً على منطق "DirectPay API v1" الناجح
    const payload = {
      amount: Number(parseFloat(body.amount).toFixed(2)),
      currency: "EGP",
      paymentOptions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      cashExpiry: 24,
      name: (body.customer_name || "Customer").substring(0, 50),
      email: body.customer_email || "customer@zaitandfilters.com",
      mobile: body.customer_phone || "01000000000",
      redirectUrl: body.callback_url || "https://zaitandfilters.com/order-success",
      customerReference: String(body.order_id)
    };

    console.log('[EasyKash Request] Initializing DirectPay v1...');

    // استخدام الرابط من المشروع الناجح
    const response = await fetch('https://back.easykash.net/api/directpayv1/pay', {
      method: 'POST',
      headers: {
        'authorization': HMAC_SECRET_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    console.log('[EasyKash Response Content]:', responseText);

    try {
      const data = JSON.parse(responseText);
      
      // استخراج رابط الدفع كما في الكود المرفق
      let paymentUrl = data?.redirectUrl || data?.url || (typeof data === 'string' && data.startsWith('http') ? data : null);

      if (paymentUrl) {
        // تنظيف الرابط من أي double slashes زائدة
        paymentUrl = paymentUrl.replace(/([^:])\/\//g, '$1/');
        return NextResponse.json({ success: true, checkout_url: paymentUrl });
      } else {
        return NextResponse.json({ 
          status: 'error', 
          message: 'لم يتم العثور على رابط الدفع في الرد',
          details: data 
        }, { status: 400 });
      }
    } catch (parseError) {
      return NextResponse.json({ 
        status: 'error', 
        message: 'رد غير متوقع من السيرفر', 
        debug: responseText.substring(0, 200) 
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('❌ EasyKash DirectPay Error:', error.message);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}