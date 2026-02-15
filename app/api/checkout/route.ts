import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // المفاتيح الجديدة من صورتك
    const PUBLIC_KEY = "gf8ueul7plkntb5r";
    const SECRET_KEY = "87ca3d5640dc3f5809d3dfbf4a5045ad";

    // بناء الـ Payload بناءً على طلبك اللي ظهر في اللوجات
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

    console.log('[EasyKash] Initializing Payment using Legacy Logic + New Keys...');

    // استخدام axios ونفس الهيدر من كودك القديم
    const response = await axios.post('https://api.easykash.net/api/v1/checkout', payload, {
      headers: {
        'authorization': SECRET_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 10000 // مهلة 10 ثوانٍ
    });

    const data = response.data;
    console.log('[EasyKash Response]:', JSON.stringify(data));

    // استخراج الرابط كما في النظام الجديد
    if (data.status === 'success' && data.checkout_url) {
      return NextResponse.json({ success: true, url: data.checkout_url });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: data.message || 'فشل استخراج رابط الدفع',
        details: data 
      }, { status: 400 });
    }

  } catch (error: any) {
    // لو الرد HTML (اللي بيعمل أيرور <) هنمسكه هنا
    const errorData = error.response?.data;
    console.error('❌ EasyKash Error:', errorData || error.message);
    
    return NextResponse.json({ 
      success: false, 
      error: 'خطأ في الاتصال ببوابة الدفع',
      details: errorData || error.message
    }, { status: error.response?.status || 500 });
  }
}