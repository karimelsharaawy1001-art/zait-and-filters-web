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
    // 1. Get the user's phone number from profiles (primary match key)
    const { data: profile } = await supabase
      .from('profiles')
      .select('phone_number')
      .eq('id', userId)
      .single();

    const phone = profile?.phone_number?.trim() || null;

    if (!phone) {
      console.log('[linkGuestOrders] No phone number found for user, skipping.');
      return;
    }

    // 2. Find ALL orders (even already linked ones) by phone
    //    so we catch orders placed before signup that still have user_id null
    const { data: guestOrders, error } = await supabase
      .from('orders')
      .select('id, user_id')
      .eq('customer_phone', phone)
      .is('user_id', null);

    if (error) {
      console.error('[linkGuestOrders] Query error:', error);
      return;
    }

    if (!guestOrders || guestOrders.length === 0) {
      console.log('[linkGuestOrders] No unlinked orders found for phone:', phone);
      return;
    }

    // 3. Stamp them all with the user_id
    const orderIds = guestOrders.map((o: any) => o.id);

    const { error: updateError } = await supabase
      .from('orders')
      .update({ user_id: userId })
      .in('id', orderIds);

    if (updateError) {
      console.error('[linkGuestOrders] Update error:', updateError);
      return;
    }

    console.log(`[linkGuestOrders] Linked ${orderIds.length} order(s) to user ${userId}`);
  } catch (err) {
    console.error('[linkGuestOrders] Error:', err);
  }
}