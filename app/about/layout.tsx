import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'من نحن | زيت أند فلترز — أول متجر قطع غيار سيارات اونلاين في مصر',
  description: 'زيت أند فلترز — المتجر الأول لقطع غيار السيارات الأصلية في مصر. نوفر زيوت موتور، فلاتر، تيل فرامل، مساعدين وقطع غيار بضمان جودة 100% وشحن لباب البيت في جميع المحافظات بأفضل الأسعار.',
  keywords: [
    'زيت أند فلترز', 'متجر قطع غيار مصر', 'قطع غيار سيارات اونلاين مصر',
    'قطع غيار اصلية مصر', 'زيوت موتور اصلية', 'فلاتر سيارات مصر',
    'متجر سيارات اونلاين', 'افضل متجر قطع غيار مصر', 'شحن قطع غيار لباب البيت',
    'قطع غيار بضمان مصر', 'من نحن زيت وفلاتر', 'about zait and filters',
  ],
  alternates: { canonical: 'https://zaitandfilters.com/about' },
  openGraph: {
    title: 'من نحن | زيت أند فلترز',
    description: 'تعرف علينا — المتجر الأول لقطع غيار السيارات الأصلية في مصر بأسعار مناسبة وشحن سريع.',
    url: 'https://zaitandfilters.com/about',
    siteName: 'زيت أند فلترز',
    locale: 'ar_EG',
    type: 'website',
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
