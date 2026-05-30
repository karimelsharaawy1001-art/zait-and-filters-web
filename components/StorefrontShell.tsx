// components/StorefrontShell.tsx
'use client';
import { usePathname } from 'next/navigation';
import { CartProvider } from '@/context/CartContext';
import PageTransition from '@/components/PageTransition';
import MobileBottomNav from '@/components/MobileBottomNav';

interface Props {
  children: React.ReactNode;
  navbar: React.ReactNode;
  footer: React.ReactNode;
  cartDrawer: React.ReactNode;
  chatWidget: React.ReactNode;
  scrollProgress: React.ReactNode;
  abandonedCartTracker: React.ReactNode;
  exitConfirm: React.ReactNode;
}

export default function StorefrontShell({
  children,
  navbar,
  footer,
  cartDrawer,
  chatWidget,
  scrollProgress,
  abandonedCartTracker,
  exitConfirm,
}: Props) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin') || pathname.startsWith('/admin-login');
  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <CartProvider>
      {scrollProgress}
      {abandonedCartTracker}
      {cartDrawer}
      {exitConfirm}
      {chatWidget}

      {/*
        Inner-scroll layout (mobile): the entire viewport is a flex column.
        - navbar  : always at the top
        - main    : fills remaining space, scrolls independently
        - MobileBottomNav: always at the bottom, NO position:fixed needed

        Desktop: normal page scroll (flex column with min-height fills naturally).
      */}
      <div className="app-shell">
        {navbar}
        <PageTransition>
          <main id="scroll-main" className="storefront-main">
            {children}
          </main>
        </PageTransition>
        {footer}
        <MobileBottomNav onOpenSidebar={() => window.dispatchEvent(new Event('openSidebar'))} />
      </div>
    </CartProvider>
  );
}
