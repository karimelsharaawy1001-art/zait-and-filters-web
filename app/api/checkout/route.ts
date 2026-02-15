import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Using both keys provided in
    const PUBLIC_KEY = "gf8ueul7plkntb5r";
    const HMAC_SECRET = "87ca3d5640dc3f5809d3dfbf4a5045ad";

    // EasyKash expects the Public Key in the body
    body.api_key = PUBLIC_KEY;

    // We use .io here - this is the official API endpoint
    const response = await fetch('https://api.easykash.io/api/v1/checkout', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // Some versions of EasyKash require the Secret Key in the header
        'Authorization': HMAC_SECRET 
      },
      body: JSON.stringify(body)
    });

    const responseText = await response.text();

    try {
      // If this works, the URL was correct and the keys are valid
      const data = JSON.parse(responseText);
      return NextResponse.json(data);
    } catch (err) {
      // If we get HTML (the "<" error), we log the actual HTML to the console
      console.error("Gateway returned HTML. Content:", responseText.substring(0, 500));
      return NextResponse.json({ 
        status: 'error', 
        message: 'The gateway returned an HTML error. Check the server logs for the full page text.',
        debug_html: responseText.substring(0, 300)
      }, { status: response.status });
    }

  } catch (error: any) {
    console.error("Fetch Execution Failed:", error.message);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}