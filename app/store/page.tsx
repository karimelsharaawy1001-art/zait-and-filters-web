'use client';
import { useState, useEffect, Suspense } from 'react';
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
  ChevronRight,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/context/CartContext';
import toast from 'react-hot-toast';

const PRODUCTS_PER_PAGE = 12;

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

// ─────────────────────────────────────────────────────────────────────────────
// FilterSection defined OUTSIDE StoreContent to keep it stable across renders
// ─────────────────────────────────────────────────────────────────────────────
interface FilterSectionProps {
  selectLoaded: boolean;
  garageMode: boolean;
  userCar: any;
  makesOptions: any[];
  modelsOptions: any[];
  categoriesOptions: any[];
  subcategoriesOptions: any[];
  brandsOptions: any[];
  selectedMake: any;
  selectedModel: any;
  yearInput: string;
  selectedCategory: any;
  selectedSubcategories: any[]; // ← changed to array
  selectedBrand: any;
  searchQuery: string;
  customSelectStyles: any;
  handleMakeChange: (opt: any) => void;
  setSelectedModel: (opt: any) => void;
  setYearInput: (val: string) => void;
  handleCategoryChange: (opt: any) => void;
  setSelectedSubcategories: (opts: any[]) => void; // ← changed to array setter
  setSelectedBrand: (opt: any) => void;
  setSearchQuery: (val: string) => void;
  handleFilterChange: () => void;
  clearFilters: () => void;
}

