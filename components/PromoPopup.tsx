'use client';

import { useEffect, useState, useRef } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { optimizeImageUrl } from '@/lib/images';

interface PopupData {
  id: string;
  desktop_image_url: string;
  mobile_image_url: string;
  promo_code: string;
  is_active: boolean;
}

export default function PromoPopup() {
  const [popup, setPopup] = useState<PopupData | null>(null);
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const checkMobile = () => {
      if (mountedRef.current) setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => {
      mountedRef.current = false;
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    fetch(`/api/promo-popup?t=${Date.now()}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!mountedRef.current) return;
        if (data?.id && data.is_active) {
          const dismissedId = localStorage.getItem('promo_popup_dismissed');
          if (dismissedId === data.id) return;
          setPopup(data);
          timer = setTimeout(() => {
            if (mountedRef.current) setVisible(true);
          }, 800);
        }
      })
      .catch((err) => console.error('[PromoPopup] fetch error:', err));

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  function dismiss() {
    if (popup) {
      localStorage.setItem('promo_popup_dismissed', popup.id);
    }
    setVisible(false);
  }

  function handleCopy(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!visible || !popup) return null;

  const imageUrl = isMobile && popup.mobile_image_url
    ? popup.mobile_image_url
    : popup.desktop_image_url;

  return (
    <div
      onClick={dismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          maxWidth: isMobile ? '360px' : '700px',
          width: '100%',
          background: 'transparent',
          borderRadius: '16px',
          overflow: 'hidden',
        }}
      >
        <button
          onClick={dismiss}
          style={{
            position: 'absolute', top: '12px', left: '12px', zIndex: 10,
            width: '32px', height: '32px', borderRadius: '50%',
            background: 'rgba(0,0,0,0.4)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#fff',
          }}
          onPointerEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.6)'}
          onPointerLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.4)'}
        >
          <X size={18} />
        </button>

        <img
          src={optimizeImageUrl(imageUrl)}
          alt="Promo"
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            borderRadius: '16px',
          }}
        />

        {popup.promo_code && (
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              padding: '14px 16px',
              background: 'linear-gradient(135deg, #0f172a, #1e293b)',
              borderBottomLeftRadius: '16px',
              borderBottomRightRadius: '16px',
            }}
          >
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem', fontWeight: '700' }}>
              كود الخصم:
            </span>
            <button
              onClick={() => handleCopy(popup.promo_code)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '6px 16px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                color: '#22c55e', fontWeight: '900', fontSize: '0.88rem',
                cursor: 'pointer', direction: 'ltr',
                fontFamily: 'monospace',
              }}
              onPointerEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
              onPointerLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            >
              {popup.promo_code}
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
