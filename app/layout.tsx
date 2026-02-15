import './globals.css'
import ProfessionalNavbar from '@/components/Navbar'
import { Almarai } from 'next/font/google'
import { CartProvider } from '@/context/CartContext'
import CartDrawer from '@/components/CartDrawer'
import { Toaster } from 'react-hot-toast' // استيراد حاوية التنبيهات

const almarai = Almarai({ 
  subsets: ['arabic'], 
  weight: ['300', '400', '700', '800'],
  display: 'swap',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className={almarai.className}>
        <CartProvider>
          {/* إضافة حاوية التنبيهات في الركن السفلي الأيمن */}
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
        </CartProvider>
      </body>
    </html>
  )
}