import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // المفاتيح الجديدة من صورتك
    const PUBLIC_KEY = "gf8ueul7plkntb5r"; 
    const SECRET_KEY = "87ca3d5640dc3f5809d3dfbf4a5045ad";

    // بناء الـ Payload بنفس مسميات المشروع القديم مع تعديل حقل المفتاح
    const payload = {
      api_key: PUBLIC_KEY, // المفتاح العام هنا
      amount: Number(body.amount),
      currency: "EGP",
      order_id: String(body.orderId),
      customer_name: body.customerName,
      customer_phone: body.customerPhone,
      customer_email: body.customerEmail,
      callback_url: "https://zaitandfilters.com/order-success",
      payment_methods: ["card", "installments", "valu", "aman"]
    };

    console.log('[EasyKash] Initializing with NEW Keys from screenshot...');

    // استخدام الرابط الرسمي المخصص للمفاتيح الجديدة
    const response = await fetch('https://api.easykash.net/api/v1/checkout', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'authorization': SECRET_KEY // المفتاح السري هنا للتوثيق
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    console.log('[EasyKash Response Raw]:', responseText);

    try {
      const data = JSON.parse(responseText);
      // التحقق من نجاح العملية واستخراج الرابط
      if (data.status === 'success' && data.checkout_url) {
        return NextResponse.json({ success: true, url: data.checkout_url });
      } else {
        return NextResponse.json({ 
          success: false, 
          message: data.message || 'فشل استخراج رابط الدفع',
          details: data 
        }, { status: 400 });
      }
    } catch (e) {
      // لو الرد HTML (اللي كان بيعمل مشكلة <)
      console.error("Non-JSON Response received:", responseText);
      return NextResponse.json({ 
        success: false, 
        message: 'السيرفر رد بصفحة خطأ HTML',
        debug: responseText.substring(0, 200) 
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('🔥 Fatal Error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}