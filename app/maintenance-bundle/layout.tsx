import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'طقم الصيانة الدورية | زيوت + فلاتر بسعر خاص — زيت أند فلترز',
  description: 'اشتري طقم الصيانة الدورية الكاملة لسيارتك — زيت موتور + فلتر زيت + فلتر هواء + فلتر تكييف بسعر خاص. متوفر لجميع موديلات السيارات مع شحن سريع لباب البيت في مصر.',
  keywords: [
    'طقم صيانة دورية سيارة مصر', 'عمرة زيت سيارة', 'تغيير زيت موتور بالفلتر',
    'زيت موتور وفلتر زيت مصر', 'باقة صيانة سيارة', 'سعر عمرة زيت مصر',
    'صيانة دورية اوبترا', 'صيانة دورية كروز', 'صيانة دورية النترا', 'صيانة دورية لانسر',
    'صيانة دورية كورولا', 'صيانة دورية يارس', 'صيانة دورية سيراتو',
    'طقم فلاتر وزيوت مصر', 'car service kit egypt', 'oil change kit egypt',
    'عمرة زيت بالبيت مصر', 'احسن سعر عمرة زيت', 'زيت وفلاتر مصر',
  ],
  alternates: { canonical: 'https://zaitandfilters.com/maintenance-bundle' },
  openGraph: {
    title: 'طقم الصيانة الدورية | زيت أند فلترز',
    description: 'طقم صيانة دورية كامل — زيت موتور + فلاتر بسعر خاص وشحن سريع لمنزلك.',
    url: 'https://zaitandfilters.com/maintenance-bundle',
    siteName: 'زيت أند فلترز',
    locale: 'ar_EG',
    type: 'website',
  },
};

export default function MaintenanceBundleLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
