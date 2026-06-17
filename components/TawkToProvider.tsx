'use client';
import { useEffect } from 'react';

declare global {
  interface Window {
    Tawk_API?: {
      onLoad?: () => void;
      maximize?: () => void;
      minimize?: () => void;
      toggle?: () => void;
      showWidget?: () => void;
      hideWidget?: () => void;
      visitor?: {
        name?: string;
        email?: string;
      };
    };
    Tawk_LoadStart?: Date;
  }
}

const TAWKTO_PROPERTY_ID = process.env.NEXT_PUBLIC_TAWKTO_PROPERTY_ID;
const TAWKTO_WIDGET_ID = process.env.NEXT_PUBLIC_TAWKTO_WIDGET_ID;

export function openTawkTo() {
  if (typeof window !== 'undefined' && window.Tawk_API) {
    window.Tawk_API.maximize?.();
    window.Tawk_API.showWidget?.();
  }
}

export default function TawkToProvider() {
  useEffect(() => {
    if (!TAWKTO_PROPERTY_ID || !TAWKTO_WIDGET_ID) return;

    window.Tawk_LoadStart = new Date();

    const s1 = document.createElement('script');
    s1.async = true;
    s1.src = `https://embed.tawk.to/${TAWKTO_PROPERTY_ID}/${TAWKTO_WIDGET_ID}`;
    s1.charset = 'UTF-8';
    s1.setAttribute('crossorigin', '*');

    const s0 = document.getElementsByTagName('script')[0];
    s0.parentNode?.insertBefore(s1, s0);

    return () => {
      // Cleanup: remove any tawk.to iframes/scripts
      document.querySelectorAll('script[src*="tawk.to"]').forEach(el => el.remove());
      document.querySelectorAll('iframe[src*="tawk.to"]').forEach(el => el.remove());
    };
  }, []);

  return null;
}
