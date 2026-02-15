import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // NEW HMAC Secret Key used as the "Authorization" header
    const SECRET_KEY = "87ca3d5640dc3f5809d3dfbf4a5045ad";

    const parsedAmount = parseFloat(body.amount) || 0;

    // EXACT payload structure from your working reference code
    const payload = {
      amount: Number(parsedAmount.toFixed(2)),
      currency: "EGP",
      paymentOptions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      cashExpiry: 24,
      name: (body.customerName || "Customer").substring(0, 50),
      email: body.customerEmail || "customer@zaitandfilters.com",
      mobile: body.customerPhone || "01000000000",
      redirectUrl: "https://zaitandfilters.com/order-success", //
      customerReference: String(body.orderId)
    };

    console.log('[EasyKash] Calling Legacy Endpoint with NEW Keys...');

    // Using the EXACT endpoint from your working code to bypass DNS ENOTFOUND errors
    const response = await axios.post('https://back.easykash.net/api/directpayv1/pay', payload, {
      headers: {
        'authorization': SECRET_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 8000
    });

    const data = response.data;
    console.log('[EasyKash Response]:', JSON.stringify(data));

    // Logic to extract URL exactly as your working code did
    let paymentUrl = data?.redirectUrl || data?.url || (typeof data === 'string' && data.startsWith('http') ? data : null);

    if (paymentUrl) {
      // Fix double slashes as per your reference code
      paymentUrl = paymentUrl.replace(/([^:])\/\//g, '$1/');

      return NextResponse.json({
        success: true,
        url: paymentUrl
      });
    } else {
      throw new Error("No URL returned from EasyKash");
    }

  } catch (error: any) {
    const errorData = error.response?.data;
    console.error('❌ Gateway Error:', errorData || error.message);
    return NextResponse.json({ 
      success: false, 
      message: errorData?.message || error.message 
    }, { status: error.response?.status || 500 });
  }
}