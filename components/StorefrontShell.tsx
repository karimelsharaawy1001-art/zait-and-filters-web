// components/StorefrontShell.tsx
'use client';
import { usePathname } from 'next/navigation';
import { CartProvider } from '@/context/CartContext';
import PageTransition from '@/components/PageTransition';

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

  // ── Admin: render ONLY the page. No navbar, footer, cart, chat, nothing. ──
  if (isAdmin) {
    return <>{children}</>;
  }

  // ── Storefront: full shell ──
  return (
    <CartProvider>
      {scrollProgress}
      {abandonedCartTracker}
      {navbar}
      {cartDrawer}
      <PageTransition>
        <main className="storefront-main">{children}</main>
      </PageTransition>
      {footer}
      {exitConfirm}
      {chatWidget}
    </CartProvider>
  );
}