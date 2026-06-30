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
        let cartItems: any[] = [];
        if (cartRaw) {
          try {
            const items = JSON.parse(cartRaw);
            cartItemsCount = items.reduce((s: number, i: any) => s + (parseInt(i.quantity) || 0), 0);
            cartTotal = items.reduce((s: number, i: any) => s + (parseFloat(i.price) * (parseInt(i.quantity) || 0)), 0);
            cartItemNames = items.map((i: any) => i.name || '');
            cartItems = items.map((i: any) => ({
              name: i.name || '',
              quantity: parseInt(i.quantity) || 1,
              price: parseFloat(i.price) || 0,
              brand: i.brand || '',
              car_make: i.car_make || '',
              car_model: i.car_model || '',
              car_model_year: i.car_model_year || i.car_year || '',
            }));
          } catch {}
        }

        const { data: { user } } = await supabase.auth.getUser();
        const userEmail = user?.email || localStorage.getItem('checkout_email') || '';
        const userName = user?.user_metadata?.name || localStorage.getItem('checkout_name') || user?.user_metadata?.full_name || '';
        const userPhone = localStorage.getItem('checkout_phone') || user?.phone || '';

        const deviceType = /Mobile|Android|iPhone|iPad|iPod/.test(navigator.userAgent) ? 'mobile' : 'desktop';
        const currentPage = window.location.pathname + window.location.search;

        await fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
            user_id: user?.id || null,
            page_title: document.title,
            current_page: currentPage,
            previous_page: prevPathRef.current,
            referrer: document.referrer || '',
            user_agent: navigator.userAgent,
            device_type: deviceType,
            cart_items_count: cartItemsCount,
            cart_total: cartTotal,
            cart_item_names: cartItemNames,
            cart_items: cartItems,
            user_name: userName,
            user_email: userEmail,
            user_phone: userPhone,
            is_online: true,
            last_active_at: new Date().toISOString(),
          }),
        });

        if (prevPathRef.current !== currentPage) {
          fetch('/api/page-view', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_id: sessionId,
              page_title: document.title,
              current_page: currentPage,
            }),
          }).catch(() => {}).then(() => {}, () => {});
        }

        prevPathRef.current = currentPage;
      } catch (err) {
        console.error('Tracking failed:', err);
      }
    };

    track();
    const interval = setInterval(track, 30000);
    return () => {
      clearInterval(interval);
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionIdRef.current,
          is_online: false,
          last_active_at: new Date().toISOString(),
        }),
      }).then(() => {}, () => {});
    };
  }, [pathname]);

  return null;
}
