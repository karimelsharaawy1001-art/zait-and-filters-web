'use client';
// components/SplashScreen.tsx

import { useEffect, useState } from 'react';

export default function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [animateOut, setAnimateOut] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (!isStandalone) return;

    const shown = sessionStorage.getItem('splash_shown_v2');
    if (shown) return;

    sessionStorage.setItem('splash_shown_v2', '1');
    setVisible(true);

    const fadeTimer  = setTimeout(() => setAnimateOut(true), 3000);
    const removeTimer = setTimeout(() => setVisible(false), 3800);

    return () => { clearTimeout(fadeTimer); clearTimeout(removeTimer); };
  }, []);

  if (!visible) return null;

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(160deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)',
        opacity: animateOut ? 0 : 1,
        transition: 'opacity 0.7s ease-in-out',
        pointerEvents: animateOut ? 'none' : 'all',
        overflow: 'hidden',
      }}>

        {/* ── Decorative blurred orbs ── */}
        <div style={{
          position: 'absolute', top: '-100px', right: '-100px',
          width: '400px', height: '400px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 65%)',
          pointerEvents: 'none', filter: 'blur(2px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-80px', left: '-80px',
          width: '350px', height: '350px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 65%)',
          pointerEvents: 'none', filter: 'blur(2px)',
        }} />
        <div style={{
          position: 'absolute', top: '40%', left: '-60px',
          width: '220px', height: '220px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        {/* ── Shimmer line ── */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
          animation: 'shimmerLine 2s ease-in-out infinite',
        }} />

        {/* ── Logo container ── */}
        <div style={{
          position: 'relative',
          animation: 'splashLogoIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          opacity: 0,
          marginBottom: '28px',
        }}>
          {/* Glow ring behind logo */}
          <div style={{
            position: 'absolute', inset: '-14px',
            borderRadius: '42px',
            background: 'rgba(255,255,255,0.12)',
            filter: 'blur(8px)',
          }} />
          {/* Outer ring */}
          <div style={{
            position: 'absolute', inset: '-6px',
            borderRadius: '34px',
            border: '1px solid rgba(255,255,255,0.25)',
          }} />
          <img
            src="/icons/icon-512.png"
            alt="زيت اند فلترز"
            style={{
              width: '120px', height: '120px',
              borderRadius: '28px',
              boxShadow: '0 24px 64px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.2)',
              display: 'block', position: 'relative', zIndex: 1,
            }}
          />
        </div>

        {/* ── Brand name ── */}
        <div style={{
          animation: 'splashTextIn 0.6s ease forwards 0.35s',
          opacity: 0, textAlign: 'center', marginBottom: '8px',
        }}>
          <div style={{
            fontSize: '2.1rem', fontWeight: '900', fontStyle: 'italic',
            color: '#ffffff', letterSpacing: '-0.5px', direction: 'ltr',
            textShadow: '0 2px 20px rgba(0,0,0,0.2)',
          }}>
            ZAIT <span style={{
              color: '#22c55e',
              borderBottom: '3px solid rgba(34,197,94,0.5)',
              paddingBottom: '2px',
            }}>&amp; FILTERS</span>
          </div>
        </div>

        {/* ── Arabic name ── */}
        <div style={{
          animation: 'splashTextIn 0.6s ease forwards 0.5s',
          opacity: 0, textAlign: 'center', marginBottom: '6px',
        }}>
          <div style={{
            fontSize: '1.1rem', fontWeight: '800', color: 'rgba(255,255,255,0.9)',
            letterSpacing: '0.5px',
          }}>
            زيت اند فلترز
          </div>
        </div>

        {/* ── Divider ── */}
        <div style={{
          animation: 'splashDivider 0.8s ease forwards 0.6s',
          opacity: 0, marginBottom: '10px',
          width: '0px', height: '1px',
          background: 'rgba(255,255,255,0.35)',
        }} />

        {/* ── Tagline ── */}
        <div style={{
          animation: 'splashTextIn 0.6s ease forwards 0.7s',
          opacity: 0, textAlign: 'center', marginBottom: '70px',
        }}>
          <div style={{
            fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)',
            fontWeight: '700', letterSpacing: '3px', direction: 'ltr',
            textTransform: 'uppercase',
          }}>
            Auto Parts · قطع غيار
          </div>
        </div>

        {/* ── Loading bar ── */}
        <div style={{
          animation: 'splashTextIn 0.5s ease forwards 0.85s',
          opacity: 0,
          position: 'absolute', bottom: '60px',
          width: '140px',
        }}>
          <div style={{
            width: '100%', height: '3px',
            background: 'rgba(255,255,255,0.2)', borderRadius: '999px', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', background: '#1c1c1c',
              borderRadius: '999px',
              animation: 'splashLoadBar 2s ease-in-out forwards 0.9s',
              width: '0%',
            }} />
          </div>
        </div>

        {/* ── Bottom tagline ── */}
        <div style={{
          animation: 'splashTextIn 0.5s ease forwards 0.9s',
          opacity: 0,
          position: 'absolute', bottom: '36px',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)',
            fontWeight: '600', letterSpacing: '1.5px', direction: 'ltr',
          }}>
            zaitandfilters.com
          </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes splashLogoIn {
          from { opacity: 0; transform: scale(0.5) translateY(30px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes splashTextIn {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes splashDivider {
          from { opacity: 0; width: 0px; }
          to   { opacity: 1; width: 120px; }
        }
        @keyframes splashLoadBar {
          0%   { width: 0%; }
          20%  { width: 25%; }
          50%  { width: 60%; }
          80%  { width: 85%; }
          100% { width: 100%; }
        }
        @keyframes shimmerLine {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100vw); }
        }
      `}} />
    </>
  );
}