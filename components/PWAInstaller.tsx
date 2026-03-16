'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';

export default function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showAndroidBanner, setShowAndroidBanner] = useState(false);
  const [showIosBanner, setShowIosBanner] = useState(false);

  async function trackInstall(platform: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('pwa_installs').insert({
        platform,
        user_agent: navigator.userAgent,
        user_id: user?.id || null,
      });
    } catch (err) {
      console.error('[PWA] Track install error:', err);
    }
  }

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('[PWA] SW registration failed:', err);
      });
    }

    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
    if (isInstalled) return;

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    if (isIos && isSafari) {
      const dismissed = sessionStorage.getItem('pwa_ios_dismissed');
      if (!dismissed) {
        setShowIosBanner(true);
        trackInstall('ios');
      }
      return;
    }

    // Track when app is actually installed (Android/Desktop)
    window.addEventListener('appinstalled', () => {
      trackInstall('android');
    });

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Detect desktop vs mobile
      const isMobile = /android/i.test(navigator.userAgent);
      setShowAndroidBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function handleAndroidInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowAndroidBanner(false);
      // Also track here as backup in case appinstalled doesn't fire
      const isDesktop = !/android/i.test(navigator.userAgent);
      await trackInstall(isDesktop ? 'desktop' : 'android');
    }
    setDeferredPrompt(null);
  }

  function dismissIos() {
    sessionStorage.setItem('pwa_ios_dismissed', '1');
    setShowIosBanner(false);
  }

  if (showIosBanner) {
    return (
      <>
        <div style={{
          position: 'fixed', bottom: '0', left: 0, right: 0, zIndex: 9999,
          background: 'linear-gradient(135deg, #0f172a, #1e293b)',
          borderTop: '1px solid rgba(34,197,94,0.3)',
          padding: '16px 20px 36px',
          direction: 'rtl',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.3)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img src="/icons/icon-192.png" alt="" style={{ width: '44px', height: '44px', borderRadius: '10px', flexShrink: 0 }} />
              <div>
                <div style={{ color: '#fff', fontWeight: '800', fontSize: '0.95rem' }}>نزّل التطبيق 📲</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginTop: '2px' }}>زيت اند فلترز</div>
              </div>
            </div>
            <button onClick={dismissIos} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '1.6rem', cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>×</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={stepStyle}>
              <div style={stepNum}>1</div>
              <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem' }}>
                اضغط على زر <strong style={{ color: '#22c55e' }}>المشاركة</strong>
                <span style={{ margin: '0 6px', fontSize: '1rem' }}>⬆️</span>
                في أسفل الشاشة
              </div>
            </div>
            <div style={stepStyle}>
              <div style={stepNum}>2</div>
              <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem' }}>
                اختر <strong style={{ color: '#22c55e' }}>"إضافة إلى الشاشة الرئيسية"</strong>
              </div>
            </div>
            <div style={stepStyle}>
              <div style={stepNum}>3</div>
              <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem' }}>
                اضغط <strong style={{ color: '#22c55e' }}>"إضافة"</strong> وهتلاقي التطبيق على شاشتك 🎉
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '12px', color: '#22c55e', fontSize: '1.2rem', animation: 'bounce 1.5s infinite' }}>▼</div>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(4px); }
          }
        `}} />
      </>
    );
  }

  if (showAndroidBanner) {
    return (
      <div style={{
        position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
        zIndex: 9999, maxWidth: '380px', width: 'calc(100% - 40px)',
        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
        borderRadius: '16px', padding: '16px 20px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
        display: 'flex', alignItems: 'center', gap: '14px',
        border: '1px solid rgba(34,197,94,0.3)', direction: 'rtl',
      }}>
        <img src="/icons/icon-192.png" alt="زيت اند فلترز" style={{ width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontWeight: '800', fontSize: '0.9rem', marginBottom: '2px' }}>نزّل التطبيق 📲</div>
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem' }}>أسرع وأسهل — بدون App Store</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
          <button onClick={handleAndroidInstall} style={{
            background: '#22c55e', color: '#fff', border: 'none', borderRadius: '10px',
            padding: '8px 16px', fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit',
          }}>تنزيل</button>
          <button onClick={() => setShowAndroidBanner(false)} style={{
            background: 'transparent', color: 'rgba(255,255,255,0.4)', border: 'none',
            fontSize: '0.75rem', cursor: 'pointer', padding: '4px', fontFamily: 'inherit',
          }}>لاحقاً</button>
        </div>
      </div>
    );
  }

  return null;
}

const stepStyle: any = {
  display: 'flex', alignItems: 'center', gap: '12px',
  backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '10px 14px',
};
const stepNum: any = {
  width: '26px', height: '26px', borderRadius: '50%',
  backgroundColor: '#22c55e', color: '#fff', fontWeight: '900',
  fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
};