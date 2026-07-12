'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { 
  Car, ChevronLeft, ChevronRight, Zap, ShoppingCart, 
  Globe, Settings2, Calendar, Flame, 
  LayoutGrid, Tags, Sparkles, Shield, TrendingUp
} from 'lucide-react';
import { m, useInView, AnimatePresence } from 'framer-motion';
import { useCart } from '@/context/CartContext'; 
import toast from 'react-hot-toast'; 
import { optimizeImageUrl } from '@/lib/images'; 


const Select = dynamic(() => import('react-select'), { 
  ssr: false,
  loading: () => <div style={{ height: '52px', backgroundColor: '#161616', borderRadius: '12px', display: 'flex', alignItems: 'center', padding: '0 15px', color: '#999' }}>جاري التحميل...</div>
});


// ─── Customer Reviews Data ────────────────────────────────────────────────────
const ALL_REVIEWS = [
  { name: 'طارق شوقي',     text: 'أخيرا لقينا موقع بيبيع قطع الغيار وبيقبل فاليو وشركات التقسيط عامة', rating: 5 },
  { name: 'وليد منصور',    text: 'البوجيهات أصلية واستهلاك البنزين اتظبط عندي', rating: 5 },
  { name: 'حسن فهمي',      text: 'أسعاركم أرخص من السوق والمنتجات مضمونة 100%', rating: 5 },
  { name: 'MOHAMED HUSSIEN', text: 'تيل الفرامل ركبته ومفيش أي تصفير، جودة محترمة', rating: 5 },
  { name: 'منى السيد',     text: 'زيت الفتيس فرق معايا جدا في النقلات، شكرا ليكم', rating: 5 },
  { name: 'AHMED EZZAT',   text: 'السعر غالي شوية بس الجودة كويسة', rating: 4 },
  { name: 'شادي علي',      text: 'أحسن موقع أشتري منه قطع غيار، أسعاركم ممتازة', rating: 5 },
  { name: 'ALI MABROUK',   text: 'شكرًا ليكم على السرعة والاهتمام، التجربة كانت ممتازة', rating: 5 },
  { name: 'إبراهيم رمضان', text: 'خدمة ممتازة والموقع سهل لأي حد يطلب منه', rating: 5 },
  { name: 'عمر رضوان',     text: 'الأسعار مناسبة جدًا مقابل الجودة', rating: 5 },
  { name: 'محمود سالم',    text: 'المنتجات أصلية وواضح فيها فرق الجودة', rating: 5 },
  { name: 'SHERIF HASSAN', text: 'من أفضل المواقع اللي اتعاملت معاها في قطع الغيار', rating: 5 },
  { name: 'دعاء يوسف',     text: 'شكرًا على المصداقية والالتزام في كل التفاصيل', rating: 5 },
  { name: 'KARIM ELALFY',  text: 'الموقع وفر عليا وقت كبير بدل النزول واللف', rating: 5 },
  { name: 'عمر سالم',      text: 'التعامل كان محترم من بداية الطلب للنهاية', rating: 5 },
  { name: 'سامح رضوان',    text: 'الموقع ممتاز للناس اللي بتدور على جودة وثقة', rating: 5 },
];
const REVIEWS_ROW1 = ALL_REVIEWS.slice(0, 8);
const REVIEWS_ROW2 = ALL_REVIEWS.slice(8);

// Avatar color palette — assigns a consistent color per name
const AVATAR_COLORS = ['#dc2626','#0284c7','#a78bfa','#db2777','#d97706','#0891b2','#dc2626','#65a30d'];
function avatarColor(name: string) {
  const seed = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[seed % AVATAR_COLORS.length];
}
function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1,2,3,4,5].map(i => (
        <svg key={i} width="13" height="13" viewBox="0 0 24 24" fill={i <= rating ? '#f59e0b' : '#2a2a2a'}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ))}
    </div>
  );
}

function ReviewCard({ r }: { r: typeof ALL_REVIEWS[0] }) {
  const bg = avatarColor(r.name);
  return (
    <div style={{
      flexShrink: 0,
      width: '290px',
      margin: '0 8px',
      background: '#1c1c1c',
      border: '1px solid #242424',
      borderRadius: '18px',
      padding: '18px 20px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      direction: 'rtl',
    }}>
      <StarRow rating={r.rating} />
      <p style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: '1.6', fontWeight: '600', margin: 0, flex: 1 }}>
        "{r.text}"
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.72rem', fontWeight: '900', color: '#fff', letterSpacing: '0.5px' }}>
          {initials(r.name)}
        </div>
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#f5f5f5', lineHeight: 1.2 }}>{r.name}</div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '600', marginTop: '1px' }}>عميل موثق ✓</div>
        </div>
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────


// ─── Google Play Announcement Banner ─────────────────────────────────────────
// Drop-in replacement for the GooglePlayBanner function in your homepage file.
//
// Detection strategy (any ONE of these = hide the banner):
//
//  1. ?source=app  in the URL  →  your app opens URLs with this param
//  2. ?source=pwa  in the URL  →  installed PWA opens URLs with this param
//  3. display-mode: standalone  →  PWA running in standalone / fullscreen
//  4. display-mode: fullscreen
//  5. Android WebView UA signals:
//       • "wv" flag inside parentheses  e.g. (Linux; Android 13; ... wv)
//       • "Version/X.X" right before "Chrome"  (old Android WebView pattern)
//  6. Custom header your app can inject into the WebView UA:
//       • "ZaitApp/1.0"  (add one line in your Android WebView setup)
//
// To make detection 100% reliable on Android, add this to your WebView config:
//   webView.settings.userAgentString += " ZaitApp/1.0"
// Then option 6 will always fire for your app users.

