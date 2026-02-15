import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = await req.json();
  const PUBLIC_KEY = "gf8ueul7plkntb5r";
  const SECRET_KEY = "87ca3d5640dc3f5809d3dfbf4a5045ad";

  // Ensure types are exactly what gateways expect
  const payload = {
    ...body,
    api_key: PUBLIC_KEY,
    amount: Number(body.amount), // Must be a number
    order_id: String(body.order_id) // Must be a string
  };

  // Possible EasyKash endpoints (DNS varies by region/provider)
  const endpoints = [
    'https://api.easykash.net/api/v1/checkout',
    'https://api.easykash.io/api/v1/checkout',
    'https://easykash.net/api/v1/checkout' // No 'api' subdomain fallback
  ];

  for (const url of endpoints) {
    try {
      console.log(`📡 Trying endpoint: ${url}`);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': SECRET_KEY 
        },
        body: JSON.stringify(payload),
        cache: 'no-store'
      });

      const text = await response.text();
      
      // If we got JSON, we are successful!
      if (text.trim().startsWith('{')) {
        const data = JSON.parse(text);
        console.log(`✅ Success with: ${url}`);
        return NextResponse.json(data);
      } 
      
      console.warn(`⚠️ Endpoint ${url} returned HTML instead of JSON.`);
    } catch (err: any) {
      console.error(`❌ Endpoint ${url} failed: ${err.message}`);
    }
  }

  // If all failed, we return a detailed debug report
  return NextResponse.json({ 
    status: 'error', 
    message: 'All EasyKash endpoints failed or returned HTML. This usually means your account is not activated for API access or your keys are wrong.',
    technical_check: 'Check Vercel Server Logs for "Raw Response" to see the HTML error message.'
  }, { status: 500 });
}