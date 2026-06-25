'use client';
import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { expandSearchQuery } from '@/lib/searchExpander';
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
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/context/CartContext';
import toast from 'react-hot-toast';
import { optimizeImageUrl } from '@/lib/images';

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
  selectedSubcategories: any[];
  selectedBrand: any;
  searchQuery: string;
  customSelectStyles: any;
  handleMakeChange: (opt: any) => void;
  setSelectedModel: (opt: any) => void;
  setYearInput: (val: string) => void;
  handleCategoryChange: (opt: any) => void;
  setSelectedSubcategories: (opts: any[]) => void;
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
    selectedMake || selectedModel || yearInput || selectedCategory || (selectedSubcategories && selectedSubcategories.length > 0) || selectedBrand || searchQuery;

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
              isSearchable={false}
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
              isSearchable={false}
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
              isSearchable={false}
              value={selectedCategory}
              onChange={handleCategoryChange}
              isClearable
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.8rem', fontWeight: '800', color: '#555' }}>
              القسم الفرعي
              {selectedSubcategories && selectedSubcategories.length > 0 && (
                <span style={{ marginRight: '8px', backgroundColor: '#22c55e', color: '#fff', padding: '2px 8px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: '900' }}>
                  {selectedSubcategories.length} مختار
                </span>
              )}
            </label>
            <Select
              instanceId="store-subcategory-select"
              isSearchable={false}
              options={subcategoriesOptions}
              styles={{
                ...customSelectStyles,
                control: (base: any) => ({
                  ...customSelectStyles.control(base),
                  height: 'auto',
                  minHeight: '48px',
                }),
                input: (base: any) => ({ ...base, color: '#1a1a1a' }),
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
              <p style={{ marginTop: '6px', fontSize: '0.72rem', color: '#0369a1', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px' }}>
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
              isSearchable={false}
              value={selectedBrand}
              onChange={(opt: any) => setSelectedBrand(opt)}
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
        تطبيق التصنيفات
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
          مسح التصنيفات
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
  const CAR_MAKE_AR: Record<string, string> = {
    TOYOTA: 'تويوتا', HYUNDAI: 'هيونداي', KIA: 'كيا', NISSAN: 'نيسان',
    CHEVROLET: 'شيفروليه', MITSUBISHI: 'ميتسوبيشي', VOLKSWAGEN: 'فولكس-فاجن',
    SKODA: 'سكودا', PEUGEOT: 'بيجو', RENAULT: 'رينو', OPEL: 'اوبل',
    MG: 'ام-جي', MAZDA: 'مازدا', SEAT: 'سيات', HONDA: 'هوندا',
    SUZUKI: 'سوزوكي', BMW: 'بي-ام-دبليو', MERCEDES: 'مرسيدس',
    FORD: 'فورد', JEEP: 'جيب',
  };

  const CAR_MODEL_AR: Record<string, string> = {
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

  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToCart, cartItems } = useCart();

  const [isMounted, setIsMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
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

  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const [selectedMake, setSelectedMake] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [selectedSubcategories, setSelectedSubcategories] = useState<any[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [carHeroImage, setCarHeroImage] = useState<string | null>(null);
  const [showHero, setShowHero] = useState(false);

  const [garageMode, setGarageMode] = useState(false);
  const [userCar, setUserCar] = useState<any>(null);

  const [saleMode, setSaleMode] = useState(false);

  const urlMake = searchParams.get('make');
  const urlModel = searchParams.get('model');
  const urlYear = searchParams.get('year');
  const urlCategory = searchParams.get('category');
  const urlSubcategory = searchParams.get('subcategory');
  const urlBrand = searchParams.get('brand');
  const urlSearch = searchParams.get('q');
  const urlSale = searchParams.get('sale') === 'true' || searchParams.get('filter') === 'sales';

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setIsMounted(true);
    setSelectLoaded(true);

    const handleResize = () => setIsDesktop(window.innerWidth > 768);
    handleResize();
    window.addEventListener('resize', handleResize);

    const syncGarageMode = () => {
      const mode = localStorage.getItem('garageMode') === 'true';
      setGarageMode(mode);
    };
    syncGarageMode();
    window.addEventListener('garageModeChanged', syncGarageMode);
    fetchGarageDataAndInit();

    return () => {
      window.removeEventListener('resize', handleResize);
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
    const heroYear = yearInput.trim() || (garageMode && userCar?.year ? String(userCar.year) : '');

    if (heroMake && heroModel) {
      setShowHero(true);
      fetchCarImage(heroMake, heroModel, heroYear);
    } else {
      setShowHero(false);
      setCarHeroImage(null);
    }
  }, [selectedMake, selectedModel, yearInput, garageMode, userCar]);

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
        supabase.from('products').select('car_make, category, brand').eq('is_active', true).order('car_make', { ascending: true }),
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

      const uniqueCategories = Array.from(new Set(productsRes.data.map((p) => p.category?.trim()).filter(Boolean)))
  .sort((a, b) => a.localeCompare(b, 'ar'));  // ← add this line
const catsOpts = uniqueCategories.map((cat) => ({ value: cat, label: cat }));
setCategoriesOptions(catsOpts);

      const uniqueBrands = Array.from(new Set(productsRes.data.map((p) => p.brand?.trim()).filter(Boolean)))
  .sort((a, b) => a.localeCompare(b, 'ar'));  // ← add this line
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
    if (urlSale) {
      setSaleMode(true);
      setShowGarageConflictBanner(false);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
          .gt('sale_price', 0)
          .order('sale_order', { ascending: true, nullsFirst: false });
        if (!error) {
          const saleProducts = (data || []).filter(
            (p: any) => Number(p.sale_price) > 0 && Number(p.regular_price) > Number(p.sale_price)
          );
          saleProducts.sort((a: any, b: any) => {
            if (a.sale_order != null && b.sale_order != null) return a.sale_order - b.sale_order;
            if (a.sale_order != null) return -1;
            if (b.sale_order != null) return 1;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });
          setProducts(saleProducts);
          setFilteredProducts(saleProducts);
        }
      } catch (err) {
        console.error('Sale fetch error:', err);
      }
      return;
    }

    const hasURLParams = urlMake || urlCategory;

    if (hasURLParams && resolvedGarageMode && resolvedUserCar) {
      const urlMakeLower = urlMake?.trim().toLowerCase();
      const garageMakeLower = resolvedUserCar.make.trim().toLowerCase();
      if (urlMakeLower && urlMakeLower !== garageMakeLower) {
        if (urlMake && makes.length > 0) {
          const makeOption = makes.find((opt) =>
            opt.value.toUpperCase() === urlMake.toUpperCase() ||
            CAR_MAKE_AR[opt.value.toUpperCase()] === urlMake
          );
          if (makeOption) {
            setSelectedMake(makeOption);
            const { data } = await supabase.from('products').select('car_model').eq('is_active', true).ilike('car_make', makeOption.value.trim());
            if (data) {
              const uniqueModels = Array.from(new Set(data.map((p) => p.car_model?.trim()).filter(Boolean)));
              const modelOptions = uniqueModels.sort().map((model) => ({ value: model, label: model }));
              setModelsOptions(modelOptions);
              if (urlModel) {
                const modelOption = modelOptions.find((opt) =>
                  opt.value.toUpperCase() === urlModel.toUpperCase() ||
                  CAR_MODEL_AR[opt.value.toUpperCase()] === urlModel
                );
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
        const { data } = await supabase.from('products').select('subcategory').eq('is_active', true).ilike('category', catOption.value.trim());
        if (data) {
          const uniqueSubcats = Array.from(new Set(data.map((p) => p.subcategory?.trim()).filter(Boolean)));
          const subcatOpts = uniqueSubcats.sort().map((s) => ({ value: s, label: s }));
          setSubcategoriesOptions(subcatOpts);
          if (urlSubcategory) {
            const urlSubcatValues = urlSubcategory.split(',').map((s) => s.trim().toUpperCase());
            const matchedSubcats = subcatOpts.filter((opt) => urlSubcatValues.includes(opt.value.toUpperCase()));
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
      const makeOption = makes.find((opt) =>
        opt.value.toUpperCase() === urlMake.toUpperCase() ||
        CAR_MAKE_AR[opt.value.toUpperCase()] === urlMake
      );
      if (makeOption) {
        setSelectedMake(makeOption);
        const { data } = await supabase.from('products').select('car_model').eq('is_active', true).ilike('car_make', makeOption.value.trim());
        if (data) {
          const uniqueModels = Array.from(new Set(data.map((p) => p.car_model?.trim()).filter(Boolean)));
          const modelOptions = uniqueModels.sort().map((model) => ({ value: model, label: model }));
          setModelsOptions(modelOptions);
          if (urlModel) {
            const modelOption = modelOptions.find((opt) =>
              opt.value.toUpperCase() === urlModel.toUpperCase() ||
              CAR_MODEL_AR[opt.value.toUpperCase()] === urlModel
            );
            if (modelOption) setSelectedModel(modelOption);
          }
        }
      }
    }

    // ── A new free-text search (?q=) always takes full priority. ──────────────
    // Old make/model params from a previous page visit must NOT contaminate it.
    if (urlSearch) {
      const intent = expandSearchQuery(urlSearch);
      await fetchProducts({
        make: intent.make,
        model: intent.model,
        category: intent.category,
        subcategories: intent.subcategories ?? [],
        brand: intent.brand,
        search: intent.textSearch,
        _garageMode: resolvedGarageMode,
        _userCar: resolvedUserCar,
      });
    } else {
      // ── Structured URL filters (from filter dropdowns / smart suggestion URLs) ─
      const hasMinimumURLFilters = (urlMake && urlModel) || urlCategory;
      if (hasMinimumURLFilters) {
        // Reverse-lookup: convert Arabic slug back to English for Supabase query
        const resolvedMake = urlMake
          ? (makes.find((opt) =>
              opt.value.toUpperCase() === urlMake.toUpperCase() ||
              CAR_MAKE_AR[opt.value.toUpperCase()] === urlMake
            )?.value ?? urlMake)
          : undefined;

        const resolvedModel = urlModel && resolvedMake
          ? (() => {
              const modelEnglish = Object.entries(CAR_MODEL_AR).find(
                ([, arVal]) => arVal === urlModel
              )?.[0] ?? urlModel;
              return modelEnglish;
            })()
          : urlModel;

        await fetchProducts({
          make: resolvedMake,
          model: resolvedModel,
          year: urlYear,
          category: urlCategory,
          subcategories: urlSubcategory ? urlSubcategory.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
          brand: urlBrand,
          _garageMode: resolvedGarageMode,
          _userCar: resolvedUserCar,
        });
      }
    }

    if (!urlSearch && !((urlMake && urlModel) || urlCategory) && resolvedGarageMode && resolvedUserCar) {
      await fetchProducts({
        make: resolvedUserCar.make,
        model: resolvedUserCar.model,
        year: resolvedUserCar.year ? String(resolvedUserCar.year) : '',
        _garageMode: true,
        _userCar: resolvedUserCar,
      });
    }
  }

  async function fetchCarImage(make: string, model: string, year?: string) {
    try {
      const yearInt = year ? parseInt(year.trim()) : NaN;

      if (!isNaN(yearInt)) {
        const { data: yearData } = await supabase
          .from('car_images')
          .select('image_url')
          .ilike('car_make', make.trim())
          .ilike('car_model', model.trim())
          .lte('year_from', yearInt)
          .gte('year_to', yearInt)
          .limit(1);

        if (yearData && yearData.length > 0 && yearData[0].image_url) {
          setCarHeroImage(yearData[0].image_url);
          return;
        }
      }

      const { data } = await supabase
        .from('car_images')
        .select('image_url')
        .ilike('car_make', make.trim())
        .ilike('car_model', model.trim())
        .limit(1);

      setCarHeroImage(data && data.length > 0 ? data[0].image_url : null);
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

      const subcatsArray: string[] = Array.isArray(filters.subcategories)
        ? filters.subcategories
        : filters.subcategory ? [filters.subcategory] : [];
      if (subcatsArray.length === 1) {
        query = query.ilike('subcategory', subcatsArray[0].trim());
      }

      if (filters.brand) query = query.ilike('brand', filters.brand.trim());

      // Apply text search at DB level when no structured filter absorbed it
      if (filters.search && !filters.make && !filters.category) {
        query = query.ilike('name', `%${filters.search.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      let fetchedProducts = data || [];

      if (subcatsArray.length > 1) {
        const lowerSubcats = subcatsArray.map((s) => s.toLowerCase());
        fetchedProducts = fetchedProducts.filter((p: any) =>
          lowerSubcats.includes((p.subcategory ?? '').trim().toLowerCase())
        );
      }

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

      if (filters.search) {
        fetchedProducts = fetchedProducts.filter((p) =>
          p.name?.toLowerCase().includes(filters.search.toLowerCase())
        );
      }

      // Sort: active products first, inactive (out of stock) at the end
      fetchedProducts.sort((a: any, b: any) => {
        const aActive = a.is_active !== false;
        const bActive = b.is_active !== false;
        if (aActive === bActive) return 0;
        return aActive ? -1 : 1;
      });
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
      const { data } = await supabase.from('products').select('car_model').eq('is_active', true).ilike('car_make', opt.value.trim());
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
    setSelectedSubcategories([]);
    if (opt) {
      const { data } = await supabase.from('products').select('subcategory').eq('is_active', true).ilike('category', opt.value.trim());
      if (data) {
        const uniqueSubcats = Array.from(new Set(data.map((p) => p.subcategory?.trim()).filter(Boolean)));
        setSubcategoriesOptions(uniqueSubcats.sort().map((s) => ({ value: s, label: s })));
      }
    } else {
      setSubcategoriesOptions([]);
    }
  }

  function handleFilterChange() {
    setSaleMode(false);

    const hasMinimumFilters = (selectedMake && selectedModel) || selectedCategory || (garageMode && userCar);
    if (!hasMinimumFilters) {
      toast.error('يرجى اختيار (الماركة والموديل) أو (الفئة) على الأقل');
      return;
    }

    const yearToApply = yearInput.trim() || (garageMode && userCar?.year ? String(userCar.year) : '');
    setAppliedYear(yearToApply);

    const makeVal = selectedMake?.value.trim().toUpperCase() ?? (garageMode ? String(userCar?.make).toUpperCase() : '');
    const modelVal = selectedModel?.value.trim().toUpperCase() ?? (garageMode && !selectedMake ? String(userCar?.model).toUpperCase() : '');

    const makeSlug = makeVal ? (CAR_MAKE_AR[makeVal] || makeVal.toLowerCase()) : '';
    const modelSlug = modelVal ? (CAR_MODEL_AR[modelVal] || modelVal.toLowerCase().replace(/\s+/g, '-')) : '';

    const params = new URLSearchParams();
    if (makeSlug) params.set('make', makeSlug);
    if (modelSlug) params.set('model', modelSlug);
    if (yearToApply) params.set('year', yearToApply);
    if (selectedCategory) params.set('category', selectedCategory.value.trim());
    if (selectedSubcategories && selectedSubcategories.length > 0) {
      params.set('subcategory', selectedSubcategories.map((s: any) => s.value.trim()).join(','));
    }
    if (selectedBrand) params.set('brand', selectedBrand.value.trim());
    if (searchQuery) params.set('q', searchQuery.trim());

    router.push(`/store?${params.toString()}`);

    fetchProducts({
      make: selectedMake?.value ?? (garageMode ? userCar?.make : undefined),
      model: selectedModel?.value ?? (garageMode ? userCar?.model : undefined),
      year: yearToApply,
      category: selectedCategory?.value,
      subcategories: selectedSubcategories?.map((s: any) => s.value) ?? [],
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
    setSelectedSubcategories([]);
    setSelectedBrand(null);
    setSearchQuery('');
    setModelsOptions([]);
    setSubcategoriesOptions([]);
    setShowGarageConflictBanner(false);
    setSaleMode(false);
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
    const anchor = document.getElementById('store-products-top');
    if (anchor) {
      anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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

  const hasMin = (selectedMake && selectedModel) || selectedCategory || (garageMode && userCar);
  const effectiveGarageConflict = showGarageConflictBanner && !saleMode;
  const showEmptyState = !loading && !initializing && !hasMin && !saleMode && filteredProducts.length === 0 && !effectiveGarageConflict;
  const showNoResults = !loading && !initializing && (hasMin || saleMode) && filteredProducts.length === 0 && !effectiveGarageConflict;

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
  };

  return (
    <div style={{ direction: 'rtl', backgroundColor: '#f9f9f9', minHeight: '100vh', paddingTop: '90px' }}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes shimmer {
            0% { background-position: -200% center; }
            100% { background-position: 200% center; }
          }
          .store-product-card {
            background: #fff;
            border-radius: 16px;
            border: 1px solid #e0e0e0;
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
          .buy-now-btn:hover {
            background: #16a34a !important;
            transform: translateY(-1px);
            box-shadow: 0 6px 18px rgba(34,197,94,0.4) !important;
          }
          .original-badge {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #f59e0b 100%);
            background-size: 200% auto;
            animation: shimmer 2.5s linear infinite;
          }
          /* ── Product card image zoom ── */
          .product-img-link {
            display: block;
            overflow: hidden;
            position: relative;
            background-color: #f1f5f9;
            height: 200px;
          }
          @media (max-width: 640px) {
            .product-img-link { height: 160px; }
          }
          .product-card-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: center;
            display: block;
            transition: transform 0.35s ease;
          }
          .product-img-link:hover .product-card-img {
            transform: scale(1.08);
          }
          @media (max-width: 640px) {
            .product-card-img {
              height: 160px;
            }
          }
          .store-product-card.out-of-stock {
            opacity: 0.65;
            filter: grayscale(40%);
          }
          .store-product-card.out-of-stock:hover {
            transform: none;
            border-color: #e0e0e0;
            box-shadow: none;
          }
          .out-of-stock-badge {
            position: absolute;
            top: 10px;
            right: 10px;
            background-color: #6b7280;
            color: #fff;
            padding: 4px 10px;
            border-radius: 8px;
            font-size: 0.7rem;
            font-weight: 900;
            z-index: 10;
          }

          /* ── List view ── */
          .products-list { display: flex; flex-direction: column; gap: 12px; }
          .list-card { display: flex; background: #fff; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 2px 10px rgba(0,0,0,0.04); overflow: hidden; transition: box-shadow 0.2s, transform 0.2s; position: relative; }
          .list-card:hover { box-shadow: 0 8px 28px rgba(34,197,94,0.12); transform: translateY(-2px); }
          .list-card-img { width: 130px; min-width: 130px; height: 130px; object-fit: cover; background: #f8fafc; flex-shrink: 0; }
          .list-card-img img { width: 100%; height: 100%; object-fit: cover; }
          .list-card-body { flex: 1; padding: 14px 16px; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
          .list-card-footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: auto; flex-wrap: wrap; }
          .view-toggle { display: flex; gap: 4px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 3px; }
          .view-btn { width: 32px; height: 32px; border: none; border-radius: 7px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; background: transparent; color: #94a3b8; }
          .view-btn.active { background: #fff; color: #22c55e; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
          @media (max-width: 480px) {
            .list-card-img { width: 100px; min-width: 100px; height: 100px; }
            .list-card-body { padding: 10px 12px; }
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
          {saleMode && !loading && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{ maxWidth: '1400px', margin: '0 auto 30px', padding: '0 20px' }}
            >
              <div
                style={{
                  background: 'linear-gradient(135deg, #ff4d4d 0%, #ff6b35 50%, #f97316 100%)',
                  borderRadius: '30px',
                  padding: isDesktop ? '40px' : '25px',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 8px 32px rgba(255,77,77,0.3)',
                }}
              >
                <div style={{ position: 'absolute', top: '-50%', right: '-10%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)', zIndex: 0, pointerEvents: 'none' }} />
                <div style={{ position: 'relative', zIndex: 2, textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', justifyContent: 'flex-start' }}>
                    <Tags size={24} color="#fff" />
                    <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1rem', fontWeight: '700' }}>العروض والتخفيضات</span>
                  </div>
                  <h1 style={{ color: '#fff', fontSize: isDesktop ? '2.5rem' : '1.7rem', fontWeight: '900', marginBottom: '16px', lineHeight: '1.2' }}>
                    🔥 أفضل العروض المتاحة الآن
                  </h1>
                  <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(255,255,255,0.2)', padding: '12px 24px', borderRadius: '15px', backdropFilter: 'blur(10px)' }}>
                    <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#fff', marginLeft: '10px' }}>{filteredProducts.length}</div>
                    <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.9)', fontWeight: '600' }}>منتج بتخفيض</div>
                  </div>
                </div>
              </div>
            </motion.section>
          )}

          {showHero && !loading && !showGarageConflictBanner && !saleMode && (
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
                  padding: isDesktop ? '40px' : '25px',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 8px 32px 0 rgba(31,38,135,0.07)',
                }}
              >
                <div style={{ position: 'absolute', top: '-50%', right: '-10%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%)', zIndex: 0, pointerEvents: 'none' }} />
                <div style={{ display: 'grid', gridTemplateColumns: carHeroImage && isDesktop ? '1.5fr 1fr' : '1fr', gap: '40px', alignItems: 'center', position: 'relative', zIndex: 2 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', justifyContent: 'flex-start' }}>
                      <CheckCircle2 size={20} color="#22c55e" />
                      <span style={{ color: '#444', fontSize: '0.9rem', fontWeight: '700', letterSpacing: '0.5px' }}>تم تحديد مواصفات السيارة</span>
                    </div>
                    <h1 style={{ color: '#1a1a1a', fontSize: isDesktop ? '2.8rem' : '1.8rem', fontWeight: '900', marginBottom: '16px', lineHeight: '1.2', letterSpacing: '-1px' }}>
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
                  {carHeroImage && isDesktop && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 0.6 }} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <img src={optimizeImageUrl(carHeroImage)} alt={`${heroMakeLabel} ${heroModelLabel}`} style={{ width: '100%', maxHeight: '280px', objectFit: 'contain', filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.15))' }} />
                    </motion.div>
                  )}
                  {carHeroImage && !isDesktop && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 0.6 }} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <img src={optimizeImageUrl(carHeroImage)} alt={`${heroMakeLabel} ${heroModelLabel}`} style={{ width: '80%', maxHeight: '180px', objectFit: 'contain', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.12))' }} />
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.section>
          )}

          {/* Scroll anchor — pagination scrolls here */}
          <div id="store-products-top" style={{ scrollMarginTop: '90px' }} />

          {/* Mobile filter toggle */}
          <div className="mobile-filter-btn" style={{ display: 'none', maxWidth: '1400px', margin: '0 auto 20px', padding: '0 20px' }}>
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              style={{ width: '100%', padding: '15px', backgroundColor: '#fff', color: '#1a1a1a', border: '1px solid #e5e5e5', borderRadius: '12px', fontWeight: '800', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Filter size={20} color="#22c55e" />
                <span>التصنيفات</span>
                {hasMin && <span style={{ backgroundColor: '#22c55e', color: '#fff', padding: '2px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '900' }}>نشط</span>}
                {saleMode && <span style={{ backgroundColor: '#ff4d4d', color: '#fff', padding: '2px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '900' }}>عروض</span>}
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
                  التصنيفات
                </h2>
                {saleMode && (
                  <div style={{ backgroundColor: '#fff1f0', border: '1px solid #ff4d4d', borderRadius: '10px', padding: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Tags size={16} color="#ff4d4d" />
                    <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#cc0000' }}>عرض كل العروض والتخفيضات</span>
                  </div>
                )}
                <FilterSection {...filterProps} />
              </div>
            </aside>

            <div style={{ flex: 1 }}>
              <AnimatePresence>
                {effectiveGarageConflict && !loading && (
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
                            subcategories: selectedSubcategories?.map((s: any) => s.value) ?? [],
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
                        مسح التصنيفات والبقاء في وضع الجراج
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── View toggle ── */}
              {!showEmptyState && !showNoResults && paginatedProducts.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                  <div className="view-toggle">
                    <button className={`view-btn${viewMode === 'list' ? ' active' : ''}`} onClick={() => setViewMode('list')} title="عرض قائمة">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                    </button>
                    <button className={`view-btn${viewMode === 'grid' ? ' active' : ''}`} onClick={() => setViewMode('grid')} title="عرض شبكة">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                    </button>
                  </div>
                </div>
              )}

              {showEmptyState ? (
                <div style={{ textAlign: 'center', padding: '100px 20px', backgroundColor: '#fff', borderRadius: '20px' }}>
                  <Filter size={80} color="#22c55e" style={{ margin: '0 auto 20px', opacity: 0.5 }} />
                  <h3 style={{ fontSize: '1.8rem', fontWeight: '900', marginBottom: '15px', color: '#1a1a1a' }}>ابدأ بتحديد التصنيفات</h3>
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
                  <p style={{ color: '#666', fontSize: '1rem' }}>جرب تغيير التصنيفات للعثور على المنتجات</p>
                </div>
              ) : paginatedProducts.length > 0 ? (
                <>
                  {/* ── Grid view ── */}
                  {viewMode === 'grid' && (
                  <div className="products-grid">
                    {paginatedProducts.map((product) => {
                      const price = product.sale_price || product.regular_price;
                      const origin = (product.country_origin || product.country_of_origin || '').trim();
                      const isOriginal = ['اصلي', 'أصلي', 'original', 'اصلى'].includes(origin.toLowerCase());
                      const isOutOfStock = product.is_active === false || (product.stock_quantity != null && Number(product.stock_quantity) === 0);
                      return (
                        <motion.div
                          key={product.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4 }}
                          className={`store-product-card${isOutOfStock ? ' out-of-stock' : ''}`}
                        >
                          {/* Out of stock badge */}
                          {isOutOfStock && (
                            <div className="out-of-stock-badge">
                              نفذت الكمية
                            </div>
                          )}
                          {/* In-cart badge */}
                          {(() => {
                            const inCartQty = cartItems.find((i: any) => i.id === product.id)?.quantity ?? 0;
                            return inCartQty > 0 ? (
                              <div style={{ position: 'absolute', top: '10px', left: '10px', background: '#22c55e', color: '#fff', borderRadius: '20px', padding: '3px 10px', fontSize: '0.7rem', fontWeight: '900', zIndex: 11, display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 2px 8px rgba(34,197,94,0.4)' }}>
                                ✓ في السلة ({inCartQty})
                              </div>
                            ) : null;
                          })()}
                          {/* Sale badge */}
                          {product.sale_price > 0 && product.regular_price > product.sale_price && (
                            <div style={{ position: 'absolute', top: '10px', right: '10px', backgroundColor: '#ff4d4d', color: '#fff', padding: '4px 10px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: '900', zIndex: 10 }}>
                              -{Math.round(((product.regular_price - product.sale_price) / product.regular_price) * 100)}%
                            </div>
                          )}
                          {/* Original badge */}
                          {isOriginal && (
                            <div
                              className="original-badge"
                              style={{
                                position: 'absolute', top: '10px', left: '10px', zIndex: 10,
                                color: '#fff', padding: '4px 10px', borderRadius: '8px',
                                fontSize: '0.7rem', fontWeight: '900', letterSpacing: '0.5px',
                                boxShadow: '0 3px 10px rgba(245,158,11,0.5)',
                                display: 'flex', alignItems: 'center', gap: '4px',
                              }}
                            >
                              ✦ أصلي
                            </div>
                          )}

                          <Link
                            href={`/products/${product.slug || product.id}`}
                            className="product-img-link"
                          >
                            <img
                              src={optimizeImageUrl(product.image_url || (product.category && subcategoryImages[product.category.trim().toUpperCase()]) || '/api/placeholder/400/320')}
                              alt={product.name}
                              className="product-card-img"
                              loading="lazy"
                              decoding="async"
                            />
                          </Link>

                          <div style={{ padding: '18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                              <span style={{ color: '#22c55e', fontWeight: '800', fontSize: '0.8rem' }}>{product.brand}</span>
                              {origin && !isOriginal && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#666', fontWeight: '700', fontSize: '0.75rem' }}>
                                  <Globe size={13} color="#22c55e" />
                                  <span>{origin}</span>
                                </div>
                              )}
                            </div>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: '900', marginBottom: '10px', height: '45px', overflow: 'hidden', lineHeight: '1.4' }}>
                              {product.name}
                            </h3>
                            <div style={{ background: '#ffffff', padding: '10px', borderRadius: '10px', marginBottom: '12px' }}>
                              <div style={{ fontSize: '0.75rem', color: '#1a1a1a', fontWeight: '800', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                                <Settings2 size={12} color="#22c55e" style={{ flexShrink: 0 }} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {(() => {
                                    const univ = ['universal','عام','all','الكل',''];
                                    const make = (product.car_make || '').trim();
                                    const model = (product.car_model || '').trim();
                                    if (univ.includes(make.toLowerCase())) return 'جميع السيارات';
                                    const cleanModel = univ.includes(model.toLowerCase()) ? '' : model;
                                    return `${make}${cleanModel ? ' ' + cleanModel : ''}`;
                                  })()}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#666', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                <Calendar size={12} color="#22c55e" style={{ flexShrink: 0 }} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.car_model_year || 'الكل'}</span>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <LayoutGrid size={12} style={{ flexShrink: 0 }} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.category}</span>
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

                              {/* ── Cart quantity control ── */}
                              {(() => {
                                const cartItem = cartItems.find((i: any) => i.id === product.id);
                                const qty = cartItem?.quantity ?? 0;
                                if (isOutOfStock) return (
                                  <>
                                    <button disabled style={{ width: '100%', padding: '11px', backgroundColor: '#9ca3af', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'not-allowed', fontSize: '0.9rem' }}>
                                      <ShoppingCart size={16} /> نفذت الكمية
                                    </button>
                                    <div style={{ width: '100%', padding: '11px', backgroundColor: '#e5e7eb', color: '#9ca3af', borderRadius: '10px', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'not-allowed' }}>
                                      <Zap size={16} /> غير متاح
                                    </div>
                                  </>
                                );
                                if (qty === 0) return (
                                  <>
                                    <button
                                      onClick={(e) => { e.preventDefault(); addToCart({ ...product, price }, 1); toast.success('تمت الإضافة'); }}
                                      style={{ width: '100%', padding: '11px', backgroundColor: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', transition: '0.2s' }}
                                    >
                                      <ShoppingCart size={16} /> أضف إلى السلة
                                    </button>
                                    <Link
                                      href={`/products/${product.slug || product.id}`}
                                      onClick={() => addToCart({ ...product, price }, 1)}
                                      className="buy-now-btn"
                                      style={{ width: '100%', padding: '11px', backgroundColor: '#22c55e', color: '#fff', borderRadius: '10px', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'none', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(34,197,94,0.3)' }}
                                    >
                                      <Zap size={16} fill="#fff" /> اشتري الآن
                                    </Link>
                                  </>
                                );
                                return (
                                  <>
                                    {/* Quantity stepper — shown when item is in cart */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '2px solid #22c55e', borderRadius: '12px', padding: '6px 10px' }}>
                                      <button
                                        onClick={(e) => { e.preventDefault(); addToCart({ ...product, price }, -1); }}
                                        style={{ width: '34px', height: '34px', borderRadius: '8px', border: 'none', background: '#22c55e', color: '#fff', fontSize: '1.3rem', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                                      >
                                        −
                                      </button>
                                      <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#16a34a', lineHeight: 1 }}>{qty}</div>
                                        <div style={{ fontSize: '0.65rem', color: '#16a34a', fontWeight: '700' }}>في السلة</div>
                                      </div>
                                      <button
                                        onClick={(e) => { e.preventDefault(); addToCart({ ...product, price }, 1); }}
                                        style={{ width: '34px', height: '34px', borderRadius: '8px', border: 'none', background: '#22c55e', color: '#fff', fontSize: '1.3rem', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                                      >
                                        +
                                      </button>
                                    </div>
                                    <Link
                                      href={`/products/${product.slug || product.id}`}
                                      className="buy-now-btn"
                                      style={{ width: '100%', padding: '11px', backgroundColor: '#22c55e', color: '#fff', borderRadius: '10px', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'none', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(34,197,94,0.3)' }}
                                    >
                                      <Zap size={16} fill="#fff" /> اشتري الآن
                                    </Link>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                  )} {/* end grid view */}

                  {/* ── List view ── */}
                  {viewMode === 'list' && (
                  <div className="products-list">
                    {paginatedProducts.map((product) => {
                      const price = product.sale_price || product.regular_price;
                      const isOutOfStock = product.is_active === false || (product.stock_quantity != null && Number(product.stock_quantity) === 0);
                      const hasSale = product.sale_price > 0 && product.regular_price > product.sale_price;
                      const discPct = hasSale ? Math.round(((product.regular_price - product.sale_price) / product.regular_price) * 100) : 0;
                      const univ = ['universal','عام','all','الكل',''];
                      const make = (product.car_make || '').trim();
                      const model = (product.car_model || '').trim();
                      const compatText = univ.includes(make.toLowerCase()) ? 'جميع السيارات' : `${make}${univ.includes(model.toLowerCase()) ? '' : ' ' + model}`;
                      const imgSrc = product.image_url || (product.category && subcategoryImages[product.category.trim().toUpperCase()]) || '/api/placeholder/200/200';
                      const inCartQty = cartItems.find((i: any) => i.id === product.id)?.quantity ?? 0;
                      return (
                        <motion.div key={product.id} className="list-card"
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                          {/* Image */}
                          <Link href={`/products/${product.slug || product.id}`} className="list-card-img" style={{ display: 'block', textDecoration: 'none', position: 'relative' }}>
                            <img src={optimizeImageUrl(imgSrc)} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                            {hasSale && (
                              <div style={{ position: 'absolute', top: '6px', right: '6px', background: '#ef4444', color: '#fff', fontSize: '0.62rem', fontWeight: '900', padding: '2px 6px', borderRadius: '6px' }}>-{discPct}%</div>
                            )}
                            {inCartQty > 0 && (
                              <div style={{ position: 'absolute', bottom: '6px', right: '6px', background: '#22c55e', color: '#fff', fontSize: '0.6rem', fontWeight: '900', padding: '2px 7px', borderRadius: '8px' }}>✓ {inCartQty}</div>
                            )}
                          </Link>

                          {/* Body */}
                          <div className="list-card-body" dir="rtl">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' as const }}>
                              <span style={{ color: '#22c55e', fontWeight: '800', fontSize: '0.72rem', textTransform: 'uppercase' as const, letterSpacing: '0.4px' }}>{product.brand}</span>
                              {product.category && <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: '600' }}>{product.category}</span>}
                            </div>

                            <Link href={`/products/${product.slug || product.id}`} style={{ textDecoration: 'none' }}>
                              <h3 style={{ fontSize: '0.9rem', fontWeight: '900', color: '#0f172a', lineHeight: '1.4', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>
                                {product.name}
                              </h3>
                            </Link>

                            {/* Compat */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: '#15803d', fontWeight: '700', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '2px 8px', alignSelf: 'flex-start' as const }}>
                              <Car size={10} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{compatText}</span>
                            </div>

                            {/* Price + action */}
                            <div className="list-card-footer">
                              <div>
                                {hasSale ? (
                                  <>
                                    <span style={{ fontSize: '1.2rem', fontWeight: '900', color: '#0f172a' }}>{product.sale_price}</span>
                                    <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#0f172a', marginRight: '3px' }}>ج.م</span>
                                    <span style={{ fontSize: '0.75rem', color: '#aaa', textDecoration: 'line-through', marginRight: '6px' }}>{product.regular_price} ج.م</span>
                                  </>
                                ) : (
                                  <>
                                    <span style={{ fontSize: '1.2rem', fontWeight: '900', color: '#0f172a' }}>{price}</span>
                                    <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#0f172a', marginRight: '3px' }}>ج.م</span>
                                  </>
                                )}
                              </div>

                              {isOutOfStock ? (
                                <button disabled style={{ padding: '8px 16px', background: '#9ca3af', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '0.8rem', cursor: 'not-allowed' }}>نفذت الكمية</button>
                              ) : inCartQty > 0 ? (
                                <div style={{ display: 'flex', alignItems: 'center', background: '#f0fdf4', border: '1.5px solid #22c55e', borderRadius: '10px', overflow: 'hidden' }}>
                                  <button onClick={(e) => { e.preventDefault(); addToCart({ ...product, price }, 1); }} style={{ width: '34px', height: '34px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.1rem', fontWeight: '900', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                                  <span style={{ width: '28px', textAlign: 'center', fontWeight: '900', fontSize: '0.9rem', color: '#16a34a' }}>{inCartQty}</span>
                                  <button onClick={(e) => { e.preventDefault(); addToCart({ ...product, price }, -1); }} style={{ width: '34px', height: '34px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.1rem', fontWeight: '900', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => { e.preventDefault(); addToCart({ ...product, price }, 1); toast.success('تمت الإضافة'); }}
                                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer' }}>
                                  <ShoppingCart size={14} /> أضف للسلة
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                  )} {/* end list view */}

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