function GooglePlayBanner() {
  const [visible, setVisible] = useState(true);
  const [isInApp, setIsInApp] = useState(true); // default true = hidden until we confirm it's a browser

  useEffect(() => {
    const ua = navigator.userAgent || '';
    const params = new URLSearchParams(window.location.search);

    const inApp =
      // 1 & 2. Explicit source param (most reliable — add to every link your app opens)
      params.get('source') === 'app' ||
      params.get('source') === 'pwa' ||

      // 3 & 4. PWA standalone / fullscreen mode
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||

      // 5a. Android WebView: UA contains "; wv)" flag
      /\bwv\b/.test(ua) ||

      // 5b. Android WebView older pattern: "Version/X.X Chrome/..."
      /Version\/\d+\.\d+.*Chrome\/\d/.test(ua) ||

      // 6. Custom UA string injected by your app's WebView (recommended)
      ua.includes('ZaitApp/');

    setIsInApp(inApp);
  }, []);

  if (!visible || isInApp) return null;

  return (
    <m.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      style={{
        background: 'linear-gradient(135deg, #0a1628 0%, #0f2040 50%, #0a1628 100%)',
        borderBottom: '1px solid rgba(34,197,94,0.3)',
        position: 'relative',
        overflow: 'hidden',
        direction: 'rtl',
      }}
    >
      {/* Decorative glow blobs */}
      <div style={{ position: 'absolute', top: '-30px', right: '15%', width: '180px', height: '180px', background: 'radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-30px', left: '10%', width: '140px', height: '140px', background: 'radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{
        maxWidth: '1200px', margin: '0 auto',
        padding: '12px 16px',
        display: 'flex', alignItems: 'center',
        gap: '12px',
        position: 'relative', zIndex: 1,
        direction: 'rtl',
      }}>

        {/* Google Play icon box */}
        <div style={{
          width: '46px', height: '46px', borderRadius: '12px', flexShrink: 0,
          background: '#1c1c1c',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M3.18 23.76c.3.17.64.24.99.19l13.2-11.94L13.94 8.6 3.18 23.76z" fill="#EA4335"/>
            <path d="M20.82 10.42l-3.35-1.92-3.53 3.19 3.53 3.19 3.38-1.94a1.36 1.36 0 0 0 0-2.52z" fill="#FBBC04"/>
            <path d="M3.18.24A1.36 1.36 0 0 0 2.5 1.4v21.2c0 .48.26.9.68 1.16L14.06 12 3.18.24z" fill="#4285F4"/>
            <path d="M4.17.05l9.77 11.95 3.53-3.19L4.17.05A1.36 1.36 0 0 0 3.18.24l-.01-.01.99-.18z" fill="#34A853"/>
            <path d="M3.18.24l.99-.19L4.17.05 3.18.24z" fill="#34A853"/>
          </svg>
        </div>

        {/* Text block */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            background: 'rgba(34,197,94,0.18)', border: '1px solid rgba(34,197,94,0.4)',
            borderRadius: '20px', padding: '2px 9px', marginBottom: '4px',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#e50914', display: 'inline-block', animation: 'gplayPulse 1.6s ease-in-out infinite', flexShrink: 0 }} />
            <span style={{ fontSize: '0.68rem', fontWeight: '900', color: '#e50914', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>🎉 جديد — تطبيقنا الرسمي على Google Play!</span>
          </div>
          <div style={{ color: '#fff', fontWeight: '800', fontSize: '0.9rem', lineHeight: '1.35' }}>
            حمّل تطبيق Zait &amp; Filters الآن
          </div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', fontWeight: '600', marginTop: '1px' }}>
            تسوق أسرع · عروض حصرية · إشعارات فورية
          </div>
        </div>

        {/* CTA button */}
        <a
          href="https://play.google.com/store/apps/details?id=com.app.hangmangame"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flexShrink: 0,
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'linear-gradient(135deg, #e50914, #dc2626)',
            color: '#fff', padding: '9px 16px', borderRadius: '10px',
            fontWeight: '900', fontSize: '0.82rem', textDecoration: 'none',
            boxShadow: '0 4px 12px rgba(34,197,94,0.4)',
            whiteSpace: 'nowrap',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><path d="M3.18 23.76c.3.17.64.24.99.19l13.2-11.94L13.94 8.6 3.18 23.76z"/><path d="M20.82 10.42l-3.35-1.92-3.53 3.19 3.53 3.19 3.38-1.94a1.36 1.36 0 0 0 0-2.52z"/><path d="M3.18.24A1.36 1.36 0 0 0 2.5 1.4v21.2c0 .48.26.9.68 1.16L14.06 12 3.18.24z"/><path d="M4.17.05l9.77 11.95 3.53-3.19L4.17.05A1.36 1.36 0 0 0 3.18.24l-.01-.01.99-.18z"/></svg>
          حمّل الآن
        </a>

        {/* Close button */}
        <button
          onClick={() => setVisible(false)}
          aria-label="إغلاق"
          style={{
            flexShrink: 0,
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '8px', width: '30px', height: '30px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem',
          }}
        >✕</button>

      </div>
    </m.div>
  );
}


// Optimized Scroll Reveal Component
function ScrollReveal({ children, delay = 0, direction = 'up' }: { children: React.ReactNode; delay?: number; direction?: 'up' | 'down' | 'left' | 'right' }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const directions = { up: { y: 40, x: 0 }, down: { y: -40, x: 0 }, left: { x: 40, y: 0 }, right: { x: -40, y: 0 } };
  return (
    <m.div ref={ref} initial={{ opacity: 0, ...directions[direction] }} animate={isInView ? { opacity: 1, y: 0, x: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}>
      {children}
    </m.div>
  );
}


// SEO: Structured Data Component
function StructuredData() {
  const organizationSchema = {
    '@context': 'https://schema.org', '@type': 'AutoPartsStore',
    name: 'Zait and Filters | زيت أند فلترز', description: 'المتجر الأول لبيع قطع غيار السيارات الأصلية في مصر',
    url: 'https://zaitandfilters.com', logo: 'https://zaitandfilters.com/logo.png',
    image: 'https://zaitandfilters.com/og-image.jpg', telephone: '+201023862436',
    email: 'orders@sales.zaitandfilters.com',
    address: { '@type': 'PostalAddress', addressCountry: 'EG', addressLocality: 'Cairo', addressRegion: 'Cairo' },
    priceRange: '$$', currenciesAccepted: 'EGP', paymentAccepted: 'Cash, Credit Card, Debit Card', openingHours: 'Mo-Sa 09:00-21:00',
  };
  const websiteSchema = {
    '@context': 'https://schema.org', '@type': 'WebSite', name: 'Zait and Filters', url: 'https://zaitandfilters.com',
    potentialAction: { '@type': 'SearchAction', target: 'https://zaitandfilters.com/store?q={search_term_string}', 'query-input': 'required name=search_term_string' },
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [{ '@type': 'ListItem', position: 1, name: 'الرئيسية', item: 'https://zaitandfilters.com' }],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
    </>
  );
}


// ─── Search Card ──────────────────────────────────────────────────────────────
function SearchCard({
  selectLoaded, makesOptions, modelsOptions, selectedMake, selectedModel,
  selectedYear, setSelectedMake, setSelectedModel, setSelectedYear, handleSearch, customSelectStyles,
}: any) {
  return (
    <>
      <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: '900', textAlign: 'center' }}>
        ابحث بمواصفات سيارتك
      </h3>
      {selectLoaded && (
        <>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#9ca3af', marginBottom: '6px', display: 'block' }}>الماركة</label>
            <Select instanceId="make-select" options={makesOptions}
              styles={{ ...customSelectStyles, menuPortal: (base: any) => ({ ...base, zIndex: 10000 }) }}
              menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
              menuPosition="fixed"
              placeholder="اختر الماركة"
              isRtl={true} isSearchable={false} value={selectedMake} onChange={(opt: any) => setSelectedMake(opt)}
              formatOptionLabel={(brand: any) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {brand.logo ? <img src={optimizeImageUrl(brand.logo)} alt="" style={{ width: '22px', height: '22px', objectFit: 'contain' }} /> : <Car size={20} color="#ccc" />}
                  <span>{brand.label}</span>
                </div>
              )}
            />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#9ca3af', marginBottom: '6px', display: 'block' }}>الموديل</label>
            <Select instanceId="model-select" options={modelsOptions}
              styles={{ ...customSelectStyles, menuPortal: (base: any) => ({ ...base, zIndex: 10000 }) }}
              menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
              menuPosition="fixed"
              placeholder="اختر الموديل"
              isRtl={true} isSearchable={false} value={selectedModel} isDisabled={!selectedMake}
              onChange={(opt: any) => setSelectedModel(opt)} />
          </div>
        </>
      )}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#9ca3af', marginBottom: '6px', display: 'block' }}>سنة الصنع</label>
        <input type="text" placeholder="مثلاً: 2024" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          style={{ width: '100%', height: '52px', padding: '0 15px', backgroundColor: '#161616', border: 'none', borderRadius: '12px', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }} />
      </div>
      <button onClick={handleSearch}
        style={{ width: '100%', marginTop: '15px', backgroundColor: '#1c1c1c', color: '#fff', border: 'none', padding: '16px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', fontSize: '1.1rem' }}>
        بحث الآن <ChevronLeft size={22} />
      </button>
    </>
  );
}


// ─── Categories Grid ──────────────────────────────────────────────────────────
function CategoriesGrid({ categories }: { categories: any[] }) {
  if (categories.length === 0) return null;
  return (
    <>
      <style>{`
        .cat-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          padding: 0 20px;
        }
        @media (max-width: 768px) {
          .cat-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            padding: 0 12px;
          }
        }
        .cat-card {
          position: relative;
          border-radius: 16px;
          overflow: hidden;
          aspect-ratio: 3/4;
          cursor: pointer;
          text-decoration: none;
          display: block;
          box-shadow: 0 4px 18px rgba(0,0,0,0.13);
          transition: transform 0.22s cubic-bezier(.34,1.28,.64,1), box-shadow 0.22s ease;
          background: #1a1a1a;
        }
        .cat-card:hover {
          transform: translateY(-5px) scale(1.025);
          box-shadow: 0 12px 36px rgba(0,0,0,0.22);
        }
        .cat-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.35s ease;
        }
        .cat-card:hover img {
          transform: scale(1.07);
        }
        .cat-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to top,
            rgba(0,0,0,0.82) 0%,
            rgba(0,0,0,0.45) 45%,
            rgba(0,0,0,0.18) 100%
          );
          transition: background 0.22s ease;
        }
        .cat-card:hover .cat-overlay {
          background: linear-gradient(
            to top,
            rgba(0,0,0,0.88) 0%,
            rgba(0,0,0,0.52) 45%,
            rgba(0,0,0,0.22) 100%
          );
        }
        .cat-label {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 14px 10px 14px;
  text-align: center;
  color: #fff;
  font-size: 1.3rem !important;
  font-weight: 900;
  line-height: 1.3;
  text-shadow: 0 2px 10px rgba(0,0,0,0.8);
  letter-spacing: -0.2px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.cat-label-arrow {
  display: block;
  font-size: 3rem;
  font-weight: 700;
  color: #e50914;
  letter-spacing: 0.04em;
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 0.2s ease, transform 0.2s ease;
}
        .cat-card:hover .cat-label-arrow {
          opacity: 1;
          transform: translateY(0);
        }
        @media (max-width: 768px) {
          .cat-label {
            font-size: 1.3rem;
            padding: 10px 6px 10px;
          }
          .cat-label-arrow { display: none; }
          .cat-card { border-radius: 12px; }
        }
      `}</style>
      <div className="cat-grid">
        {categories.map((cat) => (
          <Link
            key={cat.name}
            href={`/categories/${encodeURIComponent(cat.name)}`}
            className="cat-card"
          >
            <img src={optimizeImageUrl(cat.image)} alt={cat.name} loading="lazy" width="200" height="267" decoding="async" />
            <div className="cat-overlay" />
            <div className="cat-label">
              {cat.name}
              <div className="cat-label-arrow">تصفح ←</div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}


export default function HomePage() {
  const router = useRouter();
  const { addToCart, cartItems } = useCart(); 
  const scrollRef = useRef<HTMLDivElement>(null);
  const bestSellerRef = useRef<HTMLDivElement>(null); 

  const [isMounted, setIsMounted] = useState(false);
  const [selectLoaded, setSelectLoaded] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [makesOptions, setMakesOptions] = useState<any[]>([]); 
  const [modelsOptions, setModelsOptions] = useState<any[]>([]);
  const [selectedMake, setSelectedMake] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState<any>(null);
  const [selectedYear, setSelectedYear] = useState('');
  const [loading, setLoading] = useState(true);
  const [brandLogos, setBrandLogos] = useState<any[]>([]);
  const [slides, setSlides] = useState<any[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [saleProducts, setSaleProducts] = useState<any[]>([]);
  const [bestSellers, setBestSellers] = useState<any[]>([]); 
  const [loadingMessage, setLoadingMessage] = useState(0);
  const [homeBanner, setHomeBanner] = useState<any>(null);
  const [garageMode, setGarageMode] = useState(false);
  const [userCar, setUserCar] = useState<any>(null);

  const loadingMessages = [
    { icon: <Shield size={22} color="#e50914" />, text: 'منتجات أصلية 100%' },
    { icon: <Sparkles size={22} color="#e50914" />, text: 'أفضل الأسعار في السوق' },
    { icon: <TrendingUp size={22} color="#e50914" />, text: 'توصيل سريع لجميع المحافظات' },
  ];

  useEffect(() => {
    setIsMounted(true);
    setSelectLoaded(true); 
    fetchInitialData();
    fetchGarageData();
    fetchHomeBanner();
    const syncGarageMode = () => { setGarageMode(localStorage.getItem('garageMode') === 'true'); };
    syncGarageMode();
    window.addEventListener('garageModeChanged', syncGarageMode);
    const messageInterval = setInterval(() => { setLoadingMessage((prev) => (prev + 1) % loadingMessages.length); }, 1500);
    return () => { clearInterval(messageInterval); window.removeEventListener('garageModeChanged', syncGarageMode); };
  }, []);

  useEffect(() => {
    if (slides.length > 1) {
      const timer = setInterval(() => { setCurrentSlide((prev) => (prev + 1) % slides.length); }, 6000);
      return () => clearInterval(timer);
    }
  }, [slides]);

  useEffect(() => {
    if (selectedMake) fetchModels(selectedMake.value);
    else { setModelsOptions([]); setSelectedModel(null); }
  }, [selectedMake]);

  const isValidImg = (url: any) => url && String(url).trim().startsWith('http');

  async function fetchGarageData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('user_garage').select('*').eq('user_id', user.id).maybeSingle();
        if (data) setUserCar(data);
      }
    } catch (err) { console.error('Garage fetch error:', err); }
  }

  async function fetchHomeBanner() {
    try {
      const { data } = await supabase.from('home_banners').select('*').eq('is_active', true)
        .order('updated_at', { ascending: false }).limit(1).maybeSingle();
      if (data) setHomeBanner(data);
    } catch (err) { console.error('Banner fetch error:', err); }
  }

  async function fetchInitialData() {
    try {
      setLoading(true);
      const [heroRes, customImgRes, partBrandsRes, carBrandsRes, makesRes] = await Promise.all([
        supabase.from('hero_settings').select('*').order('id', { ascending: true }),
        supabase.from('category_images').select('name, image_url'),
        supabase.from('part_brands').select('name, logo_url').neq('logo_url', ''),
        supabase.from('car_brands').select('name, logo_url'),
        supabase.from('products').select('car_make').not('car_make', 'is', null)
      ]);
      if (heroRes.data) setSlides(heroRes.data);
      if (partBrandsRes.data) setBrandLogos(partBrandsRes.data);

      const [allProductsRes, saleProductsRes] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('products').select('*').gt('sale_price', 0).order('sale_order', { ascending: true, nullsFirst: false }),
      ]);

      if (allProductsRes.error) console.error('Products fetch error:', allProductsRes.error);
      const products = allProductsRes.data || [];
      const customImages = customImgRes.data || [];

      if (products.length > 0) {
        const rawSale = (saleProductsRes.data || []).filter(
          (p: any) => Number(p.sale_price) > 0 && Number(p.regular_price) > Number(p.sale_price) && isValidImg(p.image_url)
        );
        rawSale.sort((a: any, b: any) => {
          if (a.sale_order != null && b.sale_order != null) return a.sale_order - b.sale_order;
          if (a.sale_order != null) return -1;
          if (b.sale_order != null) return 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        setSaleProducts(rawSale);

        const { data: orders } = await supabase.from('orders').select('items').limit(100);
        const productCounts: Record<string, number> = {};
        orders?.forEach((order: any) => { order.items?.forEach((item: any) => { productCounts[item.id] = (productCounts[item.id] || 0) + (item.quantity || 1); }); });
        const sortedBestIds = Object.entries(productCounts).sort(([, a], [, b]) => b - a).map(([id]) => id);
        let bestSellersList = sortedBestIds.map(id => products.find(p => p.id === id)).filter(p => p && isValidImg(p.image_url));
        if (bestSellersList.length < 4) {
          bestSellersList = [...bestSellersList, ...products.filter(p => !bestSellersList.find(b => b?.id === p.id) && isValidImg(p.image_url))];
        }
        setBestSellers(bestSellersList);
        const uniqueCats = Array.from(new Set(products.map(i => i.category?.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "ar"));
        setCategories(uniqueCats.map(cat => {
          const imgObj = customImages.find((img: any) => img.name?.trim().toUpperCase() === cat.toUpperCase());
          const prodObj = products.find(p => p.category?.trim().toUpperCase() === cat.toUpperCase() && isValidImg(p.image_url));
          return { name: cat, image: imgObj?.image_url || prodObj?.image_url || "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=500" };
        }));
      }
      if (carBrandsRes.data && makesRes.data) {
        const uniqueMakes = Array.from(new Set(makesRes.data.map((i: any) => i.car_make?.trim()).filter(Boolean))).sort() as string[];
        setMakesOptions(uniqueMakes.map(makeName => {
          const brandInfo = carBrandsRes.data?.find((b: any) => b.name?.trim().toLowerCase() === makeName.toLowerCase());
          return { value: makeName, label: makeName, logo: brandInfo?.logo_url || null };
        }));
      }
    } catch (err) { console.error('Fetch error:', err); }
    finally { setTimeout(() => setLoading(false), 800); }
  }

  async function fetchModels(make: string) {
    try {
      const { data } = await supabase.from('products').select('car_model').ilike('car_make', make.trim()).not('car_model', 'is', null);
      if (data) {
        const uniqueModels = Array.from(new Set(data.map((i: any) => i.car_model?.trim()).filter(Boolean))).sort();
        setModelsOptions(uniqueModels.map(m => ({ value: m, label: m })));
      }
    } catch (err) { console.error('Error fetching models:', err); }
  }

  const HOME_CAR_MAKE_AR: Record<string, string> = {
    TOYOTA: 'تويوتا', HYUNDAI: 'هيونداي', KIA: 'كيا', NISSAN: 'نيسان',
    CHEVROLET: 'شيفروليه', MITSUBISHI: 'ميتسوبيشي', VOLKSWAGEN: 'فولكس-فاجن',
    SKODA: 'سكودا', PEUGEOT: 'بيجو', RENAULT: 'رينو', OPEL: 'اوبل',
    MG: 'ام-جي', MAZDA: 'مازدا', SEAT: 'سيات', HONDA: 'هوندا',
    SUZUKI: 'سوزوكي', BMW: 'بي-ام-دبليو', MERCEDES: 'مرسيدس',
    FORD: 'فورد', JEEP: 'جيب',
  };

  const HOME_CAR_MODEL_AR: Record<string, string> = {
    AVEO: 'افيو', CAPTIVA: 'كابتيفا', CRUZE: 'كروز', LANOS: 'لانوس', OPTRA: 'اوبترا',
    ACCENT: 'اكسنت', ELANTRA: 'النترا', 'GRAND I10': 'جراند-i10', I10: 'i10',
    MATRIX: 'ماتريكس', TUCSON: 'توسان', VERNA: 'فيرنا',
    CARENS: 'كارينز', 'CERATO LD': 'سيراتو-ld', 'CERATO TD': 'سيراتو-td',
    'CERATO K3': 'سيراتو-k3', 'GRAND CERATO': 'جراند-سيراتو',
    PICANTO: 'بيكانتو', RIO: 'ريو', SOUL: 'سول', SPORTAGE: 'سبورتاج',
    QASHQAI: 'قاشقاي', SENTRA: 'سنترا', 'SUNNY N16': 'صني-n16', 'SUNNY N17': 'صني-n17', TIIDA: 'تيدا',
    ASTRA: 'استرا', INSIGNIA: 'انسيجنيا',
    ECLIPSE: 'اكليبس', 'LANCER PUMA': 'لانسر-بوما', 'LANCER SHARK': 'لانسر-شارك',
    CAPTUR: 'كابتشر', CLIO: 'كليو', DUSTER: 'داستر', FLUENCE: 'فلوانس',
    KADJAR: 'كادجار', LOGAN: 'لوجان', MEGANE: 'ميجان', SANDERO: 'سانديرو',
    IBIZA: 'ابيزا', LEON: 'ليون', TOLEDO: 'توليدو',
    'OCTAVIA A4': 'اوكتافيا-a4', 'OCTAVIA A5': 'اوكتافيا-a5',
    'OCTAVIA A7': 'اوكتافيا-a7', 'OCTAVIA A8': 'اوكتافيا-a8',
    COROLLA: 'كورولا', YARIS: 'يارس',
    PASSAT: 'باسات', GOLF: 'جولف', JETTA: 'جيتا',
    '2008': '2008', '3008': '3008', '508': '508', '308': '308', '5008': '5008',
    HS: 'hs', RX5: 'rx5', ZS: 'zs',
  };

  const handleSearch = () => {
    const query = new URLSearchParams();
    if (selectedMake) {
      const makeVal = selectedMake.value.trim().toUpperCase();
      query.set('make', HOME_CAR_MAKE_AR[makeVal] || makeVal.toLowerCase());
    }
    if (selectedModel) {
      const modelVal = selectedModel.value.trim().toUpperCase();
      query.set('model', HOME_CAR_MODEL_AR[modelVal] || modelVal.toLowerCase().replace(/\s+/g, '-'));
    }
    if (selectedYear) query.set('year', selectedYear.trim());
    router.push(`/store?${query.toString()}`);
  };

  const scroll = (ref: any, direction: 'left' | 'right') => {
    if (ref.current) {
      const { scrollLeft, clientWidth } = ref.current;
      ref.current.scrollTo({ left: direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth, behavior: 'smooth' });
    }
  };

  const customSelectStyles = {
    control: (base: any) => ({ ...base, height: '52px', borderRadius: '12px', border: '1px solid #2a2a2a', backgroundColor: '#161616', fontSize: '1rem', textAlign: 'right', display: 'flex', flexDirection: 'row-reverse', cursor: 'pointer' }),
    option: (base: any, state: any) => ({ ...base, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'row-reverse', gap: '8px', padding: '10px 15px', fontSize: '0.95rem', backgroundColor: state.isFocused ? '#2a0f10' : '#161616', color: '#f5f5f5', cursor: 'pointer' }),
    singleValue: (base: any) => ({ ...base, color: '#f5f5f5', display: 'flex', alignItems: 'center', gap: '8px', flexDirection: 'row-reverse' }),
    placeholder: (base: any) => ({ ...base, color: '#9ca3af' }),
    input: (base: any) => ({ ...base, color: '#f5f5f5' }),
    valueContainer: (base: any) => ({ ...base, padding: '0 12px', display: 'flex', flexDirection: 'row-reverse' }),
    menu: (base: any) => ({ ...base, zIndex: 10000, backgroundColor: '#161616', border: '1px solid #2a2a2a' }),
    menuList: (base: any) => ({ ...base, maxHeight: '250px', backgroundColor: '#161616' })
  };

  if (!isMounted) return null;

  const filteredSaleProducts = garageMode && userCar 
    ? saleProducts.filter(p => 
        (p.car_make?.toUpperCase() === userCar.make?.toUpperCase() && 
         p.car_model?.toUpperCase() === userCar.model?.toUpperCase()) ||
        (!p.car_make || p.car_make?.toUpperCase() === 'UNIVERSAL' || p.car_make?.toUpperCase() === 'عام')
      ).slice(0, 6)
    : saleProducts.slice(0, 6);

  const filteredBestSellers = garageMode && userCar
    ? bestSellers.filter(p => 
        (p.car_make?.toUpperCase() === userCar.make?.toUpperCase() && 
         p.car_model?.toUpperCase() === userCar.model?.toUpperCase()) ||
        (!p.car_make || p.car_make?.toUpperCase() === 'UNIVERSAL' || p.car_make?.toUpperCase() === 'عام')
      ).slice(0, 6)
    : bestSellers.slice(0, 6);

  const activeSlide = slides[currentSlide] ?? {};

  const searchCardProps = {
    selectLoaded, makesOptions, modelsOptions, selectedMake, selectedModel, selectedYear,
    setSelectedMake, setSelectedModel, setSelectedYear, handleSearch, customSelectStyles,
  };


  return (
    <>
      <StructuredData />

      <div style={{ direction: 'rtl', backgroundColor: '#161616', color: '#f5f5f5', minHeight: '100vh', fontSize: '13px' }}>

        {loading && (
          <m.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} style={fullPageLoaderStyle}>
            <div style={{ textAlign: 'center', maxWidth: '480px', width: '100%', padding: '0 24px', boxSizing: 'border-box' }}>
              <m.h1 initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6, ease: 'easeOut' }} style={brandNameText}>
                <span style={{ color: '#fff' }}>ZAIT</span>
                <span style={{ color: '#22c55e' }}>&nbsp;&amp; FILTERS</span>
              </m.h1>
              <m.h2 initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.6 }} style={mainHeadline}>قطع الغيار بضغطة زرار</m.h2>
              <m.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35, duration: 0.6 }} style={tagline}>وجهتك الأولى لقطع غيار السيارات الأصلية في مصر</m.p>
              <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} style={loadingBarContainer}>
                <m.div initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: 1.5, ease: 'easeInOut' }} style={loadingBar} />
              </m.div>
              <m.div key={loadingMessage} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4 }} style={messageContainer}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                  {loadingMessages[loadingMessage].icon}
                  <span style={messageText}>{loadingMessages[loadingMessage].text}</span>
                </div>
              </m.div>
              <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} style={featurePills}>
                <div style={pill}><Shield size={16} color="#e50914" /><span>ضمان الجودة</span></div>
                <div style={pill}><Sparkles size={16} color="#e50914" /><span>أسعار تنافسية</span></div>
                <div style={pill}><TrendingUp size={16} color="#e50914" /><span>شحن مجاني</span></div>
              </m.div>
            </div>
          </m.div>
        )}

        <style dangerouslySetInnerHTML={{ __html: `
          * { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
          @keyframes pageLoad { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideIn  { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
          @keyframes slideUp  { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes shimmer  { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
          @keyframes badgePulse {
            0%, 100% { box-shadow: 0 0 6px 2px rgba(255,200,0,0.45), 0 2px 8px rgba(0,0,0,0.25); }
            50%       { box-shadow: 0 0 14px 5px rgba(255,200,0,0.75), 0 2px 8px rgba(0,0,0,0.25); }
          }
          @keyframes gplayPulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50%       { opacity: 0.5; transform: scale(0.85); }
          }

          /* ── Reviews marquee ── */
          @keyframes reviewsMarquee1 { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
          @keyframes reviewsMarquee2 { 0% { transform: translateX(-50%); } 100% { transform: translateX(0); } }

          .badge-asli {
            position: absolute; top: 8px; left: 8px;
            background: linear-gradient(120deg, #b8860b 0%, #ffd700 25%, #fffacd 50%, #ffd700 75%, #b8860b 100%);
            background-size: 200% auto;
            animation: shimmer 2.5s linear infinite, badgePulse 2s ease-in-out infinite;
            color: #3d2200; padding: 3px 8px; border-radius: 6px; font-size: 0.65rem; font-weight: 900;
            z-index: 11; letter-spacing: 0.5px; border: 1px solid rgba(255,215,0,0.7);
            text-shadow: 0 1px 0 rgba(255,255,255,0.6);
          }

          .page-container { animation: pageLoad 0.4s ease-out; }

          /* hero-section height is now in globals.css — no override needed here */
          .hero-bg-layer { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
          .hero-bg-slide { position: absolute; inset: 0; background-size: cover; background-position: center; opacity: 0; transition: opacity 0.8s ease-in-out; }
          .hero-bg-slide.active { opacity: 1; }

          @media (min-width: 769px) {
            /* height already set in globals.css */
            .hero-content-layer { position: absolute; inset: 0; z-index: 10; display: flex; align-items: center; }
            .hero-inner { width: 100%; max-width: 1300px; margin: 0 auto; padding: 40px 50px; display: flex; flex-direction: row; gap: 60px; align-items: center; justify-content: space-between; direction: rtl; }
            .hero-text { flex: 1; direction: rtl; text-align: right; display: flex; flex-direction: column; align-items: flex-end; animation: slideIn 0.6s ease-out 0.15s both; }
            .hero-text-title { width: 100%; }
            .hero-text h1 { font-size: 5rem !important; font-weight: 900 !important; line-height: 1.2 !important; margin: 0 0 22px 0 !important; color: #e50914 !important; direction: rtl !important; text-align: right !important; text-shadow: 0 2px 0 rgba(0,0,0,0.5), 0 4px 24px rgba(0,0,0,0.9), 0 0 60px rgba(0,0,0,0.6) !important; letter-spacing: -1.5px !important; width: 100% !important; display: block !important; }
            .hero-text p { font-size: 1.45rem !important; font-weight: 700 !important; line-height: 1.7 !important; color: #fff !important; direction: rtl !important; text-align: right !important; text-shadow: 0 2px 16px rgba(0,0,0,0.95) !important; margin: 0 0 36px 0 !important; max-width: 580px !important; display: block !important; width: 100% !important; }
            .hero-cta-btn { display: inline-flex !important; align-items: center !important; justify-content: center !important; gap: 12px !important; padding: 20px 56px !important; background-color: #e50914 !important; color: #fff !important; border-radius: 18px !important; text-decoration: none !important; font-weight: 900 !important; font-size: 1.35rem !important; letter-spacing: -0.3px !important; box-shadow: 0 10px 40px rgba(34,197,94,0.55) !important; transition: all 0.25s ease !important; white-space: nowrap !important; align-self: flex-end !important; }
            .hero-cta-btn:hover { background-color: #dc2626 !important; transform: translateY(-3px) !important; box-shadow: 0 16px 50px rgba(34,197,94,0.65) !important; }
            .hero-card-desktop { width: 400px; flex-shrink: 0; background: #1c1c1c; color: #f5f5f5; padding: 30px; border-radius: 30px; box-shadow: 0 20px 50px rgba(0,0,0,0.35); animation: slideUp 0.6s ease-out 0.25s both; align-self: center; }
            .hero-card-mobile { display: none; }
          }

          @media (max-width: 768px) {
            /* position: relative so hero-section height grows with content */
            .hero-content-layer { position: relative; z-index: 10; display: flex; align-items: flex-start; padding-top: 20px; padding-bottom: 32px; }
            .hero-inner { width: 100%; padding: 0 18px; box-sizing: border-box; display: flex; flex-direction: column; gap: 20px; direction: rtl; }
            .hero-text { direction: rtl; text-align: right; display: flex; flex-direction: column; align-items: flex-end; width: 100%; }
            .hero-text-title { width: 100%; }
            .hero-text h1 { font-size: 2.2rem !important; font-weight: 900 !important; line-height: 1.25 !important; margin: 0 0 10px 0 !important; color: #e50914 !important; direction: rtl !important; text-align: right !important; text-shadow: 0 2px 0 rgba(0,0,0,0.5), 0 4px 20px rgba(0,0,0,0.98), 0 0 40px rgba(0,0,0,0.8) !important; letter-spacing: -0.5px !important; width: 100% !important; display: block !important; }
            .hero-text p { font-size: 1rem !important; font-weight: 700 !important; line-height: 1.55 !important; color: #fff !important; direction: rtl !important; text-align: right !important; text-shadow: 0 2px 14px rgba(0,0,0,0.98) !important; margin: 0 0 16px 0 !important; width: 100% !important; display: block !important; }
            .hero-cta-btn { display: flex !important; align-items: center !important; justify-content: center !important; gap: 10px !important; width: 100% !important; padding: 16px 24px !important; background-color: #e50914 !important; color: #fff !important; border-radius: 16px !important; text-decoration: none !important; font-weight: 900 !important; font-size: 1.1rem !important; box-shadow: 0 8px 28px rgba(34,197,94,0.45) !important; }
            .hero-card-desktop { display: none; }
            .hero-card-mobile { width: 100%; box-sizing: border-box; background: #1c1c1c; color: #f5f5f5; padding: 16px 16px 18px; border-radius: 22px; box-shadow: 0 12px 36px rgba(0,0,0,0.3); }
          }

          @media (max-width: 380px) {
            .hero-content-layer { padding-top: 14px; gap: 18px; }
            .hero-inner { gap: 18px; }
            .hero-text h1 { font-size: 1.9rem !important; }
            .hero-text p { font-size: 1.05rem !important; }
            .hero-cta-btn { font-size: 1.1rem !important; padding: 17px 20px !important; }
          }

          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

          .product-grid-carousel { display: flex !important; flex-wrap: nowrap !important; gap: 18px; overflow-x: auto !important; scroll-snap-type: x mandatory; padding: 12px 20px 20px; -webkit-overflow-scrolling: touch; }
          .product-card-mdrn {
            flex: 0 0 270px !important; min-width: 270px !important; max-width: 270px !important;
            background: #1c1c1c;
            border-radius: 22px;
            border: 1px solid rgba(0,0,0,0.07);
            box-shadow: 0 4px 24px rgba(0,0,0,0.07);
            transition: transform 0.28s cubic-bezier(.4,0,.2,1), box-shadow 0.28s cubic-bezier(.4,0,.2,1), border-color 0.2s;
            position: relative; display: flex; flex-direction: column; overflow: hidden;
            scroll-snap-align: start;
          }
          .product-card-mdrn:hover { transform: translateY(-8px); box-shadow: 0 24px 60px rgba(34,197,94,0.18); border-color: rgba(34,197,94,0.4); }
          .img-container { background: #242424; height: 210px; width: 100%; position: relative; cursor: pointer; overflow: hidden; display: block; }
          /* Override globals.css height so image fills the container with no gap */
          .img-container .img-fill-100 { height: 100% !important; transition: transform 0.38s cubic-bezier(.4,0,.2,1); }
          .img-container:hover .img-fill-100 { transform: scale(1.07); }
          .card-brand-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
          .card-brand { color:#e50914; font-weight:800; font-size:0.75rem; letter-spacing:0.5px; text-transform:uppercase; }
          .card-origin { font-size:0.7rem; color:#888; font-weight:700; display:flex; align-items:center; gap:3px; }
          /* Allow up to 3 lines — no fixed height so long names show fully */
          .card-name { font-size:0.92rem; font-weight:900; color:#f5f5f5; line-height:1.45; overflow:hidden; margin-bottom:10px; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; }
          .card-compat { display:inline-flex; align-items:center; gap:5px; background:#1a0d0d; border:1px solid #7f1d1d; border-radius:20px; padding:4px 10px; font-size:0.72rem; font-weight:800; color:#f87171; margin-bottom:8px; max-width:100%; overflow:hidden; }
          .card-compat span, .card-cat span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0; }
          .card-cat { display:inline-flex; align-items:center; gap:4px; background:#161616; border:1px solid #2a2a2a; border-radius:20px; padding:3px 9px; font-size:0.7rem; font-weight:700; color:#94a3b8; max-width:100%; overflow:hidden; }
          /* Price: main amount + ج.م on same line, old price + save badge below */
          .card-price-block { margin:10px 0 4px; }
          .card-price-row { display:flex; align-items:baseline; gap:6px; flex-wrap:nowrap; }
          .card-price-main { font-size:1.35rem; font-weight:900; color:#f5f5f5; white-space:nowrap; }
          .card-price-currency { font-size:0.85rem; font-weight:800; color:#f5f5f5; white-space:nowrap; }
          .card-price-meta { display:flex; align-items:center; gap:6px; margin-top:4px; flex-wrap:wrap; }
          .card-price-old { font-size:0.78rem; color:#aaa; text-decoration:line-through; font-weight:600; white-space:nowrap; }
          .card-save { font-size:0.68rem; font-weight:800; color:#fff; background:#ef4444; border-radius:6px; padding:2px 7px; white-space:nowrap; }
          .card-btn-buy { width:100%; padding:13px; background:linear-gradient(135deg,#e50914 0%,#dc2626 100%); color:#fff; border:none; border-radius:12px; font-weight:900; font-size:0.95rem; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:7px; text-decoration:none; transition:all 0.2s; box-shadow:0 6px 20px rgba(34,197,94,0.35); letter-spacing:0.2px; }
          .card-btn-buy:hover { background:linear-gradient(135deg,#dc2626 0%,#b91c1c 100%); box-shadow:0 10px 28px rgba(34,197,94,0.5); transform:translateY(-1px); }
          .card-btn-cart { width:100%; padding:11px; background:#2a2a2a; color:#fff; border:none; border-radius:12px; font-weight:700; font-size:0.88rem; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:7px; text-decoration:none; transition:background 0.2s; }
          .card-btn-cart:hover { background:#3a3a3a; }

          @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
          .marquee-inner   { display: flex; width: max-content; animation: marquee 35s linear infinite; }
          .brand-logo-wrap { width: 180px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; padding: 10px 25px; }
          .logo-img-v3     { max-width: 130px; max-height: 60px; filter: brightness(0) invert(1); opacity: 0.85; transition: 0.3s; }
          .logo-img-v3:hover { opacity: 1; transform: scale(1.1); }

          .features-strip { display: grid; grid-template-columns: 1fr auto 1fr auto 1fr auto 1fr; align-items: center; padding: 20px 0; }
          .feature-item { display: flex; align-items: center; gap: 14px; padding: 12px 16px; justify-content: center; }
          .feature-icon-wrap { width: 52px; height: 52px; border-radius: 14px; background: #1a0d0d; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
          .feature-text { display: flex; flex-direction: column; gap: 2px; }
          .feature-title { font-size: 0.88rem; font-weight: 900; color: #f5f5f5; line-height: 1.3; }
          .feature-sub   { font-size: 0.75rem; font-weight: 600; color: #888; line-height: 1.3; }
          .feature-divider { width: 1px; height: 48px; background: #242424; flex-shrink: 0; }

          @media (max-width: 768px) {
            .features-strip { grid-template-columns: 1fr 1fr; gap: 0; padding: 8px 0; }
            .feature-divider { display: none; }
            .feature-item { padding: 14px 10px; border-bottom: 1px solid #1c1c1c; justify-content: flex-start; }
            .feature-item:nth-child(odd)  { border-right: 1px solid #1c1c1c; }
            .feature-item:nth-last-child(-n+2) { border-bottom: none; }
            .feature-icon-wrap { width: 42px; height: 42px; border-radius: 11px; }
            .feature-title { font-size: 0.8rem; }
            .feature-sub   { font-size: 0.68rem; }
          }

          .home-banner-section { max-width: 1200px; margin: 0 auto; padding: 16px 20px; }
          .dual-banner-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

          /* ── Banner animations ── */
          @keyframes bn-gradient-maint { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
          @keyframes bn-gradient-promo { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
          @keyframes bn-shimmer-move { 0%{transform:translateX(-150%) skewX(-20deg)} 100%{transform:translateX(350%) skewX(-20deg)} }
          @keyframes bn-gear-spin { 0%{transform:translateY(-50%) rotate(0deg)} 100%{transform:translateY(-50%) rotate(360deg)} }
          @keyframes bn-drop-float { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-8px) scale(1.05)} }
          @keyframes bn-chart-float { 0%,100%{transform:translateY(-50%) translateX(0)} 50%{transform:translateY(-50%) translateX(-6px)} }
          @keyframes bn-coin-spin { 0%,100%{transform:rotateY(0deg) translateY(0)} 50%{transform:rotateY(180deg) translateY(-6px)} }
          @keyframes bn-particle { 0%{transform:translateY(0) scale(1);opacity:0.6} 100%{transform:translateY(-60px) scale(0);opacity:0} }
          @keyframes bn-title-in { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }

          /* Maintenance banner */
          .bn-maintenance { }
          .bn-bg-maint { position:absolute;inset:0;background:linear-gradient(135deg,#052e16,#7f1d1d,#991b1b,#b91c1c,#0f4c20);background-size:300% 300%;animation:bn-gradient-maint 6s ease infinite; }
          /* Promoter banner */
          .bn-bg-promo { position:absolute;inset:0;background:linear-gradient(135deg,#2a2a2a,#1e1b4b,#312e81,#1e3a5f,#2a2a2a);background-size:300% 300%;animation:bn-gradient-promo 6s ease infinite 1s; }
          /* Shimmer sweep on both */
          .bn-shimmer { position:absolute;inset:0;pointer-events:none;overflow:hidden;border-radius:inherit; }
          .bn-shimmer::after { content:'';position:absolute;top:0;left:0;width:60%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent);animation:bn-shimmer-move 3.5s ease-in-out infinite; }
          /* Icons */
          .bn-icon-gear { position:absolute;left:-10px;top:50%;width:170px;height:170px;opacity:0.1;pointer-events:none;animation:bn-gear-spin 20s linear infinite; }
          .bn-icon-drop { position:absolute;right:14px;bottom:8px;width:72px;height:72px;opacity:0.15;pointer-events:none;animation:bn-drop-float 4s ease-in-out infinite; }
          .bn-icon-chart { position:absolute;left:-4px;top:50%;width:155px;height:155px;opacity:0.1;pointer-events:none;animation:bn-chart-float 5s ease-in-out infinite; }
          .bn-icon-coin { position:absolute;right:14px;bottom:10px;width:78px;height:78px;opacity:0.13;pointer-events:none;animation:bn-coin-spin 6s ease-in-out infinite; }
          /* Floating particles */
          .bn-particles { position:absolute;inset:0;pointer-events:none;overflow:hidden; }
          .bp { position:absolute;width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,0.3);animation:bn-particle 4s ease-in infinite; }
          .bp.green { background:rgba(34,197,94,0.4); }
          .bp1{left:20%;bottom:10%;animation-delay:0s}
          .bp2{left:45%;bottom:20%;animation-delay:1s}
          .bp3{left:65%;bottom:8%;animation-delay:2s}
          .bp4{left:80%;bottom:15%;animation-delay:1.5s}
          /* Pills */
          .bn-pill { display:inline-flex;align-items:center;gap:6px;border-radius:20px;padding:5px 14px;margin-bottom:12px;font-size:0.78rem;font-weight:800;letter-spacing:0.4px; }
          .bn-pill-gold { background:rgba(251,191,36,0.18);border:1px solid rgba(251,191,36,0.45);color:#fde047; }
          .bn-pill-green { background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.4);color:#f87171; }
          /* Title animation */
          .bn-title { animation:bn-title-in 0.6s ease-out both; }
          /* CTAs */
          .bn-cta-gold { background:linear-gradient(135deg,#fbbf24,#f59e0b)!important;color:#f5f5f5!important;font-weight:900!important;transition:all 0.2s!important; }
          .bn-cta-gold:hover { background:linear-gradient(135deg,#fcd34d,#fbbf24)!important;transform:translateY(-2px)!important;box-shadow:0 8px 20px rgba(251,191,36,0.4)!important; }
          .bn-cta-green { background:linear-gradient(135deg,#e50914,#dc2626)!important;transition:all 0.2s!important; }
          .bn-cta-green:hover { background:linear-gradient(135deg,#f87171,#e50914)!important;transform:translateY(-2px)!important;box-shadow:0 8px 20px rgba(34,197,94,0.45)!important; }
          /* Hover lift */
          .bn-maintenance:hover .bn-icon-gear { animation-duration:5s; }
          .bn-promoter:hover .bn-icon-coin { animation-duration:2s; }
          .home-banner-inner { position: relative; width: 100%; height: 260px; border-radius: 20px; overflow: hidden; cursor: pointer; box-shadow: 0 8px 30px rgba(0,0,0,0.15); transition: transform 0.3s ease, box-shadow 0.3s ease; }
          .home-banner-inner:hover { transform: translateY(-3px); box-shadow: 0 16px 44px rgba(0,0,0,0.22); }
          @media (max-width: 640px) {
            .dual-banner-grid { grid-template-columns: 1fr; gap: 12px; }
            .home-banner-inner { height: 200px; border-radius: 16px; }
          }
          .home-banner-bg  { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
          .home-banner-overlay { position: absolute; inset: 0; background: linear-gradient(to left, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.82) 60%, rgba(0,0,0,0.88) 100%); }
          .home-banner-content { position: absolute; inset: 0; display: flex; align-items: center; justify-content: flex-start; padding: 0 48px; direction: rtl; }
          .home-banner-text-block { text-align: right; max-width: 72%; }
          .home-banner-title { color: #fff; font-size: 3.2rem; font-weight: 900; line-height: 1.15; text-shadow: 0 4px 24px rgba(0,0,0,0.9), 0 2px 0 rgba(0,0,0,0.6); margin: 0 0 12px; letter-spacing: -1.5px; }
          .home-banner-subtitle { color: rgba(255,255,255,0.97); font-size: 1.35rem; font-weight: 700; text-shadow: 0 2px 14px rgba(0,0,0,0.85); margin: 0 0 22px; line-height: 1.5; }
          .home-banner-cta { display: inline-flex; align-items: center; gap: 7px; background: #e50914; color: #fff; padding: 13px 28px; border-radius: 12px; font-size: 1.05rem; font-weight: 900; text-decoration: none; box-shadow: 0 4px 16px rgba(34,197,94,0.45); transition: background 0.2s, transform 0.2s, box-shadow 0.2s; border: none; cursor: pointer; white-space: nowrap; }
          .home-banner-cta:hover { background: #dc2626; transform: translateY(-1px); box-shadow: 0 6px 22px rgba(34,197,94,0.55); }

          @media (max-width: 768px) {
            .home-banner-section { padding: 12px 12px; }
            .home-banner-inner   { height: 200px; border-radius: 16px; }
            .home-banner-overlay { background: linear-gradient(to left, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.82) 60%, rgba(0,0,0,0.9) 100%); }
            .home-banner-content { align-items: center; justify-content: flex-start; padding: 0 22px; }
            .home-banner-text-block { text-align: right; max-width: 88%; }
            .home-banner-title    { font-size: 2rem; margin-bottom: 8px; letter-spacing: -0.5px; }
            .home-banner-subtitle { font-size: 1.1rem; margin-bottom: 16px; }
            .home-banner-cta      { padding: 10px 22px; font-size: 0.95rem; }
          }

          @media (max-width: 480px) {
            .home-banner-inner    { height: 190px; }
            .home-banner-title    { font-size: 1.65rem; }
            .home-banner-subtitle { font-size: 0.95rem; }
            .loader-brand-name { font-size: 2.4rem !important; letter-spacing: -1px !important; margin-bottom: 16px !important; }
            .loader-headline   { font-size: 1.6rem !important; margin-bottom: 12px !important; }
            .loader-tagline    { font-size: 0.95rem !important; margin-bottom: 28px !important; }
          }

          @media (max-width: 768px) {
            .img-fill-100 { height: 140px !important; }
            .product-grid-carousel { display: grid !important; grid-template-columns: repeat(2,1fr) !important; gap: 12px !important; padding: 10px !important; overflow-x: visible !important; }
            .product-card-mdrn { flex: 0 0 100% !important; min-width: 0 !important; max-width: 100% !important; width: 100% !important; border-radius: 16px !important; }
            .card-name { font-size: 0.82rem !important; height: 46px !important; }
            .card-btn-buy { padding: 11px !important; font-size: 0.82rem !important; }
            .card-btn-cart { padding: 9px !important; font-size: 0.78rem !important; }
          }
          /* Car make cards hover */
          a[href^="/cars/"]:hover {
            background: rgba(34,197,94,0.1) !important;
            border-color: rgba(34,197,94,0.35) !important;
          }
        `}} />


        {!loading && (
          <div className="page-container">

            {/* ══ GOOGLE PLAY ANNOUNCEMENT BANNER ══════════════════════════════ */}
            <GooglePlayBanner />
            {/* ════════════════════════════════════════════════════════════════ */}

            <section className="hero-section">
              <div className="hero-bg-layer">
                {slides.map((slide, index) => (
                  <div key={index} className={`hero-bg-slide ${index === currentSlide ? 'active' : ''}`}>
                    {/* Real <img> on index 0 so browser discovers & preloads the LCP image immediately */}
                    {index === 0 && slide.bg_image_url ? (
                      <>
                        <img
                          src={optimizeImageUrl(slide.bg_image_url)}
                          alt=""
                          fetchPriority="high"
                          loading="eager"
                          decoding="async"
                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
                        />
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} />
                      </>
                    ) : (
                      <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(rgba(0,0,0,0.6),rgba(0,0,0,0.6)),url("${slide.bg_image_url}")`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                    )}
                  </div>
                ))}
              </div>
              <div className="hero-content-layer">
                <div className="hero-inner">
                  <div className="hero-text" dir="rtl">
                    <div className="hero-text-title" dir="rtl">
                      {activeSlide.title && <h1 dir="rtl">{activeSlide.title.replace(/<[^>]*>/g, '')}</h1>}
                      {activeSlide.subtitle && <p dir="rtl">{activeSlide.subtitle}</p>}
                    </div>
                    <Link href={activeSlide.button_link || '/store'} className="hero-cta-btn">
                      {activeSlide.button_text || 'تصفح المتجر'} ←
                    </Link>
                  </div>
                  <div className="hero-card-desktop"><SearchCard {...searchCardProps} /></div>
                  <div className="hero-card-mobile"><SearchCard {...searchCardProps} /></div>
                </div>
              </div>
            </section>

            {/* Brand Logos */}
            {brandLogos.length > 0 && (
              <ScrollReveal direction="up" delay={0.05}>
                <section style={{ padding: '14px 0', background: 'linear-gradient(90deg, #7f1d1d 0%, #b91c1c 50%, #7f1d1d 100%)', borderTop: '1px solid #8b0000', borderBottom: '1px solid #8b0000', boxShadow: 'inset 0 0 30px rgba(0,0,0,0.35)' }}>
                  <div style={{ overflow: 'hidden', direction: 'ltr' }}>
                    <div className="marquee-inner">
                      {[...brandLogos, ...brandLogos].map((brand, index) => (
                        <div key={index} className="brand-logo-wrap">
                          <Link href={`/store?brand=${brand.name}`}>
                            <img src={optimizeImageUrl(brand.logo_url)} alt={brand.name} className="logo-img-v3" loading="lazy"/>
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </ScrollReveal>
            )}

            {/* ══ CUSTOMER REVIEWS ════════════════════════════════════════════ */}
            <ScrollReveal direction="up" delay={0.06}>
              <section style={{ background: '#0a0a0a', padding: '52px 0 56px', borderBottom: '1px solid #242424' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
                  <div style={{ textAlign: 'center', marginBottom: '38px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#1a0d0d', border: '1px solid #7f1d1d', borderRadius: '20px', padding: '6px 18px', marginBottom: '14px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#dc2626', letterSpacing: '0.05em' }}>⭐ آراء عملاؤنا</span>
                    </div>
                    <h2 style={{ fontSize: '2.1rem', fontWeight: '900', color: '#f5f5f5', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
                      بيثقوا فينا ليه؟
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '1rem', fontWeight: '600', margin: 0 }}>
                      أكتر من 20,000+ عميل سعيد بتجربته معانا
                    </p>
                  </div>
                  <div style={{ overflow: 'hidden', marginBottom: '14px', direction: 'ltr' }}>
                    <div style={{ display: 'flex', width: 'max-content', animation: 'reviewsMarquee1 40s linear infinite' }}>
                      {[...REVIEWS_ROW1, ...REVIEWS_ROW1].map((r, i) => (
                        <ReviewCard key={`r1-${i}`} r={r} />
                      ))}
                    </div>
                  </div>
                  <div style={{ overflow: 'hidden', direction: 'ltr' }}>
                    <div style={{ display: 'flex', width: 'max-content', animation: 'reviewsMarquee2 44s linear infinite' }}>
                      {[...REVIEWS_ROW2, ...REVIEWS_ROW2].map((r, i) => (
                        <ReviewCard key={`r2-${i}`} r={r} />
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            </ScrollReveal>
            {/* ════════════════════════════════════════════════════════════════ */}

            {/* HOME BANNERS — maintenance bundle + promoters program side by side */}
            <ScrollReveal direction="up" delay={0.07}>
              <div className="home-banner-section">
                <div className="dual-banner-grid">

                  {/* ── Maintenance Bundle Banner ── */}
                  <Link href="/maintenance-bundle" style={{ textDecoration: 'none', display: 'block' }}>
                    <div className="home-banner-inner bn-maintenance">
                      {/* Animated gradient background */}
                      <div className="bn-bg-maint" />
                      {/* Shimmer sweep */}
                      <div className="bn-shimmer" />
                      {/* Animated floating gear */}
                      <div className="bn-icon-gear">
                        <svg viewBox="0 0 100 100" fill="white">
                          <path d="M50 30a20 20 0 1 0 0 40 20 20 0 0 0 0-40zm0 32a12 12 0 1 1 0-24 12 12 0 0 1 0 24z"/>
                          <path d="M88 42h-5.4a33.5 33.5 0 0 0-3.5-8.4l3.8-3.8a4 4 0 0 0 0-5.7L77.9 20a4 4 0 0 0-5.7 0l-3.8 3.8A33.5 33.5 0 0 0 60 20.4V15a4 4 0 0 0-4-4h-12a4 4 0 0 0-4 4v5.4a33.5 33.5 0 0 0-8.4 3.5l-3.8-3.8a4 4 0 0 0-5.7 0l-4 4a4 4 0 0 0 0 5.7l3.8 3.8A33.5 33.5 0 0 0 18.4 42H13a4 4 0 0 0-4 4v12a4 4 0 0 0 4 4h5.4a33.5 33.5 0 0 0 3.5 8.4l-3.8 3.8a4 4 0 0 0 0 5.7l4 4a4 4 0 0 0 5.7 0l3.8-3.8a33.5 33.5 0 0 0 8.4 3.5V89a4 4 0 0 0 4 4h12a4 4 0 0 0 4-4v-5.4a33.5 33.5 0 0 0 8.4-3.5l3.8 3.8a4 4 0 0 0 5.7 0l4-4a4 4 0 0 0 0-5.7l-3.8-3.8a33.5 33.5 0 0 0 3.5-8.4H88a4 4 0 0 0 4-4V46a4 4 0 0 0-4-4z"/>
                        </svg>
                      </div>
                      {/* Animated oil drop */}
                      <div className="bn-icon-drop">
                        <svg viewBox="0 0 64 64" fill="white">
                          <path d="M32 4C32 4 10 28 10 40a22 22 0 0 0 44 0C54 28 32 4 32 4zm0 54a16 16 0 0 1-16-16c0-8.5 10-24 16-32 6 8 16 23.5 16 32a16 16 0 0 1-16 16z"/>
                          <ellipse cx="24" cy="42" rx="4" ry="6" opacity="0.4"/>
                        </svg>
                      </div>
                      {/* Floating particles */}
                      <div className="bn-particles">
                        <span className="bp bp1"/><span className="bp bp2"/><span className="bp bp3"/><span className="bp bp4"/>
                      </div>
                      {/* Content */}
                      <div className="home-banner-content" style={{ direction: 'rtl', padding: '0 clamp(18px,4vw,40px)' }}>
                        <div style={{ width: '100%' }}>
                          <div className="bn-pill bn-pill-gold">🔧 باقات الصيانة الدورية</div>
                          <p className="home-banner-title bn-title" style={{ fontSize: 'clamp(1.2rem,3vw,2rem)', marginBottom: '8px' }}>
                            صيّن عربيتك و وفر فلوسك
                          </p>
                          <p className="home-banner-subtitle" style={{ fontSize: 'clamp(0.78rem,1.5vw,1rem)', marginBottom: '16px', color: 'rgba(255,255,255,0.85)' }}>
                            باقات زيوت + فلاتر + قطع غيار أصلية بسعر مجمّع
                          </p>
                          <span className="home-banner-cta bn-cta-gold">اختار باقتك الآن ←</span>
                        </div>
                      </div>
                    </div>
                  </Link>

                  {/* ── Promoters Program Banner ── */}
                  <Link href="/affiliate" style={{ textDecoration: 'none', display: 'block' }}>
                    <div className="home-banner-inner bn-promoter">
                      {/* Animated gradient background */}
                      <div className="bn-bg-promo" />
                      {/* Shimmer sweep */}
                      <div className="bn-shimmer" />
                      {/* Animated chart */}
                      <div className="bn-icon-chart">
                        <svg viewBox="0 0 100 100" fill="white">
                          <rect x="8" y="58" width="14" height="34" rx="3"/>
                          <rect x="28" y="42" width="14" height="50" rx="3"/>
                          <rect x="48" y="26" width="14" height="66" rx="3"/>
                          <rect x="68" y="12" width="14" height="80" rx="3"/>
                          <polyline points="15,53 35,37 55,21 75,7" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <circle cx="75" cy="7" r="5" fill="white"/>
                        </svg>
                      </div>
                      {/* Animated coin */}
                      <div className="bn-icon-coin">
                        <svg viewBox="0 0 64 64" fill="none">
                          <circle cx="32" cy="32" r="28" stroke="white" strokeWidth="4"/>
                          <circle cx="32" cy="32" r="19" stroke="white" strokeWidth="2" opacity="0.4"/>
                          <text x="32" y="41" textAnchor="middle" fontSize="24" fontWeight="900" fill="white" fontFamily="serif">$</text>
                        </svg>
                      </div>
                      {/* Floating particles */}
                      <div className="bn-particles">
                        <span className="bp bp1 green"/><span className="bp bp2 green"/><span className="bp bp3"/><span className="bp bp4 green"/>
                      </div>
                      {/* Content */}
                      <div className="home-banner-content" style={{ direction: 'rtl', padding: '0 clamp(18px,4vw,40px)' }}>
                        <div style={{ width: '100%' }}>
                          <div className="bn-pill bn-pill-green">💸 Promoters Program</div>
                          <p className="home-banner-title bn-title" style={{ fontSize: 'clamp(1.2rem,3vw,2rem)', marginBottom: '8px' }}>
                            اكسب مع كل بيعة!
                          </p>
                          <p className="home-banner-subtitle" style={{ fontSize: 'clamp(0.78rem,1.5vw,1rem)', marginBottom: '16px', color: 'rgba(255,255,255,0.85)' }}>
                            Commission تصل إلى 20% على كل طلب بكودك
                          </p>
                          <span className="home-banner-cta bn-cta-green">سجل كـ Promoter الآن ←</span>
                        </div>
                      </div>
                    </div>
                  </Link>

                </div>
              </div>
            </ScrollReveal>

            {/* Offers Section */}
            {saleProducts.length > 0 && (
              <ScrollReveal direction="up" delay={0.1}>
                <section style={{ padding: '25px 0', maxWidth: '1200px', margin: '0 auto' }}>
                  <div style={{ padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '15px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ff4d4d', marginBottom: '4px' }}>
                        <Zap size={16} fill="#ff4d4d" />
                        <span style={{ fontWeight: '800', fontSize: '0.85rem' }}>{garageMode && userCar ? `عروض لسيارتك ${userCar.make}` : 'أقوى الخصومات'}</span>
                      </div>
                      <h2 style={{ fontSize: '1.8rem', fontWeight: '900', margin: 0 }}>عروض حصرية 🔥</h2>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <Link href="/store?filter=sales" style={{ color: '#e50914', fontWeight: '800', textDecoration: 'none', marginLeft: '15px', fontSize: '0.9rem' }}>عرض الكل</Link>
                      <button onClick={() => scroll(scrollRef, 'right')} style={arrowBtnSmall}><ChevronRight size={14}/></button>
                      <button onClick={() => scroll(scrollRef, 'left')} style={arrowBtnSmall}><ChevronLeft size={14}/></button>
                    </div>
                  </div>
                  <div ref={scrollRef} className="no-scrollbar product-grid-carousel">
                    {filteredSaleProducts.map((p) => {
                      const isAsli = ['اصلي','أصلي','original'].includes((p.country_origin || p.country_of_origin || p.origin || '').trim().toLowerCase());
                      const discPct = Math.round(((p.regular_price - p.sale_price) / p.regular_price) * 100);
                      const univ = ['universal','عام','all','الكل',''];
                      const mk = (p.car_make||'').trim(); const mo = (p.car_model||'').trim();
                      const compatText = univ.includes(mk.toLowerCase()) ? 'جميع السيارات' : `${mk}${univ.includes(mo.toLowerCase())?'':' '+mo}`;
                      return (
                        <div key={p.id} className="product-card-mdrn">
                          {/* Discount badge */}
                          <div style={{ position:'absolute', top:'12px', right:'12px', background:'linear-gradient(135deg,#ef4444,#dc2626)', color:'#fff', padding:'4px 10px', borderRadius:'20px', fontSize:'0.72rem', fontWeight:'900', zIndex:10, boxShadow:'0 4px 12px rgba(239,68,68,0.4)', letterSpacing:'0.3px' }}>
                            خصم {discPct}%
                          </div>
                          {isAsli && <div className="badge-asli">✦ أصلي</div>}
                          <Link href={`/products/${p.id}`} className="img-container">
                            <img src={optimizeImageUrl(p.image_url)} alt={p.name} className="img-fill-100" loading="lazy" width="300" height="200" decoding="async" />
                          </Link>
                          <div style={{ padding:'16px', flex:1, display:'flex', flexDirection:'column' }}>
                            <div className="card-brand-row">
                              <span className="card-brand">{p.brand}</span>
                              {isAsli && <span style={{fontSize:'0.68rem',color:'#fbbf24',fontWeight:'800',background:'#242424',padding:'2px 7px',borderRadius:'10px'}}>✦ أصلي</span>}
                            </div>
                            <h3 className="card-name">{p.name}</h3>
                            <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginBottom:'10px'}}>
                              <span className="card-compat"><Car size={11}/><span>{compatText}</span></span>
                              {p.category && <span className="card-cat"><LayoutGrid size={10}/><span>{p.category}</span></span>}
                            </div>
                            <div className="card-price-block">
                              <div className="card-price-row">
                                <span className="card-price-main">{p.sale_price}</span>
                                <span className="card-price-currency">ج.م</span>
                              </div>
                              <div className="card-price-meta">
                                <span className="card-price-old">{p.regular_price} ج.م</span>
                                <span className="card-save">وفّرت {(p.regular_price - p.sale_price).toFixed(0)} ج.م</span>
                              </div>
                            </div>
                            <div style={{ marginTop:'auto', display:'flex', flexDirection:'column', gap:'8px', paddingTop:'10px' }}>
                              {(() => {
                                const cartItem = cartItems.find((i: any) => i.id === p.id);
                                const qty = cartItem?.quantity ?? 0;
                                if (qty > 0) return (
                                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'#1a0d0d', border:'2px solid #e50914', borderRadius:'12px', padding:'6px 10px', marginBottom:'2px' }}>
                                    <button onClick={(e) => { e.preventDefault(); addToCart({...p, price: p.sale_price}, -1); }} style={{ width:'32px', height:'32px', borderRadius:'8px', border:'none', background:'#e50914', color:'#fff', fontSize:'1.2rem', fontWeight:'900', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
                                    <span style={{ fontSize:'1.1rem', fontWeight:'900', color:'#dc2626' }}>{qty} <span style={{fontSize:'0.65rem',fontWeight:'700'}}>في السلة</span></span>
                                    <button onClick={(e) => { e.preventDefault(); addToCart({...p, price: p.sale_price}, 1); }} style={{ width:'32px', height:'32px', borderRadius:'8px', border:'none', background:'#e50914', color:'#fff', fontSize:'1.2rem', fontWeight:'900', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
                                  </div>
                                );
                                return (
                                  <button className="card-btn-cart" onClick={(e) => { e.preventDefault(); addToCart({...p, price: p.sale_price}, 1); toast.success('تمت الإضافة للسلة ✓'); }}>
                                    <ShoppingCart size={15}/> أضف إلى السلة
                                  </button>
                                );
                              })()}
                              <Link href={`/checkout?buyNow=true&productId=${p.id}&price=${p.sale_price}`} className="card-btn-buy" onClick={() => { addToCart({...p, price: p.sale_price}, 1); }}>
                                ⚡ اشتري الآن
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </ScrollReveal>
            )}

            {/* Trending Section */}
            {bestSellers.length > 0 && (
              <ScrollReveal direction="up" delay={0.15}>
                <section style={{ padding: '25px 0', maxWidth: '1200px', margin: '0 auto', background: '#1c1c1c', borderRadius: '30px' }}>
                  <div style={{ padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '15px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#e50914', marginBottom: '4px' }}>
                        <Flame size={16} fill="#e50914" />
                        <span style={{ fontWeight: '800', fontSize: '0.85rem' }}>{garageMode && userCar ? `تريند لسيارتك ${userCar.make}` : 'الأكثر طلباً'}</span>
                      </div>
                      <h2 style={{ fontSize: '1.8rem', fontWeight: '900', margin: 0 }}>تريند الآن 🔥</h2>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button onClick={() => scroll(bestSellerRef, 'right')} style={arrowBtnSmall}><ChevronRight size={14}/></button>
                      <button onClick={() => scroll(bestSellerRef, 'left')} style={arrowBtnSmall}><ChevronLeft size={14}/></button>
                    </div>
                  </div>
                  <div ref={bestSellerRef} className="no-scrollbar product-grid-carousel">
                    {filteredBestSellers.map((p) => {
                      const isAsli = ['اصلي','أصلي','original'].includes((p.country_origin || p.country_of_origin || p.origin || '').trim().toLowerCase());
                      const itemPrice = p.sale_price || p.regular_price;
                      const hasSale = p.sale_price > 0 && p.regular_price > p.sale_price;
                      const univ = ['universal','عام','all','الكل',''];
                      const mk = (p.car_make||'').trim(); const mo = (p.car_model||'').trim();
                      const compatText = univ.includes(mk.toLowerCase()) ? 'جميع السيارات' : `${mk}${univ.includes(mo.toLowerCase())?'':' '+mo}`;
                      return (
                        <div key={p.id} className="product-card-mdrn">
                          {/* Trending badge */}
                          <div style={{ position:'absolute', top:'12px', right:'12px', background:'linear-gradient(135deg,#e50914,#dc2626)', color:'#fff', padding:'4px 10px', borderRadius:'20px', fontSize:'0.7rem', fontWeight:'900', zIndex:10, boxShadow:'0 4px 12px rgba(34,197,94,0.4)' }}>
                            🔥 تريند
                          </div>
                          {isAsli && <div className="badge-asli">✦ أصلي</div>}
                          <Link href={`/products/${p.id}`} className="img-container">
                            <img src={optimizeImageUrl(p.image_url)} alt={p.name} className="img-fill-100" loading="lazy" width="300" height="200" decoding="async" />
                          </Link>
                          <div style={{ padding:'16px', flex:1, display:'flex', flexDirection:'column' }}>
                            <div className="card-brand-row">
                              <span className="card-brand">{p.brand}</span>
                              {isAsli && <span style={{fontSize:'0.68rem',color:'#fbbf24',fontWeight:'800',background:'#242424',padding:'2px 7px',borderRadius:'10px'}}>✦ أصلي</span>}
                            </div>
                            <h3 className="card-name">{p.name}</h3>
                            <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginBottom:'10px'}}>
                              <span className="card-compat"><Car size={11}/><span>{compatText}</span></span>
                              {p.category && <span className="card-cat"><LayoutGrid size={10}/><span>{p.category}</span></span>}
                            </div>
                            <div className="card-price-block">
                              <div className="card-price-row">
                                <span className="card-price-main">{itemPrice}</span>
                                <span className="card-price-currency">ج.م</span>
                              </div>
                              {hasSale && (
                                <div className="card-price-meta">
                                  <span className="card-price-old">{p.regular_price} ج.م</span>
                                  <span className="card-save">وفّرت {(p.regular_price - p.sale_price).toFixed(0)} ج.م</span>
                                </div>
                              )}
                            </div>
                            <div style={{ marginTop:'auto', display:'flex', flexDirection:'column', gap:'8px', paddingTop:'10px' }}>
                              {(() => {
                                const cartItem = cartItems.find((i: any) => i.id === p.id);
                                const qty = cartItem?.quantity ?? 0;
                                if (qty > 0) return (
                                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'#1a0d0d', border:'2px solid #e50914', borderRadius:'12px', padding:'6px 10px', marginBottom:'2px' }}>
                                    <button onClick={(e) => { e.preventDefault(); addToCart({...p, price: itemPrice}, -1); }} style={{ width:'32px', height:'32px', borderRadius:'8px', border:'none', background:'#e50914', color:'#fff', fontSize:'1.2rem', fontWeight:'900', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
                                    <span style={{ fontSize:'1.1rem', fontWeight:'900', color:'#dc2626' }}>{qty} <span style={{fontSize:'0.65rem',fontWeight:'700'}}>في السلة</span></span>
                                    <button onClick={(e) => { e.preventDefault(); addToCart({...p, price: itemPrice}, 1); }} style={{ width:'32px', height:'32px', borderRadius:'8px', border:'none', background:'#e50914', color:'#fff', fontSize:'1.2rem', fontWeight:'900', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
                                  </div>
                                );
                                return (
                                  <button className="card-btn-cart" onClick={(e) => { e.preventDefault(); addToCart({...p, price: itemPrice}, 1); toast.success('تمت الإضافة للسلة ✓'); }}>
                                    <ShoppingCart size={15}/> أضف إلى السلة
                                  </button>
                                );
                              })()}
                              <Link href={`/checkout?buyNow=true&productId=${p.id}&price=${itemPrice}`} className="card-btn-buy" onClick={() => { addToCart({...p, price: itemPrice}, 1); }}>
                                ⚡ اشتري الآن
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </ScrollReveal>
            )}

            {/* Features Strip */}
            <ScrollReveal direction="up" delay={0.18}>
              <section style={{ background: '#1c1c1c', borderTop: '1px solid #242424', borderBottom: '1px solid #242424' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
                  <div className="features-strip">
                    <div className="feature-item">
                      <div className="feature-icon-wrap">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#e50914" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/><rect x="9" y="11" width="14" height="10" rx="1"/><circle cx="12" cy="21" r="1"/><circle cx="20" cy="21" r="1"/></svg>
                      </div>
                      <div className="feature-text">
                        <span className="feature-title">شحن لأي مكان في مصر</span>
                        <span className="feature-sub">مع أكبر شركة شحن مصرية</span>
                      </div>
                    </div>
                    <div className="feature-divider" />
                    <div className="feature-item">
                      <div className="feature-icon-wrap">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#e50914" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      </div>
                      <div className="feature-text">
                        <span className="feature-title">قطع أصلية 100%</span>
                        <span className="feature-sub">بضمان حقيقي على كل منتج</span>
                      </div>
                    </div>
                    <div className="feature-divider" />
                    <div className="feature-item">
                      <div className="feature-icon-wrap">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#e50914" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                      </div>
                      <div className="feature-text">
                        <span className="feature-title">أكتر من 15+ طريقة دفع</span>
                        <span className="feature-sub">منها شركات التقسيط</span>
                      </div>
                    </div>
                    <div className="feature-divider" />
                    <div className="feature-item">
                      <div className="feature-icon-wrap">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#e50914" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>
                      </div>
                      <div className="feature-text">
                        <span className="feature-title">من الوكيل الرسمي فقط</span>
                        <span className="feature-sub">جميع المنتجات معتمدة</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </ScrollReveal>

            {/* Categories Section */}
            {categories.length > 0 && (
              <ScrollReveal direction="up" delay={0.2}>
                <section style={{ padding: '20px 0 40px', maxWidth: '1200px', margin: '0 auto' }}>
                  <div style={{ textAlign: 'right', marginBottom: '18px', padding: '0 20px' }}>
                    <h2 style={{ fontSize: '2.2rem', fontWeight: '900', margin: 0 }}>تسوق حسب الفئة</h2>
                    <p style={{ fontSize: '0.9rem', color: '#888', fontWeight: '700', margin: '6px 0 0' }}>
                      اختر فئة لعرض الأقسام الفرعية والمنتجات
                    </p>
                  </div>
                  <CategoriesGrid categories={categories} />
                </section>
              </ScrollReveal>
            )}

            {/* ══ SHOP BY CAR MAKE ══════════════════════════════════════════════ */}
            <ScrollReveal direction="up" delay={0.1}>
              <section style={{ padding: '20px 0 40px' }}>
                <style>{`
                  .make-grid {
                    display: grid;
                    grid-template-columns: repeat(5, 1fr);
                    gap: 10px;
                    padding: 0 20px;
                  }
                  @media (max-width: 900px) {
                    .make-grid { grid-template-columns: repeat(4, 1fr); }
                  }
                  @media (max-width: 580px) {
                    .make-grid { grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 0 12px; }
                  }
                  .make-card {
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
                  .make-card::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: rgba(255,255,255,0);
                    transition: background 0.2s;
                  }
                  .make-card:hover {
                    transform: translateY(-6px) scale(1.035);
                    box-shadow: 0 18px 40px rgba(0,0,0,0.32);
                  }
                  .make-card:hover::after {
                    background: rgba(255,255,255,0.07);
                  }
                  .make-card-logo-wrap {
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
                  .make-card-logo-wrap img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                  }
                  .make-card-name {
                    font-size: 0.9rem;
                    font-weight: 900;
                    color: #fff;
                    text-align: center;
                    line-height: 1.2;
                    text-shadow: 0 1px 8px rgba(0,0,0,0.4);
                    position: relative;
                    z-index: 1;
                  }
                  .make-card-cta {
                    font-size: 0.68rem;
                    font-weight: 700;
                    color: rgba(255,255,255,0.55);
                    transition: color 0.18s;
                    position: relative;
                    z-index: 1;
                  }
                  .make-card:hover .make-card-cta {
                    color: #ef4444;
                  }
                  @media (max-width: 580px) {
                    .make-card { padding: 18px 8px 14px; gap: 10px; border-radius: 12px; }
                    .make-card-logo-wrap { width: 75%; }
                    .make-card-name { font-size: 0.78rem; }
                    .make-card-cta { display: none; }
                  }
                `}</style>

                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                  <div style={{ textAlign: 'right', marginBottom: '18px', padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap' as const, gap: '10px' }}>
                    <div>
                      <h2 style={{ fontSize: '2.2rem', fontWeight: '900', margin: 0 }}>تسوق حسب سيارتك</h2>
                      <p style={{ fontSize: '0.9rem', color: '#888', fontWeight: '700', margin: '6px 0 0' }}>
                        اختر ماركة سيارتك واستعرض جميع القطع المتوافقة
                      </p>
                    </div>
                    <Link href="/cars" style={{ fontSize: '0.85rem', fontWeight: '800', color: '#e50914', textDecoration: 'none', whiteSpace: 'nowrap' as const }}>
                      عرض جميع السيارات ←
                    </Link>
                  </div>

                  <div className="make-grid">
                    {([
                      { make: 'HYUNDAI',    ar: 'هيونداي',   bg: 'linear-gradient(145deg,#002c5f,#0a4a8a)' },
                      { make: 'KIA',        ar: 'كيا',        bg: 'linear-gradient(145deg,#05141f,#0d2a40)' },
                      { make: 'TOYOTA',     ar: 'تويوتا',     bg: 'linear-gradient(145deg,#bb0000,#7a0000)' },
                      { make: 'CHEVROLET',  ar: 'شيفروليه',   bg: 'linear-gradient(145deg,#1a1a1a,#3a3a3a)' },
                      { make: 'NISSAN',     ar: 'نيسان',      bg: 'linear-gradient(145deg,#c3002f,#6e001a)' },
                      { make: 'MITSUBISHI', ar: 'ميتسوبيشي', bg: 'linear-gradient(145deg,#cc0000,#880000)' },
                      { make: 'RENAULT',    ar: 'رينو',       bg: 'linear-gradient(145deg,#efdf00,#b8a800)' },
                      { make: 'PEUGEOT',    ar: 'بيجو',       bg: 'linear-gradient(145deg,#0b2d78,#06194a)' },
                      { make: 'VOLKSWAGEN', ar: 'فولكس فاجن', bg: 'linear-gradient(145deg,#001e50,#00102e)' },
                      { make: 'SKODA',      ar: 'سكودا',      bg: 'linear-gradient(145deg,#4ba82e,#2c6819)' },
                      { make: 'MG',         ar: 'إم جي',      bg: 'linear-gradient(145deg,#ae0000,#6b0000)' },
                      { make: 'OPEL',       ar: 'أوبل',       bg: 'linear-gradient(145deg,#e8b800,#b08c00)' },
                      { make: 'HONDA',      ar: 'هوندا',      bg: 'linear-gradient(145deg,#cc0000,#880000)' },
                      { make: 'SUZUKI',     ar: 'سوزوكي',     bg: 'linear-gradient(145deg,#1a3a6a,#0d2040)' },
                      { make: 'MAZDA',      ar: 'مازدا',      bg: 'linear-gradient(145deg,#910000,#5a0000)' },
                      { make: 'SEAT',       ar: 'سيات',       bg: 'linear-gradient(145deg,#222,#444)' },
                      { make: 'BMW',        ar: 'بي إم دبليو', bg: 'linear-gradient(145deg,#1c69d4,#0d3f8f)' },
                      { make: 'MERCEDES',   ar: 'مرسيدس',     bg: 'linear-gradient(145deg,#333,#555)' },
                      { make: 'FORD',       ar: 'فورد',       bg: 'linear-gradient(145deg,#003178,#001e50)' },
                      { make: 'JEEP',       ar: 'جيب',        bg: 'linear-gradient(145deg,#2d5016,#1a2e0a)' },
                    ] as { make: string; ar: string; bg: string }[]).map(({ make, ar, bg }) => {
                      const logoUrl = makesOptions.find((m: any) => m.value?.toUpperCase() === make)?.logo || null;
                      return (
                        <Link key={make} href={`/cars/${make.toLowerCase()}`} className="make-card" style={{ background: bg }}>
                          <div className="make-card-logo-wrap">
                            {logoUrl
                              ? <img src={optimizeImageUrl(logoUrl)} alt={ar} loading="lazy" />
                              : <Car size={32} color="#64748b" />
                            }
                          </div>
                          <div className="make-card-name">{ar}</div>
                          <div className="make-card-cta">تصفح القطع ←</div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </section>
            </ScrollReveal>

          </div>
        )}

        {/* STICKY GARAGE NOTIFICATION */}
        <AnimatePresence>
          {garageMode && userCar && (
            <m.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} style={stickyNotificationStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={garageIconWrapMini}><Car size={18} color="#fff" /></div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: '900', color: '#fff', lineHeight: '1.2' }}>وضع جراجي مفعل لسيارة {userCar.make}</div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)', fontWeight: '700' }}>نعرض المنتجات المتوافقة والعامة فقط</div>
                </div>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

// Styles
const fullPageLoaderStyle: any = { position: 'fixed', inset: 0, background: 'linear-gradient(135deg,#0a0a0a 0%,#1a1a1a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '0 16px', boxSizing: 'border-box' };
const brandNameText: any = { fontSize: 'clamp(2.2rem,8vw,4rem)', fontWeight: '900', fontStyle: 'italic', letterSpacing: '-2px', marginBottom: '20px', lineHeight: '1', textTransform: 'uppercase', filter: 'drop-shadow(0 10px 30px rgba(34,197,94,0.4))' };
const mainHeadline: any = { color: '#fff', fontWeight: '900', fontSize: 'clamp(1.6rem,6vw,3.5rem)', marginBottom: '16px', letterSpacing: '-1px', lineHeight: '1.2', textShadow: '0 4px 20px rgba(34,197,94,0.3)' };
const tagline: any = { color: '#a0a0a0', fontSize: 'clamp(0.9rem,3vw,1.5rem)', fontWeight: '600', marginBottom: '36px', lineHeight: '1.7' };
const loadingBarContainer: any = { width: '100%', height: '5px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden', marginBottom: '32px' };
const loadingBar: any = { height: '100%', background: 'linear-gradient(90deg,#e50914 0%,#dc2626 50%,#e50914 100%)', borderRadius: '10px' };
const messageContainer: any = { marginBottom: '28px', minHeight: '35px' };
const messageText: any = { fontSize: '1.1rem', fontWeight: '700', color: '#fff' };
const featurePills: any = { display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' };
const pill: any = { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', backgroundColor: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '25px', fontSize: '0.82rem', fontWeight: '700', color: '#e50914', backdropFilter: 'blur(10px)' };
const arrowBtnSmall = { width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#1c1c1c', border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };
const cartBtnStyleSmall: any = { width: '100%', padding: '12px', backgroundColor: '#1c1c1c', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', fontSize: '1rem' }; // legacy — kept for maintenance bundle page
const stickyNotificationStyle: any = { position: 'fixed', bottom: '85px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(39,174,96,0.95)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', color: '#fff', padding: '12px 20px', borderRadius: '20px', zIndex: 1000, boxShadow: '0 10px 30px rgba(0,0,0,0.2)', width: 'max-content', maxWidth: '90%', border: '1px solid rgba(255,255,255,0.2)', direction: 'rtl' };
const garageIconWrapMini: any = { width: '32px', height: '32px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const buyNowBtnStyle: any = { width: '100%', padding: '12px', backgroundColor: '#e50914', color: '#fff', borderRadius: '10px', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', fontSize: '1rem', textDecoration: 'none' };