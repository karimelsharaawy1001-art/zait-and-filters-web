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


// Optimized Scroll Reveal Component
function ScrollReveal({ children, delay = 0, direction = 'up' }: { children: React.ReactNode; delay?: number; direction?: 'up' | 'down' | 'left' | 'right' }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  const directions = {
    up: { y: 40, x: 0 },
    down: { y: -40, x: 0 },
    left: { x: 40, y: 0 },
    right: { x: -40, y: 0 },
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, ...directions[direction] }}
      animate={isInView ? { opacity: 1, y: 0, x: 0 } : {}}
      transition={{
        duration: 0.5,
        delay: delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      {children}
    </motion.div>
  );
}


// SEO: Structured Data Component
function StructuredData() {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'AutoPartsStore',
    name: 'Zait and Filters | زيت أند فلترز',
    description: 'المتجر الأول لبيع قطع غيار السيارات الأصلية في مصر',
    url: 'https://zaitandfilters.com',
    logo: 'https://zaitandfilters.com/logo.png',
    image: 'https://zaitandfilters.com/og-image.jpg',
    telephone: '+201023862436',
    email: 'orders@sales.zaitandfilters.com',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'EG',
      addressLocality: 'Cairo',
      addressRegion: 'Cairo',
    },
    priceRange: '$$',
    currenciesAccepted: 'EGP',
    paymentAccepted: 'Cash, Credit Card, Debit Card',
    openingHours: 'Mo-Sa 09:00-21:00',
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Zait and Filters',
    url: 'https://zaitandfilters.com',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://zaitandfilters.com/store?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'الرئيسية',
        item: 'https://zaitandfilters.com',
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </>
  );
}


// ─── Search Card ──────────────────────────────────────────────────────────────
function SearchCard({
  selectLoaded,
  makesOptions,
  modelsOptions,
  selectedMake,
  selectedModel,
  selectedYear,
  setSelectedMake,
  setSelectedModel,
  setSelectedYear,
  handleSearch,
  customSelectStyles,
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
            <Select
              instanceId="make-select"
              options={makesOptions}
              styles={customSelectStyles}
              placeholder="اختر الماركة"
              isRtl={true}
              isSearchable={false}
              value={selectedMake}
              onChange={(opt: any) => setSelectedMake(opt)}
              formatOptionLabel={(brand: any) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {brand.logo
                    ? <img src={brand.logo} alt="" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
                    : <Car size={20} color="#ccc" />}
                  <span>{brand.label}</span>
                </div>
              )}
            />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#555', marginBottom: '6px', display: 'block' }}>الموديل</label>
            <Select
              instanceId="model-select"
              options={modelsOptions}
              styles={customSelectStyles}
              placeholder="اختر الموديل"
              isRtl={true}
              isSearchable={false}
              value={selectedModel}
              isDisabled={!selectedMake}
              onChange={(opt: any) => setSelectedModel(opt)}
            />
          </div>
        </>
      )}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#555', marginBottom: '6px', display: 'block' }}>سنة الصنع</label>
        <input
          type="text"
          placeholder="مثلاً: 2024"
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          style={{ width: '100%', height: '52px', padding: '0 15px', backgroundColor: '#f8f8f8', border: 'none', borderRadius: '12px', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>
      <button
        onClick={handleSearch}
        style={{ width: '100%', marginTop: '15px', backgroundColor: '#1a1a1a', color: '#fff', border: 'none', padding: '16px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', fontSize: '1.1rem' }}
      >
        بحث الآن <ChevronLeft size={22} />
      </button>
    </>
  );
}
// ─────────────────────────────────────────────────────────────────────────────


