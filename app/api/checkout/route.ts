import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Your NEW keys from the screenshot
    const PUBLIC_KEY = "gf8ueul7plkntb5r";
    const SECRET_KEY = "87ca3d5640dc3f5809d3dfbf4a5045ad";

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

    console.log("🚀 Executing Axios request to EasyKash v1...");

    // Using axios with a User-Agent to bypass HTML security challenges
    const response = await axios.post('https://api.easykash.net/api/v1/checkout', payload, {
      headers: {
        'authorization': SECRET_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
      },
      timeout: 15000
    });

    const data = response.data;
    
    if (data.status === 'success' && data.checkout_url) {
      return NextResponse.json({ success: true, url: data.checkout_url });
    }
    
    return NextResponse.json({ success: false, message: data.message || 'Gateway error' }, { status: 400 });

  } catch (error: any) {
    const errorData = error.response?.data;
    console.error("🔥 Axios Bridge Failure:", errorData || error.message);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      details: errorData 
    }, { status: 500 });
  }
}