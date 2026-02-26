'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useCart } from '@/context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import toast from 'react-hot-toast';
import {
  Wrench, ShoppingCart,
  CheckCircle2, AlertCircle, Trash2, Car, Plus,
  Droplets, Flame, Settings, Filter, Zap
} from 'lucide-react';

const Select = dynamic(() => import('react-select'), { ssr: false });

const BUNDLE_CATEGORIES = [
  { name: 'زيوت موتور', subcategories: ['0W20','0W30','10W40','10W60','15W40','15W50','20W50','5W20','5W30','5W40','5W50'] },
  { name: 'زيوت فرامل', subcategories: [] },
  { name: 'زيوت فتيس و دبرياج و باور', subcategories: ['75W90','80W90','ATF','CENTRAL HYDRAULIC','CVT','DCT','DEXRON 2','DEXRON 3','DEXRON 6','DSG','MTF','SAE70W','SP3','SP4'] },
  { name: 'فلاتر', subcategories: ['فلتر زيت','فلتر هواء','فلتر بنزين','فلتر تكييف','فلاتر أخرى'] },
  { name: 'بوجيهات و سلوك بوجيهات و موبينة', subcategories: ['بوجيهات'] },
];

const UNIVERSAL_CATEGORIES = [
  'زيوت موتور',
  'زيوت فرامل',
  'زيوت فتيس و دبرياج و باور',
  'فلاتر',
];

// ── Section accent colors & icons ─────────────────────────────────────
const CATEGORY_STYLES: Record<string, {
  bg: string; bgDisabled: string;
  border: string; borderActive: string;
  iconBg: string; iconColor: string;
  badge: string; badgeText: string;
  itemBg: string; itemBorder: string;
  addBtnBorder: string; addBtnColor: string; addBtnHover: string;
  priceBg: string;
  icon: React.ReactNode;
}> = {
  'زيوت موتور': {
    bg: '#fffbeb', bgDisabled: '#fafaf5',
    border: '#fde68a', borderActive: '#f59e0b',
    iconBg: '#f59e0b', iconColor: '#fff',
    badge: '#fef3c7', badgeText: '#92400e',
    itemBg: '#fffdf0', itemBorder: '#fde68a',
    addBtnBorder: '#f59e0b', addBtnColor: '#b45309', addBtnHover: '#fef3c7',
    priceBg: '#fef9c3',
    icon: <Droplets size={16} color="#fff" />,
  },
  'زيوت فرامل': {
    bg: '#fef2f2', bgDisabled: '#fdf5f5',
    border: '#fecaca', borderActive: '#ef4444',
    iconBg: '#ef4444', iconColor: '#fff',
    badge: '#fee2e2', badgeText: '#991b1b',
    itemBg: '#fff5f5', itemBorder: '#fecaca',
    addBtnBorder: '#ef4444', addBtnColor: '#b91c1c', addBtnHover: '#fee2e2',
    priceBg: '#fee2e2',
    icon: <Flame size={16} color="#fff" />,
  },
  'زيوت فتيس و دبرياج و باور': {
    bg: '#f0f9ff', bgDisabled: '#f5fafd',
    border: '#bae6fd', borderActive: '#0ea5e9',
    iconBg: '#0ea5e9', iconColor: '#fff',
    badge: '#e0f2fe', badgeText: '#0c4a6e',
    itemBg: '#f0f9ff', itemBorder: '#bae6fd',
    addBtnBorder: '#0ea5e9', addBtnColor: '#0369a1', addBtnHover: '#e0f2fe',
    priceBg: '#e0f2fe',
    icon: <Settings size={16} color="#fff" />,
  },
  'فلاتر': {
    bg: '#f0fdf4', bgDisabled: '#f5fdf7',
    border: '#bbf7d0', borderActive: '#22c55e',
    iconBg: '#22c55e', iconColor: '#fff',
    badge: '#dcfce7', badgeText: '#14532d',
    itemBg: '#f0fdf4', itemBorder: '#bbf7d0',
    addBtnBorder: '#22c55e', addBtnColor: '#15803d', addBtnHover: '#dcfce7',
    priceBg: '#dcfce7',
    icon: <Filter size={16} color="#fff" />,
  },
  'بوجيهات و سلوك بوجيهات و موبينة': {
    bg: '#faf5ff', bgDisabled: '#fdf8ff',
    border: '#e9d5ff', borderActive: '#8b5cf6',
    iconBg: '#8b5cf6', iconColor: '#fff',
    badge: '#ede9fe', badgeText: '#4c1d95',
    itemBg: '#faf5ff', itemBorder: '#e9d5ff',
    addBtnBorder: '#8b5cf6', addBtnColor: '#6d28d9', addBtnHover: '#ede9fe',
    priceBg: '#ede9fe',
    icon: <Zap size={16} color="#fff" />,
  },
};

