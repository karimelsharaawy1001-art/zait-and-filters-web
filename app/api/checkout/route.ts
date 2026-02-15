import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Your Keys from
    const PUBLIC_KEY = "gf8ueul7plkntb5r";
    const SECRET_KEY = "87ca3d5640dc3f5809d3dfbf4a5045ad";

    // Inject the public key into the request body
    body.api_key = PUBLIC_KEY;

    // Use the official API endpoint (NOT www)
    const response = await fetch('https://api.easykash.net/api/v1/checkout', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // EasyKash often requires the Secret Key in the Authorization header
        'Authorization': SECRET_KEY 
      },
      body: JSON.stringify(body)
    });

    // Capture the response as text first to prevent the "<" SyntaxError
    const responseText = await response.text();

    try {
      const data = JSON.parse(responseText);
      console.log("EasyKash Response:", data);
      return NextResponse.json(data);
    } catch (parseError) {
      // If we reach here, EasyKash returned an HTML error page
      console.error("EasyKash returned HTML instead of JSON:", responseText);
      return NextResponse.json({ 
        status: 'error', 
        message: 'The payment gateway returned an error page. Please check your account settings.',
        debug: responseText.substring(0, 200) 
      }, { status: response.status });
    }

  } catch (error: any) {
    console.error("Internal Server Error:", error.message);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}