function FilterSection({
  selectLoaded,
  garageMode,
  userCar,
  makesOptions,
  modelsOptions,
  categoriesOptions,
  subcategoriesOptions,
  brandsOptions,
  selectedMake,
  selectedModel,
  yearInput,
  selectedCategory,
  selectedSubcategories,
  selectedBrand,
  searchQuery,
  customSelectStyles,
  handleMakeChange,
  setSelectedModel,
  setYearInput,
  handleCategoryChange,
  setSelectedSubcategories,
  setSelectedBrand,
  setSearchQuery,
  handleFilterChange,
  clearFilters,
}: FilterSectionProps) {
  const hasAnyFilter =
    selectedMake ||
    selectedModel ||
    yearInput ||
    selectedCategory ||
    (selectedSubcategories && selectedSubcategories.length > 0) ||
    selectedBrand ||
    searchQuery;

  const garageMakeConflict =
    garageMode &&
    userCar &&
    selectedMake &&
    selectedMake.value.toLowerCase() !== userCar.make.toLowerCase();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      {selectLoaded && (
        <>
          {garageMakeConflict && (
            <div
              style={{
                backgroundColor: '#fff7ed',
                border: '1px solid #f97316',
                padding: '12px',
                borderRadius: '10px',
                fontSize: '0.75rem',
                color: '#9a3412',
                display: 'flex',
                alignItems: 'start',
                gap: '8px',
              }}
            >
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#f97316' }} />
              <span>
                وضع الجراج مفعّل لسيارة <strong>{userCar.make}</strong>. لن تظهر منتجات{' '}
                <strong>{selectedMake?.label}</strong> ما دام الجراج مفعّلاً.
              </span>
            </div>
          )}

          <div style={{ opacity: garageMode ? 0.5 : 1, pointerEvents: garageMode ? 'none' : 'auto' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.8rem', fontWeight: '800', color: '#555' }}>
              الماركة <span style={{ color: '#22c55e' }}>*</span>
            </label>
            <Select
              instanceId="store-make-select"
              options={makesOptions}
              styles={customSelectStyles}
              placeholder={garageMode ? userCar?.make : 'اختر الماركة'}
              isRtl={true}
              value={selectedMake}
              onChange={handleMakeChange}
              isClearable
            />
          </div>

          <div style={{ opacity: garageMode ? 0.5 : 1, pointerEvents: garageMode ? 'none' : 'auto' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.8rem', fontWeight: '800', color: '#555' }}>
              الموديل <span style={{ color: '#22c55e' }}>*</span>
            </label>
            <Select
              instanceId="store-model-select"
              options={modelsOptions}
              styles={customSelectStyles}
              placeholder={garageMode ? userCar?.model : 'اختر الموديل'}
              isRtl={true}
              value={selectedModel}
              onChange={(opt: any) => setSelectedModel(opt)}
              isDisabled={!selectedMake && !garageMode}
              isClearable
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.8rem', fontWeight: '800', color: '#555' }}>
              سنة الصنع
            </label>
            <input
              type="text"
              placeholder="مثلاً: 2024"
              value={yearInput}
              onChange={(e) => setYearInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleFilterChange()}
              style={{
                width: '100%',
                height: '48px',
                padding: '0 15px',
                backgroundColor: '#fff',
                border: '1px solid #e5e5e5',
                borderRadius: '10px',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
          </div>

          <div
            style={{
              textAlign: 'center',
              color: '#888',
              fontSize: '0.85rem',
              fontWeight: '700',
              padding: '10px 0',
              borderTop: '1px solid #eee',
              borderBottom: '1px solid #eee',
              margin: '5px 0',
            }}
          >
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
              onChange={handleCategoryChange}
              isClearable
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.8rem', fontWeight: '800', color: '#555' }}>
              القسم الفرعي
              {selectedSubcategories && selectedSubcategories.length > 0 && (
                <span
                  style={{
                    marginRight: '8px',
                    backgroundColor: '#22c55e',
                    color: '#fff',
                    padding: '2px 8px',
                    borderRadius: '8px',
                    fontSize: '0.7rem',
                    fontWeight: '900',
                  }}
                >
                  {selectedSubcategories.length} مختار
                </span>
              )}
            </label>
            <Select
              instanceId="store-subcategory-select"
              options={subcategoriesOptions}
              styles={{
                ...customSelectStyles,
                // Override control height to allow multi-value chips to expand
                control: (base: any) => ({
                  ...customSelectStyles.control(base),
                  height: 'auto',
                  minHeight: '48px',
                }),
              }}
              placeholder="اختر قسم فرعي أو أكثر"
              isRtl={true}
              isMulti
              value={selectedSubcategories}
              onChange={(opts: any) => setSelectedSubcategories(opts ? (opts as any[]) : [])}
              isDisabled={!selectedCategory}
              isClearable
              closeMenuOnSelect={false}
              hideSelectedOptions={false}
            />
            {selectedSubcategories && selectedSubcategories.length > 1 && (
              <p
                style={{
                  marginTop: '6px',
                  fontSize: '0.72rem',
                  color: '#0369a1',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <AlertCircle size={13} />
                سيتم عرض منتجات كل الأقسام المختارة
              </p>
            )}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.8rem', fontWeight: '800', color: '#555' }}>
              العلامة التجارية
            </label>
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
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.8rem', fontWeight: '800', color: '#555' }}>
              البحث
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="ابحث عن منتج..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleFilterChange()}
                style={{
                  width: '100%',
                  height: '48px',
                  padding: '0 45px 0 15px',
                  backgroundColor: '#fff',
                  border: '1px solid #e5e5e5',
                  borderRadius: '10px',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
              <Search size={18} color="#999" style={{ position: 'absolute', right: '15px', top: '15px' }} />
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#f0f9ff',
              padding: '12px',
              borderRadius: '10px',
              fontSize: '0.75rem',
              color: '#0369a1',
              display: 'flex',
              alignItems: 'start',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>يجب اختيار (الماركة + الموديل) أو (الفئة) على الأقل</span>
          </div>
        </>
      )}

      <button
        onClick={handleFilterChange}
        style={{
          width: '100%',
          padding: '14px',
          backgroundColor: '#22c55e',
          color: '#fff',
          border: 'none',
          borderRadius: '12px',
          fontWeight: '900',
          fontSize: '1rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          marginTop: '10px',
        }}
      >
        <Search size={18} />
        تطبيق الفلاتر
      </button>

      {hasAnyFilter && (
        <button
          onClick={clearFilters}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#fee',
            color: '#dc2626',
            border: 'none',
            borderRadius: '10px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '0.9rem',
          }}
        >
          <X size={16} />
          مسح الفلاتر
        </button>
      )}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Pagination Component
// ─────────────────────────────────────────────────────────────────────────────
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

function Pagination({ currentPage, totalPages, totalItems, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('ellipsis');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  };

  const pages = getPageNumbers();
  const startItem = (currentPage - 1) * PRODUCTS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * PRODUCTS_PER_PAGE, totalItems);

  return (
    <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      <p style={{ color: '#888', fontSize: '0.85rem', fontWeight: '600' }}>
        عرض <span style={{ color: '#1a1a1a', fontWeight: '800' }}>{startItem}–{endItem}</span> من{' '}
        <span style={{ color: '#22c55e', fontWeight: '800' }}>{totalItems}</span> منتج
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            border: '1.5px solid #e5e5e5',
            backgroundColor: currentPage === 1 ? '#f5f5f5' : '#fff',
            color: currentPage === 1 ? '#ccc' : '#1a1a1a',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            boxShadow: currentPage === 1 ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <ChevronRight size={18} />
        </button>

        {pages.map((page, idx) =>
          page === 'ellipsis' ? (
            <span
              key={`ellipsis-${idx}`}
              style={{ width: '42px', textAlign: 'center', color: '#aaa', fontWeight: '700', fontSize: '1rem' }}
            >
              …
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page as number)}
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                border: currentPage === page ? 'none' : '1.5px solid #e5e5e5',
                background:
                  currentPage === page
                    ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                    : '#fff',
                color: currentPage === page ? '#fff' : '#1a1a1a',
                fontWeight: '900',
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow:
                  currentPage === page
                    ? '0 4px 14px rgba(34,197,94,0.4)'
                    : '0 2px 8px rgba(0,0,0,0.06)',
                transform: currentPage === page ? 'scale(1.1)' : 'scale(1)',
              }}
            >
              {page}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            border: '1.5px solid #e5e5e5',
            backgroundColor: currentPage === totalPages ? '#f5f5f5' : '#fff',
            color: currentPage === totalPages ? '#ccc' : '#1a1a1a',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            boxShadow: currentPage === totalPages ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <ChevronLeft size={18} />
        </button>
      </div>

      {totalPages > 7 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
          <span style={{ fontSize: '0.8rem', color: '#888', fontWeight: '600' }}>الانتقال إلى صفحة:</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            defaultValue={currentPage}
            key={currentPage}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                const val = parseInt((e.target as HTMLInputElement).value);
                if (val >= 1 && val <= totalPages) onPageChange(val);
              }
            }}
            style={{
              width: '60px',
              height: '36px',
              textAlign: 'center',
              border: '1.5px solid #e5e5e5',
              borderRadius: '10px',
              fontSize: '0.9rem',
              fontWeight: '700',
              outline: 'none',
            }}
          />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

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
  const [initializing, setInitializing] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);

  const [yearInput, setYearInput] = useState('');
  const [appliedYear, setAppliedYear] = useState('');
  const [showGarageConflictBanner, setShowGarageConflictBanner] = useState(false);

  const [makesOptions, setMakesOptions] = useState<any[]>([]);
  const [modelsOptions, setModelsOptions] = useState<any[]>([]);
  const [categoriesOptions, setCategoriesOptions] = useState<any[]>([]);
  const [subcategoriesOptions, setSubcategoriesOptions] = useState<any[]>([]);
  const [brandsOptions, setBrandsOptions] = useState<any[]>([]);
  const [subcategoryImages, setSubcategoryImages] = useState<Record<string, string>>({});

  const [selectedMake, setSelectedMake] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [selectedSubcategories, setSelectedSubcategories] = useState<any[]>([]); // ← now an array
  const [selectedBrand, setSelectedBrand] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [carHeroImage, setCarHeroImage] = useState<string | null>(null);
  const [showHero, setShowHero] = useState(false);

  const [garageMode, setGarageMode] = useState(false);
  const [userCar, setUserCar] = useState<any>(null);

  const urlMake = searchParams.get('make');
  const urlModel = searchParams.get('model');
  const urlYear = searchParams.get('year');
  const urlCategory = searchParams.get('category');
  const urlSubcategory = searchParams.get('subcategory'); // comma-separated for multi
  const urlBrand = searchParams.get('brand');
  const urlSearch = searchParams.get('q');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setIsMounted(true);
    setSelectLoaded(true);

    const syncGarageMode = () => {
      const mode = localStorage.getItem('garageMode') === 'true';
      setGarageMode(mode);
    };
    syncGarageMode();
    window.addEventListener('garageModeChanged', syncGarageMode);
    fetchGarageDataAndInit();

    return () => {
      window.removeEventListener('garageModeChanged', syncGarageMode);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const make = selectedMake?.value ?? null;
    const model = selectedModel?.value ?? null;
    const garageMake = garageMode && userCar ? userCar.make : null;
    const garageModel = garageMode && userCar ? userCar.model : null;

    const heroMake = make || garageMake;
    const heroModel = model || garageModel;

    if (heroMake && heroModel) {
      setShowHero(true);
      fetchCarImage(heroMake, heroModel);
    } else {
      setShowHero(false);
      setCarHeroImage(null);
    }
  }, [selectedMake, selectedModel, garageMode, userCar]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredProducts]);

  async function fetchGarageDataAndInit() {
    let resolvedGarageMode = localStorage.getItem('garageMode') === 'true';
    let resolvedUserCar: any = null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('user_garage')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        if (data) {
          resolvedUserCar = data;
          setUserCar(data);
        }
      }
    } catch (err) {
      console.error('Garage fetch error:', err);
    }

    await initializePage(resolvedGarageMode, resolvedUserCar);
  }

  async function initializePage(resolvedGarageMode: boolean, resolvedUserCar: any) {
    try {
      setLoading(true);

      const [productsRes, subcatRes] = await Promise.all([
        supabase.from('products').select('car_make, category, brand').order('car_make', { ascending: true }),
        supabase.from('category_images').select('name, image_url'),
      ]);

      if (productsRes.error) throw productsRes.error;

      if (subcatRes.data) {
        const imgMap: Record<string, string> = {};
        subcatRes.data.forEach((item) => {
          if (item.name) imgMap[item.name.trim().toUpperCase()] = item.image_url;
        });
        setSubcategoryImages(imgMap);
      }

      const uniqueMakes = Array.from(new Set(productsRes.data.map((p) => p.car_make?.trim()).filter(Boolean)));
      const makesOpts = uniqueMakes.map((make) => ({ value: make, label: make }));
      setMakesOptions(makesOpts);

      const uniqueCategories = Array.from(new Set(productsRes.data.map((p) => p.category?.trim()).filter(Boolean)));
      const catsOpts = uniqueCategories.map((cat) => ({ value: cat, label: cat }));
      setCategoriesOptions(catsOpts);

      const uniqueBrands = Array.from(new Set(productsRes.data.map((p) => p.brand?.trim()).filter(Boolean)));
      const brandsOpts = uniqueBrands.map((brand) => ({ value: brand, label: brand }));
      setBrandsOptions(brandsOpts);

      await applyURLFilters(makesOpts, catsOpts, brandsOpts, resolvedGarageMode, resolvedUserCar);
    } catch (error) {
      console.error('Error initializing page:', error);
      toast.error('حدث خطأ في تحميل الصفحة');
    } finally {
      setLoading(false);
      setInitializing(false);
    }
  }

  async function applyURLFilters(
    makes: any[],
    cats: any[],
    brands: any[],
    resolvedGarageMode: boolean,
    resolvedUserCar: any,
  ) {
    const hasURLParams = urlMake || urlCategory;

    if (hasURLParams && resolvedGarageMode && resolvedUserCar) {
      const urlMakeLower = urlMake?.trim().toLowerCase();
      const garageMakeLower = resolvedUserCar.make.trim().toLowerCase();
      if (urlMakeLower && urlMakeLower !== garageMakeLower) {
        if (urlMake && makes.length > 0) {
          const makeOption = makes.find((opt) => opt.value.toUpperCase() === urlMake.toUpperCase());
          if (makeOption) {
            setSelectedMake(makeOption);
            const { data } = await supabase.from('products').select('car_model').ilike('car_make', makeOption.value.trim());
            if (data) {
              const uniqueModels = Array.from(new Set(data.map((p) => p.car_model?.trim()).filter(Boolean)));
              const modelOptions = uniqueModels.sort().map((model) => ({ value: model, label: model }));
              setModelsOptions(modelOptions);
              if (urlModel) {
                const modelOption = modelOptions.find((opt) => opt.value.toUpperCase() === urlModel.toUpperCase());
                if (modelOption) setSelectedModel(modelOption);
              }
            }
          }
        }
        if (urlYear) { setYearInput(urlYear); setAppliedYear(urlYear); }
        setShowGarageConflictBanner(true);
        return;
      }
    }

    if (urlYear) { setYearInput(urlYear); setAppliedYear(urlYear); }

    if (urlCategory && cats.length > 0) {
      const catOption = cats.find((opt) => opt.value.toUpperCase() === urlCategory.toUpperCase());
      if (catOption) {
        setSelectedCategory(catOption);
        const { data } = await supabase.from('products').select('subcategory').ilike('category', catOption.value.trim());
        if (data) {
          const uniqueSubcats = Array.from(new Set(data.map((p) => p.subcategory?.trim()).filter(Boolean)));
          const subcatOpts = uniqueSubcats.sort().map((s) => ({ value: s, label: s }));
          setSubcategoriesOptions(subcatOpts);
          // Support comma-separated multi subcategories in URL
          if (urlSubcategory) {
            const urlSubcatValues = urlSubcategory.split(',').map((s) => s.trim().toUpperCase());
            const matchedSubcats = subcatOpts.filter((opt) =>
              urlSubcatValues.includes(opt.value.toUpperCase())
            );
            if (matchedSubcats.length > 0) setSelectedSubcategories(matchedSubcats);
          }
        }
      }
    }

    if (urlBrand && brands.length > 0) {
      const brandOption = brands.find((opt) => opt.value.toUpperCase() === urlBrand.toUpperCase());
      if (brandOption) setSelectedBrand(brandOption);
    }

    if (urlSearch) setSearchQuery(urlSearch);

    if (urlMake && makes.length > 0) {
      const makeOption = makes.find((opt) => opt.value.toUpperCase() === urlMake.toUpperCase());
      if (makeOption) {
        setSelectedMake(makeOption);
        const { data } = await supabase.from('products').select('car_model').ilike('car_make', makeOption.value.trim());
        if (data) {
          const uniqueModels = Array.from(new Set(data.map((p) => p.car_model?.trim()).filter(Boolean)));
          const modelOptions = uniqueModels.sort().map((model) => ({ value: model, label: model }));
          setModelsOptions(modelOptions);
          if (urlModel) {
            const modelOption = modelOptions.find((opt) => opt.value.toUpperCase() === urlModel.toUpperCase());
            if (modelOption) setSelectedModel(modelOption);
          }
        }
      }
    }

    const hasMinimumURLFilters = (urlMake && urlModel) || urlCategory;

    if (hasMinimumURLFilters) {
      // Build subcategory values array from URL
      const urlSubcatValues = urlSubcategory
        ? urlSubcategory.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

      await fetchProducts({
        make: urlMake,
        model: urlModel,
        year: urlYear,
        category: urlCategory,
        subcategories: urlSubcatValues, // ← array
        brand: urlBrand,
        search: urlSearch,
        _garageMode: resolvedGarageMode,
        _userCar: resolvedUserCar,
      });
    } else if (resolvedGarageMode && resolvedUserCar) {
      await fetchProducts({
        make: resolvedUserCar.make,
        model: resolvedUserCar.model,
        year: resolvedUserCar.year ? String(resolvedUserCar.year) : '',
        _garageMode: true,
        _userCar: resolvedUserCar,
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
      setCarHeroImage(data?.image_url ?? null);
    } catch {
      setCarHeroImage(null);
    }
  }

  const isYearCompatible = (productYearStr: string, selectedYear: string): boolean => {
    if (!productYearStr || !selectedYear) return true;
    const target = parseInt(selectedYear.trim());
    if (isNaN(target)) return true;

    const entries = productYearStr.split(/[,/]+/).map((s) => s.trim()).filter(Boolean);

    for (const entry of entries) {
      const rangeMatch = entry.match(/^(\d{4})\s*-\s*(\d{4})$/);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1]);
        const end = parseInt(rangeMatch[2]);
        if (!isNaN(start) && !isNaN(end) && target >= start && target <= end) return true;
        continue;
      }
      const openEndMatch = entry.match(/^(\d{4})\s*\+$/);
      if (openEndMatch) {
        const start = parseInt(openEndMatch[1]);
        if (!isNaN(start) && target >= start) return true;
        continue;
      }
      const singleMatch = entry.match(/^(\d{4})$/);
      if (singleMatch) {
        if (target === parseInt(singleMatch[1])) return true;
        continue;
      }
    }
    return false;
  };

  function isProductCompatibleWithGarage(p: any, gCar: any): boolean {
    const UNIVERSAL_VALUES = ['universal', 'عام', 'all', 'الكل', ''];
    const productMake = (p.car_make ?? '').trim().toLowerCase();
    const garageMake = gCar.make.trim().toLowerCase();
    const isUniversalMake = !productMake || UNIVERSAL_VALUES.includes(productMake);
    if (!isUniversalMake && productMake !== garageMake) return false;
    if (!isUniversalMake) {
      const productModel = (p.car_model ?? '').trim().toLowerCase();
      const garageModel = gCar.model.trim().toLowerCase();
      const isUniversalModel = !productModel || UNIVERSAL_VALUES.includes(productModel);
      if (!isUniversalModel && productModel !== garageModel) return false;
    }
    if (gCar.year && p.car_model_year) {
      if (!isYearCompatible(p.car_model_year, String(gCar.year))) return false;
    }
    return true;
  }

  async function fetchProducts(filters: any) {
    try {
      if (!initializing) setLoading(true);

      const gMode: boolean = '_garageMode' in filters ? filters._garageMode : garageMode;
      const gCar: any = '_userCar' in filters ? filters._userCar : userCar;

      const filterMake = filters.make?.trim().toLowerCase();
      const garageMake = gCar?.make?.trim().toLowerCase();
      const isConflicting = gMode && gCar && filterMake && filterMake !== garageMake;
      setShowGarageConflictBanner(isConflicting);

      if (isConflicting) {
        setProducts([]);
        setFilteredProducts([]);
        if (!initializing) setLoading(false);
        return;
      }

      let query = supabase.from('products').select('*').order('created_at', { ascending: false });

      if (gMode && gCar) {
        query = query.or(
          [`car_make.ilike.${gCar.make}`, `car_make.is.null`, `car_make.ilike.universal`, `car_make.ilike.عام`].join(',')
        );
      } else {
        if (filters.make) query = query.ilike('car_make', filters.make.trim());
        if (filters.model) query = query.ilike('car_model', filters.model.trim());
      }

      if (filters.category) query = query.ilike('category', filters.category.trim());

      // ── Multi-subcategory: only add DB filter when exactly 1 selected
      // For multiple, we filter client-side below (OR logic across subcategories)
      const subcatsArray: string[] = filters.subcategories ?? [];
      if (subcatsArray.length === 1) {
        query = query.ilike('subcategory', subcatsArray[0].trim());
      }

      if (filters.brand) query = query.ilike('brand', filters.brand.trim());

      const { data, error } = await query;
      if (error) throw error;

      let fetchedProducts = data || [];

      if (gMode && gCar) {
        fetchedProducts = fetchedProducts.filter((p) => isProductCompatibleWithGarage(p, gCar));
      } else {
        const yearToMatch = filters.year || '';
        fetchedProducts = fetchedProducts.filter((p) => {
          const matchesSearch = filters.search
            ? p.name?.toLowerCase().includes(filters.search.toLowerCase())
            : true;
          const matchesYear = yearToMatch ? isYearCompatible(p.car_model_year, yearToMatch) : true;
          return matchesSearch && matchesYear;
        });
      }

      // ── Client-side multi-subcategory filter (OR logic)
      if (subcatsArray.length > 1) {
        const lowerSubcats = subcatsArray.map((s) => s.toLowerCase());
        fetchedProducts = fetchedProducts.filter((p) =>
          lowerSubcats.includes((p.subcategory ?? '').trim().toLowerCase())
        );
      }

      if (filters.search) {
        fetchedProducts = fetchedProducts.filter((p) =>
          p.name?.toLowerCase().includes(filters.search.toLowerCase())
        );
      }

      setProducts(fetchedProducts);
      setFilteredProducts(fetchedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('حدث خطأ في تحميل المنتجات');
    } finally {
      if (!initializing) setLoading(false);
    }
  }

  async function handleMakeChange(opt: any) {
    setSelectedMake(opt);
    setSelectedModel(null);
    if (opt) {
      const { data } = await supabase.from('products').select('car_model').ilike('car_make', opt.value.trim());
      if (data) {
        const uniqueModels = Array.from(new Set(data.map((p) => p.car_model?.trim()).filter(Boolean)));
        setModelsOptions(uniqueModels.sort().map((model) => ({ value: model, label: model })));
      }
    } else {
      setModelsOptions([]);
    }
  }

  async function handleCategoryChange(opt: any) {
    setSelectedCategory(opt);
    setSelectedSubcategories([]); // ← reset to empty array
    if (opt) {
      const { data } = await supabase.from('products').select('subcategory').ilike('category', opt.value.trim());
      if (data) {
        const uniqueSubcats = Array.from(new Set(data.map((p) => p.subcategory?.trim()).filter(Boolean)));
        setSubcategoriesOptions(uniqueSubcats.sort().map((s) => ({ value: s, label: s })));
      }
    } else {
      setSubcategoriesOptions([]);
    }
  }

  function handleFilterChange() {
  const hasMinimumFilters = (selectedMake && selectedModel) || selectedCategory || (garageMode && userCar) || searchQuery.trim();
  if (!hasMinimumFilters) {
    toast.error('يرجى اختيار (الماركة والموديل) أو (الفئة) على الأقل');
    return;
  }

    const yearToApply = yearInput.trim() || (garageMode && userCar?.year ? String(userCar.year) : '');
    setAppliedYear(yearToApply);

    const params = new URLSearchParams();
    if (selectedMake) params.set('make', selectedMake.value.trim().toUpperCase());
    if (selectedModel) params.set('model', selectedModel.value.trim().toUpperCase());
    if (yearToApply) params.set('year', yearToApply);
    if (selectedCategory) params.set('category', selectedCategory.value.trim());
    // ← serialize multiple subcategories as comma-separated
    if (selectedSubcategories && selectedSubcategories.length > 0) {
      params.set('subcategory', selectedSubcategories.map((s) => s.value.trim()).join(','));
    }
    if (selectedBrand) params.set('brand', selectedBrand.value.trim());
    if (searchQuery) params.set('q', searchQuery.trim());
    if (garageMode && userCar) {
      if (!selectedMake) params.set('make', String(userCar.make).toUpperCase());
      if (!selectedModel) params.set('model', String(userCar.model).toUpperCase());
    }

    router.push(`/store?${params.toString()}`);

    fetchProducts({
      make: selectedMake?.value ?? (garageMode ? userCar?.make : undefined),
      model: selectedModel?.value ?? (garageMode ? userCar?.model : undefined),
      year: yearToApply,
      category: selectedCategory?.value,
      subcategories: selectedSubcategories?.map((s) => s.value) ?? [], // ← array
      brand: selectedBrand?.value,
      search: searchQuery,
      _garageMode: garageMode,
      _userCar: userCar,
    });

    setFiltersOpen(false);
  }

  function clearFilters() {
    setSelectedMake(null);
    setSelectedModel(null);
    setYearInput('');
    setAppliedYear('');
    setSelectedCategory(null);
    setSelectedSubcategories([]); // ← reset to empty array
    setSelectedBrand(null);
    setSearchQuery('');
    setModelsOptions([]);
    setSubcategoriesOptions([]);
    setShowGarageConflictBanner(false);
    router.push('/store');

    if (garageMode && userCar) {
      fetchProducts({
        make: userCar.make,
        model: userCar.model,
        year: userCar.year ? String(userCar.year) : '',
        _garageMode: true,
        _userCar: userCar,
      });
    } else {
      setFilteredProducts([]);
      setProducts([]);
    }
  }

  function handlePageChange(page: number) {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      flexWrap: 'wrap',
    }),
    multiValue: (base: any) => ({
      ...base,
      backgroundColor: '#dcfce7',
      borderRadius: '6px',
      margin: '2px',
    }),
    multiValueLabel: (base: any) => ({
      ...base,
      color: '#166534',
      fontWeight: '700',
      fontSize: '0.78rem',
      padding: '2px 6px',
    }),
    multiValueRemove: (base: any) => ({
      ...base,
      color: '#166534',
      cursor: 'pointer',
      ':hover': {
        backgroundColor: '#bbf7d0',
        color: '#14532d',
      },
    }),
    menu: (base: any) => ({ ...base, zIndex: 9999 }),
  };

  if (!isMounted) return null;

  const hasMin = (selectedMake && selectedModel) || selectedCategory || (garageMode && userCar);
  const showEmptyState = !loading && !initializing && !hasMin && !searchQuery.trim() && filteredProducts.length === 0 && !showGarageConflictBanner;
  const showNoResults = !loading && !initializing && hasMin && filteredProducts.length === 0 && !showGarageConflictBanner;

  const heroMakeLabel = selectedMake?.label || (garageMode && userCar?.make) || '';
  const heroModelLabel = selectedModel?.label || (garageMode && userCar?.model) || '';
  const heroYear = appliedYear || (garageMode && userCar?.year ? String(userCar.year) : '');

  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * PRODUCTS_PER_PAGE,
    currentPage * PRODUCTS_PER_PAGE,
  );

  const filterProps: FilterSectionProps = {
    selectLoaded,
    garageMode,
    userCar,
    makesOptions,
    modelsOptions,
    categoriesOptions,
    subcategoriesOptions,
    brandsOptions,
    selectedMake,
    selectedModel,
    yearInput,
    selectedCategory,
    selectedSubcategories, // ← array
    selectedBrand,
    searchQuery,
    customSelectStyles,
    handleMakeChange,
    setSelectedModel,
    setYearInput,
    handleCategoryChange,
    setSelectedSubcategories, // ← array setter
    setSelectedBrand,
    setSearchQuery,
    handleFilterChange,
    clearFilters,
  };

  return (
    <div style={{ direction: 'rtl', backgroundColor: '#f9f9f9', minHeight: '100vh', paddingTop: '80px' }}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

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
            top: 10px;
            left: 10px;
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
            .store-product-card { border-radius: 12px; }
            .store-product-card h3 { font-size: 0.85rem !important; height: 38px !important; }
          }
          @media (min-width: 769px) {
            .desktop-filters { display: block !important; }
            .mobile-filter-btn { display: none !important; }
          }
          .page-btn:hover:not(:disabled) {
            border-color: #22c55e !important;
            color: #22c55e !important;
          }

          /* ── Product image: contain so the full image is visible ── */
          .product-card-image {
            width: 100%;
            height: 100%;
            object-fit: contain;
            padding: 12px;
            transition: transform 0.3s ease;
            background-color: #fff;
          }
        `,
        }}
      />

      <AnimatePresence>
        {(loading || initializing) && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <Loader2 size={60} color="#22c55e" style={{ animation: 'spin 1s linear infinite', marginBottom: '20px' }} />
              <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1a1a1a' }}>جاري تحميل المنتجات...</h3>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!initializing && (
        <>
          {showHero && !loading && !showGarageConflictBanner && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{ maxWidth: '1400px', margin: '0 auto 30px', padding: '0 20px' }}
            >
              <div
                style={{
                  background: 'rgba(255,255,255,0.4)',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                  backgroundColor: 'rgba(255,255,255,0.5)',
                  border: '1px solid rgba(255,255,255,0.4)',
                  borderRadius: '30px',
                  padding: typeof window !== 'undefined' && window.innerWidth <= 768 ? '25px' : '40px',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 8px 32px 0 rgba(31,38,135,0.07)',
                }}
              >
                <div style={{ position: 'absolute', top: '-50%', right: '-10%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%)', zIndex: 0, pointerEvents: 'none' }} />
                <div style={{ display: 'grid', gridTemplateColumns: carHeroImage && typeof window !== 'undefined' && window.innerWidth > 768 ? '1.5fr 1fr' : '1fr', gap: '40px', alignItems: 'center', position: 'relative', zIndex: 2 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', justifyContent: 'flex-start' }}>
                      <CheckCircle2 size={20} color="#22c55e" />
                      <span style={{ color: '#444', fontSize: '0.9rem', fontWeight: '700', letterSpacing: '0.5px' }}>تم تحديد مواصفات السيارة</span>
                    </div>
                    <h1 style={{ color: '#1a1a1a', fontSize: typeof window !== 'undefined' && window.innerWidth <= 768 ? '1.8rem' : '2.8rem', fontWeight: '900', marginBottom: '16px', lineHeight: '1.2', letterSpacing: '-1px' }}>
                      قطع غيار <span style={{ color: '#22c55e' }}>{heroMakeLabel}</span> الأصلية
                    </h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.8)', padding: '10px 20px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid rgba(255,255,255,0.5)' }}>
                        <Car size={18} color="#22c55e" />
                        <span style={{ color: '#1a1a1a', fontSize: '1.1rem', fontWeight: '800' }}>{heroMakeLabel} {heroModelLabel}</span>
                      </div>
                      {heroYear && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.8)', padding: '10px 20px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid rgba(255,255,255,0.5)' }}>
                          <Calendar size={18} color="#22c55e" />
                          <span style={{ color: '#1a1a1a', fontSize: '1.1rem', fontWeight: '700' }}>{heroYear}</span>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', padding: '12px 24px', borderRadius: '15px', boxShadow: '0 10px 20px rgba(34,197,94,0.2)' }}>
                      <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#fff', marginLeft: '10px' }}>{filteredProducts.length}</div>
                      <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: '600' }}>قطعة غيار متاحة</div>
                    </div>
                  </div>
                  {carHeroImage && typeof window !== 'undefined' && window.innerWidth > 768 && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 0.6 }} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <img src={carHeroImage} alt={`${heroMakeLabel} ${heroModelLabel}`} style={{ width: '100%', maxHeight: '280px', objectFit: 'contain', filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.15))' }} />
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.section>
          )}

          {/* Mobile filter toggle */}
          <div className="mobile-filter-btn" style={{ display: 'none', maxWidth: '1400px', margin: '0 auto 20px', padding: '0 20px' }}>
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              style={{ width: '100%', padding: '15px', backgroundColor: '#fff', color: '#1a1a1a', border: '1px solid #e5e5e5', borderRadius: '12px', fontWeight: '800', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Filter size={20} color="#22c55e" />
                <span>الفلاتر</span>
                {hasMin && <span style={{ backgroundColor: '#22c55e', color: '#fff', padding: '2px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '900' }}>نشط</span>}
              </div>
              {filtersOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            <AnimatePresence>
              {filtersOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} style={{ overflow: 'hidden' }}>
                  <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', marginTop: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                    <FilterSection {...filterProps} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px 80px', display: 'flex', gap: '25px', alignItems: 'flex-start' }}>
            <aside className="desktop-filters" style={{ display: 'none', width: '280px', flexShrink: 0, position: 'sticky', top: '100px' }}>
              <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: '900', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Filter size={22} color="#22c55e" />
                  الفلاتر
                </h2>
                <FilterSection {...filterProps} />
              </div>
            </aside>

            <div style={{ flex: 1 }}>
              {/* Garage conflict banner */}
              <AnimatePresence>
                {showGarageConflictBanner && !loading && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}
                    style={{ backgroundColor: '#fff7ed', border: '2px solid #f97316', borderRadius: '16px', padding: '28px 24px', textAlign: 'center', marginBottom: '20px' }}
                  >
                    <AlertTriangle size={48} color="#f97316" style={{ margin: '0 auto 16px' }} />
                    <h3 style={{ fontSize: '1.3rem', fontWeight: '900', color: '#9a3412', marginBottom: '10px' }}>وضع الجراج مفعّل</h3>
                    <p style={{ color: '#c2410c', fontSize: '1rem', fontWeight: '600', marginBottom: '6px' }}>
                      لديك جراج نشط لسيارة <strong>{userCar?.make} {userCar?.model} {userCar?.year}</strong>.
                    </p>
                    <p style={{ color: '#7c2d12', fontSize: '0.9rem', marginBottom: '20px', lineHeight: '1.6' }}>
                      لا يمكن عرض منتجات سيارة أخرى عندما يكون وضع الجراج مفعّلاً.<br />
                      لعرض منتجات سيارات أخرى، يرجى إيقاف تشغيل وضع الجراج من شريط التنقل أعلى الصفحة.
                    </p>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => {
                          localStorage.setItem('garageMode', 'false');
                          setGarageMode(false);
                          setShowGarageConflictBanner(false);
                          window.dispatchEvent(new Event('garageModeChanged'));
                          fetchProducts({
                            make: selectedMake?.value,
                            model: selectedModel?.value,
                            year: appliedYear,
                            category: selectedCategory?.value,
                            subcategories: selectedSubcategories?.map((s) => s.value) ?? [],
                            brand: selectedBrand?.value,
                            search: searchQuery,
                            _garageMode: false,
                            _userCar: null,
                          });
                        }}
                        style={{ padding: '12px 24px', backgroundColor: '#f97316', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '900', fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                        <X size={16} />
                        إيقاف وضع الجراج وعرض النتائج
                      </button>
                      <button
                        onClick={clearFilters}
                        style={{ padding: '12px 24px', backgroundColor: '#fff', color: '#9a3412', border: '1px solid #f97316', borderRadius: '10px', fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer' }}
                      >
                        مسح الفلاتر والبقاء في وضع الجراج
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {showEmptyState ? (
                <div style={{ textAlign: 'center', padding: '100px 20px', backgroundColor: '#fff', borderRadius: '20px' }}>
                  <Filter size={80} color="#22c55e" style={{ margin: '0 auto 20px', opacity: 0.5 }} />
                  <h3 style={{ fontSize: '1.8rem', fontWeight: '900', marginBottom: '15px', color: '#1a1a1a' }}>ابدأ بتحديد الفلاتر</h3>
                  <p style={{ color: '#666', fontSize: '1.1rem', marginBottom: '10px' }}>اختر الماركة والموديل أو الفئة للبحث عن المنتجات</p>
                  <div style={{ backgroundColor: '#f0f9ff', padding: '15px', borderRadius: '12px', maxWidth: '500px', margin: '20px auto', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
                    <AlertCircle size={20} color="#0369a1" />
                    <span style={{ color: '#0369a1', fontSize: '0.9rem', fontWeight: '700' }}>هذا يساعد في تحسين سرعة التصفح</span>
                  </div>
                </div>
              ) : showNoResults ? (
                <div style={{ textAlign: 'center', padding: '80px 20px', backgroundColor: '#fff', borderRadius: '20px' }}>
                  <Car size={70} color="#ccc" style={{ margin: '0 auto 15px' }} />
                  <h3 style={{ fontSize: '1.6rem', fontWeight: '900', marginBottom: '8px' }}>لا توجد منتجات</h3>
                  <p style={{ color: '#666', fontSize: '1rem' }}>جرب تغيير الفلاتر للعثور على المنتجات</p>
                </div>
              ) : paginatedProducts.length > 0 ? (
                <>
                  <div className="products-grid">
                    {paginatedProducts.map((product) => {
                      const price = product.sale_price || product.regular_price;
                      const isAsli = (product.country_origin || product.country_of_origin || product.origin)?.trim() === 'اصلي';
                      return (
                        <motion.div
                          key={product.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4 }}
                          className="store-product-card"
                        >
                          {product.sale_price > 0 && product.regular_price > product.sale_price && (
                            <div style={{ position: 'absolute', top: '10px', right: '10px', backgroundColor: '#ff4d4d', color: '#fff', padding: '4px 10px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: '900', zIndex: 10 }}>
                              -{Math.round(((product.regular_price - product.sale_price) / product.regular_price) * 100)}%
                            </div>
                          )}

                          {isAsli && (
                            <div className="badge-asli">✦ أصلي</div>
                          )}

                          {/* ── IMAGE CONTAINER: white bg, fixed height, contain fit ── */}
                          <Link
                            href={`/products/${product.id}`}
                            style={{
                              display: 'block',
                              height: '200px',
                              backgroundColor: '#ffffff',
                              overflow: 'hidden',
                              position: 'relative',
                            }}
                          >
                            <img
                              src={
                                product.image_url ||
                                (product.subcategory && subcategoryImages[product.subcategory.trim().toUpperCase()]) ||
                                (product.category && subcategoryImages[product.category.trim().toUpperCase()]) ||
                                undefined
                              }
                              alt={product.name}
                              className="product-card-image"
                              loading="lazy"
                            />
                          </Link>

                          <div style={{ padding: '18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                              <span style={{ color: '#22c55e', fontWeight: '800', fontSize: '0.8rem' }}>{product.brand}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#666', fontWeight: '700', fontSize: '0.75rem' }}>
                                <Globe size={13} color="#22c55e" />
                                <span>{product.country_origin || 'أصلي'}</span>
                              </div>
                            </div>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: '900', marginBottom: '10px', height: '45px', overflow: 'hidden', lineHeight: '1.4' }}>
                              {product.name}
                            </h3>
                            <div style={{ background: '#f9f9f9', padding: '10px', borderRadius: '10px', marginBottom: '12px' }}>
                              <div style={{ fontSize: '0.75rem', color: '#1a1a1a', fontWeight: '800', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Settings2 size={12} color="#22c55e" />
                                {product.car_make} {product.car_model}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#666', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                <Calendar size={12} color="#22c55e" />
                                {product.car_model_year || 'الكل'}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <LayoutGrid size={12} />
                                {product.category}
                              </div>
                            </div>
                            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {product.sale_price > 0 && product.regular_price > product.sale_price ? (
                                <div>
                                  <span style={{ display: 'block', color: '#bbb', textDecoration: 'line-through', fontSize: '0.75rem' }}>{product.regular_price} ج.م</span>
                                  <span style={{ fontSize: '1.2rem', fontWeight: '900' }}>{product.sale_price} ج.م</span>
                                </div>
                              ) : (
                                <span style={{ fontSize: '1.2rem', fontWeight: '900' }}>{price} ج.م</span>
                              )}
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  addToCart({ ...product, price }, 1);
                                  toast.success('تمت الإضافة');
                                }}
                                style={{ width: '100%', padding: '11px', backgroundColor: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', transition: '0.2s' }}
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

                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={filteredProducts.length}
                    onPageChange={handlePageChange}
                  />
                </>
              ) : null}
            </div>
          </div>
        </>
      )}

      {/* STICKY GARAGE NOTIFICATION */}
      <AnimatePresence>
        {garageMode && userCar && (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} style={stickyNotificationStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={garageIconWrapMini}>
                <Car size={18} color="#fff" />
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: '900', color: '#fff', lineHeight: '1.2' }}>
                  وضع جراجي مفعل: {userCar.make} {userCar.model} {userCar.year}
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
  );
}

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
  direction: 'rtl',
};

const garageIconWrapMini: any = {
  width: '32px',
  height: '32px',
  borderRadius: '10px',
  backgroundColor: 'rgba(255,255,255,0.2)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export default function StorePage() {
  return (
    <Suspense
      fallback={
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 size={60} color="#22c55e" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      }
    >
      <StoreContent />
    </Suspense>
  );
}