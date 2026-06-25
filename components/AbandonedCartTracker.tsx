'use client';
import { useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { supabase } from '@/app/lib/supabase';

export function AbandonedCartTracker() {
  const { cart } = useCart();

  useEffect(() => {
    if (cart.length === 0) return;

    const trackCart = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        // Use localStorage for persistent session tracking (matches useAbandonedCart.ts)
        let sessionId = localStorage.getItem('zf_session_id');
        if (!sessionId) {
          sessionId = crypto.randomUUID?.() || `zf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          localStorage.setItem('zf_session_id', sessionId);
        }

        const customerEmail = localStorage.getItem('checkout_email') || user?.email || '';
        const cartSubtotal = cart.reduce((sum: number, item: any) => sum + (parseFloat(item.price) * item.quantity), 0);

        const detailedCartItems = cart.map((item) => ({
          id: item.id,
          name: item.name,
          price: parseFloat(item.price),
          quantity: item.quantity,
          brand: item.brand || 'غير محدد',
          car_make: item.car_make || item.make || 'غير محدد',
          car_model: item.car_model || item.model || 'غير محدد',
          car_model_year: item.car_model_year || item.year || item.model_year || 'غير محدد',
          image_url: item.image_url || item.image || '',
          country_origin: item.country_origin || item.country_of_origin || 'أصلي',
          category: item.category || '',
          part_number: item.part_number || '',
          line_total: parseFloat(item.price) * item.quantity
        }));

        const browserInfo = {
          userAgent: navigator.userAgent,
          language: navigator.language,
          screenResolution: `${window.screen.width}x${window.screen.height}`,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          platform: navigator.platform,
          timestamp: new Date().toISOString()
        };

        const deviceType = /Mobile|Android|iPhone|iPad|iPod/.test(navigator.userAgent)
          ? 'mobile'
          : 'desktop';

        const cartData = {
          user_id: user?.id || null,
          session_id: sessionId,
          customer_email: customerEmail,
          customer_name: localStorage.getItem('checkout_name') || '',
          customer_phone: localStorage.getItem('checkout_phone') || '',
          cart_items: detailedCartItems,
          cart_subtotal: cartSubtotal,
          cart_total: cartSubtotal,
          page_url: window.location.href,
          referrer_url: document.referrer || '',
          device_type: deviceType,
          browser_info: browserInfo,
          last_activity_at: new Date().toISOString()
        };

        // Check for existing non-recovered cart for this session/user
        const { data: existing } = await supabase
          .from('abandoned_carts')
          .select('id')
          .eq(user ? 'user_id' : 'session_id', user ? user.id : sessionId)
          .eq('recovered', false)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existing) {
          await supabase.from('abandoned_carts').update(cartData).eq('id', existing.id);
        } else {
          await supabase.from('abandoned_carts').insert([cartData]);
        }
      } catch (error) {
        console.error('Failed to track cart:', error);
      }
    };

    trackCart();
    const interval = setInterval(trackCart, 30000);
    return () => clearInterval(interval);
  }, [cart]);

  return null;
}
