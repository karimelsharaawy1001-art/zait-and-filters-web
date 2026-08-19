// app/api/paymob-callback/route.ts
//
// Paymob redirects here after payment completes.
// Configure in your intention: redirection_url = https://zaitandfilters.com/order-success?orderId=...
//
// This handler just redirects to the order success page.
// The actual order update is done by the webhook (paymob-webhook).

import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const orderId = params.get('orderId') || params.get('merchant_order_id') || '';

  // Redirect to order success page
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://zaitandfilters.com';
  return NextResponse.redirect(`${siteUrl}/order-success?orderId=${orderId}`);
}

export async function POST(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const orderId = params.get('orderId') || params.get('merchant_order_id') || '';

  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://zaitandfilters.com';
  return NextResponse.redirect(`${siteUrl}/order-success?orderId=${orderId}`);
}
