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
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useCart } from '@/context/CartContext'; 
import toast from 'react-hot-toast'; 


const Select = dynamic(() => import('react-select'), { 
  ssr: false,
  loading: () => <div style={{ height: '52px', backgroundColor: '#f8f8f8', borderRadius: '12px', display: 'flex', alignItems: 'center', padding: '0 15px', color: '#999' }}>جاري التحميل...</div>
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
const AVATAR_COLORS = ['#16a34a','#0284c7','#7c3aed','#db2777','#d97706','#0891b2','#dc2626','#65a30d'];
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
        <svg key={i} width="13" height="13" viewBox="0 0 24 24" fill={i <= rating ? '#f59e0b' : '#e2e8f0'}>
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
      background: '#fff',
      border: '1px solid #f1f5f9',
      borderRadius: '18px',
      padding: '18px 20px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      direction: 'rtl',
    }}>
      <StarRow rating={r.rating} />
      <p style={{ fontSize: '0.88rem', color: '#334155', lineHeight: '1.6', fontWeight: '600', margin: 0, flex: 1 }}>
        "{r.text}"
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.72rem', fontWeight: '900', color: '#fff', letterSpacing: '0.5px' }}>
          {initials(r.name)}
        </div>
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>{r.name}</div>
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
    <motion.div
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
          background: '#fff',
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
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'gplayPulse 1.6s ease-in-out infinite', flexShrink: 0 }} />
            <span style={{ fontSize: '0.68rem', fontWeight: '900', color: '#22c55e', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>🎉 جديد — تطبيقنا الرسمي على Google Play!</span>
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
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
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
    </motion.div>
  );
}


