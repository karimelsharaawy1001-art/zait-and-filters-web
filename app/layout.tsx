// app/layout.tsx
import './globals.css'
import ProfessionalNavbar from '@/components/Navbar'
import ProfessionalFooter from '@/components/Footer' 
import { Almarai } from 'next/font/google'
import { CartProvider } from '@/context/CartContext'
import CartDrawer from '@/components/CartDrawer'
import { Toaster } from 'react-hot-toast'
import { AbandonedCartTracker } from '@/components/AbandonedCartTracker'
import PageTransition from '@/components/PageTransition'
import ScrollProgress from '@/components/ScrollProgress'
import type { Metadata } from 'next'
import Script from 'next/script'
import { GA_MEASUREMENT_ID } from '@/lib/gtag'
import { GAProvider } from './ga-provider'
import { Suspense } from 'react'
import SplashScreen from '@/components/SplashScreen'
import ExitConfirmDialog from '@/components/ExitConfirmDialog'
import ChatWidget from '@/components/ChatWidget'
import StorefrontShell from '@/components/StorefrontShell'

const almarai = Almarai({ 
  subsets: ['arabic'], 
  weight: ['300', '400', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://zaitandfilters.com'),
  title: {
    default: "زيت اند فلترز | اكبر موقع لقطع غيار السيارات في مصر",
    template: "%s | زيت اند فلترز"
  },
  description: "المتجر الأول لبيع قطع غيار السيارات الأصلية في مصر. نوفر زيوت، فلاتر، تيل فرامل، سيور، وبوجيهات لأشهر الماركات (تويوتا، نيسان، كيا، هيونداي). جودة مضمونة وشحن سريع.",
  keywords: ["قطع غيار سيارات أصلية","قطع غيار سيارات مصر","زيوت سيارات","فلاتر سيارات","تيل فرامل أصلي","بوجيهات","سيور سيارات","زيت اند فلترز","أرخص قطع غيار في مصر","قطع غيار تويوتا","قطع غيار هيونداي","فلاتر زيت","فلاتر هواء","فلاتر بنزين","car spare parts Egypt","MANN filters","BOSCH filters"],
  authors: [{ name: "Zait & Filters" }],
  creator: "Zait & Filters",
  publisher: "Zait & Filters",
  applicationName: "Zait & Filters",
  category: "Automotive Parts",
  classification: "E-commerce",
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'زيت اند فلترز' },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 } },
  openGraph: {
    title: "زيت اند فلترز | وجهتك الموثوقة لقطع غيار السيارات الأصلية",
    description: "كل ما تحتاجه سيارتك من قطع غيار أصلية وزيوت عالمية في مكان واحد.",
    url: "https://zaitandfilters.com",
    siteName: "Zait & Filters",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Zait & Filters" }],
    locale: "ar_EG",
    alternateLocale: "en_US",
    type: "website",
  },
  twitter: { card: 'summary_large_image', title: 'زيت اند فلترز', description: 'المتجر الأول لبيع قطع غيار السيارات الأصلية في مصر', images: ['/og-image.jpg'] },
  alternates: { canonical: 'https://zaitandfilters.com' },
  icons: {
    icon: [{ url: '/favicon.ico', sizes: 'any' }, { url: '/icons/icon-192.png', type: 'image/png', sizes: '192x192' }, { url: '/icons/icon-512.png', type: 'image/png', sizes: '512x512' }],
    apple: [{ url: '/icons/icon-192.png', sizes: '192x192' }, { url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  other: { 'apple-mobile-web-app-title': 'زيت اند فلترز', 'apple-mobile-web-app-capable': 'yes', 'mobile-web-app-capable': 'yes', 'msapplication-TileColor': '#0f172a', 'msapplication-TileImage': '/icons/icon-192.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" style={{ scrollBehavior: 'smooth' }}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#22c55e" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="زيت اند فلترز" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {GA_MEASUREMENT_ID && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />
            <Script id="ga4-init" strategy="afterInteractive">{`
              window.dataLayer = window.dataLayer || [];
              function gtag(){window.dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}', { page_path: window.location.pathname });
            `}</Script>
          </>
        )}
      </head>
      <body className={almarai.className}>

        <SplashScreen />

        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              const ref = new URLSearchParams(window.location.search).get('ref');
              if (ref) localStorage.setItem('zf_marketer_ref', ref);
            } catch(e) {}
          })();
        `}} />

        <Suspense fallback={null}><GAProvider /></Suspense>

        <Toaster
          position="bottom-right"
          toastOptions={{ style: { fontFamily: 'inherit', borderRadius: '12px', background: '#333', color: '#fff' } }}
        />

        {/*
          StorefrontShell is a 'use client' component that reads pathname
          and only renders Navbar / Footer / Cart / Chat on non-admin routes.
          Admin routes get only {children} — clean, no overlap.
        */}
        <StorefrontShell
          navbar={<ProfessionalNavbar />}
          footer={<ProfessionalFooter />}
          cartDrawer={<CartDrawer />}
          chatWidget={<ChatWidget />}
          scrollProgress={<ScrollProgress />}
          abandonedCartTracker={<AbandonedCartTracker />}
          exitConfirm={<ExitConfirmDialog />}
        >
          {children}
        </StorefrontShell>

      </body>
    </html>
  );
}