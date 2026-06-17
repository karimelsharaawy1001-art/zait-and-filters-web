'use client';

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

const TAWKTO_PROPERTY_ID = process.env.NEXT_PUBLIC_TAWKTO_PROPERTY_ID || '6a31c917b319cc1d4d432159';
const TAWKTO_WIDGET_ID = process.env.NEXT_PUBLIC_TAWKTO_WIDGET_ID || '1jr97j0sm';

let tawkLoaded = false;

export function openTawkTo() {
  if (typeof window === 'undefined') return;

  if (window.Tawk_API) {
    window.Tawk_API.maximize?.();
    window.Tawk_API.showWidget?.();
    return;
  }

  if (tawkLoaded) return;
  tawkLoaded = true;

  window.Tawk_LoadStart = new Date();

  const s1 = document.createElement('script');
  s1.async = true;
  s1.src = `https://embed.tawk.to/${TAWKTO_PROPERTY_ID}/${TAWKTO_WIDGET_ID}`;
  s1.charset = 'UTF-8';
  s1.setAttribute('crossorigin', '*');

  const s0 = document.getElementsByTagName('script')[0];
  s0.parentNode?.insertBefore(s1, s0);

  const check = setInterval(() => {
    if (window.Tawk_API) {
      clearInterval(check);
      window.Tawk_API.maximize?.();
      window.Tawk_API.showWidget?.();
    }
  }, 200);

  setTimeout(() => clearInterval(check), 10000);
}