export default function HomePage() {
  const router = useRouter();
  const { addToCart } = useCart(); 
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

  // GARAGE FEATURES STATE
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

    const syncGarageMode = () => {
      setGarageMode(localStorage.getItem('garageMode') === 'true');
    };
    syncGarageMode();
    window.addEventListener('garageModeChanged', syncGarageMode);
    
    const messageInterval = setInterval(() => {
      setLoadingMessage((prev) => (prev + 1) % loadingMessages.length);
    }, 1500);

    return () => {
      clearInterval(messageInterval);
      window.removeEventListener('garageModeChanged', syncGarageMode);
    };
  }, []);


  useEffect(() => {
    if (slides.length > 1) {
      const timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      }, 6000);
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
        const { data } = await supabase
          .from('user_garage')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        if (data) setUserCar(data);
      }
    } catch (err) {
      console.error('Garage fetch error:', err);
    }
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

      const { data: allProducts, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (productsError) {
        console.error('Products fetch error:', productsError);
      }

      const products = allProducts || [];
      const customImages = customImgRes.data || [];
      
      if (products.length > 0) {
        setSaleProducts(products.filter(p => 
          Number(p.sale_price) > 0 && 
          Number(p.regular_price) > Number(p.sale_price) && 
          isValidImg(p.image_url)
        ));

        const { data: orders } = await supabase.from('orders').select('items').limit(100);
        const productCounts: Record<string, number> = {};
        orders?.forEach((order: any) => {
          order.items?.forEach((item: any) => {
            productCounts[item.id] = (productCounts[item.id] || 0) + (item.quantity || 1);
          });
        });
        const sortedBestIds = Object.entries(productCounts).sort(([, a], [, b]) => b - a).map(([id]) => id);
        let bestSellersList = sortedBestIds
          .map(id => products.find(p => p.id === id))
          .filter(p => p && isValidImg(p.image_url));

        if (bestSellersList.length < 4) {
          bestSellersList = [
            ...bestSellersList, 
            ...products
              .filter(p => !bestSellersList.find(b => b?.id === p.id) && isValidImg(p.image_url))
          ];
        }
        setBestSellers(bestSellersList);

        const uniqueCats = Array.from(new Set(
          products
            .map(i => i.category?.trim())
            .filter(Boolean)
        ));
        
        setCategories(uniqueCats.map(cat => {
          const imgObj = customImages.find(img => img.name?.trim().toUpperCase() === cat.toUpperCase());
          const prodObj = products.find(p => p.category?.trim().toUpperCase() === cat.toUpperCase() && isValidImg(p.image_url));
          return { 
            name: cat, 
            image: imgObj?.image_url || prodObj?.image_url || "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=500" 
          };
        }));
      }

      if (carBrandsRes.data && makesRes.data) {
        const uniqueMakes = Array.from(new Set(
          makesRes.data
            .map(i => i.car_make?.trim())
            .filter(Boolean)
        )).sort();
        
        setMakesOptions(uniqueMakes.map(makeName => {
          const brandInfo = carBrandsRes.data?.find(b => b.name?.trim().toLowerCase() === makeName.toLowerCase());
          return { 
            value: makeName, 
            label: makeName, 
            logo: brandInfo?.logo_url || null 
          };
        }));
      }
    } catch (err) { 
      console.error('Fetch error:', err); 
    } finally { 
      setTimeout(() => setLoading(false), 800); 
    }
  }


  async function fetchModels(make: string) {
    try {
      const { data } = await supabase
        .from('products')
        .select('car_model')
        .ilike('car_make', make.trim())
        .not('car_model', 'is', null);
      
      if (data) {
        const uniqueModels = Array.from(new Set(
          data
            .map(i => i.car_model?.trim())
            .filter(Boolean)
        )).sort();
        
        setModelsOptions(uniqueModels.map(m => ({ value: m, label: m })));
      }
    } catch (err) {
      console.error('Error fetching models:', err);
    }
  }


  const handleSearch = () => {
    const query = new URLSearchParams();
    if (selectedMake) query.set('make', selectedMake.value.trim().toUpperCase());
    if (selectedModel) query.set('model', selectedModel.value.trim().toUpperCase());
    if (selectedYear) query.set('year', selectedYear.trim());
    router.push(`/store?${query.toString()}`);
  };


  const scroll = (ref: any, direction: 'left' | 'right') => {
    if (ref.current) {
      const { scrollLeft, clientWidth } = ref.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
      ref.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };


  const customSelectStyles = {
    control: (base: any) => ({ 
      ...base, 
      height: '52px', 
      borderRadius: '12px', 
      border: 'none', 
      backgroundColor: '#f8f8f8', 
      fontSize: '1rem', 
      textAlign: 'right', 
      display: 'flex', 
      flexDirection: 'row-reverse',
      cursor: 'pointer',
    }),
    option: (base: any, state: any) => ({ 
      ...base, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'flex-start', 
      flexDirection: 'row-reverse', 
      gap: '8px', 
      padding: '10px 15px', 
      fontSize: '0.95rem', 
      backgroundColor: state.isFocused ? '#eefcf5' : '#fff', 
      color: '#1a1a1a', 
      cursor: 'pointer'
    }),
    singleValue: (base: any) => ({ 
      ...base, 
      display: 'flex', 
      alignItems: 'center', 
      gap: '8px', 
      flexDirection: 'row-reverse' 
    }),
    valueContainer: (base: any) => ({ 
      ...base, 
      padding: '0 12px', 
      display: 'flex', 
      flexDirection: 'row-reverse' 
    }),
    menu: (base: any) => ({ 
      ...base, 
      zIndex: 10000 
    }),
    menuList: (base: any) => ({
      ...base,
      maxHeight: '250px'
    })
  };


  if (!isMounted) return null;

  // GARAGE FILTER LOGIC
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
    selectLoaded,
    makesOptions,
    modelsOptions,
    selectedMake,
    selectedModel,
    selectedYear,
    setSelectedMake,
    setSelectedModel,
    setSelectedYear,
    handleSearch,
    customSelectStyles,
  };


  return (
    <>
      <StructuredData />
      
      <div style={{ direction: 'rtl', backgroundColor: '#fdfdfd', color: '#1a1a1a', minHeight: '100vh', fontSize: '13px' }}>
        
        {loading && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={fullPageLoaderStyle}
          >
            <div style={{ textAlign: 'center', maxWidth: '480px', width: '100%', padding: '0 24px', boxSizing: 'border-box' }}>
              <motion.h1
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                style={brandNameText}
              >
                <span style={{ color: '#fff' }}>ZAIT</span>
                <span style={{ color: '#22c55e' }}>&nbsp;&amp; FILTERS</span>
              </motion.h1>

              <motion.h2 
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                style={mainHeadline}
              >
                قطع الغيار بضغطة زرار
              </motion.h2>

              <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.6 }}
                style={tagline}
              >
                وجهتك الأولى لقطع غيار السيارات الأصلية في مصر
              </motion.p>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                style={loadingBarContainer}
              >
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 1.5, ease: 'easeInOut' }}
                  style={loadingBar}
                />
              </motion.div>

              <motion.div
                key={loadingMessage}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                style={messageContainer}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                  {loadingMessages[loadingMessage].icon}
                  <span style={messageText}>{loadingMessages[loadingMessage].text}</span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                style={featurePills}
              >
                <div style={pill}>
                  <Shield size={16} color="#22c55e" />
                  <span>ضمان الجودة</span>
                </div>
                <div style={pill}>
                  <Sparkles size={16} color="#22c55e" />
                  <span>أسعار تنافسية</span>
                </div>
                <div style={pill}>
                  <TrendingUp size={16} color="#22c55e" />
                  <span>شحن مجاني</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}


        <style dangerouslySetInnerHTML={{ __html: `
          * { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
          
          @keyframes pageLoad { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideIn  { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
          @keyframes slideUp  { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          
          @keyframes shimmer {
            0% { background-position: -200% center; }
            100% { background-position: 200% center; }
          }

          @keyframes badgePulse {
            0%, 100% { box-shadow: 0 0 6px 2px rgba(255, 200, 0, 0.45), 0 2px 8px rgba(0,0,0,0.25); }
            50% { box-shadow: 0 0 14px 5px rgba(255, 200, 0, 0.75), 0 2px 8px rgba(0,0,0,0.25); }
          }

          .badge-asli {
            position: absolute;
            top: 8px;
            left: 8px;
            background: linear-gradient(120deg, #b8860b 0%, #ffd700 25%, #fffacd 50%, #ffd700 75%, #b8860b 100%);
            background-size: 200% auto;
            animation: shimmer 2.5s linear infinite, badgePulse 2s ease-in-out infinite;
            color: #3d2200;
            padding: 3px 8px;
            border-radius: 6px;
            font-size: 0.65rem;
            font-weight: 900;
            z-index: 11;
            letter-spacing: 0.5px;
            border: 1px solid rgba(255,215,0,0.7);
            text-shadow: 0 1px 0 rgba(255,255,255,0.6);
          }

          .page-container { animation: pageLoad 0.4s ease-out; }

          .hero-section {
            position: relative;
            width: 100%;
            background: #000;
          }

          .hero-bg-layer {
            position: absolute;
            inset: 0;
            z-index: 0;
            pointer-events: none;
            transform: translateZ(0);
          }

          .hero-bg-slide {
            position: absolute;
            inset: 0;
            background-size: cover;
            background-position: center;
            opacity: 0;
            transition: opacity 0.8s ease-in-out;
            will-change: opacity;
          }
          .hero-bg-slide.active { opacity: 1; }

          /* ── Desktop ── */
          @media (min-width: 769px) {
            .hero-section          { height: 600px; overflow: hidden; }
            .hero-content-layer    { position: absolute; inset: 0; z-index: 10; display: flex; align-items: center; }
            .hero-inner            { width: 100%; max-width: 1200px; margin: 0 auto; padding: 40px 20px; display: flex; gap: 40px; align-items: center; justify-content: space-between; }
            .hero-text             { flex: 1; text-align: right; min-width: 300px; animation: slideIn 0.6s ease-out 0.15s both; display: flex; flex-direction: column; }

            /*
             * FIX: .hero-text-title has a fixed min-height so the search
             * card never shifts when a slide has more or fewer lines.
             * 200px comfortably fits h1 (3rem × 1.4 line-height × 3 lines)
             * + subtitle (1.2rem × 1.5 × 2 lines) + their margins.
             * overflow:hidden clips any extreme outliers gracefully.
             */
            .hero-text-title       { min-height: 200px; overflow: hidden; }

            .hero-card-desktop     { width: 400px; flex-shrink: 0; background: #fff; padding: 30px; border-radius: 30px; box-shadow: 0 20px 40px rgba(0,0,0,0.3); animation: slideUp 0.6s ease-out 0.25s both; align-self: center; }
            .hero-card-mobile      { display: none; }
          }

          /* ── Mobile ── */
          @media (max-width: 768px) {
            .hero-section {
              min-height: 580px;
              height: auto;
              overflow: hidden;
            }

            .hero-content-layer {
              position: absolute;
              inset: 0;
              z-index: 10;
              display: flex;
              align-items: flex-start;
              padding-top: 90px;
              overflow-y: auto;
            }

            .hero-inner {
              width: 100%;
              padding: 0 16px 24px;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              gap: 20px;
            }

            .hero-text             { text-align: center; display: flex; flex-direction: column; }

            /*
             * FIX: Same idea on mobile — fixed min-height on the text
             * wrapper so the search card below never jumps.
             * 140px = ~2 lines of h1 at 2rem + subtitle at 1rem.
             */
            .hero-text-title       { min-height: 140px; overflow: hidden; }

            .hero-text h1          { font-size: 2rem !important; line-height: 1.3 !important; }
            .hero-text p           { font-size: 1rem !important; max-width: 90%; margin-left: auto !important; margin-right: auto !important; }

            .hero-card-desktop     { display: none; }
            .hero-card-mobile      {
              width: 100%;
              box-sizing: border-box;
              background: #fff;
              padding: 20px 16px;
              border-radius: 20px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.15);
            }
          }

          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          
          .product-grid-carousel { 
            display: flex !important; 
            flex-wrap: nowrap !important; 
            gap: 15px; 
            overflow-x: auto !important; 
            scroll-snap-type: x mandatory; 
            padding: 10px 20px; 
            -webkit-overflow-scrolling: touch; 
          }
          
          .product-card-mdrn { 
            flex: 0 0 320px !important; 
            min-width: 320px !important; 
            max-width: 320px !important; 
            background: #fff; 
            border-radius: 18px; 
            border: 1px solid #f2f2f2; 
            transition: all 0.3s ease; 
            position: relative; 
            display: flex; 
            flex-direction: column; 
            overflow: hidden; 
            scroll-snap-align: start; 
          }
          
          .product-card-mdrn:hover { 
            transform: translateY(-6px); 
            border-color: #22c55e; 
            box-shadow: 0 10px 30px rgba(34, 197, 94, 0.15); 
          }
          
          .img-container { 
            background: #f9f9f9; 
            height: 200px; 
            width: 100%; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            position: relative; 
            cursor: pointer; 
            overflow: hidden; 
          }
          
          .img-fill-100 { 
            width: 100%; 
            height: 100%; 
            object-fit: cover; 
            padding: 0; 
            transition: transform 0.3s ease; 
          }
          
          .img-container:hover .img-fill-100 { transform: scale(1.02); }
          
          .category-grid-v3 { 
            display: grid; 
            grid-template-columns: repeat(4, 1fr); 
            gap: 20px; 
            padding: 20px; 
          }
          
          .category-item-mdrn { 
            position: relative; 
            height: 220px; 
            border-radius: 20px; 
            overflow: hidden; 
            background-color: #1a1a1a; 
            transition: 0.3s ease; 
            cursor: pointer; 
          }
          
          .category-item-mdrn:hover { 
            transform: translateY(-5px); 
            box-shadow: 0 15px 40px rgba(0,0,0,0.3); 
          }
          
          .category-item-mdrn:hover .cat-bg-img { 
            transform: scale(1.1); 
            filter: brightness(0.9); 
          }
          
          .cat-bg-img { 
            width: 100%; 
            height: 100%; 
            object-fit: cover; 
            opacity: 0.6; 
            filter: brightness(0.7); 
            transition: 0.4s ease; 
          }
          
          .cat-info-overlay { 
            position: absolute; 
            top: 0; 
            left: 0; 
            width: 100%; 
            height: 100%; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            background: linear-gradient(to top, rgba(0,0,0,0.7), transparent); 
            padding: 20px; 
          }
          
          .cat-title-text { 
            color: #fff; 
            font-size: 1.6rem; 
            font-weight: 900; 
            text-align: center; 
            text-shadow: 2px 2px 10px rgba(0,0,0,0.8); 
          }
          
          @keyframes marquee { 
            0% { transform: translateX(0); } 
            100% { transform: translateX(-50%); } 
          }
          
          .marquee-inner { 
            display: flex; 
            width: max-content; 
            animation: marquee 35s linear infinite; 
          }
          
          .brand-logo-wrap { 
            width: 180px; 
            flex-shrink: 0; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            padding: 10px 25px; 
          }
          
          .logo-img-v3 { 
            max-width: 130px; 
            max-height: 60px; 
            filter: grayscale(100%); 
            opacity: 0.5; 
            transition: 0.3s; 
          }
          
          .logo-img-v3:hover { 
            filter: grayscale(0%); 
            opacity: 1; 
            transform: scale(1.1); 
          }

          /* ── LOADING SCREEN MOBILE ── */
          @media (max-width: 480px) {
            .loader-brand-name {
              font-size: 2.4rem !important;
              letter-spacing: -1px !important;
              margin-bottom: 16px !important;
            }
            .loader-headline {
              font-size: 1.6rem !important;
              margin-bottom: 12px !important;
            }
            .loader-tagline {
              font-size: 0.95rem !important;
              margin-bottom: 28px !important;
            }
          }
          
          @media (max-width: 768px) { 
            .category-grid-v3 { grid-template-columns: repeat(2, 1fr); gap: 10px; }
            .img-container { height: 140px !important; }
            
            .product-grid-carousel { 
              display: grid !important; 
              grid-template-columns: repeat(2, 1fr) !important; 
              gap: 10px !important; 
              padding: 10px !important; 
              overflow-x: visible !important;
            }
            
            .product-card-mdrn { 
              flex: 0 0 100% !important; 
              min-width: 0 !important; 
              max-width: 100% !important; 
              width: 100% !important;
              border-radius: 12px !important;
            }

            .product-card-mdrn h3 {
              font-size: 0.85rem !important;
              height: 38px !important;
            }

            .product-card-mdrn span {
              font-size: 0.9rem !important;
            }
            
            .product-card-mdrn button {
              font-size: 0.8rem !important;
              padding: 8px !important;
            }
          }
        `}} />


        {!loading && (
          <div className="page-container">

            <section className="hero-section">

              {/* Background layer — GPU composited, zero layout impact */}
              <div className="hero-bg-layer">
                {slides.map((slide, index) => (
                  <div
                    key={index}
                    className={`hero-bg-slide ${index === currentSlide ? 'active' : ''}`}
                    style={{
                      backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url("${slide.bg_image_url}")`,
                    }}
                  />
                ))}
              </div>

              {/* Content layer — stable, mounted exactly once */}
              <div className="hero-content-layer">
                <div className="hero-inner">

                  <div className="hero-text">
                    {/*
                      FIX: .hero-text-title wraps the title + subtitle
                      with a fixed min-height so the search card (below
                      the hero-text div, and the card on desktop) never
                      shifts position when slides have different line counts.
                    */}
                    <div className="hero-text-title">
                      {activeSlide.title && (
                        <h1 style={{ fontSize: '3rem', fontWeight: '900', lineHeight: '1.4', marginBottom: '15px', color: '#22c55e' }}>
                          {activeSlide.title.replace(/<[^>]*>/g, '')}
                        </h1>
                      )}
                      <p style={{ color: '#fff', fontSize: '1.2rem', fontWeight: '500', marginBottom: '25px', maxWidth: '550px', lineHeight: '1.5' }}>
                        {activeSlide.subtitle}
                      </p>
                    </div>
                    <Link
                      href={activeSlide.button_link || '/store'}
                      style={{ padding: '12px 30px', backgroundColor: '#22c55e', color: '#fff', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.95rem', display: 'inline-block' }}
                    >
                      {activeSlide.button_text || 'تصفح المتجر'}
                    </Link>
                  </div>

                  {/* Search card — desktop only */}
                  <div className="hero-card-desktop">
                    <SearchCard {...searchCardProps} />
                  </div>

                  {/* Search card — mobile only */}
                  <div className="hero-card-mobile">
                    <SearchCard {...searchCardProps} />
                  </div>

                </div>
              </div>

            </section>


            {/* Brand Logos */}
            {brandLogos.length > 0 && (
              <ScrollReveal direction="up" delay={0.05}>
                <section style={{ padding: '12px 0', background: '#fff', borderBottom: '1px solid #f5f5f5', position: 'relative', zIndex: 1 }}>
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


            {/* Offers Section */}
            {saleProducts.length > 0 && (
              <ScrollReveal direction="up" delay={0.1}>
                <section style={{ padding: '25px 0', maxWidth: '1200px', margin: '0 auto' }}>
                  <div style={{ padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '15px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ff4d4d', marginBottom: '4px' }}>
                        <Zap size={16} fill="#ff4d4d" />
                        <span style={{ fontWeight: '800', fontSize: '0.85rem' }}>
                          {garageMode && userCar ? `عروض لسيارتك ${userCar.make}` : 'أقوى الخصومات'}
                        </span>
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
                          {isAsli && (
                            <div className="badge-asli">✦ أصلي</div>
                          )}
                          <Link href={`/products/${p.id}`} className="img-container">
                            <img src={p.image_url} alt={p.name} className="img-fill-100" loading="lazy" />
                            <div style={{ position: 'absolute', bottom: 6, left: 6, background: 'rgba(255,255,255,0.9)', padding: '2px 6px', borderRadius: '5px', fontSize: '0.65rem', fontWeight: '800' }}>
                              <Car size={9} /> {p.car_make}
                            </div>
                          </Link>
                          <div style={{ padding: '15px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ color: '#22c55e', fontWeight: '800', fontSize: '0.8rem' }}>{p.brand}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#666', fontWeight: '700' }}><Globe size={14} color="#22c55e" /><span>{country}</span></div>
                            </div>
                            <h3 style={{ fontSize: '1rem', fontWeight: '900', marginBottom: '4px', height: '45px', overflow: 'hidden' }}>{p.name}</h3>
                            <div className="md-hidden" style={{ background: '#f9f9f9', padding: '10px', borderRadius: '10px', marginBottom: '10px' }}>
                              <div style={{fontSize:'0.8rem', color:'#1a1a1a', fontWeight:'800', marginBottom:'3px', display:'flex', alignItems:'center', gap:'6px'}}><Settings2 size={14} color="#22c55e"/> {p.car_make} {p.car_model}</div>
                              <div style={{fontSize:'0.8rem', color:'#666', fontWeight:'700', display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px'}}><Calendar size={14} color="#22c55e"/> {p.car_model_year || 'الكل'}</div>
                              <div style={{fontSize:'0.8rem', color:'#22c55e', fontWeight:'800', display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px'}}><LayoutGrid size={14}/> {p.category}</div>
                              <div style={{fontSize:'0.8rem', color:'#888', fontWeight:'700', display:'flex', alignItems:'center', gap:'6px'}}><Tags size={14}/> {p.subcategory || 'عام'}</div>
                            </div>
                            <div style={{ marginTop: 'auto', display:'flex', flexDirection:'column', gap:'12px' }}>
                              <div>
                                <span style={{ display: 'block', color: '#bbb', textDecoration: 'line-through', fontSize: '0.75rem' }}>{p.regular_price} ج.م</span>
                                <span style={{ fontSize: '1.2rem', fontWeight: '900' }}>{p.sale_price} ج.م</span>
                              </div>
                              <button style={cartBtnStyleSmall} onClick={(e) => { e.preventDefault(); addToCart({...p, price: p.sale_price}, 1); toast.success('تمت الإضافة'); }}>
                                <ShoppingCart size={16} /> أضف إلى السلة
                              </button>
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
                        <span style={{ fontWeight: '800', fontSize: '0.85rem' }}>
                          {garageMode && userCar ? `تريند لسيارتك ${userCar.make}` : 'الأكثر طلباً'}
                        </span>
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
                          {isAsli && (
                            <div className="badge-asli">✦ أصلي</div>
                          )}
                          <Link href={`/products/${p.id}`} className="img-container">
                            <img src={p.image_url} alt={p.name} className="img-fill-100" loading="lazy" />
                          </Link>
                          <div style={{ padding: '15px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ color: '#22c55e', fontWeight: '800', fontSize: '0.8rem' }}>{p.brand}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#666', fontWeight: '700' }}><Globe size={14} color="#22c55e" /><span>{country}</span></div>
                            </div>
                            <h3 style={{ fontSize: '1rem', fontWeight: '900', marginBottom: '4px', height: '45px', overflow: 'hidden' }}>{p.name}</h3>
                            <div className="md-hidden" style={{ background: '#f9f9f9', padding: '8px', borderRadius: '10px', marginBottom: '10px' }}>
                              <div style={{fontSize:'0.8rem', color:'#1a1a1a', fontWeight:'800', marginBottom:'3px', display:'flex', alignItems:'center', gap:'6px'}}><Settings2 size={14} color="#22c55e"/> {p.car_make} {p.car_model}</div>
                              <div style={{fontSize:'0.8rem', color:'#666', fontWeight:'700', display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px'}}><Calendar size={14} color="#22c55e"/> {p.car_model_year || 'الكل'}</div>
                              <div style={{fontSize:'0.8rem', color:'#22c55e', fontWeight:'800', display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px'}}><LayoutGrid size={14}/> {p.category}</div>
                              <div style={{fontSize:'0.8rem', color:'#888', fontWeight:'700', display:'flex', alignItems:'center', gap:'6px'}}><Tags size={14}/> {p.subcategory || 'عام'}</div>
                            </div>
                            <div style={{ marginTop: 'auto', display:'flex', flexDirection:'column', gap:'12px' }}>
                              <span style={{ fontSize: '1.2rem', fontWeight: '900' }}>{p.sale_price || p.regular_price} ج.م</span>
                              <button style={cartBtnStyleSmall} onClick={(e) => { e.preventDefault(); addToCart({...p, price: p.sale_price || p.regular_price}, 1); toast.success('تمت الإضافة'); }}>
                                <ShoppingCart size={16} /> أضف إلى السلة
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </ScrollReveal>
            )}


            {/* Categories Section */}
            <ScrollReveal direction="up" delay={0.2}>
              <section style={{ padding: '40px 20px 80px', maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ textAlign: 'right', marginBottom: '30px' }}>
                  <h2 style={{ fontSize: '2.2rem', fontWeight: '900', margin: 0 }}>تسوق حسب الفئة</h2>
                </div>
                <div className="category-grid-v3">
                  {categories.map((cat, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.08, duration: 0.4, ease: 'easeOut' }}
                    >
                      <Link href={`/categories/${encodeURIComponent(cat.name)}`}>
                        <div className="category-item-mdrn">
                          <img src={cat.image} alt={cat.name} className="cat-bg-img" loading="lazy" />
                          <div className="cat-info-overlay"><span className="cat-title-text">{cat.name}</span></div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </section>
            </ScrollReveal>

          </div>
        )}

        {/* STICKY GARAGE NOTIFICATION */}
        <AnimatePresence>
          {garageMode && userCar && (
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              style={stickyNotificationStyle}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={garageIconWrapMini}>
                  <Car size={18} color="#fff" />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: '900', color: '#fff', lineHeight: '1.2' }}>
                    وضع جراجي مفعل لسيارة {userCar.make}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)', fontWeight: '700' }}>
                    نعرض المنتجات المتوافقة والعامة فقط
                  </div>
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
const fullPageLoaderStyle: any = { 
  position: 'fixed', 
  top: 0, 
  left: 0, 
  width: '100%', 
  height: '100%', 
  background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)', 
  display: 'flex', 
  alignItems: 'center', 
  justifyContent: 'center', 
  zIndex: 99999,
  padding: '0 16px',
  boxSizing: 'border-box',
};

const brandNameText: any = { 
  fontSize: 'clamp(2.2rem, 8vw, 4rem)',
  fontWeight: '900', 
  fontStyle: 'italic', 
  letterSpacing: '-2px', 
  marginBottom: '20px', 
  lineHeight: '1', 
  textTransform: 'uppercase', 
  filter: 'drop-shadow(0 10px 30px rgba(34, 197, 94, 0.4))',
};

const mainHeadline: any = { 
  color: '#fff', 
  fontWeight: '900', 
  fontSize: 'clamp(1.6rem, 6vw, 3.5rem)',
  marginBottom: '16px', 
  letterSpacing: '-1px', 
  lineHeight: '1.2', 
  textShadow: '0 4px 20px rgba(34, 197, 94, 0.3)',
};

const tagline: any = { 
  color: '#a0a0a0', 
  fontSize: 'clamp(0.9rem, 3vw, 1.5rem)',
  fontWeight: '600', 
  marginBottom: '36px', 
  lineHeight: '1.7',
};

const loadingBarContainer: any = { 
  width: '100%', 
  height: '5px', 
  backgroundColor: 'rgba(255,255,255,0.1)', 
  borderRadius: '10px', 
  overflow: 'hidden', 
  marginBottom: '32px',
};

const loadingBar: any = { 
  height: '100%', 
  background: 'linear-gradient(90deg, #22c55e 0%, #16a34a 50%, #22c55e 100%)', 
  borderRadius: '10px',
};

const messageContainer: any = { marginBottom: '28px', minHeight: '35px' };
const messageText: any = { fontSize: '1.1rem', fontWeight: '700', color: '#fff' };

const featurePills: any = { 
  display: 'flex', 
  gap: '10px', 
  justifyContent: 'center', 
  flexWrap: 'wrap',
};

const pill: any = { 
  display: 'flex', 
  alignItems: 'center', 
  gap: '8px', 
  padding: '10px 16px', 
  backgroundColor: 'rgba(34, 197, 94, 0.15)', 
  border: '1px solid rgba(34, 197, 94, 0.3)', 
  borderRadius: '25px', 
  fontSize: '0.82rem', 
  fontWeight: '700', 
  color: '#22c55e', 
  backdropFilter: 'blur(10px)',
};

const arrowBtnSmall = { width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#fff', border: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };
const cartBtnStyleSmall: any = { width: '100%', padding: '12px', backgroundColor: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', fontSize: '1rem' };

const stickyNotificationStyle: any = {
  position: 'fixed',
  bottom: '85px',
  left: '50%',
  transform: 'translateX(-50%)',
  backgroundColor: 'rgba(39, 174, 96, 0.95)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  color: '#fff',
  padding: '12px 20px',
  borderRadius: '20px',
  zIndex: 1000,
  boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
  width: 'max-content',
  maxWidth: '90%',
  border: '1px solid rgba(255,255,255,0.2)',
  direction: 'rtl'
};

const garageIconWrapMini: any = {
  width: '32px',
  height: '32px',
  borderRadius: '10px',
  backgroundColor: 'rgba(255,255,255,0.2)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};