const DEFAULT_STYLE = {
  bg: '#fff', bgDisabled: '#f5f5f5',
  border: '#e5e5e5', borderActive: '#22c55e',
  iconBg: '#aaa', iconColor: '#fff',
  badge: '#f3f4f6', badgeText: '#374151',
  itemBg: '#f9f9f9', itemBorder: '#e5e5e5',
  addBtnBorder: '#22c55e', addBtnColor: '#16a34a', addBtnHover: '#f0fdf4',
  priceBg: '#f0fdf4',
  icon: <Wrench size={16} color="#fff" />,
};

const DISCOUNT = 5;

const makeEmptyItem = () => ({
  selectedSubcat: null,
  selectedBrand: null,
  selectedProduct: null,
  filteredProducts: [] as any[],
});

const makeInitialSlots = () =>
  BUNDLE_CATEGORIES.map((cat) => ({
    category: cat.name,
    subcategories: cat.subcategories,
    availableProducts: [] as any[],
    availableBrands: [] as any[],
    isIncluded: true,
    loading: false,
    items: [makeEmptyItem()],
  }));

export default function MaintenanceBundlePage() {
  const [makesOptions, setMakesOptions] = useState<any[]>([]);
  const [modelsOptions, setModelsOptions] = useState<any[]>([]);
  const [yearsOptions, setYearsOptions] = useState<any[]>([]);
  const [selectedMake, setSelectedMake] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState<any>(null);
  const [selectedYear, setSelectedYear] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [bundleSlots, setBundleSlots] = useState<any[]>(makeInitialSlots());

  const { addToCart } = useCart();

  const carSelected = selectedMake && selectedModel;

  const allSelectedProducts = bundleSlots.flatMap((slot) =>
    slot.isIncluded ? slot.items.filter((item: any) => item.selectedProduct) : []
  );
  const canAddToCart = allSelectedProducts.length >= 2;

  const totalOriginal = allSelectedProducts.reduce((sum: number, item: any) => {
    const p = item.selectedProduct;
    return sum + (p?.sale_price > 0 ? p.sale_price : p?.regular_price || 0);
  }, 0);
  const totalDiscounted = totalOriginal * (1 - DISCOUNT / 100);
  const savings = totalOriginal - totalDiscounted;

  useEffect(() => {
    setIsMounted(true);
    fetchMakes();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedMake && selectedModel) {
      fetchAllSlots(selectedMake, selectedModel, selectedYear);
    }
  }, [selectedMake, selectedModel, selectedYear]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchAllSlots(make: any, model: any, year: any) {
    const yearNum = year ? parseInt(year.value) : null;
    setBundleSlots((prev) => prev.map((slot) => ({ ...slot, loading: true })));

    const updatedSlots = await Promise.all(
      BUNDLE_CATEGORIES.map(async (cat) => {
        const isUniversal = UNIVERSAL_CATEGORIES.includes(cat.name);

        let query = supabase
          .from('products')
          .select('*')
          .ilike('category', cat.name.trim());

        if (!isUniversal) {
          query = query
            .ilike('car_make', make.value.trim())
            .ilike('car_model', model.value.trim());
        }

        const { data } = await query;

        const filtered = (data || []).filter((p: any) => {
          if (isUniversal) return true;
          if (!yearNum || !p.car_model_year) return true;
          return isYearCompatible(p.car_model_year, String(yearNum));
        });

        const uniqueBrands = Array.from(
          new Set(filtered.map((p: any) => p.brand?.trim()).filter(Boolean))
        ) as string[];

        return {
          category: cat.name,
          subcategories: cat.subcategories,
          availableProducts: filtered,
          availableBrands: uniqueBrands.map((b) => ({ value: b, label: b })),
          isIncluded: true,
          loading: false,
          items: [makeEmptyItem()],
        };
      })
    );

    setBundleSlots(updatedSlots);
  }

  async function fetchMakes() {
    const { data } = await supabase
      .from('products')
      .select('car_make')
      .order('car_make', { ascending: true });
    const unique = Array.from(new Set(data?.map((p: any) => p.car_make?.trim()).filter(Boolean)));
    setMakesOptions(unique.map((m) => ({ value: m, label: m })));
  }

  async function handleMakeChange(opt: any) {
    setSelectedMake(opt);
    setSelectedModel(null);
    setSelectedYear(null);
    setModelsOptions([]);
    setYearsOptions([]);
    setBundleSlots(makeInitialSlots());
    if (!opt) return;
    const { data } = await supabase
      .from('products')
      .select('car_model')
      .ilike('car_make', opt.value.trim());
    const unique = Array.from(new Set(data?.map((p: any) => p.car_model?.trim()).filter(Boolean)));
    setModelsOptions((unique as string[]).sort().map((m) => ({ value: m, label: m })));
  }

  async function handleModelChange(opt: any) {
    setSelectedModel(opt);
    setSelectedYear(null);
    setYearsOptions([]);
    setBundleSlots(makeInitialSlots());
    if (!opt || !selectedMake) return;
    const { data } = await supabase
      .from('products')
      .select('car_model_year')
      .ilike('car_make', selectedMake.value.trim())
      .ilike('car_model', opt.value.trim());
    const allYears = new Set<number>();
    data?.forEach((p: any) => {
      if (!p.car_model_year) return;
      p.car_model_year.split(/[,/]+/).forEach((entry: string) => {
        const range = entry.trim().match(/^(\d{4})\s*-\s*(\d{4})$/);
        if (range) {
          for (let y = parseInt(range[1]); y <= parseInt(range[2]); y++) allYears.add(y);
        } else {
          const single = entry.trim().match(/^(\d{4})/);
          if (single) allYears.add(parseInt(single[1]));
        }
      });
    });
    const sorted = Array.from(allYears).sort((a, b) => b - a);
    setYearsOptions(sorted.map((y) => ({ value: String(y), label: String(y) })));
  }

  function isYearCompatible(productYearStr: string, yr: string): boolean {
    if (!productYearStr || !yr) return true;
    const target = parseInt(yr);
    if (isNaN(target)) return true;
    const entries = productYearStr.split(/[,/]+/).map((s) => s.trim()).filter(Boolean);
    for (const entry of entries) {
      const range = entry.match(/^(\d{4})\s*-\s*(\d{4})$/);
      if (range && target >= parseInt(range[1]) && target <= parseInt(range[2])) return true;
      const open = entry.match(/^(\d{4})\s*\+$/);
      if (open && target >= parseInt(open[1])) return true;
      const single = entry.match(/^(\d{4})$/);
      if (single && target === parseInt(single[1])) return true;
    }
    return false;
  }

  function addItem(slotIndex: number) {
    const updated = [...bundleSlots];
    updated[slotIndex] = {
      ...updated[slotIndex],
      items: [...updated[slotIndex].items, makeEmptyItem()],
    };
    setBundleSlots(updated);
  }

  function removeItem(slotIndex: number, itemIndex: number) {
    const updated = [...bundleSlots];
    const newItems = updated[slotIndex].items.filter((_: any, i: number) => i !== itemIndex);
    updated[slotIndex] = { ...updated[slotIndex], items: newItems };
    setBundleSlots(updated);
  }

  function handleSubcatChange(slotIndex: number, itemIndex: number, subcat: string | null) {
    const updated = [...bundleSlots];
    const slot = updated[slotIndex];
    const filtered = subcat
      ? slot.availableProducts.filter(
          (p: any) => p.subcategory?.trim().toLowerCase() === subcat.trim().toLowerCase()
        )
      : slot.availableProducts;
    const newItems = [...slot.items];
    newItems[itemIndex] = {
      ...newItems[itemIndex],
      selectedSubcat: subcat,
      selectedBrand: null,
      selectedProduct: null,
      filteredProducts: filtered,
    };
    updated[slotIndex] = { ...slot, items: newItems };
    setBundleSlots(updated);
  }

  function handleBrandChange(slotIndex: number, itemIndex: number, brand: any) {
    const updated = [...bundleSlots];
    const slot = updated[slotIndex];
    const item = slot.items[itemIndex];
    const sourceProducts = item.selectedSubcat ? item.filteredProducts : slot.availableProducts;
    const filtered = brand
      ? sourceProducts.filter(
          (p: any) => p.brand?.trim().toLowerCase() === brand.value.toLowerCase()
        )
      : sourceProducts;
    const newItems = [...slot.items];
    newItems[itemIndex] = {
      ...item,
      selectedBrand: brand,
      selectedProduct: filtered.length === 1 ? filtered[0] : null,
      filteredProducts: filtered,
    };
    updated[slotIndex] = { ...slot, items: newItems };
    setBundleSlots(updated);
  }

  function handleProductChange(slotIndex: number, itemIndex: number, product: any) {
    const updated = [...bundleSlots];
    const slot = updated[slotIndex];
    const newItems = [...slot.items];
    newItems[itemIndex] = { ...newItems[itemIndex], selectedProduct: product };
    updated[slotIndex] = { ...slot, items: newItems };
    setBundleSlots(updated);
  }

  function toggleSlot(slotIndex: number) {
    const currentlyIncluded = bundleSlots.filter((s) => s.isIncluded).length;
    const slot = bundleSlots[slotIndex];
    if (slot.isIncluded && currentlyIncluded <= 2) {
      toast.error('يجب أن تحتوي الباقة على قسمين على الأقل');
      return;
    }
    const updated = [...bundleSlots];
    updated[slotIndex] = { ...updated[slotIndex], isIncluded: !slot.isIncluded };
    setBundleSlots(updated);
  }

  function addBundleToCart() {
    if (!canAddToCart) {
      toast.error('يجب اختيار منتجين على الأقل لإتمام الباقة');
      return;
    }
    allSelectedProducts.forEach((item: any) => {
      const p = item.selectedProduct;
      const originalPrice = p.sale_price > 0 ? p.sale_price : p.regular_price;
      const discountedPrice = parseFloat((originalPrice * (1 - DISCOUNT / 100)).toFixed(2));
      addToCart({ ...p, price: discountedPrice }, 1);
    });
    toast.success(`🛠️ تمت إضافة الباقة! وفرت ${savings.toFixed(0)} ج.م`);
  }

  const customSelectStyles = {
    control: (base: any) => ({
      ...base,
      minHeight: '44px',
      borderRadius: '10px',
      border: '1px solid #e5e5e5',
      fontSize: '0.85rem',
      direction: 'rtl',
      background: '#fff',
    }),
    menu: (base: any) => ({ ...base, zIndex: 9999, direction: 'rtl' }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isFocused ? '#f0fdf4' : '#fff',
      color: '#1a1a1a',
      fontSize: '0.85rem',
    }),
  };

  function getBrandsForItem(slot: any, item: any) {
    const source = item.selectedSubcat ? item.filteredProducts : slot.availableProducts;
    const unique = Array.from(
      new Set(source.map((p: any) => p.brand?.trim()).filter(Boolean))
    ) as string[];
    return unique.map((b) => ({ value: b, label: b }));
  }

  function getProductsForItem(slot: any, item: any) {
    const source = item.selectedBrand
      ? item.filteredProducts
      : item.selectedSubcat
      ? item.filteredProducts
      : slot.availableProducts;
    return source.map((p: any) => ({
      value: p.id,
      label: `${p.name}${p.part_number ? ` — ${p.part_number}` : ''} — ${p.sale_price > 0 ? p.sale_price : p.regular_price} ج.م`,
      product: p,
    }));
  }

  if (!isMounted) return null;

  return (
    <div style={{ direction: 'rtl', backgroundColor: '#f4f4f4', minHeight: '100vh', paddingTop: '70px' }}>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 640px) {
          .bundle-header { padding: 32px 16px !important; }
          .bundle-header h1 { font-size: 1.5rem !important; }
          .bundle-header p { font-size: 0.9rem !important; }
          .bundle-header-icon { padding: 10px !important; }
          .car-selector-card { padding: 18px !important; border-radius: 14px !important; }
          .car-selector-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
          .bundle-main { padding: 0 12px 100px !important; }
          .slot-card { padding: 14px !important; border-radius: 12px !important; }
          .slot-header-title { font-size: 0.85rem !important; }
          .slot-toggle-btn span { display: none; }
          .item-card { padding: 12px !important; border-radius: 10px !important; }
          .item-grid-3 { grid-template-columns: 1fr !important; gap: 10px !important; }
          .item-grid-2 { grid-template-columns: 1fr !important; gap: 10px !important; }
          .summary-bar { padding: 16px !important; border-radius: 16px !important; bottom: 10px !important; }
          .summary-bar-inner { flex-direction: column !important; align-items: stretch !important; gap: 12px !important; }
          .summary-price { font-size: 1.6rem !important; }
          .summary-btn { width: 100% !important; justify-content: center !important; padding: 14px 20px !important; font-size: 0.95rem !important; }
          .summary-alert { justify-content: center !important; }
          .empty-state { padding: 40px 16px !important; }
          .add-item-btn { font-size: 0.82rem !important; padding: 10px 8px !important; }
          .section-title { font-size: 1rem !important; }
          .selected-count-badge { font-size: 0.78rem !important; padding: 4px 10px !important; }
        }
        @media (max-width: 400px) {
          .bundle-header h1 { font-size: 1.25rem !important; }
          .slot-header-title { font-size: 0.82rem !important; }
        }
      `}</style>

      {/* PAGE HEADER */}
      <div
        className="bundle-header"
        style={{
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
          padding: '50px 20px',
          textAlign: 'center',
          marginBottom: '28px',
        }}
      >
        <div
          className="bundle-header-icon"
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: '#22c55e', borderRadius: '18px', padding: '14px', marginBottom: '16px',
          }}
        >
          <Wrench size={32} color="#fff" />
        </div>
        <h1 style={{ color: '#fff', fontSize: '2rem', fontWeight: '900', marginBottom: '10px', lineHeight: 1.3 }}>
          باقة الصيانة الذكية
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', maxWidth: '480px', margin: '0 auto', lineHeight: 1.6 }}>
          اختر سيارتك وخصص باقة الصيانة المناسبة — واحصل على خصم {DISCOUNT}% على السعر الإجمالي
        </p>
      </div>

      <div className="bundle-main" style={{ maxWidth: '900px', margin: '0 auto', padding: '0 16px 100px' }}>

        {/* CAR SELECTOR */}
        <div
          className="car-selector-card"
          style={{
            background: '#fff', borderRadius: '18px', padding: '22px',
            marginBottom: '22px', boxShadow: '0 4px 20px rgba(0,0,0,0.07)',
          }}
        >
          <h2 style={{ fontWeight: '900', fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Car size={20} color="#22c55e" />
            اختر سيارتك
          </h2>
          <div className="car-selector-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '700', fontSize: '0.8rem', marginBottom: '5px', color: '#555' }}>الماركة</label>
              <Select instanceId="bundle-make" options={makesOptions} styles={customSelectStyles} placeholder="اختر الماركة" isRtl={true} value={selectedMake} onChange={(opt: any) => handleMakeChange(opt)} isClearable />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '700', fontSize: '0.8rem', marginBottom: '5px', color: '#555' }}>الموديل</label>
              <Select instanceId="bundle-model" options={modelsOptions} styles={customSelectStyles} placeholder="اختر الموديل" isRtl={true} value={selectedModel} onChange={(opt: any) => handleModelChange(opt)} isDisabled={!selectedMake} isClearable />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '700', fontSize: '0.8rem', marginBottom: '5px', color: '#555' }}>
                سنة الصنع{' '}
                <span style={{ color: '#aaa', fontWeight: '500', fontSize: '0.75rem' }}>(اختياري)</span>
              </label>
              <Select
                instanceId="bundle-year"
                options={yearsOptions}
                styles={customSelectStyles}
                placeholder="اختر السنة"
                isRtl={true}
                value={selectedYear}
                onChange={(opt: any) => {
                  setSelectedYear(opt);
                  if (selectedMake && selectedModel) fetchAllSlots(selectedMake, selectedModel, opt);
                }}
                isDisabled={!selectedModel}
                isClearable
              />
            </div>
          </div>
        </div>

        {/* BUNDLE SLOTS */}
        <AnimatePresence>
          {carSelected && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h2 className="section-title" style={{ fontWeight: '900', fontSize: '1.1rem' }}>🛠️ محتويات الباقة</h2>
                <div className="selected-count-badge" style={{ background: '#f0fdf4', color: '#16a34a', padding: '5px 12px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: '800' }}>
                  {allSelectedProducts.length} منتج مختار
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                {bundleSlots.map((slot, slotIdx) => {
                  const cs = CATEGORY_STYLES[slot.category] ?? DEFAULT_STYLE;
                  return (
                    <motion.div
                      key={slot.category}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: slotIdx * 0.06 }}
                      className="slot-card"
                      style={{
                        background: slot.isIncluded ? cs.bg : cs.bgDisabled,
                        borderRadius: '14px',
                        border: slot.isIncluded && slot.items.some((i: any) => i.selectedProduct)
                          ? `2px solid ${cs.borderActive}`
                          : `1.5px solid ${slot.isIncluded ? cs.border : '#e5e5e5'}`,
                        padding: '18px',
                        opacity: slot.isIncluded ? 1 : 0.55,
                        transition: 'all 0.2s',
                      }}
                    >
                      {/* SLOT HEADER */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: slot.isIncluded ? '14px' : '0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>

                          {/* Colored icon circle */}
                          <div style={{
                            width: 34, height: 34, borderRadius: '50%',
                            background: cs.iconBg,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: `0 3px 10px ${cs.iconBg}55`,
                          }}>
                            {slot.loading
                              ? <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} />
                              : slot.isIncluded && slot.items.some((i: any) => i.selectedProduct)
                                ? <CheckCircle2 size={16} color="#fff" />
                                : cs.icon
                            }
                          </div>

                          <span className="slot-header-title" style={{ fontWeight: '900', fontSize: '0.92rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {slot.category}
                          </span>

                          {!slot.loading && (
                            <span style={{
                              flexShrink: 0, fontSize: '0.72rem', fontWeight: '700',
                              background: slot.availableProducts.length === 0 ? '#fff7ed' : cs.badge,
                              color: slot.availableProducts.length === 0 ? '#f97316' : cs.badgeText,
                              padding: '2px 8px', borderRadius: '20px',
                            }}>
                              {slot.availableProducts.length === 0 ? 'لا يوجد' : `${slot.availableProducts.length} منتج`}
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => toggleSlot(slotIdx)}
                          className="slot-toggle-btn"
                          style={{
                            flexShrink: 0, marginRight: '8px',
                            background: slot.isIncluded ? '#fee2e2' : '#f0fdf4',
                            color: slot.isIncluded ? '#dc2626' : '#16a34a',
                            border: 'none', borderRadius: '8px',
                            padding: '6px 10px', cursor: 'pointer',
                            fontWeight: '700', fontSize: '0.78rem',
                            display: 'flex', alignItems: 'center', gap: '4px',
                          }}
                        >
                          {slot.isIncluded
                            ? <><Trash2 size={13} /><span>إزالة</span></>
                            : <><CheckCircle2 size={13} /><span>إضافة</span></>
                          }
                        </button>
                      </div>

                      {/* ITEMS */}
                      {slot.isIncluded && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {slot.items.map((item: any, itemIdx: number) => {
                            const itemBrands = getBrandsForItem(slot, item);
                            const itemProducts = getProductsForItem(slot, item);
                            return (
                              <div
                                key={itemIdx}
                                className="item-card"
                                style={{
                                  background: item.selectedProduct ? cs.itemBg : '#fff',
                                  borderRadius: '12px',
                                  padding: '13px',
                                  border: item.selectedProduct ? `1.5px solid ${cs.itemBorder}` : '1.5px solid #efefef',
                                  position: 'relative',
                                  transition: 'all 0.2s',
                                }}
                              >
                                {/* Item header row */}
                                {slot.items.length > 1 && (
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: cs.badgeText, background: cs.badge, padding: '2px 8px', borderRadius: '6px' }}>
                                      منتج #{itemIdx + 1}
                                    </span>
                                    <button
                                      onClick={() => removeItem(slotIdx, itemIdx)}
                                      style={{
                                        background: '#fee2e2', color: '#dc2626',
                                        border: 'none', borderRadius: '6px',
                                        width: '26px', height: '26px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer',
                                      }}
                                      title="حذف هذا المنتج"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                )}

                                {/* Selectors grid */}
                                <div
                                  className={slot.subcategories.length > 0 ? 'item-grid-3' : 'item-grid-2'}
                                  style={{
                                    display: 'grid',
                                    gridTemplateColumns: slot.subcategories.length > 0 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
                                    gap: '10px',
                                  }}
                                >
                                  {slot.subcategories.length > 0 && (
                                    <div>
                                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#666', marginBottom: '5px' }}>النوع / اللزوجة</label>
                                      <Select
                                        instanceId={`subcat-${slotIdx}-${itemIdx}`}
                                        options={slot.subcategories.map((s: string) => ({ value: s, label: s }))}
                                        styles={customSelectStyles}
                                        placeholder="النوع"
                                        isRtl={true}
                                        value={item.selectedSubcat ? { value: item.selectedSubcat, label: item.selectedSubcat } : null}
                                        onChange={(opt: any) => handleSubcatChange(slotIdx, itemIdx, opt?.value ?? null)}
                                        isClearable
                                      />
                                    </div>
                                  )}
                                  <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#666', marginBottom: '5px' }}>العلامة التجارية</label>
                                    <Select
                                      instanceId={`brand-${slotIdx}-${itemIdx}`}
                                      options={itemBrands}
                                      styles={customSelectStyles}
                                      placeholder={slot.loading ? 'جاري...' : itemBrands.length === 0 ? 'لا يوجد' : 'الماركة'}
                                      isRtl={true}
                                      value={item.selectedBrand}
                                      onChange={(opt: any) => handleBrandChange(slotIdx, itemIdx, opt)}
                                      isDisabled={slot.loading || itemBrands.length === 0}
                                      isClearable
                                      noOptionsMessage={() => 'لا توجد علامات'}
                                    />
                                  </div>
                                  <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#666', marginBottom: '5px' }}>المنتج</label>
                                    <Select
                                      instanceId={`product-${slotIdx}-${itemIdx}`}
                                      options={itemProducts}
                                      styles={customSelectStyles}
                                      placeholder="اختر المنتج"
                                      isRtl={true}
                                      value={item.selectedProduct
                                        ? itemProducts.find((o: any) => o.value === item.selectedProduct.id) ?? null
                                        : null
                                      }
                                      onChange={(opt: any) => handleProductChange(slotIdx, itemIdx, opt?.product ?? null)}
                                      isDisabled={slot.loading || itemProducts.length === 0}
                                      isClearable
                                      noOptionsMessage={() => 'اختر الماركة أولاً'}
                                    />
                                  </div>
                                </div>

                                {/* Price tag */}
                                {item.selectedProduct && (
                                  <div style={{
                                    marginTop: '10px',
                                    display: 'flex', alignItems: 'center',
                                    gap: '8px', flexWrap: 'wrap',
                                    background: cs.priceBg,
                                    borderRadius: '8px',
                                    padding: '8px 12px',
                                  }}>
                                    <span style={{ fontSize: '0.76rem', color: '#888' }}>السعر:</span>
                                    <span style={{ textDecoration: 'line-through', color: '#bbb', fontSize: '0.8rem' }}>
                                      {item.selectedProduct.sale_price > 0 ? item.selectedProduct.sale_price : item.selectedProduct.regular_price} ج.م
                                    </span>
                                    <span style={{ color: cs.iconBg, fontWeight: '900', fontSize: '1rem' }}>
                                      {(
                                        (item.selectedProduct.sale_price > 0
                                          ? item.selectedProduct.sale_price
                                          : item.selectedProduct.regular_price) *
                                        (1 - DISCOUNT / 100)
                                      ).toFixed(0)} ج.م
                                    </span>
                                    <span style={{ background: '#fef9c3', color: '#854d0e', padding: '2px 7px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800' }}>
                                      خصم {DISCOUNT}%
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* ADD ITEM BUTTON */}
                          {slot.availableProducts.length > 0 && (
                            <button
                              className="add-item-btn"
                              onClick={() => addItem(slotIdx)}
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                gap: '7px', padding: '11px 8px',
                                background: 'transparent',
                                border: `2px dashed ${cs.addBtnBorder}`,
                                borderRadius: '12px',
                                color: cs.addBtnColor,
                                fontWeight: '800', fontSize: '0.85rem',
                                cursor: 'pointer', width: '100%',
                                transition: 'background 0.2s',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = cs.addBtnHover)}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                              <Plus size={15} />
                              إضافة منتج آخر من {slot.category}
                            </button>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* STICKY SUMMARY BAR */}
              {allSelectedProducts.length >= 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="summary-bar"
                  style={{
                    background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
                    borderRadius: '18px', padding: '20px 24px',
                    position: 'sticky', bottom: '16px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.25)',
                  }}
                >
                  <div className="summary-bar-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                    <div>
                      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.82rem', marginBottom: '4px' }}>
                        إجمالي الباقة ({allSelectedProducts.length} منتج)
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="summary-price" style={{ fontSize: '1.8rem', fontWeight: '900', color: '#22c55e' }}>
                          {totalDiscounted.toFixed(0)} ج.م
                        </span>
                        <div>
                          <span style={{ textDecoration: 'line-through', color: 'rgba(255,255,255,0.35)', fontSize: '0.95rem', display: 'block' }}>
                            {totalOriginal.toFixed(0)} ج.م
                          </span>
                          <span style={{ color: '#fbbf24', fontWeight: '800', fontSize: '0.82rem' }}>
                            وفرت {savings.toFixed(0)} ج.م
                          </span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                      {!canAddToCart && (
                        <p className="summary-alert" style={{ color: '#f87171', fontSize: '0.78rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <AlertCircle size={13} />
                          اختر منتجين على الأقل للحصول على الخصم
                        </p>
                      )}
                      <button
                        className="summary-btn"
                        onClick={addBundleToCart}
                        disabled={!canAddToCart}
                        style={{
                          padding: '14px 28px',
                          background: canAddToCart ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : '#555',
                          color: '#fff', border: 'none', borderRadius: '12px',
                          fontWeight: '900', fontSize: '0.95rem',
                          cursor: canAddToCart ? 'pointer' : 'not-allowed',
                          display: 'flex', alignItems: 'center', gap: '8px',
                          boxShadow: canAddToCart ? '0 6px 20px rgba(34,197,94,0.4)' : 'none',
                          transition: 'all 0.2s', whiteSpace: 'nowrap',
                        }}
                      >
                        <ShoppingCart size={20} />
                        أضف الباقة للسلة — {totalDiscounted.toFixed(0)} ج.م
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* EMPTY STATE */}
        {!carSelected && (
          <div className="empty-state" style={{ textAlign: 'center', padding: '50px 20px', color: '#aaa' }}>
            <Car size={64} color="#e0e0e0" style={{ margin: '0 auto 16px' }} />
            <p style={{ fontWeight: '800', fontSize: '1.05rem', color: '#888', marginBottom: '8px' }}>
              اختر ماركة وموديل سيارتك أولاً
            </p>
            <p style={{ fontSize: '0.88rem', color: '#bbb', lineHeight: 1.6 }}>
              السنة اختيارية — ستظهر المنتجات المتوفرة لسيارتك تلقائياً
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
