import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // المفاتيح الجديدة المؤكدة من صورتك
    const PUBLIC_KEY = "gf8ueul7plkntb5r";
    const SECRET_KEY = "87ca3d5640dc3f5809d3dfbf4a5045ad";

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

    console.log("📡 Calling EasyKash API...");

    const response = await fetch('https://api.easykash.net/api/v1/checkout', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'authorization': SECRET_KEY 
      },
      body: JSON.stringify(payload),
      cache: 'no-store'
    });

    const responseText = await response.text();

    // التحقق من نوع الرد قبل محاولة تحويله لـ JSON
    if (responseText.trim().startsWith('<!DOCTYPE') || responseText.includes('<html')) {
      console.error("❌ Received HTML instead of JSON. Check API activation.");
      return NextResponse.json({ 
        success: false, 
        message: "بوابة الدفع ردت بصفحة HTML (ربما الحساب غير مفعل للـ API)",
        debug: responseText.substring(0, 150)
      }, { status: 500 });
    }

    const data = JSON.parse(responseText);
    
    if (data.status === 'success' && data.checkout_url) {
      return NextResponse.json({ success: true, url: data.checkout_url });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: data.message || "فشلت بوابة الدفع في تكوين الرابط",
        details: data 
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error("🔥 Server Bridge Error:", error.message);
    return NextResponse.json({ success: false, message: "خطأ داخلي في السيرفر: " + error.message }, { status: 500 });
  }
}