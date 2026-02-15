import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // المفاتيح الخاصة بك من
    const PUBLIC_API_KEY = "gf8ueul7plkntb5r";
    const HMAC_SECRET_KEY = "87ca3d5640dc3f5809d3dfbf4a5045ad";

    // نضمن إن الـ api_key موجود في البيانات المرسلة
    body.api_key = PUBLIC_API_KEY;

    console.log("🚀 Sending authenticated request to EasyKash...");

    const response = await fetch('https://api.easykash.net/api/v1/checkout', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // إضافة السيكرت كي في الهيدر للتحقق من الهوية
        'Authorization': HMAC_SECRET_KEY 
      },
      body: JSON.stringify(body)
    });

    const responseText = await response.text();
    
    try {
      const data = JSON.parse(responseText);
      return NextResponse.json(data);
    } catch (e) {
      console.error("❌ EasyKash Error Page Content:", responseText);
      return NextResponse.json({ 
        status: 'error', 
        message: 'بوابة الدفع رفضت الطلب أمنياً. تأكد من تطابق الـ Keys.',
        debug: responseText.substring(0, 300)
      }, { status: response.status });
    }

  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}