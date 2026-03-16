'use client';
import { useEffect, useState } from 'react';

export default function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(() => {
        console.log('[PWA] Service Worker registered');
      });
    }

    // Catch install prompt (Android/Desktop Chrome)
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show banner only if not already installed
      const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
      if (!isInstalled) setShowBanner(true);
    });
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShowBanner(false);
    setDeferredPrompt(null);
  }

  if (!showBanner) return null;

  return (
    <div style={{
      position: 'fixed', bottom: '20px', right: '50%', transform: 'translateX(50%)',
      zIndex: 9999, maxWidth: '380px', width: 'calc(100% - 40px)',
      background: 'linear-gradient(135deg, #0f172a, #1e293b)',
      borderRadius: '16px', padding: '16px 20px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      display: 'flex', alignItems: 'center', gap: '14px',
      border: '1px solid rgba(34,197,94,0.3)',
      direction: 'rtl',
    }}>
      <img src="/icons/icon-192.png" alt="" style={{ width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ color: '#fff', fontWeight: '800', fontSize: '0.9rem', marginBottom: '2px' }}>
          نزّل التطبيق 📲
        </div>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>
          أسرع وأسهل — بدون App Store
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
        <button onClick={handleInstall} style={{
          background: '#22c55e', color: '#fff', border: 'none',
          borderRadius: '10px', padding: '8px 16px',
          fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer',
        }}>
          تنزيل
        </button>
        <button onClick={() => setShowBanner(false)} style={{
          background: 'transparent', color: 'rgba(255,255,255,0.4)',
          border: 'none', fontSize: '0.75rem', cursor: 'pointer', padding: '4px',
        }}>
          لاحقاً
        </button>
      </div>
    </div>
  );
}