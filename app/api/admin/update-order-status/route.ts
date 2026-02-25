import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: Request) {
  try {
    const { orderId, newStatus } = await req.json();

    if (!orderId || !newStatus) {
      return NextResponse.json({ error: 'orderId and newStatus are required' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Update order status
    const { error: orderError } = await supabaseAdmin
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (orderError) throw orderError;

    // If delivered, update affiliate commission dates
    if (newStatus === 'delivered') {
      const deliveryDate = new Date().toISOString();
      const releaseDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      await supabaseAdmin
        .from('affiliate_commissions')
        .update({ delivery_date: deliveryDate, release_date: releaseDate })
        .eq('order_id', orderId);
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('update-order-status error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}