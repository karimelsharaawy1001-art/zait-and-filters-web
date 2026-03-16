'use client';
// hooks/useExitWarning.ts
//
// Shows a warning when user tries to leave a page.
// Works on all devices and browsers.
// Use on checkout page to prevent accidental exits.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function useExitWarning(shouldWarn: boolean, message?: string) {
  const warningMessage = message || 'لديك منتجات في سلتك. هل تريد مغادرة الصفحة؟';

  useEffect(() => {
    if (!shouldWarn) return;

    // ── Browser tab close / refresh ───────────────────────────────────────
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = warningMessage; // Required for Chrome
      return warningMessage;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [shouldWarn, warningMessage]);
}