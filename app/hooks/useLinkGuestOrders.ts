// hooks/useLinkGuestOrders.ts
// ─────────────────────────────────────────────────────────────
// Call this hook right after a user signs up OR signs in.
// It finds all guest orders that match the user's phone number
// (or email) and stamps them with the new user_id so they
// appear in the profile order history.
// ─────────────────────────────────────────────────────────────
import { supabase } from '@/app/lib/supabase';

export async function linkGuestOrdersToUser(userId: string) {
  try {
    // 1. Get the user's profile phone & email
    const { data: profile } = await supabase
      .from('profiles')
      .select('phone_number, email')
      .eq('id', userId)
      .single();

    // Also get auth email directly as fallback
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const authEmail = authUser?.email || null;

    const phone = profile?.phone_number || null;
    const email = profile?.email || authEmail || null;

    if (!phone && !email) return; // nothing to match on

    // 2. Find all guest orders (user_id is null) that match phone or email
    let query = supabase
      .from('orders')
      .select('id')
      .is('user_id', null);

    if (phone && email) {
      query = query.or(`customer_phone.eq.${phone},customer_email.eq.${email}`);
    } else if (phone) {
      query = query.eq('customer_phone', phone);
    } else if (email) {
      query = query.eq('customer_email', email);
    }

    const { data: guestOrders } = await query;

    if (!guestOrders || guestOrders.length === 0) return;

    // 3. Stamp them all with the user_id
    const orderIds = guestOrders.map((o) => o.id);
    await supabase
      .from('orders')
      .update({ user_id: userId })
      .in('id', orderIds);

    console.log(`[linkGuestOrders] Linked ${orderIds.length} guest order(s) to user ${userId}`);
  } catch (err) {
    console.error('[linkGuestOrders] Error:', err);
  }
}