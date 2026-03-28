// app/api/wallet/apply/route.ts
// Validates user has enough balance and returns the applicable discount
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'غير مسجل الدخول' }, { status: 401 });

    const { amountToUse, orderTotal } = await req.json();
    if (!amountToUse || amountToUse <= 0) return NextResponse.json({ error: 'مبلغ غير صحيح' }, { status: 400 });

    const { data: wallet } = await supabase
      .from('wallets').select('balance').eq('user_id', user.id).single();

    const balance = wallet?.balance ?? 0;
    if (balance <= 0) return NextResponse.json({ error: 'رصيد المحفظة صفر' }, { status: 400 });

    // Can't use more than the wallet has OR more than 50% of order total
    const maxAllowed = Math.min(balance, orderTotal * 0.5);
    const applied = Math.min(amountToUse, maxAllowed);

    return NextResponse.json({ applied: parseFloat(applied.toFixed(2)), balance });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}