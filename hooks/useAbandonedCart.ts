import { useEffect, useCallback } from 'react';
import { useCart } from '@/context/CartContext';
import { supabase } from '@/app/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export function useAbandonedCart() {
  const { cart } = useCart();

  // Generate or get session ID for anonymous users
  const getSessionId = useCallback(() => {
    let sessionId = localStorage.getItem('zf_session_id');
    if (!sessionId) {
      sessionId = uuidv4();
      localStorage.setItem('zf_session_id', sessionId);
    }
    return sessionId;
  }, []);

  // Track cart activity
  const trackCartActivity = useCallback(async () => {
    if (cart.length === 0) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const sessionId = getSessionId();

      // Calculate totals
      const subtotal = cart.reduce((sum: number, item: any) => 
        sum + (parseFloat(item.price) * item.quantity), 0
      );

      // Get user info from profile if logged in
      let customerEmail = '';
      let customerName = '';
      let customerPhone = '';

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email, phone_number')
          .eq('id', user.id)
          .single();

        if (profile) {
          customerEmail = profile.email || '';
          customerName = profile.full_name || '';
          customerPhone = profile.phone_number || '';
        }
      }

      // Get browser info
      const browserInfo = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screenResolution: `${window.screen.width}x${window.screen.height}`
      };

      const deviceType = /Mobile|Android|iPhone/i.test(navigator.userAgent) 
        ? 'mobile' 
        : /Tablet|iPad/i.test(navigator.userAgent) 
        ? 'tablet' 
        : 'desktop';

      // Check if abandoned cart already exists for this user/session
      const { data: existing } = await supabase
        .from('abandoned_carts')
        .select('id')
        .eq(user ? 'user_id' : 'session_id', user ? user.id : sessionId)
        .eq('recovered', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const cartData = {
        user_id: user?.id || null,
        session_id: sessionId,
        customer_email: customerEmail,
        customer_name: customerName,
        customer_phone: customerPhone,
        cart_items: cart,
        cart_subtotal: subtotal,
        cart_total: subtotal,
        last_activity_at: new Date().toISOString(),
        page_url: typeof window !== 'undefined' ? window.location.href : '',
        referrer_url: typeof document !== 'undefined' ? document.referrer : '',
        device_type: deviceType,
        browser_info: browserInfo
      };

      if (existing) {
        // Update existing abandoned cart
        await supabase
          .from('abandoned_carts')
          .update(cartData)
          .eq('id', existing.id);
        
        console.log('✅ Updated abandoned cart:', existing.id);
      } else {
        // Create new abandoned cart
        const { data, error } = await supabase
          .from('abandoned_carts')
          .insert([cartData])
          .select()
          .single();
        
        if (error) {
          console.error('❌ Error creating abandoned cart:', error);
        } else {
          console.log('✅ Created new abandoned cart:', data.id);
        }
      }
    } catch (error) {
      console.error('Error tracking cart activity:', error);
    }
  }, [cart, getSessionId]);

  // Mark as recovered when order is placed
  const markAsRecovered = useCallback(async (orderId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const sessionId = getSessionId();

      const { error } = await supabase
        .from('abandoned_carts')
        .update({
          recovered: true,
          recovered_at: new Date().toISOString(),
          recovery_order_id: orderId
        })
        .eq(user ? 'user_id' : 'session_id', user ? user.id : sessionId)
        .eq('recovered', false);

      if (error) {
        console.error('Error marking cart as recovered:', error);
      } else {
        console.log('✅ Marked abandoned cart as recovered for order:', orderId);
      }
    } catch (error) {
      console.error('Error marking cart as recovered:', error);
    }
  }, [getSessionId]);

  return { trackCartActivity, markAsRecovered };
}
