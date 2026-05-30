import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'المدونة | نصائح صيانة السيارات في مصر — زيت أند فلترز',
  description: 'مدونة زيت أند فلترز — نصائح صيانة السيارات، متى تغير الزيت والفلاتر، كيف تختار قطع الغيار الأصلية، ودليل العناية بسيارتك في مصر.',
  keywords: [
    'نصائح صيانة سيارات مصر', 'متى اغير زيت الموتور', 'كيف تختار قطع غيار اصلية',
    'دليل صيانة السيارات', 'صيانة سيارة اوبترا', 'صيانة سيارة كروز',
    'متى اغير فلتر الزيت', 'متى اغير التيل', 'نصايح عربية مصر',
    'مدونة قطع غيار', 'blog car parts egypt', 'car maintenance tips egypt',
  ],
  alternates: { canonical: 'https://zaitandfilters.com/blog' },
  openGraph: {
    title: 'المدونة | نصائح صيانة السيارات — زيت أند فلترز',
    description: 'نصائح صيانة السيارات وأحدث المقالات عن قطع الغيار والعناية بسيارتك في مصر.',
    url: 'https://zaitandfilters.com/blog',
    siteName: 'زيت أند فلترز',
    locale: 'ar_EG',
    type: 'website',
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
