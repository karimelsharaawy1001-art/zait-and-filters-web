import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'اتصل بنا | زيت أند فلترز — خدمة عملاء قطع غيار السيارات',
  description: 'تواصل مع فريق زيت أند فلترز لأي استفسار عن قطع غيار السيارات، الأسعار، الشحن، أو الضمان. نحن هنا لمساعدتك في الاختيار الصحيح لسيارتك.',
  keywords: [
    'اتصل بنا زيت أند فلترز', 'خدمة عملاء قطع غيار', 'واتساب قطع غيار مصر',
    'استفسار قطع غيار', 'طلب قطع غيار', 'تواصل زيت وفلاتر',
    'رقم تليفون قطع غيار مصر', 'contact zait and filters',
  ],
  alternates: { canonical: 'https://zaitandfilters.com/contact' },
  openGraph: {
    title: 'اتصل بنا | زيت أند فلترز',
    description: 'تواصل معنا لأي استفسار عن قطع غيار سيارتك — نرد في أسرع وقت.',
    url: 'https://zaitandfilters.com/contact',
    siteName: 'زيت أند فلترز',
    locale: 'ar_EG',
    type: 'website',
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
