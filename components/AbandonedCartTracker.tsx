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
        // Get user info if logged in
        const { data: { user } } = await supabase.auth.getUser();
        
        // Get customer email from localStorage or form
        const customerEmail = localStorage.getItem('checkout_email') || 
                             user?.email || 
                             '';

        // Calculate cart totals
        const cartSubtotal = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);

        // Prepare detailed cart items with all product information
        const detailedCartItems = cart.map((item) => ({
          id: item.id,
          name: item.name,
          price: parseFloat(item.price),
          quantity: item.quantity,
          
          // Product details
          brand: item.brand || 'غير محدد',
          car_make: item.car_make || item.make || 'غير محدد',
          car_model: item.car_model || item.model || 'غير محدد',
          car_model_year: item.car_model_year || item.year || item.model_year || 'غير محدد',
          
          // Product image
          image_url: item.image_url || item.image || '',
          
          // Additional details
          country_origin: item.country_origin || item.country_of_origin || 'أصلي',
          category: item.category || '',
          part_number: item.part_number || '',
          
          // Line total
          line_total: parseFloat(item.price) * item.quantity
        }));

        // Get browser and device info
        const browserInfo = {
          userAgent: navigator.userAgent,
          language: navigator.language,
          screenResolution: `${window.screen.width}x${window.screen.height}`,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          platform: navigator.platform,
          timestamp: new Date().toISOString()
        };

        // Detect device type
        const deviceType = /Mobile|Android|iPhone|iPad|iPod/.test(navigator.userAgent) 
          ? 'mobile' 
          : 'desktop';

        // Prepare abandoned cart data
        const abandonedCartData = {
          user_id: user?.id || null,
          session_id: sessionStorage.getItem('session_id') || 
                     `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          
          customer_email: customerEmail || 'no-email@placeholder.com',
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

        // Store session ID for tracking
        if (!sessionStorage.getItem('session_id')) {
          sessionStorage.setItem('session_id', abandonedCartData.session_id);
        }

        // Upsert abandoned cart (update if exists, insert if new)
        const { data, error } = await supabase
          .from('abandoned_carts')
          .upsert(abandonedCartData, {
            onConflict: 'session_id',
            ignoreDuplicates: false
          })
          .select()
          .single();

        if (error) {
          console.error('Error tracking abandoned cart:', error);
        } else {
          console.log('✅ Cart tracked successfully:', data.id);
        }

      } catch (error) {
        console.error('Failed to track cart:', error);
      }
    };

    // Track immediately
    trackCart();

    // Track every 30 seconds while cart is active
    const interval = setInterval(trackCart, 30000);

    return () => clearInterval(interval);
  }, [cart]);

  return null;
}