// Optimized Scroll Reveal Component
function ScrollReveal({ children, delay = 0, direction = 'up' }: { children: React.ReactNode; delay?: number; direction?: 'up' | 'down' | 'left' | 'right' }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const directions = { up: { y: 40, x: 0 }, down: { y: -40, x: 0 }, left: { x: 40, y: 0 }, right: { x: -40, y: 0 } };
  return (
    <motion.div ref={ref} initial={{ opacity: 0, ...directions[direction] }} animate={isInView ? { opacity: 1, y: 0, x: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}>
      {children}
    </motion.div>
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
            <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#555', marginBottom: '6px', display: 'block' }}>الماركة</label>
            <Select instanceId="make-select" options={makesOptions}
              styles={{ ...customSelectStyles, menuPortal: (base: any) => ({ ...base, zIndex: 10000 }) }}
              menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
              menuPosition="fixed"
              placeholder="اختر الماركة"
              isRtl={true} isSearchable={false} value={selectedMake} onChange={(opt: any) => setSelectedMake(opt)}
              formatOptionLabel={(brand: any) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {brand.logo ? <img src={brand.logo} alt="" style={{ width: '22px', height: '22px', objectFit: 'contain' }} /> : <Car size={20} color="#ccc" />}
                  <span>{brand.label}</span>
                </div>
              )}
            />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#555', marginBottom: '6px', display: 'block' }}>الموديل</label>
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
        <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#555', marginBottom: '6px', display: 'block' }}>سنة الصنع</label>
        <input type="text" placeholder="مثلاً: 2024" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}
          style={{ width: '100%', height: '52px', padding: '0 15px', backgroundColor: '#f8f8f8', border: 'none', borderRadius: '12px', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }} />
      </div>
      <button onClick={handleSearch}
        style={{ width: '100%', marginTop: '15px', backgroundColor: '#1a1a1a', color: '#fff', border: 'none', padding: '16px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', fontSize: '1.1rem' }}>
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
  color: #22c55e;
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
            <img src={cat.image} alt={cat.name} loading="lazy" width="200" height="267" decoding="async" />
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
    { icon: <Shield size={22} color="#22c55e" />, text: 'منتجات أصلية 100%' },
    { icon: <Sparkles size={22} color="#22c55e" />, text: 'أفضل الأسعار في السوق' },
    { icon: <TrendingUp size={22} color="#22c55e" />, text: 'توصيل سريع لجميع المحافظات' },
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
    control: (base: any) => ({ ...base, height: '52px', borderRadius: '12px', border: 'none', backgroundColor: '#f8f8f8', fontSize: '1rem', textAlign: 'right', display: 'flex', flexDirection: 'row-reverse', cursor: 'pointer' }),
    option: (base: any, state: any) => ({ ...base, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'row-reverse', gap: '8px', padding: '10px 15px', fontSize: '0.95rem', backgroundColor: state.isFocused ? '#eefcf5' : '#fff', color: '#1a1a1a', cursor: 'pointer' }),
    singleValue: (base: any) => ({ ...base, display: 'flex', alignItems: 'center', gap: '8px', flexDirection: 'row-reverse' }),
    valueContainer: (base: any) => ({ ...base, padding: '0 12px', display: 'flex', flexDirection: 'row-reverse' }),
    menu: (base: any) => ({ ...base, zIndex: 10000 }),
    menuList: (base: any) => ({ ...base, maxHeight: '250px' })
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

      <div style={{ direction: 'rtl', backgroundColor: '#fdfdfd', color: '#1a1a1a', minHeight: '100vh', fontSize: '13px' }}>

        {loading && (
          <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} style={fullPageLoaderStyle}>
            <div style={{ textAlign: 'center', maxWidth: '480px', width: '100%', padding: '0 24px', boxSizing: 'border-box' }}>
              <motion.h1 initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6, ease: 'easeOut' }} style={brandNameText}>
                <span style={{ color: '#fff' }}>ZAIT</span>
                <span style={{ color: '#22c55e' }}>&nbsp;&amp; FILTERS</span>
              </motion.h1>
              <motion.h2 initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.6 }} style={mainHeadline}>قطع الغيار بضغطة زرار</motion.h2>
              <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35, duration: 0.6 }} style={tagline}>وجهتك الأولى لقطع غيار السيارات الأصلية في مصر</motion.p>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} style={loadingBarContainer}>
                <motion.div initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: 1.5, ease: 'easeInOut' }} style={loadingBar} />
              </motion.div>
              <motion.div key={loadingMessage} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4 }} style={messageContainer}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                  {loadingMessages[loadingMessage].icon}
                  <span style={messageText}>{loadingMessages[loadingMessage].text}</span>
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} style={featurePills}>
                <div style={pill}><Shield size={16} color="#22c55e" /><span>ضمان الجودة</span></div>
                <div style={pill}><Sparkles size={16} color="#22c55e" /><span>أسعار تنافسية</span></div>
                <div style={pill}><TrendingUp size={16} color="#22c55e" /><span>شحن مجاني</span></div>
              </motion.div>
            </div>
          </motion.div>
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
          .hero-bg-slide { position: absolute; inset: 0; background-size: cover; background-position: center; opacity: 0; transition: opacity 0.8s ease-in-out; will-change: opacity; }
          .hero-bg-slide.active { opacity: 1; }

          @media (min-width: 769px) {
            /* height already set in globals.css */
            .hero-content-layer { position: absolute; inset: 0; z-index: 10; display: flex; align-items: center; }
            .hero-inner { width: 100%; max-width: 1300px; margin: 0 auto; padding: 40px 50px; display: flex; flex-direction: row; gap: 60px; align-items: center; justify-content: space-between; direction: rtl; }
            .hero-text { flex: 1; direction: rtl; text-align: right; display: flex; flex-direction: column; align-items: flex-end; animation: slideIn 0.6s ease-out 0.15s both; }
            .hero-text-title { width: 100%; }
            .hero-text h1 { font-size: 5rem !important; font-weight: 900 !important; line-height: 1.2 !important; margin: 0 0 22px 0 !important; color: #22c55e !important; direction: rtl !important; text-align: right !important; text-shadow: 0 2px 0 rgba(0,0,0,0.5), 0 4px 24px rgba(0,0,0,0.9), 0 0 60px rgba(0,0,0,0.6) !important; letter-spacing: -1.5px !important; width: 100% !important; display: block !important; }
            .hero-text p { font-size: 1.45rem !important; font-weight: 700 !important; line-height: 1.7 !important; color: #fff !important; direction: rtl !important; text-align: right !important; text-shadow: 0 2px 16px rgba(0,0,0,0.95) !important; margin: 0 0 36px 0 !important; max-width: 580px !important; display: block !important; width: 100% !important; }
            .hero-cta-btn { display: inline-flex !important; align-items: center !important; justify-content: center !important; gap: 12px !important; padding: 20px 56px !important; background-color: #22c55e !important; color: #fff !important; border-radius: 18px !important; text-decoration: none !important; font-weight: 900 !important; font-size: 1.35rem !important; letter-spacing: -0.3px !important; box-shadow: 0 10px 40px rgba(34,197,94,0.55) !important; transition: all 0.25s ease !important; white-space: nowrap !important; align-self: flex-end !important; }
            .hero-cta-btn:hover { background-color: #16a34a !important; transform: translateY(-3px) !important; box-shadow: 0 16px 50px rgba(34,197,94,0.65) !important; }
            .hero-card-desktop { width: 400px; flex-shrink: 0; background: #fff; padding: 30px; border-radius: 30px; box-shadow: 0 20px 50px rgba(0,0,0,0.35); animation: slideUp 0.6s ease-out 0.25s both; align-self: center; }
            .hero-card-mobile { display: none; }
          }

          @media (max-width: 768px) {
            /* position: relative so hero-section height grows with content */
            .hero-content-layer { position: relative; z-index: 10; display: flex; align-items: flex-start; padding-top: 20px; padding-bottom: 32px; }
            .hero-inner { width: 100%; padding: 0 18px; box-sizing: border-box; display: flex; flex-direction: column; gap: 20px; direction: rtl; }
            .hero-text { direction: rtl; text-align: right; display: flex; flex-direction: column; align-items: flex-end; width: 100%; }
            .hero-text-title { width: 100%; }
            .hero-text h1 { font-size: 2.2rem !important; font-weight: 900 !important; line-height: 1.25 !important; margin: 0 0 10px 0 !important; color: #22c55e !important; direction: rtl !important; text-align: right !important; text-shadow: 0 2px 0 rgba(0,0,0,0.5), 0 4px 20px rgba(0,0,0,0.98), 0 0 40px rgba(0,0,0,0.8) !important; letter-spacing: -0.5px !important; width: 100% !important; display: block !important; }
            .hero-text p { font-size: 1rem !important; font-weight: 700 !important; line-height: 1.55 !important; color: #fff !important; direction: rtl !important; text-align: right !important; text-shadow: 0 2px 14px rgba(0,0,0,0.98) !important; margin: 0 0 16px 0 !important; width: 100% !important; display: block !important; }
            .hero-cta-btn { display: flex !important; align-items: center !important; justify-content: center !important; gap: 10px !important; width: 100% !important; padding: 16px 24px !important; background-color: #22c55e !important; color: #fff !important; border-radius: 16px !important; text-decoration: none !important; font-weight: 900 !important; font-size: 1.1rem !important; box-shadow: 0 8px 28px rgba(34,197,94,0.45) !important; }
            .hero-card-desktop { display: none; }
            .hero-card-mobile { width: 100%; box-sizing: border-box; background: #fff; padding: 16px 16px 18px; border-radius: 22px; box-shadow: 0 12px 36px rgba(0,0,0,0.3); }
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

          .product-grid-carousel { display: flex !important; flex-wrap: nowrap !important; gap: 15px; overflow-x: auto !important; scroll-snap-type: x mandatory; padding: 10px 20px; -webkit-overflow-scrolling: touch; }
          .product-card-mdrn { flex: 0 0 320px !important; min-width: 320px !important; max-width: 320px !important; background: #fff; border-radius: 18px; border: 1px solid #f2f2f2; transition: all 0.3s ease; position: relative; display: flex; flex-direction: column; overflow: hidden; scroll-snap-align: start; }
          .product-card-mdrn:hover { transform: translateY(-6px); border-color: #22c55e; box-shadow: 0 10px 30px rgba(34,197,94,0.15); }
          .img-container { background: #f9f9f9; height: 200px; width: 100%; position: relative; cursor: pointer; overflow: hidden; }
          /* .img-fill-100 height/width now in globals.css — only add transition here */
          .img-fill-100  { transition: transform 0.3s ease; }
          .img-container:hover .img-fill-100 { transform: scale(1.02); }

          @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
          .marquee-inner   { display: flex; width: max-content; animation: marquee 35s linear infinite; }
          .brand-logo-wrap { width: 180px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; padding: 10px 25px; }
          .logo-img-v3     { max-width: 130px; max-height: 60px; filter: grayscale(100%); opacity: 0.5; transition: 0.3s; }
          .logo-img-v3:hover { filter: grayscale(0%); opacity: 1; transform: scale(1.1); }

          .features-strip { display: grid; grid-template-columns: 1fr auto 1fr auto 1fr auto 1fr; align-items: center; padding: 20px 0; }
          .feature-item { display: flex; align-items: center; gap: 14px; padding: 12px 16px; justify-content: center; }
          .feature-icon-wrap { width: 52px; height: 52px; border-radius: 14px; background: #f0fdf4; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
          .feature-text { display: flex; flex-direction: column; gap: 2px; }
          .feature-title { font-size: 0.88rem; font-weight: 900; color: #1a1a1a; line-height: 1.3; }
          .feature-sub   { font-size: 0.75rem; font-weight: 600; color: #888; line-height: 1.3; }
          .feature-divider { width: 1px; height: 48px; background: #f0f0f0; flex-shrink: 0; }

          @media (max-width: 768px) {
            .features-strip { grid-template-columns: 1fr 1fr; gap: 0; padding: 8px 0; }
            .feature-divider { display: none; }
            .feature-item { padding: 14px 10px; border-bottom: 1px solid #f5f5f5; justify-content: flex-start; }
            .feature-item:nth-child(odd)  { border-right: 1px solid #f5f5f5; }
            .feature-item:nth-last-child(-n+2) { border-bottom: none; }
            .feature-icon-wrap { width: 42px; height: 42px; border-radius: 11px; }
            .feature-title { font-size: 0.8rem; }
            .feature-sub   { font-size: 0.68rem; }
          }

          .home-banner-section { max-width: 1200px; margin: 0 auto; padding: 16px 20px; }
          .home-banner-inner { position: relative; width: 100%; height: 260px; border-radius: 20px; overflow: hidden; cursor: pointer; box-shadow: 0 8px 30px rgba(0,0,0,0.15); transition: transform 0.3s ease, box-shadow 0.3s ease; }
          .home-banner-inner:hover { transform: translateY(-3px); box-shadow: 0 16px 44px rgba(0,0,0,0.22); }
          .home-banner-bg  { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
          .home-banner-overlay { position: absolute; inset: 0; background: linear-gradient(to left, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.82) 60%, rgba(0,0,0,0.88) 100%); }
          .home-banner-content { position: absolute; inset: 0; display: flex; align-items: center; justify-content: flex-start; padding: 0 48px; direction: rtl; }
          .home-banner-text-block { text-align: right; max-width: 72%; }
          .home-banner-title { color: #fff; font-size: 3.2rem; font-weight: 900; line-height: 1.15; text-shadow: 0 4px 24px rgba(0,0,0,0.9), 0 2px 0 rgba(0,0,0,0.6); margin: 0 0 12px; letter-spacing: -1.5px; }
          .home-banner-subtitle { color: rgba(255,255,255,0.97); font-size: 1.35rem; font-weight: 700; text-shadow: 0 2px 14px rgba(0,0,0,0.85); margin: 0 0 22px; line-height: 1.5; }
          .home-banner-cta { display: inline-flex; align-items: center; gap: 7px; background: #22c55e; color: #fff; padding: 13px 28px; border-radius: 12px; font-size: 1.05rem; font-weight: 900; text-decoration: none; box-shadow: 0 4px 16px rgba(34,197,94,0.45); transition: background 0.2s, transform 0.2s, box-shadow 0.2s; border: none; cursor: pointer; white-space: nowrap; }
          .home-banner-cta:hover { background: #16a34a; transform: translateY(-1px); box-shadow: 0 6px 22px rgba(34,197,94,0.55); }

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
            .product-grid-carousel { display: grid !important; grid-template-columns: repeat(2,1fr) !important; gap: 10px !important; padding: 10px !important; overflow-x: visible !important; }
            .product-card-mdrn { flex: 0 0 100% !important; min-width: 0 !important; max-width: 100% !important; width: 100% !important; border-radius: 12px !important; }
            .product-card-mdrn h3     { font-size: 0.85rem !important; height: 38px !important; }
            .product-card-mdrn span   { font-size: 0.9rem !important; }
            .product-card-mdrn button { font-size: 0.8rem !important; padding: 8px !important; }
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
                  <div key={index} className={`hero-bg-slide ${index === currentSlide ? 'active' : ''}`}
                    style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.6),rgba(0,0,0,0.6)),url("${slide.bg_image_url}")` }} />
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
                <section style={{ padding: '12px 0', background: '#fff', borderBottom: '1px solid #f5f5f5' }}>
                  <div style={{ overflow: 'hidden', direction: 'ltr' }}>
                    <div className="marquee-inner">
                      {[...brandLogos, ...brandLogos].map((brand, index) => (
                        <div key={index} className="brand-logo-wrap">
                          <Link href={`/store?brand=${brand.name}`}>
                            <img src={brand.logo_url} alt={brand.name} className="logo-img-v3" loading="lazy"/>
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
              <section style={{ background: '#fafcff', padding: '52px 0 56px', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
                  <div style={{ textAlign: 'center', marginBottom: '38px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '20px', padding: '6px 18px', marginBottom: '14px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#16a34a', letterSpacing: '0.05em' }}>⭐ آراء عملاؤنا</span>
                    </div>
                    <h2 style={{ fontSize: '2.1rem', fontWeight: '900', color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
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

            {/* HOME BANNER */}
            {homeBanner && (
              <ScrollReveal direction="up" delay={0.07}>
                <div className="home-banner-section">
                  {homeBanner.link_url ? (
                    <Link href={homeBanner.link_url} style={{ textDecoration: 'none' }}>
                      <div className="home-banner-inner">
                        {homeBanner.image_url && <img src={homeBanner.image_url} alt={homeBanner.title || 'banner'} className="home-banner-bg" loading="eager" fetchPriority="high" width="1200" height="260" />}
                        <div className="home-banner-overlay" />
                        <div className="home-banner-content">
                          <div className="home-banner-text-block">
                            {homeBanner.title && <p className="home-banner-title">{homeBanner.title}</p>}
                            {homeBanner.subtitle && <p className="home-banner-subtitle">{homeBanner.subtitle}</p>}
                            <span className="home-banner-cta">{homeBanner.cta_text || 'اكتشف الآن'} ←</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <div className="home-banner-inner">
                      {homeBanner.image_url && <img src={homeBanner.image_url} alt={homeBanner.title || 'banner'} className="home-banner-bg" loading="eager" fetchPriority="high" width="1200" height="260" />}
                      <div className="home-banner-overlay" />
                      <div className="home-banner-content">
                        <div className="home-banner-text-block">
                          {homeBanner.title && <p className="home-banner-title">{homeBanner.title}</p>}
                          {homeBanner.subtitle && <p className="home-banner-subtitle">{homeBanner.subtitle}</p>}
                          {homeBanner.cta_text && <span className="home-banner-cta">{homeBanner.cta_text} ←</span>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollReveal>
            )}

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
                      <Link href="/store?filter=sales" style={{ color: '#22c55e', fontWeight: '800', textDecoration: 'none', marginLeft: '15px', fontSize: '0.9rem' }}>عرض الكل</Link>
                      <button onClick={() => scroll(scrollRef, 'right')} style={arrowBtnSmall}><ChevronRight size={14}/></button>
                      <button onClick={() => scroll(scrollRef, 'left')} style={arrowBtnSmall}><ChevronLeft size={14}/></button>
                    </div>
                  </div>
                  <div ref={scrollRef} className="no-scrollbar product-grid-carousel">
                    {filteredSaleProducts.map((p) => {
                      const country = p.country_origin || p.country_of_origin || p.origin || 'أصلي';
                      const isAsli = (p.country_origin || p.country_of_origin || p.origin)?.trim() === 'اصلي';
                      return (
                        <div key={p.id} className="product-card-mdrn">
                          <div style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: '#ff4d4d', color: '#fff', padding: '2px 6px', borderRadius: '5px', fontSize: '0.6rem', fontWeight: '900', zIndex: 10 }}>
                            -{Math.round(((p.regular_price - p.sale_price) / p.regular_price) * 100)}%
                          </div>
                          {isAsli && <div className="badge-asli">✦ أصلي</div>}
                          <Link href={`/products/${p.id}`} className="img-container">
                            <img src={p.image_url} alt={p.name} className="img-fill-100" loading="lazy" width="300" height="200" decoding="async" />
                            {p.car_make && !['universal','عام','all','الكل'].includes(p.car_make.toLowerCase()) && (
                              <div style={{ position: 'absolute', bottom: 6, left: 6, background: 'rgba(255,255,255,0.9)', padding: '2px 6px', borderRadius: '5px', fontSize: '0.65rem', fontWeight: '800' }}>
                                <Car size={9} /> {p.car_make}
                              </div>
                            )}
                          </Link>
                          <div style={{ padding: '15px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ color: '#22c55e', fontWeight: '800', fontSize: '0.8rem' }}>{p.brand}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#666', fontWeight: '700' }}><Globe size={14} color="#22c55e" /><span>{country}</span></div>
                            </div>
                            <h3 style={{ fontSize: '1rem', fontWeight: '900', marginBottom: '4px', height: '45px', overflow: 'hidden' }}>{p.name}</h3>
                            <div className="md-hidden" style={{ background: '#f9f9f9', padding: '10px', borderRadius: '10px', marginBottom: '10px' }}>
                              <div style={{fontSize:'0.8rem',color:'#1a1a1a',fontWeight:'800',marginBottom:'3px',display:'flex',alignItems:'center',gap:'6px'}}><Settings2 size={14} color="#22c55e"/> {(() => { const univ=['universal','عام','all','الكل','']; const mk=(p.car_make||'').trim(); const mo=(p.car_model||'').trim(); if(univ.includes(mk.toLowerCase())) return 'جميع السيارات'; const cm=univ.includes(mo.toLowerCase())?'':mo; return `${mk}${cm?' '+cm:''}`; })()}</div>
                              <div style={{fontSize:'0.8rem',color:'#666',fontWeight:'700',display:'flex',alignItems:'center',gap:'6px',marginBottom:'3px'}}><Calendar size={14} color="#22c55e"/> {p.car_model_year || 'الكل'}</div>
                              <div style={{fontSize:'0.8rem',color:'#22c55e',fontWeight:'800',display:'flex',alignItems:'center',gap:'6px',marginBottom:'3px'}}><LayoutGrid size={14}/> {p.category}</div>
                              <div style={{fontSize:'0.8rem',color:'#888',fontWeight:'700',display:'flex',alignItems:'center',gap:'6px'}}><Tags size={14}/> {p.subcategory || 'عام'}</div>
                            </div>
                            <div style={{ marginTop: 'auto', display:'flex', flexDirection:'column', gap:'12px' }}>
                              <div>
                                <span style={{ display: 'block', color: '#bbb', textDecoration: 'line-through', fontSize: '0.75rem' }}>{p.regular_price} ج.م</span>
                                <span style={{ fontSize: '1.2rem', fontWeight: '900' }}>{p.sale_price} ج.م</span>
                              </div>
                              {(() => {
                                const cartItem = cartItems.find((i: any) => i.id === p.id);
                                const qty = cartItem?.quantity ?? 0;
                                if (qty === 0) return (
                                  <>
                                    <button style={cartBtnStyleSmall} onClick={(e) => { e.preventDefault(); addToCart({...p, price: p.sale_price}, 1); toast.success('تمت الإضافة'); }}>
                                      <ShoppingCart size={16} /> أضف إلى السلة
                                    </button>
                                    <Link href={`/checkout?buyNow=true&productId=${p.id}&price=${p.sale_price}`} style={buyNowBtnStyle} onClick={() => { addToCart({...p, price: p.sale_price}, 1); }}>
                                      ⚡ اشتري الآن
                                    </Link>
                                  </>
                                );
                                return (
                                  <>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '2px solid #22c55e', borderRadius: '12px', padding: '6px 10px' }}>
                                      <button onClick={(e) => { e.preventDefault(); addToCart({...p, price: p.sale_price}, -1); }} style={{ width: '34px', height: '34px', borderRadius: '8px', border: 'none', background: '#22c55e', color: '#fff', fontSize: '1.3rem', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                                      <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#16a34a', lineHeight: 1 }}>{qty}</div>
                                        <div style={{ fontSize: '0.65rem', color: '#16a34a', fontWeight: '700' }}>في السلة</div>
                                      </div>
                                      <button onClick={(e) => { e.preventDefault(); addToCart({...p, price: p.sale_price}, 1); }} style={{ width: '34px', height: '34px', borderRadius: '8px', border: 'none', background: '#22c55e', color: '#fff', fontSize: '1.3rem', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                                    </div>
                                    <Link href={`/checkout?buyNow=true&productId=${p.id}&price=${p.sale_price}`} style={buyNowBtnStyle}>
                                      ⚡ اشتري الآن
                                    </Link>
                                  </>
                                );
                              })()}
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
                <section style={{ padding: '25px 0', maxWidth: '1200px', margin: '0 auto', background: '#fff', borderRadius: '30px' }}>
                  <div style={{ padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '15px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#22c55e', marginBottom: '4px' }}>
                        <Flame size={16} fill="#22c55e" />
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
                      const country = p.country_origin || p.country_of_origin || p.origin || 'أصلي';
                      const isAsli = p.brand?.trim() === 'اصلي';
                      return (
                        <div key={p.id} className="product-card-mdrn">
                          <div style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: '#22c55e', color: '#fff', padding: '2px 6px', borderRadius: '5px', fontSize: '0.6rem', fontWeight: '900', zIndex: 10 }}>تريند ✨</div>
                          {isAsli && <div className="badge-asli">✦ أصلي</div>}
                          <Link href={`/products/${p.id}`} className="img-container">
                            <img src={p.image_url} alt={p.name} className="img-fill-100" loading="lazy" width="300" height="200" decoding="async" />
                          </Link>
                          <div style={{ padding: '15px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ color: '#22c55e', fontWeight: '800', fontSize: '0.8rem' }}>{p.brand}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#666', fontWeight: '700' }}><Globe size={14} color="#22c55e" /><span>{country}</span></div>
                            </div>
                            <h3 style={{ fontSize: '1rem', fontWeight: '900', marginBottom: '4px', height: '45px', overflow: 'hidden' }}>{p.name}</h3>
                            <div className="md-hidden" style={{ background: '#f9f9f9', padding: '8px', borderRadius: '10px', marginBottom: '10px' }}>
                              <div style={{fontSize:'0.8rem',color:'#1a1a1a',fontWeight:'800',marginBottom:'3px',display:'flex',alignItems:'center',gap:'6px'}}><Settings2 size={14} color="#22c55e"/> {(() => { const univ=['universal','عام','all','الكل','']; const mk=(p.car_make||'').trim(); const mo=(p.car_model||'').trim(); if(univ.includes(mk.toLowerCase())) return 'جميع السيارات'; const cm=univ.includes(mo.toLowerCase())?'':mo; return `${mk}${cm?' '+cm:''}`; })()}</div>
                              <div style={{fontSize:'0.8rem',color:'#666',fontWeight:'700',display:'flex',alignItems:'center',gap:'6px',marginBottom:'3px'}}><Calendar size={14} color="#22c55e"/> {p.car_model_year || 'الكل'}</div>
                              <div style={{fontSize:'0.8rem',color:'#22c55e',fontWeight:'800',display:'flex',alignItems:'center',gap:'6px',marginBottom:'3px'}}><LayoutGrid size={14}/> {p.category}</div>
                              <div style={{fontSize:'0.8rem',color:'#888',fontWeight:'700',display:'flex',alignItems:'center',gap:'6px'}}><Tags size={14}/> {p.subcategory || 'عام'}</div>
                            </div>
                            <div style={{ marginTop: 'auto', display:'flex', flexDirection:'column', gap:'12px' }}>
                              <span style={{ fontSize: '1.2rem', fontWeight: '900' }}>{p.sale_price || p.regular_price} ج.م</span>
                              {(() => {
                                const cartItem = cartItems.find((i: any) => i.id === p.id);
                                const qty = cartItem?.quantity ?? 0;
                                const itemPrice = p.sale_price || p.regular_price;
                                if (qty === 0) return (
                                  <>
                                    <button style={cartBtnStyleSmall} onClick={(e) => { e.preventDefault(); addToCart({...p, price: itemPrice}, 1); toast.success('تمت الإضافة'); }}>
                                      <ShoppingCart size={16} /> أضف إلى السلة
                                    </button>
                                    <Link href={`/checkout?buyNow=true&productId=${p.id}&price=${itemPrice}`} style={buyNowBtnStyle} onClick={() => { addToCart({...p, price: itemPrice}, 1); }}>
                                      ⚡ اشتري الآن
                                    </Link>
                                  </>
                                );
                                return (
                                  <>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '2px solid #22c55e', borderRadius: '12px', padding: '6px 10px' }}>
                                      <button onClick={(e) => { e.preventDefault(); addToCart({...p, price: itemPrice}, -1); }} style={{ width: '34px', height: '34px', borderRadius: '8px', border: 'none', background: '#22c55e', color: '#fff', fontSize: '1.3rem', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                                      <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#16a34a', lineHeight: 1 }}>{qty}</div>
                                        <div style={{ fontSize: '0.65rem', color: '#16a34a', fontWeight: '700' }}>في السلة</div>
                                      </div>
                                      <button onClick={(e) => { e.preventDefault(); addToCart({...p, price: itemPrice}, 1); }} style={{ width: '34px', height: '34px', borderRadius: '8px', border: 'none', background: '#22c55e', color: '#fff', fontSize: '1.3rem', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                                    </div>
                                    <Link href={`/checkout?buyNow=true&productId=${p.id}&price=${itemPrice}`} style={buyNowBtnStyle}>
                                      ⚡ اشتري الآن
                                    </Link>
                                  </>
                                );
                              })()}
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
              <section style={{ background: '#fff', borderTop: '1px solid #f0f0f0', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
                  <div className="features-strip">
                    <div className="feature-item">
                      <div className="feature-icon-wrap">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/><rect x="9" y="11" width="14" height="10" rx="1"/><circle cx="12" cy="21" r="1"/><circle cx="20" cy="21" r="1"/></svg>
                      </div>
                      <div className="feature-text">
                        <span className="feature-title">شحن لأي مكان في مصر</span>
                        <span className="feature-sub">مع أكبر شركة شحن مصرية</span>
                      </div>
                    </div>
                    <div className="feature-divider" />
                    <div className="feature-item">
                      <div className="feature-icon-wrap">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      </div>
                      <div className="feature-text">
                        <span className="feature-title">قطع أصلية 100%</span>
                        <span className="feature-sub">بضمان حقيقي على كل منتج</span>
                      </div>
                    </div>
                    <div className="feature-divider" />
                    <div className="feature-item">
                      <div className="feature-icon-wrap">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                      </div>
                      <div className="feature-text">
                        <span className="feature-title">أكتر من 15+ طريقة دفع</span>
                        <span className="feature-sub">منها شركات التقسيط</span>
                      </div>
                    </div>
                    <div className="feature-divider" />
                    <div className="feature-item">
                      <div className="feature-icon-wrap">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>
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

          </div>
        )}

        {/* STICKY GARAGE NOTIFICATION */}
        <AnimatePresence>
          {garageMode && userCar && (
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} style={stickyNotificationStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={garageIconWrapMini}><Car size={18} color="#fff" /></div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: '900', color: '#fff', lineHeight: '1.2' }}>وضع جراجي مفعل لسيارة {userCar.make}</div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)', fontWeight: '700' }}>نعرض المنتجات المتوافقة والعامة فقط</div>
                </div>
              </div>
            </motion.div>
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
const loadingBar: any = { height: '100%', background: 'linear-gradient(90deg,#22c55e 0%,#16a34a 50%,#22c55e 100%)', borderRadius: '10px' };
const messageContainer: any = { marginBottom: '28px', minHeight: '35px' };
const messageText: any = { fontSize: '1.1rem', fontWeight: '700', color: '#fff' };
const featurePills: any = { display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' };
const pill: any = { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', backgroundColor: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '25px', fontSize: '0.82rem', fontWeight: '700', color: '#22c55e', backdropFilter: 'blur(10px)' };
const arrowBtnSmall = { width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#fff', border: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };
const cartBtnStyleSmall: any = { width: '100%', padding: '12px', backgroundColor: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', fontSize: '1rem' };
const stickyNotificationStyle: any = { position: 'fixed', bottom: '85px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(39,174,96,0.95)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', color: '#fff', padding: '12px 20px', borderRadius: '20px', zIndex: 1000, boxShadow: '0 10px 30px rgba(0,0,0,0.2)', width: 'max-content', maxWidth: '90%', border: '1px solid rgba(255,255,255,0.2)', direction: 'rtl' };
const garageIconWrapMini: any = { width: '32px', height: '32px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const buyNowBtnStyle: any = { width: '100%', padding: '12px', backgroundColor: '#22c55e', color: '#fff', borderRadius: '10px', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', fontSize: '1rem', textDecoration: 'none' };