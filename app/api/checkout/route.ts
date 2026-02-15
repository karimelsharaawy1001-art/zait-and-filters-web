import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // EasyKash Credentials
    const API_KEY = "gf8ueul7plkntb5r";
    const HMAC_SECRET = "87ca3d5640dc3f5809d3dfbf4a5045ad";

    const parsedAmount = parseFloat(body.amount) || 0;

    // Validate phone number (Egyptian format)
    const mobile = (body.customerPhone || "01000000000").replace(/\s/g, '');
    if (!mobile.match(/^01[0-9]{9}$/)) {
      return NextResponse.json({ 
        success: false, 
        message: 'رقم الموبايل غير صحيح' 
      }, { status: 400 });
    }

    // EasyKash payload structure
    const payload = {
      amount: Number(parsedAmount.toFixed(2)),
      currency: "EGP",
      paymentOptions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      cashExpiry: 24,
      name: (body.customerName || "Customer").substring(0, 50),
      email: body.customerEmail || "customer@zaitandfilters.com",
      mobile: mobile,
      redirectUrl: "https://zaitandfilters.com/order-success",
      customerReference: String(body.orderId)
    };

    console.log('[EasyKash] Request Payload:', JSON.stringify(payload, null, 2));
    console.log('[EasyKash] Using API Key:', API_KEY.substring(0, 8) + '...');

    // Call EasyKash API with CORRECT authentication
    const response = await axios.post(
      'https://back.easykash.net/api/directpayv1/pay', 
      payload, 
      {
        headers: {
          'apikey': API_KEY,           // ← API Key header
          'authorization': HMAC_SECRET, // ← HMAC Secret header
          'Content-Type': 'application/json'
        },
        timeout: 15000 // Increased timeout
      }
    );

    const data = response.data;
    console.log('[EasyKash] Response:', JSON.stringify(data, null, 2));

    // Extract payment URL from response
    let paymentUrl = data?.redirectUrl || data?.url || data?.paymentUrl;

    // Handle if response is a direct string URL
    if (!paymentUrl && typeof data === 'string' && data.startsWith('http')) {
      paymentUrl = data;
    }

    if (paymentUrl) {
      // Clean up URL (remove double slashes)
      paymentUrl = paymentUrl.replace(/([^:])\/\//g, '$1/');

      console.log('[EasyKash] Payment URL:', paymentUrl);

      return NextResponse.json({
        success: true,
        url: paymentUrl
      });
    } else {
      console.error('[EasyKash] No URL in response:', data);
      throw new Error("No payment URL returned from EasyKash");
    }

  } catch (error: any) {
    // Enhanced error handling
    if (error.code === 'ECONNABORTED') {
      console.error('❌ Timeout Error: EasyKash took too long to respond');
      return NextResponse.json({ 
        success: false, 
        message: 'انتهت مهلة الاتصال ببوابة الدفع. حاول مرة أخرى.' 
      }, { status: 408 });
    }

    if (error.code === 'ENOTFOUND') {
      console.error('❌ DNS Error: Cannot reach EasyKash servers');
      return NextResponse.json({ 
        success: false, 
        message: 'لا يمكن الوصول لبوابة الدفع. تحقق من الاتصال بالإنترنت.' 
      }, { status: 503 });
    }

    const errorData = error.response?.data;
    const errorStatus = error.response?.status;
    
    console.error('❌ EasyKash Error:', {
      status: errorStatus,
      data: errorData,
      message: error.message,
      fullError: error
    });

    return NextResponse.json({ 
      success: false, 
      message: errorData?.message || error.message || 'حدث خطأ في بوابة الدفع',
      details: errorData
    }, { status: errorStatus || 500 });
  }
}
