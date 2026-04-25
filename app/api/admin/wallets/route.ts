// app/api/admin/wallets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── GET — list all wallets with profile info ─────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams.get('search') || '';
    const userId = req.nextUrl.searchParams.get('user_id') || '';

    // If fetching a single user's transactions
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

      // Always return an array so the UI can safely .map() without crashing
      return NextResponse.json({ transactions: data || [] });
    }

    // Otherwise list all wallets joined with profiles
    const { data: wallets, error: wErr } = await supabase
      .from('wallets')
      .select('user_id, balance');

    if (wErr) {
      return NextResponse.json({ error: wErr.message }, { status: 500 });
    }

    if (!wallets || wallets.length === 0) {
      return NextResponse.json({ wallets: [] });
    }

    const userIds = wallets.map(w => w.user_id);

    // Fetch profiles for those user IDs
    const { data: profiles, error: pErr } = await supabase
      .from('profiles')
      .select('id, full_name, phone_number, email')
      .in('id', userIds);

    if (pErr) {
      return NextResponse.json({ error: pErr.message }, { status: 500 });
    }

    // Build profile lookup map
    const profileMap: Record<string, any> = {};
    (profiles || []).forEach(p => {
      profileMap[p.id] = p;
    });

    let merged = wallets.map(w => ({
      user_id: w.user_id,
      balance: w.balance ?? 0,
      full_name: profileMap[w.user_id]?.full_name || '—',
      phone_number: profileMap[w.user_id]?.phone_number || '—',
      email: profileMap[w.user_id]?.email || '—',
    }));

    // Apply search filter
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      merged = merged.filter(w =>
        w.full_name.toLowerCase().includes(q) ||
        w.phone_number.includes(q) ||
        w.email.toLowerCase().includes(q)
      );
    }

    // Sort by balance desc
    merged.sort((a, b) => b.balance - a.balance);

    return NextResponse.json({ wallets: merged });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── POST — adjust wallet balance ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, amount, type, description } = body;

    // Validate required fields
    if (!user_id) {
      return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400 });
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount === 0) {
      return NextResponse.json(
        { error: 'المبلغ مطلوب ويجب ألا يكون صفراً' },
        { status: 400 }
      );
    }

    if (!description?.trim()) {
      return NextResponse.json({ error: 'السبب مطلوب' }, { status: 400 });
    }

    // Get current balance (wallet might not exist yet)
    const { data: wallet, error: walletSelectErr } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', user_id)
      .single();

    // PGRST116 = no rows returned, which is fine — we'll create the wallet
    if (walletSelectErr && walletSelectErr.code !== 'PGRST116') {
      throw walletSelectErr;
    }

    const currentBalance = wallet?.balance ?? 0;
    const newBalance = Math.max(0, currentBalance + numericAmount);

    // Update wallet balance
    const { error: walletErr } = await supabase
      .from('wallets')
      .upsert({ user_id, balance: newBalance }, { onConflict: 'user_id' });

    if (walletErr) throw walletErr;

    // Insert transaction record
    // NOTE: admin_note was removed because that column does not exist in your
    //       current Supabase schema. If you add it later, you can pass it back in.
    const { error: txErr } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id,
        amount: numericAmount,
        type: type || (numericAmount > 0 ? 'adjustment' : 'deduction'),
        description: description.trim(),
        balance_after: newBalance,
      });

    if (txErr) throw txErr;

    return NextResponse.json({ success: true, new_balance: newBalance });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}