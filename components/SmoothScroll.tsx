'use client';
import { useEffect } from 'react';

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Smooth scroll behavior using CSS
    document.documentElement.style.scrollBehavior = 'smooth';
    
    // Optional: Add custom smooth scroll with requestAnimationFrame
    let isScrolling = false;
    let targetScroll = window.scrollY;

    const smoothScroll = () => {
      if (!isScrolling) return;
      
      const currentScroll = window.scrollY;
      const diff = targetScroll - currentScroll;
      
      if (Math.abs(diff) > 1) {
        window.scrollTo(0, currentScroll + diff * 0.1);
        requestAnimationFrame(smoothScroll);
      } else {
        isScrolling = false;
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      targetScroll = Math.max(0, Math.min(
        document.documentElement.scrollHeight - window.innerHeight,
        targetScroll + e.deltaY
      ));
      
      if (!isScrolling) {
        isScrolling = true;
        requestAnimationFrame(smoothScroll);
      }
    };

    // Only enable on desktop
    if (window.innerWidth > 768) {
      document.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      document.removeEventListener('wheel', handleWheel);
      document.documentElement.style.scrollBehavior = 'auto';
    };
  }, []);

  return <>{children}</>;
}
