import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Using your keys verified from
    const PUBLIC_KEY = "gf8ueul7plkntb5r";
    const SECRET_KEY = "87ca3d5640dc3f5809d3dfbf4a5045ad";

    const payload = {
      ...body,
      api_key: PUBLIC_KEY,
      amount: Number(body.amount)
    };

    // This is the most likely official endpoint based on their dashboard structure
    const targetUrl = 'https://www.easykash.net/api/v1/checkout';

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': SECRET_KEY 
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();

    // IF IT FAILS, LOG THE ACTUAL HTML PAGE TO VERCEL CONSOLE
    if (!response.ok || !responseText.trim().startsWith('{')) {
      console.error(`❌ Gateway Error (${response.status}):`, responseText);
      return NextResponse.json({ 
        status: 'error', 
        message: 'The gateway returned a webpage instead of data. Check Vercel logs for the full text.',
        preview: responseText.substring(0, 500) // Shows the beginning of the HTML
      }, { status: response.status });
    }

    return NextResponse.json(JSON.parse(responseText));

  } catch (error: any) {
    console.error("🔥 System Fetch Error:", error.message);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}