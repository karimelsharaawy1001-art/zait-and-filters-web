import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // المفاتيح الجديدة المؤكدة
    const PUBLIC_KEY = "gf8ueul7plkntb5r";
    const SECRET_KEY = "87ca3d5640dc3f5809d3dfbf4a5045ad";

    // بناء الـ Payload بنفس مسميات النظام القديم الناجح
    const payload = {
      api_key: PUBLIC_KEY,
      amount: Number(parseFloat(body.amount).toFixed(2)),
      currency: "EGP",
      order_id: String(body.orderId),
      customer_name: body.customerName,
      customer_phone: body.customerPhone,
      customer_email: body.customerEmail,
      callback_url: "https://zaitandfilters.com/order-success",
      payment_methods: ["card", "installments", "valu", "aman"]
    };

    console.log("🚀 Calling EasyKash via Axios...");

    // استخدام axios مع الروابط الجديدة لضمان استقرار الاتصال
    const response = await axios.post('https://api.easykash.net/api/v1/checkout', payload, {
      headers: {
        'authorization': SECRET_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 10000 // مهلة 10 ثوانٍ للرد
    });

    const data = response.data;
    console.log("✅ Gateway Response:", JSON.stringify(data));

    if (data.status === 'success' && data.checkout_url) {
      return NextResponse.json({ success: true, url: data.checkout_url });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: data.message || "فشل استخراج رابط الدفع",
        details: data 
      }, { status: 400 });
    }

  } catch (error: any) {
    // التقاط أخطاء axios بشكل دقيق (مثل ردود الـ HTML)
    const errorData = error.response?.data;
    console.error("🔥 Axios Error:", errorData || error.message);
    
    return NextResponse.json({ 
      success: false, 
      message: "خطأ في الاتصال بالبوابة",
      details: typeof errorData === 'string' && errorData.startsWith('<') ? "Gateway returned HTML Error" : errorData
    }, { status: error.response?.status || 500 });
  }
}