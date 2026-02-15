import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // تسجيل البيانات المرسلة للتأكد من سلامتها في الـ Logs
    console.log("Sending to EasyKash:", body);

    const response = await fetch('https://api.easykash.net/api/v1/checkout', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    // تسجيل رد فعل سيرفر EasyKash لمعرفة سبب الرفض إن وجد
    console.log("EasyKash Server Response:", data);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Payment Bridge Error:", error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'فشل الاتصال بسيرفر الدفع',
        details: error.message 
      }, 
      { status: 500 }
    );
  }
}