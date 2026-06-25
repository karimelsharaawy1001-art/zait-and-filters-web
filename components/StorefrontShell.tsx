// components/StorefrontShell.tsx
'use client';
import { usePathname } from 'next/navigation';
import { CartProvider } from '@/context/CartContext';
import PageTransition from '@/components/PageTransition';
import PromoPopup from '@/components/PromoPopup';

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
      <PromoPopup />
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
