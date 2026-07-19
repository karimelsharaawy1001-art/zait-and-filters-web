import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function makeAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Keep the last 10 digits so 010..., +2010..., 0020... all compare equal
const normalizePhone = (p: string) => (p || '').replace(/\D/g, '').slice(-10);

export async function POST(req: Request) {
  try {
    const { orderId, phone, newNumber } = await req.json();

    if (!orderId || !phone || !newNumber) {
      return NextResponse.json({ error: 'orderId, phone and newNumber are required' }, { status: 400 });
    }

    const cleanNew = String(newNumber).replace(/\s/g, '');
    if (normalizePhone(cleanNew).length < 10) {
      return NextResponse.json({ error: 'رقم واتساب غير صحيح' }, { status: 400 });
    }

    const db = makeAdmin();

    // Verify the order exists and the requester owns it (phone must match the order)
    const { data: order, error: fetchErr } = await db
      .from('orders')
      .select('id, customer_phone, status')
      .eq('id', orderId)
      .single();

    if (fetchErr || !order) {
      return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });
    }
    if (normalizePhone(order.customer_phone) !== normalizePhone(phone)) {
      return NextResponse.json({ error: 'رقم الموبايل لا يطابق هذا الطلب' }, { status: 403 });
    }

    const { error: updErr } = await db
      .from('orders')
      .update({
        new_whatsapp_number: cleanNew,
        whatsapp_reactivation_requested: true,
        whatsapp_reactivation_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updErr) {
      // Most likely the migration (013) hasn't been applied yet
      console.error('whatsapp-reactivation update failed:', updErr.message);
      return NextResponse.json({ error: 'تعذّر حفظ الرقم، حاول لاحقًا' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('whatsapp-reactivation error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
