import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // ✅ ONLY use HMAC Secret Key (from your working code pattern)
    const HMAC_SECRET = "87ca3d564d0dc3f5809d3dfbf4a5045ad";

    const parsedAmount = parseFloat(body.amount) || 0;

    // Validate phone number (Egyptian format)
    const mobile = (body.customerPhone || "01000000000").replace(/\s/g, '');
    if (!mobile.match(/^01[0-9]{9}$/)) {
      return NextResponse.json({ 
        success: false, 
        message: 'رقم الموبايل غير صحيح' 
      }, { status: 400 });
    }

    // EXACT payload structure from working code
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
    console.log('[EasyKash] Using HMAC Secret (first 8 chars):', HMAC_SECRET.substring(0, 8) + '...');

    // ✅ EXACT endpoint and headers from working code
    const response = await axios.post(
      'https://back.easykash.net/api/directpayv1/pay', 
      payload, 
      {
        headers: {
          'authorization': HMAC_SECRET,  // ← ONLY THIS ONE!
          'Content-Type': 'application/json'
        },
        timeout: 7000  // Match your working code's timeout
      }
    );

    const data = response.data;
    console.log('[EasyKash] Response:', JSON.stringify(data, null, 2));

    // Extract payment URL (matching your working code logic)
    let paymentUrl = data?.redirectUrl || data?.url || (typeof data === 'string' && data.startsWith('http') ? data : null);

    if (paymentUrl) {
      // Fix double slashes (from your working code)
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
    // Enhanced error handling (matching your working code)
    const errorData = error.response?.data;
    const errorStatus = error.response?.status || 500;
    
    console.error('❌ EasyKash Error:', {
      status: errorStatus,
      data: errorData,
      message: error.message
    });

    // Friendly error message
    let friendlyMessage = "Failed to initialize payment gateway.";
    if (errorData) {
      if (typeof errorData === 'string') friendlyMessage += ` Detail: ${errorData}`;
      else if (errorData.message) friendlyMessage += ` Detail: ${errorData.message}`;
      else friendlyMessage += ` Detail: ${JSON.stringify(errorData)}`;
    } else {
      friendlyMessage += ` ${error.message}`;
    }

    return NextResponse.json({ 
      success: false, 
      message: friendlyMessage,
      details: errorData
    }, { status: errorStatus });
  }
}
