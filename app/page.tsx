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
import { motion, useInView } from 'framer-motion';
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


  const loadingMessages = [
    { icon: <Shield size={22} color="#22c55e" />, text: 'منتجات أصلية 100%' },
    { icon: <Sparkles size={22} color="#22c55e" />, text: 'أفضل الأسعار في السوق' },
    { icon: <TrendingUp size={22} color="#22c55e" />, text: 'توصيل سريع لجميع المحافظات' },
  ];


  useEffect(() => {
    setIsMounted(true);
    setSelectLoaded(true); 
    fetchInitialData();
    
    const messageInterval = setInterval(() => {
      setLoadingMessage((prev) => (prev + 1) % loadingMessages.length);
    }, 1500);


    return () => clearInterval(messageInterval);
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


  async function fetchInitialData() {
    try {
      setLoading(true);
      
      // FIXED: Fetch ALL products but optimize other queries
      const [heroRes, customImgRes, partBrandsRes, carBrandsRes, makesRes] = await Promise.all([
        supabase.from('hero_settings').select('*').order('id', { ascending: true }),
        supabase.from('category_images').select('name, image_url'),
        supabase.from('part_brands').select('name, logo_url').neq('logo_url', ''),
        supabase.from('car_brands').select('name, logo_url'),
        supabase.from('products').select('car_make').not('car_make', 'is', null) // Only fetch makes column
      ]);

      if (heroRes.data) setSlides(heroRes.data);
      if (partBrandsRes.data) setBrandLogos(partBrandsRes.data);

      // FIXED: Fetch ALL products without range limit
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
        // Filter sale products from ALL products
        setSaleProducts(products.filter(p => 
          Number(p.sale_price) > 0 && 
          Number(p.regular_price) > Number(p.sale_price) && 
          isValidImg(p.image_url)
        ).slice(0, 20)); // Show first 20 sale products


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
              .slice(0, 20)
          ];
        }
        setBestSellers(bestSellersList.slice(0, 20)); // Show first 20 best sellers

        // Get unique categories from ALL products
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


      // Process makes efficiently from dedicated query
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


  // Fetch models only when needed
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
      flexDirection: 'row-reverse' 
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
            <div style={{ textAlign: 'center', maxWidth: '600px' }}>
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                style={logoContainer}
              >
                <motion.img
                  src="/api/placeholder/200/200"
                  alt="Zait and Filters"
                  animate={{ 
                    y: [0, -10, 0],
                  }}
                  transition={{ 
                    duration: 2.5, 
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                  style={logoImage}
                />
              </motion.div>


              <motion.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                style={brandNameText}
              >
                <span style={{ color: '#fff' }}>ZAIT</span>
                <span style={{ color: '#22c55e' }}>&nbsp;& FILTERS</span>
              </motion.h1>


              <motion.h2 
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                style={mainHeadline}
              >
                قطع الغيار بضغطة زرار
              </motion.h2>


              <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                style={tagline}
              >
                وجهتك الأولى لقطع غيار السيارات الأصلية في مصر
              </motion.p>


              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
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
                transition={{ delay: 0.8 }}
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
          
          @keyframes pageLoad { 
            from { opacity: 0; } 
            to { opacity: 1; } 
          }
          
          @keyframes slideIn { 
            from { opacity: 0; transform: translateX(30px); } 
            to { opacity: 1; transform: translateX(0); } 
          }
          
          @keyframes slideUp { 
            from { opacity: 0; transform: translateY(20px); } 
            to { opacity: 1; transform: translateY(0); } 
          }
          
          .page-container { animation: pageLoad 0.4s ease-out; }
          
          .hero-content-right { animation: slideIn 0.6s ease-out 0.15s both; }
          .hero-content-left { animation: slideUp 0.6s ease-out 0.25s both; }
          
          .hero-slide { 
            position: absolute; 
            inset: 0; 
            background-size: cover; 
            background-position: center; 
            opacity: 0;
            transition: opacity 0.8s ease-in-out;
            min-height: 100%;
          }
          
          .hero-slide.active { opacity: 1; }
          
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
            object-fit: contain; 
            padding: 15px; 
            transition: transform 0.3s ease; 
          }
          
          .img-container:hover .img-fill-100 { transform: scale(1.05); }
          
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
          
          @media (max-width: 768px) { 
            .category-grid-v3 { grid-template-columns: repeat(2, 1fr); gap: 10px; }
            .img-container { height: 140px !important; }
            
            /* ADJUSTED: Show 2 product cards per row on mobile for Special Offers and Trending */
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

            .product-card-mdrn .cart-price-wrap span:first-of-type {
               font-size: 0.7rem !important;
            }

            /* COMPLETE FIX FOR HERO ON MOBILE */
            section:first-of-type { 
              min-height: auto !important;
              overflow: visible !important;
              padding-bottom: 30px !important;
            }
            
            .hero-slide {
              position: relative !important;
              min-height: auto !important;
              padding-top: 100px !important;
              padding-bottom: 40px !important;
            }
            
            .hero-content-wrapper {
              flex-direction: column !important;
              gap: 20px !important;
            }
            
            .hero-content-right {
              text-align: center !important;
              order: 1 !important;
              min-width: 100% !important;
              padding: 0 10px !important;
            }
            
            .hero-content-left {
              width: 100% !important;
              max-width: 100% !important;
              padding: 20px !important;
              order: 2 !important;
              margin: 0 auto !important;
            }

            .hero-content-right h1 {
              font-size: 2rem !important;
              line-height: 1.3 !important;
            }
            
            .hero-content-right p {
              margin-left: auto !important;
              margin-right: auto !important;
              font-size: 1rem !important;
              max-width: 90% !important;
            }
          }
        `}} />


        {!loading && (
          <div className="page-container">
            {/* Hero Section */}
            <section style={{ position: 'relative', minHeight: '600px', overflow: 'hidden', backgroundColor: '#000' }}>
              {slides.map((slide, index) => (
                <div 
                  key={index}
                  className={`hero-slide ${index === currentSlide ? 'active' : ''}`}
                  style={{ 
                    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url("${slide.bg_image_url}")`,
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
                    <div className="hero-content-wrapper" style={{ display: 'flex', gap: '40px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                      <div className="hero-content-right" style={{ flex: '1', textAlign: 'right', minWidth: '300px' }}>
                        {slide.title && (
                          <h1 style={{ fontSize: '3rem', fontWeight: '900', lineHeight: '1.4', marginBottom: '15px', color: '#22c55e' }}>
                            {slide.title.replace(/<[^>]*>/g, '')}
                          </h1>
                        )}
                        <p style={{ color: '#fff', fontSize: '1.2rem', fontWeight: '500', marginBottom: '25px', maxWidth: '550px', lineHeight: '1.5' }}>{slide.subtitle}</p>
                        <Link href={slide.button_link || '/store'} style={{ padding: '12px 30px', backgroundColor: '#22c55e', color: '#fff', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.95rem', display: 'inline-block' }}>{slide.button_text || 'تصفح المتجر'}</Link>
                      </div>
                      
                      <div className="hero-content-left" style={{ width: '400px', maxWidth: '100%', backgroundColor: '#fff', padding: '30px', borderRadius: '30px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', position: 'relative', zIndex: 100 }}>
                        <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: '900', textAlign: 'center' }}>ابحث بمواصفات سيارتك</h3>
                        {selectLoaded && (
                          <>
                            <div style={{marginBottom: '12px'}}>
                              <label style={{fontSize: '0.8rem', fontWeight: '800', color: '#555', marginBottom: '6px', display: 'block'}}>الماركة</label>
                              <Select 
                                instanceId="make-select" 
                                options={makesOptions} 
                                styles={customSelectStyles} 
                                placeholder="اختر الماركة" 
                                isRtl={true} 
                                isSearchable={true}
                                onChange={(opt) => setSelectedMake(opt)} 
                                formatOptionLabel={(brand: any) => (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    {brand.logo ? <img src={brand.logo} alt="" style={{ width: '22px', height: '22px', objectFit: 'contain' }} /> : <Car size={20} color="#ccc" />}
                                    <span>{brand.label}</span>
                                  </div>
                                )} 
                              />
                            </div>
                            <div style={{marginBottom: '12px'}}>
                              <label style={{fontSize: '0.8rem', fontWeight: '800', color: '#555', marginBottom: '6px', display: 'block'}}>الموديل</label>
                              <Select 
                                instanceId="model-select" 
                                options={modelsOptions} 
                                styles={customSelectStyles} 
                                placeholder="اختر الموديل" 
                                isRtl={true} 
                                isSearchable={true}
                                value={selectedModel} 
                                isDisabled={!selectedMake} 
                                onChange={(opt) => setSelectedModel(opt)}
                              />
                            </div>
                          </>
                        )}
                        <div style={{marginBottom: '12px'}}><label style={{fontSize: '0.8rem', fontWeight: '800', color: '#555', marginBottom: '6px', display: 'block'}}>سنة الصنع</label><input type="text" placeholder="مثلاً: 2024" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} style={{ width: '100%', height: '52px', padding: '0 15px', backgroundColor: '#f8f8f8', border: 'none', borderRadius: '12px', fontSize: '1rem', outline: 'none' }} /></div>
                        <button onClick={handleSearch} style={{ width: '100%', marginTop: '15px', backgroundColor: '#1a1a1a', color: '#fff', border: 'none', padding: '16px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', fontSize: '1.1rem' }}>بحث الآن <ChevronLeft size={22} /></button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </section>


            {/* Brand Logos */}
            {brandLogos.length > 0 && (
              <ScrollReveal direction="up" delay={0.05}>
                <section style={{ padding: '12px 0', background: '#fff', borderBottom: '1px solid #f5f5f5', position: 'relative', zIndex: 1 }}>
                  <div style={{ overflow: 'hidden', direction: 'ltr' }}><div className="marquee-inner">{[...brandLogos, ...brandLogos].map((brand, index) => (<div key={index} className="brand-logo-wrap"><Link href={`/store?brand=${brand.name}`}><img src={brand.logo_url} alt={brand.name} className="logo-img-v3" loading="lazy"/></Link></div>))}</div></div>
                </section>
              </ScrollReveal>
            )}


            {/* Offers Section */}
            {saleProducts.length > 0 && (
              <ScrollReveal direction="up" delay={0.1}>
                <section style={{ padding: '25px 0', maxWidth: '1200px', margin: '0 auto' }}>
                  <div style={{ padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '15px' }}>
                    <div><div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ff4d4d', marginBottom: '4px' }}><Zap size={16} fill="#ff4d4d" /><span style={{ fontWeight: '800', fontSize: '0.85rem' }}>أقوى الخصومات</span></div><h2 style={{ fontSize: '1.8rem', fontWeight: '900', margin: 0 }}>عروض حصرية 🔥</h2></div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><Link href="/store?filter=sales" style={{ color: '#22c55e', fontWeight: '800', textDecoration: 'none', marginLeft: '15px', fontSize: '0.9rem' }}>عرض الكل</Link><button onClick={() => scroll(scrollRef, 'right')} style={arrowBtnSmall}><ChevronRight size={14}/></button><button onClick={() => scroll(scrollRef, 'left')} style={arrowBtnSmall}><ChevronLeft size={14}/></button></div>
                  </div>
                  <div ref={scrollRef} className="no-scrollbar product-grid-carousel">
                    {saleProducts.map((p) => {
                      const country = p.country_origin || p.country_of_origin || p.origin || 'أصلي';
                      return (
                        <div key={p.id} className="product-card-mdrn">
                          <div style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: '#ff4d4d', color: '#fff', padding: '2px 6px', borderRadius: '5px', fontSize: '0.6rem', fontWeight: '900', zIndex: 10 }}>-{Math.round(((p.regular_price - p.sale_price) / p.regular_price) * 100)}%</div>
                          <Link href={`/products/${p.id}`} className="img-container"><img src={p.image_url} alt={p.name} className="img-fill-100" loading="lazy" /><div style={{ position: 'absolute', bottom: 6, left: 6, background: 'rgba(255,255,255,0.9)', padding: '2px 6px', borderRadius: '5px', fontSize: '0.65rem', fontWeight: '800' }}><Car size={9} /> {p.car_make}</div></Link>
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
                              <div className="cart-price-wrap">
                                <span style={{ display: 'block', color: '#bbb', textDecoration: 'line-through', fontSize: '0.75rem' }}>{p.regular_price} ج.م</span>
                                <span style={{ fontSize: '1.2rem', fontWeight: '900' }}>{p.sale_price} ج.م</span>
                              </div>
                              <button style={cartBtnStyleSmall} onClick={(e) => { e.preventDefault(); addToCart({...p, price: p.sale_price}, 1); toast.success('تمت الإضافة'); }}><ShoppingCart size={16} /> أضف إلى السلة</button>
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
                    <div><div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#22c55e', marginBottom: '4px' }}><Flame size={16} fill="#22c55e" /><span style={{ fontWeight: '800', fontSize: '0.85rem' }}>الأكثر طلباً</span></div><h2 style={{ fontSize: '1.8rem', fontWeight: '900', margin: 0 }}>تريند الآن 🔥</h2></div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><button onClick={() => scroll(bestSellerRef, 'right')} style={arrowBtnSmall}><ChevronRight size={14}/></button><button onClick={() => scroll(bestSellerRef, 'left')} style={arrowBtnSmall}><ChevronLeft size={14}/></button></div>
                  </div>
                  <div ref={bestSellerRef} className="no-scrollbar product-grid-carousel">
                    {bestSellers.map((p) => {
                      const country = p.country_origin || p.country_of_origin || p.origin || 'أصلي';
                      return (
                        <div key={p.id} className="product-card-mdrn">
                          <div style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: '#22c55e', color: '#fff', padding: '2px 6px', borderRadius: '5px', fontSize: '0.6rem', fontWeight: '900', zIndex: 10 }}>تريند ✨</div>
                          <Link href={`/products/${p.id}`} className="img-container"><img src={p.image_url} alt={p.name} className="img-fill-100" loading="lazy" /></Link>
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
                              <button style={cartBtnStyleSmall} onClick={(e) => { e.preventDefault(); addToCart({...p, price: p.sale_price || p.regular_price}, 1); toast.success('تمت الإضافة'); }}><ShoppingCart size={16} /> أضف إلى السلة</button>
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
                <div style={{ textAlign: 'right', marginBottom: '30px' }}><h2 style={{ fontSize: '2.2rem', fontWeight: '900', margin: 0 }}>تسوق حسب الفئة</h2></div>
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
  zIndex: 99999 
};


const logoContainer: any = { marginBottom: '30px' };
const logoImage: any = { width: '180px', height: 'auto', filter: 'drop-shadow(0 20px 40px rgba(34, 197, 94, 0.3))' };
const brandNameText: any = { fontSize: '4rem', fontWeight: '900', fontStyle: 'italic', letterSpacing: '-2px', marginBottom: '25px', lineHeight: '1', textTransform: 'uppercase', filter: 'drop-shadow(0 10px 30px rgba(34, 197, 94, 0.4))' };
const mainHeadline: any = { color: '#fff', fontWeight: '900', fontSize: '3.5rem', marginBottom: '20px', letterSpacing: '-1px', lineHeight: '1.2', textShadow: '0 4px 20px rgba(34, 197, 94, 0.3)' };
const tagline: any = { color: '#a0a0a0', fontSize: '1.3rem', fontWeight: '600', marginBottom: '45px', lineHeight: '1.7' };
const loadingBarContainer: any = { width: '100%', height: '5px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden', marginBottom: '40px' };
const loadingBar: any = { height: '100%', background: 'linear-gradient(90deg, #22c55e 0%, #16a34a 50%, #22c55e 100%)', borderRadius: '10px' };
const messageContainer: any = { marginBottom: '35px', minHeight: '35px' };
const messageText: any = { fontSize: '1.15rem', fontWeight: '700', color: '#fff' };
const featurePills: any = { display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' };
const pill: any = { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '25px', fontSize: '0.85rem', fontWeight: '700', color: '#22c55e', backdropFilter: 'blur(10px)' };
const arrowBtnSmall = { width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#fff', border: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };
const cartBtnStyleSmall: any = { width: '100%', padding: '12px', backgroundColor: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', fontSize: '1rem' };