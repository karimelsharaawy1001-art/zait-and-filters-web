// app/api/wallet/apply/route.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'غير مسجل الدخول' }, { status: 401 });

    const { amountToUse, orderTotal } = await req.json();
    if (!amountToUse || amountToUse <= 0)
      return NextResponse.json({ error: 'مبلغ غير صحيح' }, { status: 400 });

    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    const balance = wallet?.balance ?? 0;
    if (balance <= 0)
      return NextResponse.json({ error: 'رصيد المحفظة صفر' }, { status: 400 });

    // Max: wallet balance OR 75% of order total — whichever is less
    const maxAllowed = Math.min(balance, orderTotal * 0.75);
    const applied = Math.min(amountToUse, maxAllowed);

    return NextResponse.json({ applied: parseFloat(applied.toFixed(2)), balance });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}