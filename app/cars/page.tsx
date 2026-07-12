import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { CAR_MAKES } from './[make]/page';
import { optimizeImageUrl } from '@/lib/images';

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

const MAKE_GRADIENTS: Record<string, string> = {
  HYUNDAI:    'linear-gradient(145deg,#002c5f,#0a4a8a)',
  KIA:        'linear-gradient(145deg,#05141f,#0d2a40)',
  TOYOTA:     'linear-gradient(145deg,#bb0000,#7a0000)',
  CHEVROLET:  'linear-gradient(145deg,#1a1a1a,#3a3a3a)',
  NISSAN:     'linear-gradient(145deg,#c3002f,#6e001a)',
  MITSUBISHI: 'linear-gradient(145deg,#cc0000,#880000)',
  RENAULT:    'linear-gradient(145deg,#efdf00,#b8a800)',
  PEUGEOT:    'linear-gradient(145deg,#0b2d78,#06194a)',
  VOLKSWAGEN: 'linear-gradient(145deg,#001e50,#00102e)',
  SKODA:      'linear-gradient(145deg,#4ba82e,#2c6819)',
  MG:         'linear-gradient(145deg,#ae0000,#6b0000)',
  OPEL:       'linear-gradient(145deg,#e8b800,#b08c00)',
  HONDA:      'linear-gradient(145deg,#cc0000,#880000)',
  SUZUKI:     'linear-gradient(145deg,#1a3a6a,#0d2040)',
  MAZDA:      'linear-gradient(145deg,#910000,#5a0000)',
  SEAT:       'linear-gradient(145deg,#222,#444)',
  BMW:        'linear-gradient(145deg,#1c69d4,#0d3f8f)',
  MERCEDES:   'linear-gradient(145deg,#333,#555)',
  FORD:       'linear-gradient(145deg,#003178,#001e50)',
  JEEP:       'linear-gradient(145deg,#2d5016,#1a2e0a)',
};

export default async function CarsHubPage() {
  // Fetch brand logos from Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: brandsData } = await supabase
    .from('car_brands')
    .select('name, logo_url');

  const logoMap: Record<string, string> = {};
  (brandsData || []).forEach((b: any) => {
    if (b.name && b.logo_url) logoMap[b.name.toUpperCase()] = b.logo_url;
  });

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
      <style>{`
        .cars-hub-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 12px;
          padding: 0 20px;
        }
        @media (max-width: 900px) {
          .cars-hub-grid { grid-template-columns: repeat(4, 1fr); }
        }
        @media (max-width: 580px) {
          .cars-hub-grid { grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 0 12px; }
        }
        .hub-card {
          border-radius: 16px;
          padding: 28px 12px 20px;
          text-decoration: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 14px;
          aspect-ratio: 3/4;
          transition: transform 0.22s cubic-bezier(.34,1.28,.64,1), box-shadow 0.22s ease;
          box-shadow: 0 4px 14px rgba(0,0,0,0.22);
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }
        .hub-card::after {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(255,255,255,0);
          transition: background 0.2s;
        }
        .hub-card:hover {
          transform: translateY(-6px) scale(1.035);
          box-shadow: 0 18px 40px rgba(0,0,0,0.32);
        }
        .hub-card:hover::after {
          background: rgba(255,255,255,0.07);
        }
        .hub-logo-wrap {
          width: 80%;
          aspect-ratio: 3/2;
          background: rgba(28,28,28,0.92);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px;
          position: relative;
          z-index: 1;
          box-shadow: 0 3px 12px rgba(0,0,0,0.18);
        }
        .hub-logo-wrap img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .hub-name {
          font-size: 0.9rem;
          font-weight: 900;
          color: #fff;
          text-align: center;
          text-shadow: 0 1px 8px rgba(0,0,0,0.4);
          position: relative;
          z-index: 1;
        }
        .hub-cta {
          font-size: 0.68rem;
          font-weight: 700;
          color: rgba(255,255,255,0.55);
          transition: color 0.18s;
          position: relative;
          z-index: 1;
        }
        .hub-card:hover .hub-cta {
          color: #ef4444;
        }
        @media (max-width: 580px) {
          .hub-card { padding: 18px 8px 14px; gap: 10px; border-radius: 12px; }
          .hub-logo-wrap { width: 75%; }
          .hub-name { font-size: 0.78rem; }
          .hub-cta { display: none; }
        }
      `}</style>

      <div dir="rtl" style={{ background: '#161616', minHeight: '100vh', fontFamily: 'inherit' }}>

        {/* Hero */}
        <div style={{ background: 'linear-gradient(135deg, #2a2a2a, #3a3a3a)', padding: '48px 20px', textAlign: 'center' }}>
          <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: '900', color: '#fff', margin: '0 0 12px' }}>
            قطع غيار السيارات حسب الموديل
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', maxWidth: '560px', margin: '0 auto', lineHeight: 1.7 }}>
            اختر سيارتك وتصفح جميع القطع المتوافقة — قطع أصلية، أسعار مناسبة، شحن لباب البيت.
          </p>
        </div>

        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 0' }}>
          <div className="cars-hub-grid">
            {MAKE_ORDER.map((makeKey) => {
              const info = CAR_MAKES[makeKey];
              if (!info) return null;
              const logoUrl = logoMap[makeKey] || null;
              const bg = MAKE_GRADIENTS[makeKey] || 'linear-gradient(145deg,#1a1a2e,#0d1117)';
              return (
                <Link key={makeKey} href={`/cars/${makeKey.toLowerCase()}`} className="hub-card" style={{ background: bg }}>
                  <div className="hub-logo-wrap">
                    {logoUrl
                      ? <img src={optimizeImageUrl(logoUrl)} alt={info.arName} loading="lazy" />
                      : <span style={{ fontSize: '0.7rem', fontWeight: '900', color: '#64748b' }}>{makeKey}</span>
                    }
                  </div>
                  <div className="hub-name">{info.arName}</div>
                  <div className="hub-cta">تصفح القطع ←</div>
                </Link>
              );
            })}
          </div>

          {/* SEO text */}
          <div style={{ background: '#1c1c1c', border: '1px solid #242424', borderRadius: '20px', padding: '28px', margin: '40px 20px 0' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: '900', color: '#f5f5f5', margin: '0 0 12px' }}>
              قطع غيار السيارات الأصلية في مصر — زيت أند فلترز
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem', lineHeight: 1.8, margin: 0 }}>
              زيت أند فلترز هو متجرك الأول لقطع غيار السيارات الأصلية في مصر. نوفر قطع غيار لجميع ماركات السيارات المنتشرة في مصر: هيونداي، كيا، تويوتا، شيفروليه، نيسان، ميتسوبيشي، رينو، بيجو، فولكس فاجن، سكودا، أوبل، إم جي، هوندا، سوزوكي، مازدا، سيات، BMW، مرسيدس، فورد وجيب.
              نشحن لجميع محافظات مصر مع ضمان الجودة. يمكنك الدفع بالتقسيط عبر فاليو، سهولة، لاكي، كليفر، أمان، تقسيط البنك الأهلي وحالا.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
