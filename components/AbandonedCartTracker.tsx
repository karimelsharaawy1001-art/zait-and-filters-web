'use client';
import { useAbandonedCart } from '@/hooks/useAbandonedCart';
import { useEffect } from 'react';
import { useCart } from '@/context/CartContext';

export function AbandonedCartTracker() {
  const { trackCartActivity } = useAbandonedCart();
  const { cart } = useCart();

  useEffect(() => {
    // Only track if cart has items
    if (cart.length === 0) return;

    // Track when user is about to leave
    const handleBeforeUnload = () => {
      trackCartActivity();
    };

    // Track visibility change (tab switching/closing)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        trackCartActivity();
      }
    };

    // Track periodically while on site (every 30 seconds)
    const intervalId = setInterval(() => {
      trackCartActivity();
    }, 30000);

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [trackCartActivity, cart]);

  return null;
}
