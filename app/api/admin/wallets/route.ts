// app/api/admin/wallets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── GET — list all wallets with profile info ─────────────────────────────────
export async function GET(req: NextRequest) {
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
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ transactions: data });
  }

  // Otherwise list all wallets joined with profiles
  const { data: wallets, error: wErr } = await supabase
    .from('wallets')
    .select('user_id, balance');
  if (wErr) return NextResponse.json({ error: wErr.message }, { status: 500 });

  if (!wallets || wallets.length === 0)
    return NextResponse.json({ wallets: [] });

  const userIds = wallets.map(w => w.user_id);

  // Fetch profiles for those user IDs
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, phone_number, email')
    .in('id', userIds);

  // Fetch auth emails as fallback (profiles may not have email col)
  // We'll rely on profiles only — merge by id
  const profileMap: Record<string, any> = {};
  (profiles || []).forEach(p => { profileMap[p.id] = p; });

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
}

// ── POST — adjust wallet balance ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { user_id, amount, type, description, admin_note } = await req.json();

    if (!user_id || amount === undefined || amount === 0)
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });
    if (!description?.trim())
      return NextResponse.json({ error: 'السبب مطلوب' }, { status: 400 });

    // Get current balance (upsert if doesn't exist)
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', user_id)
      .single();

    const currentBalance = wallet?.balance ?? 0;
    const newBalance = Math.max(0, currentBalance + amount);

    // Update wallet balance
    const { error: walletErr } = await supabase
      .from('wallets')
      .upsert({ user_id, balance: newBalance }, { onConflict: 'user_id' });
    if (walletErr) throw walletErr;

    // Insert transaction record
    const { error: txErr } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id,
        amount,
        type: type || (amount > 0 ? 'adjustment' : 'deduction'),
        description: description.trim(),
        admin_note: admin_note?.trim() || null,
        balance_after: newBalance,
      });
    if (txErr) throw txErr;

    return NextResponse.json({ success: true, new_balance: newBalance });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}