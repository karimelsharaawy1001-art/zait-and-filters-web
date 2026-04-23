import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const userId = searchParams.get('user_id') || '';

    // ── Single user transactions (statement) ────────────────────────────────
    if (userId) {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ transactions: data ?? [] });
    }

    // ── All wallets with profile info ───────────────────────────────────────
    const { data: wallets, error: walletsError } = await supabase
      .from('wallets')
      .select('user_id, balance');

    if (walletsError) {
      return NextResponse.json({ error: walletsError.message }, { status: 500 });
    }

    if (!wallets || wallets.length === 0) {
      return NextResponse.json({ wallets: [] });
    }

    const userIds = wallets.map((w: any) => w.user_id);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, phone_number, email')
      .in('id', userIds);

    const profileMap: Record<string, any> = {};
    (profiles ?? []).forEach((p: any) => {
      profileMap[p.id] = p;
    });

    let merged = wallets.map((w: any) => ({
      user_id:      w.user_id,
      balance:      w.balance ?? 0,
      full_name:    profileMap[w.user_id]?.full_name    || '—',
      phone_number: profileMap[w.user_id]?.phone_number || '—',
      email:        profileMap[w.user_id]?.email        || '—',
    }));

    // Search filter
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      merged = merged.filter((w: any) =>
        w.full_name.toLowerCase().includes(q) ||
        w.phone_number.includes(q) ||
        w.email.toLowerCase().includes(q)
      );
    }

    // Sort by balance desc
    merged.sort((a: any, b: any) => b.balance - a.balance);

    return NextResponse.json({ wallets: merged });

  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'خطأ غير متوقع' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, amount, type, description, admin_note } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'user_id مطلوب' }, { status: 400 });
    }
    if (amount === undefined || amount === null || amount === 0) {
      return NextResponse.json({ error: 'المبلغ لا يمكن أن يكون صفراً' }, { status: 400 });
    }
    if (!description?.trim()) {
      return NextResponse.json({ error: 'السبب مطلوب' }, { status: 400 });
    }

    // Get current balance
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', user_id)
      .maybeSingle();

    const currentBalance: number = wallet?.balance ?? 0;
    const newBalance = Math.max(0, currentBalance + Number(amount));

    // Upsert wallet balance
    const { error: walletError } = await supabase
      .from('wallets')
      .upsert(
        { user_id, balance: newBalance },
        { onConflict: 'user_id' }
      );

    if (walletError) {
      return NextResponse.json({ error: walletError.message }, { status: 500 });
    }

    // Insert transaction record
    const { error: txError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id,
        amount:        Number(amount),
        type:          type ?? (Number(amount) > 0 ? 'adjustment' : 'deduction'),
        description:   description.trim(),
        admin_note:    admin_note?.trim() || null,
        balance_after: newBalance,
      });

    if (txError) {
      return NextResponse.json({ error: txError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, new_balance: newBalance });

  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'خطأ غير متوقع' }, { status: 500 });
  }
}