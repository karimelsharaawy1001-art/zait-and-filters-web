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

const almarai = Almarai({ 
  subsets: ['arabic'], 
  weight: ['300', '400', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: "زيت أند فلترز | اكبر موقع لقطع غيار السيارات في مصر",
    template: "%s | زيت أند فلترز"
  },
  description: "المتجر الأول لبيع قطع غيار السيارات الأصلية في مصر. نوفر زيوت، فلاتر، تيل فرامل، سيور، وبوجيهات لأشهر الماركات (تويوتا، نيسان، كيا، هيونداي). جودة مضمونة وشحن سريع.",
  keywords: [
    "قطع غيار سيارات أصلية", 
    "قطع غيار سيارات مصر", 
    "زيوت سيارات", 
    "فلاتر سيارات", 
    "تيل فرامل أصلي", 
    "بوجيهات", 
    "سيور سيارات", 
    "زيت أند فلترز", 
    "أرخص قطع غيار في مصر",
    "قطع غيار تويوتا",
    "قطع غيار هيونداي",
    "فلاتر زيت",
    "فلاتر هواء",
    "فلاتر بنزين",
    "car spare parts Egypt",
    "MANN filters",
    "BOSCH filters"
  ],
  authors: [{ name: "Zait & Filters" }],
  creator: "Zait & Filters",
  publisher: "Zait & Filters",
  applicationName: "Zait & Filters",
  category: "Automotive Parts",
  classification: "E-commerce",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: "زيت أند فلترز | وجهتك الموثوقة لقطع غيار السيارات الأصلية",
    description: "كل ما تحتاجه سيارتك من قطع غيار أصلية وزيوت عالمية في مكان واحد. اطلب الآن واستلم في منزلك بجميع محافظات مصر.",
    url: "https://zaitandfilters.com", 
    siteName: "Zait & Filters",
    images: [
      {
        url: "https://zaitandfilters.com/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Zait & Filters - Original Car Spare Parts",
      },
    ],
    locale: "ar_EG",
    alternateLocale: "en_US",
    type: "website",
  },
  twitter: {
    card: 'summary_large_image',
    title: 'زيت أند فلترز | قطع غيار السيارات الأصلية في مصر',
    description: 'المتجر الأول لبيع قطع غيار السيارات الأصلية في مصر',
    images: ['https://zaitandfilters.com/og-image.jpg'],
  },
  alternates: {
    canonical: 'https://zaitandfilters.com',
  },
  verification: {
    google: 'your-google-verification-code',
  },
  other: {
    'apple-mobile-web-app-title': 'Zait & Filters',
    'msapplication-TileColor': '#2ecc71',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl" style={{ scrollBehavior: 'smooth' }}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#2ecc71" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {GA_MEASUREMENT_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){window.dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}', {
                  page_path: window.location.pathname,
                });
              `}
            </Script>
          </>
        )}
      </head>
      <body className={almarai.className}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
          (function() {
            try {
              const urlParams = new URLSearchParams(window.location.search);
              const ref = urlParams.get('ref');
              if (ref) {
                localStorage.setItem('zf_marketer_ref', ref);
                console.log('Affiliate ID Captured:', ref);
              }
            } catch (e) { console.error('Affiliate error:', e); }
          })();
        `,
          }}
        />

        <GAProvider />

        <CartProvider>
          <ScrollProgress />
          
          <Toaster 
            position="bottom-right"
            toastOptions={{
              style: {
                fontFamily: 'inherit',
                borderRadius: '12px',
                background: '#333',
                color: '#fff',
              },
            }}
          />
          
          <AbandonedCartTracker />
          
          <ProfessionalNavbar />
          <CartDrawer />
          
          <PageTransition>
            <main>
              {children}
            </main>
          </PageTransition>

          <ProfessionalFooter />
        </CartProvider>
      </body>
    </html>
  )
}
