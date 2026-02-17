'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  Car,
  ChevronLeft,
  Filter,
  X,
  Search,
  ShoppingCart,
  Globe,
  Settings2,
  Calendar,
  LayoutGrid,
  Tags,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/context/CartContext';
import toast from 'react-hot-toast';


const Select = dynamic(() => import('react-select'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: '48px',
        backgroundColor: '#f8f8f8',
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 15px',
        color: '#999',
      }}
    >
      جاري التحميل...
    </div>
  ),
});


function StoreContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToCart } = useCart();


  const [isMounted, setIsMounted] = useState(false);
  const [selectLoaded, setSelectLoaded] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [initializing, setInitializing] = useState(true); // NEW: Track initialization


  const [makesOptions, setMakesOptions] = useState<any[]>([]);
  const [modelsOptions, setModelsOptions] = useState<any[]>([]);
  const [categoriesOptions, setCategoriesOptions] = useState<any[]>([]);
  const [brandsOptions, setBrandsOptions] = useState<any[]>([]);


  const [selectedMake, setSelectedMake] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState<any>(null);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [selectedBrand, setSelectedBrand] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');


  const [carHeroImage, setCarHeroImage] = useState<string | null>(null);
  const [showHero, setShowHero] = useState(false);


  // Get URL params once on mount
  const urlMake = searchParams.get('make');
  const urlModel = searchParams.get('model');
  const urlYear = searchParams.get('year');
  const urlCategory = searchParams.get('category');
  const urlBrand = searchParams.get('brand');
  const urlSearch = searchParams.get('q');


  useEffect(() => {
    setIsMounted(true);
    setSelectLoaded(true);
    initializePage();
  }, []);


  useEffect(() => {
    if (selectedMake && selectedModel) {
      setShowHero(true);
      fetchCarImage(selectedMake.value, selectedModel.value);
    } else {
      setShowHero(false);
      setCarHeroImage(null);
    }
  }, [selectedMake, selectedModel]);


  async function initializePage() {
    try {
      setLoading(true);
      
      // Fetch filter options
      const { data, error } = await supabase
        .from('products')
        .select('car_make, category, brand')
        .order('car_make', { ascending: true });


      if (error) throw error;


      const uniqueMakes = Array.from(
        new Set(data.map((p) => p.car_make?.trim()).filter(Boolean))
      );
      const makesOpts = uniqueMakes.map((make) => ({ value: make, label: make }));
      setMakesOptions(makesOpts);


      const uniqueCategories = Array.from(
        new Set(data.map((p) => p.category?.trim()).filter(Boolean))
      );
      const catsOpts = uniqueCategories.map((cat) => ({ value: cat, label: cat }));
      setCategoriesOptions(catsOpts);


      const uniqueBrands = Array.from(
        new Set(data.map((p) => p.brand?.trim()).filter(Boolean))
      );
      const brandsOpts = uniqueBrands.map((brand) => ({ value: brand, label: brand }));
      setBrandsOptions(brandsOpts);


      // Apply URL filters if they exist
      await applyURLFilters(makesOpts, catsOpts, brandsOpts);
      
    } catch (error) {
      console.error('Error initializing page:', error);
      toast.error('حدث خطأ في تحميل الصفحة');
    } finally {
      setLoading(false);
      setInitializing(false); // Mark initialization complete
    }
  }


  async function applyURLFilters(makes: any[], cats: any[], brands: any[]) {
    let makeOption = null;
    let modelOption = null;
    let catOption = null;
    let brandOption = null;


    // Set year
    if (urlYear) {
      setSelectedYear(urlYear);
    }


    // Set category
    if (urlCategory && cats.length > 0) {
      catOption = cats.find(
        (opt) => opt.value.toUpperCase() === urlCategory.toUpperCase()
      );
      if (catOption) {
        setSelectedCategory(catOption);
      }
    }


    // Set brand
    if (urlBrand && brands.length > 0) {
      brandOption = brands.find(
        (opt) => opt.value.toUpperCase() === urlBrand.toUpperCase()
      );
      if (brandOption) {
        setSelectedBrand(brandOption);
      }
    }


    // Set search
    if (urlSearch) {
      setSearchQuery(urlSearch);
    }


    // Set make and model
    if (urlMake && makes.length > 0) {
      makeOption = makes.find(
        (opt) => opt.value.toUpperCase() === urlMake.toUpperCase()
      );
      
      if (makeOption) {
        setSelectedMake(makeOption);
        
        // Fetch models for this make
        const { data } = await supabase
          .from('products')
          .select('car_model')
          .ilike('car_make', makeOption.value.trim());


        if (data) {
          const uniqueModels = Array.from(
            new Set(data.map((p) => p.car_model?.trim()).filter(Boolean))
          );
          const modelOptions = uniqueModels.sort().map((model) => ({ value: model, label: model }));
          setModelsOptions(modelOptions);


          // Set model if in URL
          if (urlModel) {
            modelOption = modelOptions.find(
              (opt) => opt.value.toUpperCase() === urlModel.toUpperCase()
            );
            if (modelOption) {
              setSelectedModel(modelOption);
            }
          }
        }
      }
    }


    // Fetch products if minimum filters are met
    const hasMinimumFilters = (urlMake && urlModel) || urlCategory;
    if (hasMinimumFilters) {
      await fetchProducts({
        make: urlMake,
        model: urlModel,
        year: urlYear,
        category: urlCategory,
        brand: urlBrand,
        search: urlSearch,
      });
    }
  }


  async function fetchCarImage(make: string, model: string) {
    try {
      const { data } = await supabase
        .from('car_images')
        .select('image_url')
        .ilike('car_make', make.trim())
        .ilike('car_model', model.trim())
        .single();


      if (data && data.image_url) {
        setCarHeroImage(data.image_url);
      } else {
        setCarHeroImage(null);
      }
    } catch (error) {
      setCarHeroImage(null);
    }
  }


  async function fetchProducts(filters: any) {
    try {
      // Don't show loading spinner if this is initial load with URL params
      if (!initializing) {
        setLoading(true);
      }
      
      let query = supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });


      if (filters.make) {
        query = query.ilike('car_make', filters.make.trim());
      }


      if (filters.model) {
        query = query.ilike('car_model', filters.model.trim());
      }


      if (filters.year) {
        query = query.ilike('car_model_year', `%${filters.year.trim()}%`);
      }


      if (filters.category) {
        query = query.ilike('category', filters.category.trim());
      }


      if (filters.brand) {
        query = query.ilike('brand', filters.brand.trim());
      }


      const { data, error } = await query;


      if (error) throw error;


      let allFetchedProducts = data || [];


      if (filters.search) {
        allFetchedProducts = allFetchedProducts.filter((p) =>
          p.name?.toLowerCase().includes(filters.search.toLowerCase())
        );
      }


      setProducts(allFetchedProducts);
      setFilteredProducts(allFetchedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('حدث خطأ في تحميل المنتجات');
    } finally {
      if (!initializing) {
        setLoading(false);
      }
    }
  }


  // Manual filter change from user interaction
  async function handleMakeChange(opt: any) {
    setSelectedMake(opt);
    setSelectedModel(null);
    
    if (opt) {
      const { data } = await supabase
        .from('products')
        .select('car_model')
        .ilike('car_make', opt.value.trim());


      if (data) {
        const uniqueModels = Array.from(
          new Set(data.map((p) => p.car_model?.trim()).filter(Boolean))
        );
        setModelsOptions(uniqueModels.sort().map((model) => ({ value: model, label: model })));
      }
    } else {
      setModelsOptions([]);
    }
  }


  function handleFilterChange() {
    const hasMinimumFilters = (selectedMake && selectedModel) || selectedCategory;


    if (!hasMinimumFilters) {
      toast.error('يرجى اختيار (الماركة والموديل) أو (الفئة) على الأقل');
      return;
    }


    const params = new URLSearchParams();
    if (selectedMake) params.set('make', selectedMake.value.trim().toUpperCase());
    if (selectedModel) params.set('model', selectedModel.value.trim().toUpperCase());
    if (selectedYear) params.set('year', selectedYear.trim());
    if (selectedCategory) params.set('category', selectedCategory.value.trim());
    if (selectedBrand) params.set('brand', selectedBrand.value.trim());
    if (searchQuery) params.set('q', searchQuery.trim());


    router.push(`/store?${params.toString()}`);


    fetchProducts({
      make: selectedMake?.value,
      model: selectedModel?.value,
      year: selectedYear,
      category: selectedCategory?.value,
      brand: selectedBrand?.value,
      search: searchQuery,
    });


    setFiltersOpen(false);
  }


  function clearFilters() {
    setSelectedMake(null);
    setSelectedModel(null);
    setSelectedYear('');
    setSelectedCategory(null);
    setSelectedBrand(null);
    setSearchQuery('');
    setFilteredProducts([]);
    setProducts([]);
    setModelsOptions([]);
    router.push('/store');
  }


  const customSelectStyles = {
    control: (base: any) => ({
      ...base,
      height: '48px',
      borderRadius: '10px',
      border: '1px solid #e5e5e5',
      backgroundColor: '#fff',
      fontSize: '0.9rem',
      textAlign: 'right',
      display: 'flex',
      flexDirection: 'row-reverse',
    }),
    option: (base: any, state: any) => ({
      ...base,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
      flexDirection: 'row-reverse',
      gap: '8px',
      padding: '10px 15px',
      fontSize: '0.85rem',
      backgroundColor: state.isFocused ? '#eefcf5' : '#fff',
      color: '#1a1a1a',
      cursor: 'pointer',
    }),
    singleValue: (base: any) => ({
      ...base,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      flexDirection: 'row-reverse',
    }),
    valueContainer: (base: any) => ({
      ...base,
      padding: '0 12px',
      display: 'flex',
      flexDirection: 'row-reverse',
    }),
    menu: (base: any) => ({ ...base, zIndex: 9999 }),
  };


  if (!isMounted) return null;


  const hasMinimumFilters = (selectedMake && selectedModel) || selectedCategory;
  const showEmptyState = !loading && !initializing && !hasMinimumFilters && filteredProducts.length === 0;
  const showNoResults = !loading && !initializing && hasMinimumFilters && filteredProducts.length === 0;


  const FilterSection = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      {selectLoaded && (
        <>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.8rem', fontWeight: '800', color: '#555' }}>
              الماركة <span style={{ color: '#22c55e' }}>*</span>
            </label>
            <Select 
              instanceId="store-make-select" 
              options={makesOptions} 
              styles={customSelectStyles} 
              placeholder="اختر الماركة" 
              isRtl={true} 
              value={selectedMake} 
              onChange={handleMakeChange} 
              isClearable 
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.8rem', fontWeight: '800', color: '#555' }}>
              الموديل <span style={{ color: '#22c55e' }}>*</span>
            </label>
            <Select 
              instanceId="store-model-select" 
              options={modelsOptions} 
              styles={customSelectStyles} 
              placeholder="اختر الموديل" 
              isRtl={true} 
              value={selectedModel} 
              onChange={(opt) => setSelectedModel(opt)} 
              isDisabled={!selectedMake} 
              isClearable 
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.8rem', fontWeight: '800', color: '#555' }}>سنة الصنع</label>
            <input 
              type="text" 
              placeholder="مثلاً: 2024" 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(e.target.value)} 
              style={{ width: '100%', height: '48px', padding: '0 15px', backgroundColor: '#fff', border: '1px solid #e5e5e5', borderRadius: '10px', fontSize: '0.9rem', outline: 'none' }} 
            />
          </div>

          <div style={{ textAlign: 'center', color: '#888', fontSize: '0.85rem', fontWeight: '700', padding: '10px 0', borderTop: '1px solid #eee', borderBottom: '1px solid #eee', margin: '5px 0' }}>
            أو
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.8rem', fontWeight: '800', color: '#555' }}>
              الفئة <span style={{ color: '#22c55e' }}>*</span>
            </label>
            <Select 
              instanceId="store-category-select" 
              options={categoriesOptions} 
              styles={customSelectStyles} 
              placeholder="اختر الفئة" 
              isRtl={true} 
              value={selectedCategory} 
              onChange={(opt) => setSelectedCategory(opt)} 
              isClearable 
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.8rem', fontWeight: '800', color: '#555' }}>العلامة التجارية</label>
            <Select 
              instanceId="store-brand-select" 
              options={brandsOptions} 
              styles={customSelectStyles} 
              placeholder="اختر العلامة" 
              isRtl={true} 
              value={selectedBrand} 
              onChange={(opt) => setSelectedBrand(opt)} 
              isClearable 
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.8rem', fontWeight: '800', color: '#555' }}>البحث</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                placeholder="ابحث عن منتج..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleFilterChange();
                  }
                }}
                style={{ width: '100%', height: '48px', padding: '0 45px 0 15px', backgroundColor: '#fff', border: '1px solid #e5e5e5', borderRadius: '10px', fontSize: '0.9rem', outline: 'none' }} 
              />
              <Search size={18} color="#999" style={{ position: 'absolute', right: '15px', top: '15px' }} />
            </div>
          </div>

          <div style={{ backgroundColor: '#f0f9ff', padding: '12px', borderRadius: '10px', fontSize: '0.75rem', color: '#0369a1', display: 'flex', alignItems: 'start', gap: '8px' }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>يجب اختيار (الماركة + الموديل) أو (الفئة) على الأقل</span>
          </div>
        </>
      )}

      <button onClick={handleFilterChange} style={{ width: '100%', padding: '14px', backgroundColor: '#22c55e', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '900', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '10px' }}>
        <Search size={18} />
        تطبيق الفلاتر
      </button>

      {(selectedMake || selectedModel || selectedYear || selectedCategory || selectedBrand || searchQuery) && (
        <button onClick={clearFilters} style={{ width: '100%', padding: '12px', backgroundColor: '#fee', color: '#dc2626', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.9rem' }}>
          <X size={16} />
          مسح الفلاتر
        </button>
      )}
    </div>
  );


  return (
    <div style={{ direction: 'rtl', backgroundColor: '#f9f9f9', minHeight: '100vh', paddingTop: '80px' }}>
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          
          .store-product-card {
            background: #fff;
            border-radius: 16px;
            border: 1px solid #f0f0f0;
            transition: all 0.3s ease;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            position: relative;
          }
          
          .store-product-card:hover {
            transform: translateY(-5px);
            border-color: #22c55e;
            box-shadow: 0 10px 30px rgba(34, 197, 94, 0.15);
          }
          
          /* Products Grid - 2 columns on mobile */
          .products-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
          
          @media (min-width: 640px) {
            .products-grid {
              grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
              gap: 20px;
            }
          }
          
          @media (max-width: 768px) {
            .desktop-filters { display: none !important; }
            .mobile-filter-btn { display: block !important; }
            
            /* Adjust product card for mobile 2-column layout */
            .store-product-card {
              border-radius: 12px;
            }
            
            .store-product-card h3 {
              font-size: 0.85rem !important;
              height: 38px !important;
            }
            
            .store-product-card img {
              padding: 10px !important;
            }
          }
          
          @media (min-width: 769px) {
            .desktop-filters { display: block !important; }
            .mobile-filter-btn { display: none !important; }
          }
        `,
      }} />


      {/* Loading Screen - Show during initialization OR manual loading */}
      <AnimatePresence>
        {(loading || initializing) && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <Loader2
                size={60}
                color="#22c55e"
                style={{
                  animation: 'spin 1s linear infinite',
                  marginBottom: '20px',
                }}
              />
              <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1a1a1a' }}>
                جاري تحميل المنتجات...
              </h3>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Only render content after initialization is complete */}
      {!initializing && (
        <>
          {showHero && !loading && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                maxWidth: '1400px',
                margin: '0 auto 30px',
                padding: '0 20px',
              }}
            >
              <div
                style={{
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  borderRadius: '20px',
                  padding: window.innerWidth <= 768 ? '25px' : '35px',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 10px 40px rgba(34, 197, 94, 0.25)',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0.08,
                    backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }}
                />

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: carHeroImage && window.innerWidth > 768 ? '2fr 1fr' : '1fr',
                    gap: '25px',
                    alignItems: 'center',
                    position: 'relative',
                    zIndex: 2,
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '12px',
                      }}
                    >
                      <CheckCircle2 size={20} color="#fff" />
                      <span
                        style={{
                          color: '#fff',
                          fontSize: '0.85rem',
                          fontWeight: '700',
                        }}
                      >
                        تم اختيار السيارة
                      </span>
                    </div>

                    <h1
                      style={{
                        color: '#fff',
                        fontSize: window.innerWidth <= 768 ? '1.6rem' : '2rem',
                        fontWeight: '900',
                        marginBottom: '12px',
                        lineHeight: '1.2',
                        textShadow: '0 2px 10px rgba(0,0,0,0.15)',
                      }}
                    >
                      قطع غيار {selectedMake?.label}
                    </h1>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        flexWrap: 'wrap',
                        marginBottom: '15px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          backgroundColor: 'rgba(255, 255, 255, 0.2)',
                          padding: '8px 15px',
                          borderRadius: '10px',
                          backdropFilter: 'blur(10px)',
                        }}
                      >
                        <Car size={18} color="#fff" />
                        <span
                          style={{
                            color: '#fff',
                            fontSize: window.innerWidth <= 768 ? '0.95rem' : '1.1rem',
                            fontWeight: '800',
                          }}
                        >
                          {selectedMake?.label} {selectedModel?.label}
                        </span>
                      </div>

                      {selectedYear && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            padding: '8px 15px',
                            borderRadius: '10px',
                            backdropFilter: 'blur(10px)',
                          }}
                        >
                          <Calendar size={18} color="#fff" />
                          <span
                            style={{
                              color: '#fff',
                              fontSize: '0.95rem',
                              fontWeight: '700',
                            }}
                          >
                            {selectedYear}
                          </span>
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        backgroundColor: 'rgba(255, 255, 255, 0.25)',
                        padding: '10px 18px',
                        borderRadius: '10px',
                        backdropFilter: 'blur(10px)',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '1.5rem',
                          fontWeight: '900',
                          color: '#fff',
                          marginLeft: '8px',
                        }}
                      >
                        {filteredProducts.length}
                      </div>
                      <div
                        style={{
                          fontSize: '0.85rem',
                          color: 'rgba(255, 255, 255, 0.95)',
                          fontWeight: '600',
                        }}
                      >
                        منتج متاح
                      </div>
                    </div>
                  </div>

                  {carHeroImage && window.innerWidth > 768 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2, duration: 0.4 }}
                      style={{
                        height: '200px',
                        borderRadius: '15px',
                        overflow: 'hidden',
                        boxShadow: '0 15px 40px rgba(0, 0, 0, 0.3)',
                      }}
                    >
                      <img
                        src={carHeroImage}
                        alt={`${selectedMake?.label} ${selectedModel?.label}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.section>
          )}


          <div className="mobile-filter-btn" style={{ display: 'none', maxWidth: '1400px', margin: '0 auto 20px', padding: '0 20px' }}>
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              style={{
                width: '100%',
                padding: '15px',
                backgroundColor: '#fff',
                color: '#1a1a1a',
                border: '1px solid #e5e5e5',
                borderRadius: '12px',
                fontWeight: '800',
                fontSize: '1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Filter size={20} color="#22c55e" />
                <span>الفلاتر</span>
                {hasMinimumFilters && (
                  <span
                    style={{
                      backgroundColor: '#22c55e',
                      color: '#fff',
                      padding: '2px 8px',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: '900',
                    }}
                  >
                    نشط
                  </span>
                )}
              </div>
              {filtersOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>

            <AnimatePresence>
              {filtersOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div
                    style={{
                      backgroundColor: '#fff',
                      padding: '20px',
                      borderRadius: '12px',
                      marginTop: '10px',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                    }}
                  >
                    <FilterSection />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>


          <div
            style={{
              maxWidth: '1400px',
              margin: '0 auto',
              padding: '0 20px 80px',
              display: 'flex',
              gap: '25px',
              alignItems: 'flex-start',
            }}
          >
            <aside
              className="desktop-filters"
              style={{
                display: 'none',
                width: '280px',
                flexShrink: 0,
                position: 'sticky',
                top: '100px',
              }}
            >
              <div
                style={{
                  backgroundColor: '#fff',
                  padding: '25px',
                  borderRadius: '15px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                }}
              >
                <h2
                  style={{
                    fontSize: '1.3rem',
                    fontWeight: '900',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <Filter size={22} color="#22c55e" />
                  الفلاتر
                </h2>
                <FilterSection />
              </div>
            </aside>


            <div style={{ flex: 1 }}>
              {showEmptyState ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '100px 20px',
                    backgroundColor: '#fff',
                    borderRadius: '20px',
                  }}
                >
                  <Filter size={80} color="#22c55e" style={{ margin: '0 auto 20px', opacity: 0.5 }} />
                  <h3 style={{ fontSize: '1.8rem', fontWeight: '900', marginBottom: '15px', color: '#1a1a1a' }}>
                    ابدأ بتحديد الفلاتر
                  </h3>
                  <p style={{ color: '#666', fontSize: '1.1rem', marginBottom: '10px' }}>
                    اختر الماركة والموديل أو الفئة للبحث عن المنتجات
                  </p>
                  <div style={{ backgroundColor: '#f0f9ff', padding: '15px', borderRadius: '12px', maxWidth: '500px', margin: '20px auto', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
                    <AlertCircle size={20} color="#0369a1" />
                    <span style={{ color: '#0369a1', fontSize: '0.9rem', fontWeight: '700' }}>
                      هذا يساعد في تحسين سرعة التصفح
                    </span>
                  </div>
                </div>
              ) : showNoResults ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '80px 20px',
                    backgroundColor: '#fff',
                    borderRadius: '20px',
                  }}
                >
                  <Car size={70} color="#ccc" style={{ margin: '0 auto 15px' }} />
                  <h3 style={{ fontSize: '1.6rem', fontWeight: '900', marginBottom: '8px' }}>
                    لا توجد منتجات
                  </h3>
                  <p style={{ color: '#666', fontSize: '1rem' }}>
                    جرب تغيير الفلاتر للعثور على المنتجات
                  </p>
                </div>
              ) : filteredProducts.length > 0 ? (
                <div className="products-grid">
                  {filteredProducts.map((product) => {
                    const country =
                      product.country_origin ||
                      product.country_of_origin ||
                      product.origin ||
                      'أصلي';
                    const price = product.sale_price || product.regular_price;


                    return (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="store-product-card"
                      >
                        {product.sale_price > 0 &&
                          product.regular_price > product.sale_price && (
                            <div
                              style={{
                                position: 'absolute',
                                top: '10px',
                                right: '10px',
                                backgroundColor: '#ff4d4d',
                                color: '#fff',
                                padding: '4px 10px',
                                borderRadius: '8px',
                                fontSize: '0.7rem',
                                fontWeight: '900',
                                zIndex: 10,
                              }}
                            >
                              -
                              {Math.round(
                                ((product.regular_price - product.sale_price) /
                                  product.regular_price) *
                                  100
                              )}
                              %
                            </div>
                          )}


                        <Link
                          href={`/products/${product.id}`}
                          style={{
                            display: 'block',
                            height: '200px',
                            backgroundColor: '#f9f9f9',
                            overflow: 'hidden',
                            position: 'relative',
                          }}
                        >
                          <img
                            src={product.image_url || "/api/placeholder/400/320"}
                            alt={product.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'contain',
                              padding: '15px',
                              transition: 'transform 0.3s ease',
                            }}
                            loading="lazy"
                          />
                        </Link>


                        <div
                          style={{
                            padding: '18px',
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: '10px',
                            }}
                          >
                            <span
                              style={{
                                color: '#22c55e',
                                fontWeight: '800',
                                fontSize: '0.8rem',
                              }}
                            >
                              {product.brand}
                            </span>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                color: '#666',
                                fontWeight: '700',
                                fontSize: '0.75rem',
                              }}
                            >
                              <Globe size={13} color="#22c55e" />
                              <span>{country}</span>
                            </div>
                          </div>


                          <h3
                            style={{
                              fontSize: '0.95rem',
                              fontWeight: '900',
                              marginBottom: '10px',
                              height: '45px',
                              overflow: 'hidden',
                              lineHeight: '1.4',
                            }}
                          >
                            {product.name}
                          </h3>


                          <div
                            style={{
                              background: '#f9f9f9',
                              padding: '10px',
                              borderRadius: '10px',
                              marginBottom: '12px',
                            }}
                          >
                            <div
                              style={{
                                fontSize: '0.75rem',
                                color: '#1a1a1a',
                                fontWeight: '800',
                                marginBottom: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              <Settings2 size={12} color="#22c55e" />
                              {product.car_make} {product.car_model}
                            </div>
                            <div
                              style={{
                                fontSize: '0.75rem',
                                color: '#666',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                marginBottom: '4px',
                              }}
                            >
                              <Calendar size={12} color="#22c55e" />
                              {product.car_model_year || 'الكل'}
                            </div>
                            <div
                              style={{
                                fontSize: '0.75rem',
                                color: '#22c55e',
                                fontWeight: '800',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              <LayoutGrid size={12} />
                              {product.category}
                            </div>
                          </div>


                          <div
                            style={{
                              marginTop: 'auto',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px',
                            }}
                          >
                            {product.sale_price > 0 &&
                            product.regular_price > product.sale_price ? (
                              <div>
                                <span
                                  style={{
                                    display: 'block',
                                    color: '#bbb',
                                    textDecoration: 'line-through',
                                    fontSize: '0.75rem',
                                  }}
                                >
                                  {product.regular_price} ج.م
                                </span>
                                <span style={{ fontSize: '1.2rem', fontWeight: '900' }}>
                                  {product.sale_price} ج.م
                                </span>
                              </div>
                            ) : (
                              <span style={{ fontSize: '1.2rem', fontWeight: '900' }}>
                                {price} ج.م
                              </span>
                            )}


                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                addToCart({ ...product, price }, 1);
                                toast.success('تمت الإضافة');
                              }}
                              style={{
                                width: '100%',
                                padding: '11px',
                                backgroundColor: '#1a1a1a',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '10px',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                transition: '0.2s',
                              }}
                            >
                              <ShoppingCart size={16} />
                              أضف إلى السلة
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}


export default function StorePage() {
  return (
    <Suspense fallback={
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={60} color="#22c55e" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    }>
      <StoreContent />
    </Suspense>
  );
}