import type { Metadata } from 'next';
import Link from 'next/link';
import { CAR_MAKES } from './[make]/page';

export const metadata: Metadata = {
  title: 'قطع غيار السيارات حسب الموديل | زيت أند فلترز مصر',
  description: 'اختر سيارتك واشتري قطع غيار أصلية — هيونداي، كيا، تويوتا، شيفروليه، نيسان، رينو، بيجو، فولكس فاجن وأكثر من 20 ماركة. شحن لباب البيت في جميع محافظات مصر.',
  keywords: [
    'قطع غيار السيارات مصر', 'قطع غيار حسب الموديل', 'قطع غيار هيونداي', 'قطع غيار كيا',
    'قطع غيار تويوتا', 'قطع غيار شيفروليه', 'قطع غيار نيسان', 'قطع غيار رينو',
    'قطع غيار بيجو', 'قطع غيار ميتسوبيشي', 'قطع غيار فولكس فاجن', 'قطع غيار سكودا',
    'قطع غيار حسب السيارة مصر', 'اختار سيارتك قطع غيار', 'قطع غيار اصلية مصر',
  ],
  alternates: { canonical: 'https://zaitandfilters.com/cars' },
  openGraph: {
    title: 'قطع غيار السيارات حسب الموديل | زيت أند فلترز',
    description: 'اختر سيارتك واشتري قطع غيار أصلية بأفضل الأسعار في مصر.',
    url: 'https://zaitandfilters.com/cars',
    siteName: 'زيت أند فلترز',
    locale: 'ar_EG',
    type: 'website',
  },
};

const MAKE_ORDER = [
  'HYUNDAI', 'KIA', 'TOYOTA', 'CHEVROLET', 'NISSAN', 'MITSUBISHI',
  'RENAULT', 'PEUGEOT', 'VOLKSWAGEN', 'SKODA', 'OPEL', 'MG',
  'HONDA', 'SUZUKI', 'MAZDA', 'SEAT', 'BMW', 'MERCEDES', 'FORD', 'JEEP',
];

export default function CarsHubPage() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'قطع غيار السيارات حسب الموديل — زيت أند فلترز',
    description: 'اختر سيارتك واشتري قطع غيار أصلية بأفضل الأسعار في مصر.',
    url: 'https://zaitandfilters.com/cars',
    publisher: { '@type': 'Organization', name: 'Zait and Filters', url: 'https://zaitandfilters.com' },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <div dir="rtl" style={{ background: '#f8fafc', minHeight: '100vh', fontFamily: 'inherit' }}>

        {/* Hero */}
        <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', padding: '48px 20px', textAlign: 'center' }}>
          <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: '900', color: '#fff', margin: '0 0 12px' }}>
            قطع غيار السيارات حسب الموديل
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', maxWidth: '560px', margin: '0 auto', lineHeight: 1.7 }}>
            اختر سيارتك وتصفح جميع القطع المتوافقة — قطع أصلية، أسعار مناسبة، شحن لباب البيت.
          </p>
        </div>

        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
            {MAKE_ORDER.map((makeKey) => {
              const info = CAR_MAKES[makeKey];
              if (!info) return null;
              return (
                <Link
                  key={makeKey}
                  href={`/cars/${makeKey.toLowerCase()}`}
                  style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: '18px', padding: '24px 16px', textDecoration: 'none', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '10px', transition: 'box-shadow 0.2s' }}
                >
                  <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#0f172a' }}>{info.arName}</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600', letterSpacing: '0.5px' }}>{makeKey}</div>
                  <div style={{ fontSize: '0.78rem', color: '#22c55e', fontWeight: '800' }}>
                    تسوق قطع غيار {info.arName}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* SEO text */}
          <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: '20px', padding: '28px', marginTop: '40px' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: '900', color: '#0f172a', margin: '0 0 12px' }}>
              قطع غيار السيارات الأصلية في مصر — زيت أند فلترز
            </h2>
            <p style={{ color: '#475569', fontSize: '0.88rem', lineHeight: 1.8, margin: 0 }}>
              زيت أند فلترز هو متجرك الأول لقطع غيار السيارات الأصلية في مصر. نوفر قطع غيار لجميع ماركات السيارات المنتشرة في مصر: هيونداي، كيا، تويوتا، شيفروليه، نيسان، ميتسوبيشي، رينو، بيجو، فولكس فاجن، سكودا، أوبل، إم جي، هوندا، سوزوكي، مازدا، سيات، BMW، مرسيدس، فورد وجيب.
              نشحن لجميع محافظات مصر مع ضمان الجودة. يمكنك الدفع بالتقسيط عبر فاليو، سهولة، لاكي، كليفر، أمان، تقسيط البنك الأهلي وحالا.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
