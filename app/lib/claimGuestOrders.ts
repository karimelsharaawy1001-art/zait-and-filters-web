import { supabase } from '@/app/lib/supabase';

/**
 * After a user registers, call this to link any guest orders
 * that were placed using the same email or phone number.
 */
export async function claimGuestOrders(
  userId: string,
  email: string,
  phone?: string
) {
  try {
    let query = supabase
      .from('orders')
      .update({ user_id: userId })
      .is('user_id', null); // only unclaimed guest orders

    if (phone) {
      query = query.or(`guest_email.eq.${email},guest_phone.eq.${phone}`);
    } else {
      query = query.eq('guest_email', email);
    }

    const { error } = await query;
    if (error) console.error('[claimGuestOrders] Failed:', error.message);
  } catch (err) {
    console.error('[claimGuestOrders] Unexpected error:', err);
  }
}