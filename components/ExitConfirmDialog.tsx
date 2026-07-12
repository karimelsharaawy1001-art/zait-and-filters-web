'use client';
// components/ExitConfirmDialog.tsx
//
// On Android PWA: intercepts the back button on the home page
// and shows a "هل تريد الخروج؟" dialog before closing the app.
//
// Add this component to your home page or layout.

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function ExitConfirmDialog() {
  const [showDialog, setShowDialog] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Only run in PWA standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (!isStandalone) return;

    // Only intercept back button on the home page
    // (other pages should just go back normally)
    const isHomePage = pathname === '/';
    if (!isHomePage) return;

    // Push a dummy history entry so back button doesn't exit immediately
    window.history.pushState({ exitGuard: true }, '');

    const handlePopState = (e: PopStateEvent) => {
      // If we're on home page and user pressed back, show dialog
      if (pathname === '/') {
        setShowDialog(true);
        // Push the dummy entry again so they can press back again if needed
        window.history.pushState({ exitGuard: true }, '');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [pathname]);

  function handleStay() {
    setShowDialog(false);
  }

  function handleExit() {
    // Close the PWA — only works on Android
    window.close();
    // Fallback: go back in history
    window.history.go(-2);
  }

  if (!showDialog) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleStay}
        style={{
          position: 'fixed', inset: 0, zIndex: 99998,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          animation: 'fadeIn 0.2s ease',
        }}
      />

      {/* Dialog */}
      <div style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        zIndex: 99999,
        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
        borderRadius: '24px 24px 0 0',
        padding: '28px 24px 40px',
        direction: 'rtl',
        animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.4)',
        border: '1px solid rgba(34,197,94,0.2)',
        borderBottom: 'none',
      }}>

        {/* Handle bar */}
        <div style={{
          width: '40px', height: '4px', borderRadius: '2px',
          backgroundColor: 'rgba(255,255,255,0.2)',
          margin: '0 auto 24px',
        }} />

        {/* Icon */}
        <div style={{ textAlign: 'center', fontSize: '3rem', marginBottom: '12px' }}>
          👋
        </div>

        {/* Title */}
        <h3 style={{
          textAlign: 'center', color: '#ffffff',
          fontSize: '1.2rem', fontWeight: '900',
          margin: '0 0 8px',
        }}>
          هل تريد الخروج؟
        </h3>

        {/* Subtitle */}
        <p style={{
          textAlign: 'center', color: 'rgba(255,255,255,0.5)',
          fontSize: '0.85rem', margin: '0 0 28px', lineHeight: 1.5,
        }}>
          شكراً لزيارتك زيت اند فلترز 🌿
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={handleStay}
            style={{
              width: '100%', padding: '15px',
              background: 'linear-gradient(135deg, #e50914, #dc2626)',
              color: '#fff', border: 'none', borderRadius: '14px',
              fontWeight: '900', fontSize: '1rem', cursor: 'pointer',
              fontFamily: 'inherit',
              boxShadow: '0 4px 16px rgba(34,197,94,0.3)',
            }}
          >
            ابقى معنا 🛍️
          </button>
          <button
            onClick={handleExit}
            style={{
              width: '100%', padding: '15px',
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.5)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '14px',
              fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            خروج
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}} />
    </>
  );
}