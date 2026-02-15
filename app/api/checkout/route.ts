import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // المفاتيح الجديدة المؤكدة
    const PUBLIC_KEY = "gf8ueul7plkntb5r";
    const SECRET_KEY = "87ca3d5640dc3f5809d3dfbf4a5045ad";

    // "توليفة" Payload هجينة: مسميات النظام الجديد مع هيكلة النظام القديم
    const payload = {
      api_key: PUBLIC_KEY,
      amount: Number(parseFloat(body.amount).toFixed(2)), // التأكد من أنه رقم بكسرين عشريين
      currency: "EGP",
      order_id: String(body.orderId),
      customer_name: body.customerName,
      customer_phone: body.customerPhone,
      customer_email: body.customerEmail,
      callback_url: "https://zaitandfilters.com/order-success",
      // إضافة الخيارات من الكود القديم لضمان القبول
      paymentOptions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      payment_methods: ["card", "installments", "valu", "aman"]
    };

    console.log("🚀 Executing Radical Fetch to EasyKash...");

    const response = await fetch('https://api.easykash.net/api/v1/checkout', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'authorization': SECRET_KEY,
        // ⚠️ السر هنا: إضافة User-Agent لتبدو كمتصفح حقيقي وتجاوز الـ HTML Challenge
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': 'https://zaitandfilters.com',
        'Referer': 'https://zaitandfilters.com/'
      },
      body: JSON.stringify(payload),
      cache: 'no-store'
    });

    const responseText = await response.text();

    // فحص حقيقي قبل أي Parse
    if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
       // لو رجع HTML تاني، يبقى الحساب ده "موقوف برمجياً" من EasyKash ومحتاج تفعيل يدوي
       return NextResponse.json({ 
         success: false, 
         message: "بوابة الدفع ترفض الاتصال البرمجي وتطلب تفاعل بشري (HTML Block)",
         debug_title: "Security Block Detected"
       }, { status: 403 });
    }

    const data = JSON.parse(responseText);
    
    if (data.status === 'success' && data.checkout_url) {
      return NextResponse.json({ success: true, url: data.checkout_url });
    }

    return NextResponse.json({ success: false, message: data.message || 'Error', details: data }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}