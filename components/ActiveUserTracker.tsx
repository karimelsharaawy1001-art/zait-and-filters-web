'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

export function ActiveUserTracker() {
  const pathname = usePathname();
  const prevPathRef = useRef('');
  const sessionIdRef = useRef('');

  useEffect(() => {
    let sessionId = localStorage.getItem('zf_session_id');
    if (!sessionId) {
      sessionId = crypto.randomUUID?.() || `zf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('zf_session_id', sessionId);
    }
    sessionIdRef.current = sessionId;

    const track = async () => {
      try {
        const cartRaw = localStorage.getItem('zait_cart');
        let cartItemsCount = 0;
        let cartTotal = 0;
        let cartItemNames: string[] = [];
        if (cartRaw) {
          try {
            const items = JSON.parse(cartRaw);
            cartItemsCount = items.reduce((s: number, i: any) => s + (parseInt(i.quantity) || 0), 0);
            cartTotal = items.reduce((s: number, i: any) => s + (parseFloat(i.price) * (parseInt(i.quantity) || 0)), 0);
            cartItemNames = items.map((i: any) => i.name || '');
          } catch {}
        }

        const { data: { user } } = await supabase.auth.getUser();
        const userEmail = user?.email || localStorage.getItem('checkout_email') || '';
        const userName = user?.user_metadata?.name || localStorage.getItem('checkout_name') || user?.user_metadata?.full_name || '';
        const userPhone = localStorage.getItem('checkout_phone') || user?.phone || '';

        const deviceType = /Mobile|Android|iPhone|iPad|iPod/.test(navigator.userAgent) ? 'mobile' : 'desktop';

        const currentPage = window.location.pathname + window.location.search;

        const { error } = await supabase
          .from('user_sessions')
          .upsert({
            session_id: sessionId,
            user_id: user?.id || null,
            current_page: currentPage,
            previous_page: prevPathRef.current,
            referrer: document.referrer || '',
            user_agent: navigator.userAgent,
            device_type: deviceType,
            cart_items_count: cartItemsCount,
            cart_total: cartTotal,
            cart_item_names: cartItemNames,
            user_name: userName,
            user_email: userEmail,
            user_phone: userPhone,
            is_online: true,
            last_active_at: new Date().toISOString(),
          }, { onConflict: 'session_id' });

        if (error) console.error('Track error:', error);

        prevPathRef.current = currentPage;
      } catch (err) {
        console.error('Tracking failed:', err);
      }
    };

    track();
    const interval = setInterval(track, 30000);
    return () => {
      clearInterval(interval);
      supabase.from('user_sessions').update({ is_online: false }).eq('session_id', sessionIdRef.current).then(() => {}, () => {});
    };
  }, [pathname]);

  return null;
}
