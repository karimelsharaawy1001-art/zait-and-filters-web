'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { 
  Car, ShieldCheck, ChevronLeft, ChevronRight, Zap, ShoppingCart, 
  Globe, Settings2, Calendar, Flame, Loader2, 
  Facebook, Instagram, Music2, Headphones, Mail, MapPin, Send,
  LayoutGrid, Tags 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/context/CartContext'; 
import toast from 'react-hot-toast'; 

const Select = dynamic(() => import('react-select'), { ssr: false });

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

  useEffect(() => {
    setIsMounted(true);
    fetchInitialData();
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
      const [heroRes, productsRes, catListRes, customImgRes, partBrandsRes, carBrandsRes] = await Promise.all([
        supabase.from('hero_settings').select('*').order('id', { ascending: true }),
        supabase.from('products').select('*').range(0, 1000).order('created_at', { ascending: false }),
        supabase.from('products').select('category'),
        supabase.from('category_images').select('name, image_url'),
        supabase.from('part_brands').select('name, logo_url').neq('logo_url', ''),
        supabase.from('car_brands').select('name, logo_url')
      ]);

      if (heroRes.data) setSlides(heroRes.data);
      if (partBrandsRes.data) setBrandLogos(partBrandsRes.data);

      const allProducts = productsRes.data || [];
      const customImages = customImgRes.data || [];
      
      if (allProducts.length > 0) {
        setSaleProducts(allProducts.filter(p => Number(p.sale_price) > 0 && Number(p.regular_price) > Number(p.sale_price) && isValidImg(p.image_url)));

        const { data: orders } = await supabase.from('orders').select('items').limit(50);
        const productCounts: Record<string, number> = {};
        orders?.forEach((order: any) => {
          order.items?.forEach((item: any) => {
            productCounts[item.id] = (productCounts[item.id] || 0) + (item.quantity || 1);
          });
        });
        const sortedBestIds = Object.entries(productCounts).sort(([, a], [, b]) => b - a).map(([id]) => id);
        let bestSellersList = sortedBestIds.map(id => allProducts.find(p => p.id === id)).filter(p => p && isValidImg(p.image_url));

        if (bestSellersList.length < 4) {
          bestSellersList = [...bestSellersList, ...allProducts.filter(p => !bestSellersList.find(b => b?.id === p.id) && isValidImg(p.image_url)).slice(0, 10)];
        }
        setBestSellers(bestSellersList);
      }

      if (catListRes.data) {
        const uniqueCats = Array.from(new Set(catListRes.data.map(i => i.category?.trim()).filter(Boolean)));
        setCategories(uniqueCats.map(cat => {
          const imgObj = customImages.find(img => img.name?.trim().toUpperCase() === cat.toUpperCase());
          const prodObj = allProducts.find(p => p.category?.trim().toUpperCase() === cat.toUpperCase() && isValidImg(p.image_url));
          return { name: cat, image: imgObj?.image_url || prodObj?.image_url || "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=500" };
        }));
      }

      if (carBrandsRes.data) {
        const uniqueMakes = Array.from(new Set(allProducts.map(i => i.car_make?.trim()).filter(Boolean)));
        setMakesOptions(uniqueMakes.map(makeName => {
          const brandInfo = carBrandsRes.data?.find(b => b.name?.trim().toLowerCase() === makeName.toString().toLowerCase());
          return { value: makeName, label: makeName, logo: brandInfo?.logo_url || null };
        }));
      }
    } catch (err) { console.error(err); } finally { setTimeout(() => setLoading(false), 500); }
  }

  async function fetchModels(make: string) {
    const { data } = await supabase.from('products').select('car_model').ilike('car_make', make.trim());
    if (data) {
      setModelsOptions(Array.from(new Set(data.map(i => i.car_model?.trim()).filter(Boolean))).sort().map(m => ({ value: m, label: m })));
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
    control: (base: any) => ({ ...base, height: '52px', borderRadius: '12px', border: 'none', backgroundColor: '#f8f8f8', fontSize: '1rem', textAlign: 'right', display: 'flex', flexDirection: 'row-reverse' }),
    option: (base: any, state: any) => ({ ...base, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'row-reverse', gap: '8px', padding: '10px 15px', fontSize: '0.95rem', backgroundColor: state.isFocused ? '#eefcf5' : '#fff', color: '#1a1a1a', cursor: 'pointer' }),
    singleValue: (base: any) => ({ ...base, display: 'flex', alignItems: 'center', gap: '8px', flexDirection: 'row-reverse' }),
    valueContainer: (base: any) => ({ ...base, padding: '0 12px', display: 'flex', flexDirection: 'row-reverse' }),
    menu: (base: any) => ({ ...base, zIndex: 9999 })
  };

  if (!isMounted) return null;

  return (
    <>
      {/* SEO: Structured Data */}
      <StructuredData />
      
      <div style={{ direction: 'rtl', backgroundColor: '#fdfdfd', color: '#1a1a1a', minHeight: '100vh', fontSize: '13px' }}>
        
        <AnimatePresence>
          {loading && (
            <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} style={fullPageLoaderStyle}>
              <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} style={{ textAlign: 'center' }}>
                <div style={logoCircle}><Car size={40} color="#22c55e" /></div>
                <h2 style={{ color: '#22c55e', fontWeight: '900', marginTop: '20px', fontSize: '1.2rem' }}>زيت أند فلترز</h2>
                <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', marginTop: '10px' }}><Loader2 className="animate-spin" size={20} color="#22c55e" /><span style={{color: '#888'}}>جاري التحميل...</span></div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <style dangerouslySetInnerHTML={{ __html: `
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          .product-grid-carousel { display: flex !important; flex-wrap: nowrap !important; gap: 15px; overflow-x: auto !important; scroll-snap-type: x mandatory; padding: 10px 20px; -webkit-overflow-scrolling: touch; }
          .product-card-mdrn { flex: 0 0 280px !important; background: #fff; border-radius: 18px; border: 1px solid #f2f2f2; transition: all 0.3s ease; position: relative; display: flex; flex-direction: column; overflow: hidden; scroll-snap-align: start; }
          .product-card-mdrn:hover { transform: translateY(-6px); border-color: #22c55e; }
          .img-container { background: #f9f9f9; height: 180px; width: 100%; display: flex; align-items: center; justify-content: center; position: relative; cursor: pointer; overflow: hidden; }
          .img-fill-100 { width: 100%; height: 100%; object-fit: cover; }
          .category-grid-v3 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; padding: 20px; }
          .category-item-mdrn { position: relative; height: 220px; border-radius: 20px; overflow: hidden; background-color: #1a1a1a; transition: 0.3s ease; }
          .cat-bg-img { width: 100%; height: 100%; object-fit: cover; opacity: 0.6; filter: brightness(0.7); }
          .cat-info-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(to top, rgba(0,0,0,0.7), transparent); padding: 20px; }
          .cat-title-text { color: #fff; font-size: 1.6rem; font-weight: 900; text-align: center; text-shadow: 2px 2px 10px rgba(0,0,0,0.8); }
          @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
          .marquee-inner { display: flex; width: max-content; animation: marquee 35s linear infinite; }
          .brand-logo-wrap { width: 180px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; padding: 10px 25px; }
          .logo-img-v3 { max-width: 130px; max-height: 60px; filter: grayscale(100%); opacity: 0.5; transition: 0.3s; }
          @media (max-width: 768px) { .category-grid-v3 { grid-template-columns: repeat(2, 1fr); gap: 10px; } }
        `}} />

        {!loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            {/* Hero Section */}
            <section style={{ position: 'relative', minHeight: '500px', overflow: 'hidden', backgroundColor: '#000' }}>
              <AnimatePresence mode="wait">
                {slides.length > 0 && (
                  <motion.div key={currentSlide} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }} className="hero-slide" style={{ position: 'absolute', inset: 0, backgroundSize: 'cover', backgroundPosition: 'center', backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url("${slides[currentSlide]?.bg_image_url}")`, display: 'flex', alignItems: 'center' }}>
                    <div style={{ position: 'relative', zIndex: 5, width: '100%', maxWidth: '1100px', margin: '0 auto', padding: '0 20px' }}>
                      <div style={{ display: 'flex', gap: '40px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1', textAlign: 'right', minWidth: '300px' }}>
                          <h1 style={{ fontSize: '3rem', fontWeight: '900', lineHeight: '1.4', marginBottom: '15px', color: '#22c55e' }} dangerouslySetInnerHTML={{ __html: slides[currentSlide]?.title || '' }} />
                          <p style={{ color: '#fff', fontSize: '1.2rem', fontWeight: '500', marginBottom: '25px', maxWidth: '550px', lineHeight: '1.5' }}>{slides[currentSlide]?.subtitle}</p>
                          <Link href={slides[currentSlide]?.button_link || '/store'} style={{ padding: '12px 30px', backgroundColor: '#22c55e', color: '#fff', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.95rem' }}>{slides[currentSlide]?.button_text || 'تصفح المتجر'}</Link>
                        </div>
                        
                        <div style={{ width: '400px', backgroundColor: '#fff', padding: '30px', borderRadius: '30px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
                          <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: '900', textAlign: 'center' }}>ابحث بمواصفات سيارتك</h3>
                          <div style={{marginBottom: '12px'}}><label style={{fontSize: '0.8rem', fontWeight: '800', color: '#555', marginBottom: '6px', display: 'block'}}>الماركة</label><Select instanceId="make-select" options={makesOptions} styles={customSelectStyles} placeholder="اختر الماركة" isRtl={true} onChange={(opt) => setSelectedMake(opt)} formatOptionLabel={(brand: any) => (<div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>{brand.logo ? <img src={brand.logo} alt="" style={{ width: '22px', height: '22px', objectFit: 'contain' }} /> : <Car size={20} color="#ccc" />}<span>{brand.label}</span></div>)} /></div>
                          <div style={{marginBottom: '12px'}}><label style={{fontSize: '0.8rem', fontWeight: '800', color: '#555', marginBottom: '6px', display: 'block'}}>الموديل</label><Select instanceId="model-select" options={modelsOptions} styles={customSelectStyles} placeholder="اختر الموديل" isRtl={true} value={selectedModel} isDisabled={!selectedMake} onChange={(opt) => setSelectedModel(opt)} /></div>
                          <div style={{marginBottom: '12px'}}><label style={{fontSize: '0.8rem', fontWeight: '800', color: '#555', marginBottom: '6px', display: 'block'}}>سنة الصنع</label><input type="text" placeholder="مثلاً: 2024" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} style={{ width: '100%', height: '52px', padding: '0 15px', backgroundColor: '#f8f8f8', border: 'none', borderRadius: '12px', fontSize: '1rem', outline: 'none' }} /></div>
                          <button onClick={handleSearch} style={{ width: '100%', marginTop: '15px', backgroundColor: '#1a1a1a', color: '#fff', border: 'none', padding: '16px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', fontSize: '1.1rem' }}>بحث الآن <ChevronLeft size={22} /></button>
                        </div>

                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {brandLogos.length > 0 && (
              <section style={{ padding: '12px 0', background: '#fff', borderBottom: '1px solid #f5f5f5' }}>
                <div style={{ overflow: 'hidden', direction: 'ltr' }}><div className="marquee-inner">{[...brandLogos, ...brandLogos].map((brand, index) => (<div key={index} className="brand-logo-wrap"><Link href={`/store?brand=${brand.name}`}><img src={brand.logo_url} alt={brand.name} className="logo-img-v3" loading="lazy"/></Link></div>))}</div></div>
              </section>
            )}

            {/* عروض حصرية */}
            {saleProducts.length > 0 && (
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
                          <div style={{ background: '#f9f9f9', padding: '10px', borderRadius: '10px', marginBottom: '10px' }}>
                            <div style={{fontSize:'0.8rem', color:'#1a1a1a', fontWeight:'800', marginBottom:'3px', display:'flex', alignItems:'center', gap:'6px'}}><Settings2 size={14} color="#22c55e"/> {p.car_make} {p.car_model}</div>
                            <div style={{fontSize:'0.8rem', color:'#666', fontWeight:'700', display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px'}}><Calendar size={14} color="#22c55e"/> {p.car_model_year || 'الكل'}</div>
                            <div style={{fontSize:'0.8rem', color:'#22c55e', fontWeight:'800', display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px'}}><LayoutGrid size={14}/> {p.category}</div>
                            <div style={{fontSize:'0.8rem', color:'#888', fontWeight:'700', display:'flex', alignItems:'center', gap:'6px'}}><Tags size={14}/> {p.subcategory || 'عام'}</div>
                          </div>
                          <div style={{ marginTop: 'auto', display:'flex', flexDirection:'column', gap:'12px' }}>
                            <div><span style={{ display: 'block', color: '#bbb', textDecoration: 'line-through', fontSize: '0.75rem' }}>{p.regular_price} ج.م</span><span style={{ fontSize: '1.2rem', fontWeight: '900' }}>{p.sale_price} ج.م</span></div>
                            <button style={cartBtnStyleSmall} onClick={(e) => { e.preventDefault(); addToCart({...p, price: p.sale_price}, 1); toast.success('تمت الإضافة'); }}><ShoppingCart size={16} /> أضف إلى السلة</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* تريند الآن */}
            {bestSellers.length > 0 && (
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
                          <div style={{ background: '#f9f9f9', padding: '8px', borderRadius: '10px', marginBottom: '10px' }}>
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
            )}

            <section style={{ padding: '40px 20px 80px', maxWidth: '1200px', margin: '0 auto' }}>
              <div style={{ textAlign: 'right', marginBottom: '30px' }}><h2 style={{ fontSize: '2.2rem', fontWeight: '900', margin: 0 }}>تسوق حسب الفئة</h2></div>
              <div className="category-grid-v3">
                {categories.map((cat, index) => (
                  <Link href={`/categories/${encodeURIComponent(cat.name)}`} key={index}>
                    <div className="category-item-mdrn">
                      <img src={cat.image} alt={cat.name} className="cat-bg-img" loading="lazy" />
                      <div className="cat-info-overlay"><span className="cat-title-text">{cat.name}</span></div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

          </motion.div>
        )}
      </div>
    </>
  );
}

const fullPageLoaderStyle: any = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 };
const logoCircle: any = { width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#eefcf5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', boxShadow: '0 10px 20px rgba(34, 197, 94, 0.1)' };
const arrowBtnSmall = { width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#fff', border: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };
const cartBtnStyleSmall: any = { width: '100%', padding: '12px', backgroundColor: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', fontSize: '1rem' };
