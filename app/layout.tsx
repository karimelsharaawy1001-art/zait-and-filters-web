import './globals.css'
import ProfessionalNavbar from '@/components/Navbar'
import ProfessionalFooter from '@/components/Footer' 
import { Almarai } from 'next/font/google'
import { CartProvider } from '@/context/CartContext'
import CartDrawer from '@/components/CartDrawer'
import { Toaster } from 'react-hot-toast'

const almarai = Almarai({ 
  subsets: ['arabic'], 
  weight: ['300', '400', '700', '800'],
  display: 'swap',
});

// --- الـ Metadata المطورة لقطع الغيار الأصلية ---
export const metadata = {
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
    "أرخص قطع غيار في مصر"
  ],
  authors: [{ name: "Zait & Filters" }],
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#2ecc71",
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
    type: "website",
  },
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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className={almarai.className}>
        {/* --- 🎯 رادار المسوقين: التقاط كود الريفيرال من اللينك وتخزينه --- */}
        <script dangerouslySetInnerHTML={{ __html: `
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
        `}} />

        <CartProvider>
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
          
          <ProfessionalNavbar />
          <CartDrawer />
          
          <main>
            {children}
          </main>

          <ProfessionalFooter />
          
        </CartProvider>
      </body>
    </html>
  )
}