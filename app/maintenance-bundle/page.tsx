'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useCart } from '@/context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import toast from 'react-hot-toast';
import {
  Wrench, ShoppingCart,
  CheckCircle2, AlertCircle, Trash2, Car
} from 'lucide-react';

const Select = dynamic(() => import('react-select'), { ssr: false });

const BUNDLE_CATEGORIES = [
  { name: 'زيوت موتور', subcategories: ['0W20','0W30','10W40','10W60','15W40','15W50','20W50','5W20','5W30','5W40','5W50'] },
  { name: 'زيوت فرامل', subcategories: [] },
  { name: 'زيوت فتيس و دبرياج و باور', subcategories: ['75W90','80W90','ATF','CENTRAL HYDRAULIC','CVT','DCT','DEXRON 2','DEXRON 3','DEXRON 6','DSG','MTF','SAE70W','SP3','SP4'] },
  { name: 'فلاتر', subcategories: ['فلتر زيت','فلتر هواء','فلتر بنزين','فلتر تكييف','فلاتر أخرى'] },
  { name: 'بوجيهات و سلوك بوجيهات و موبينة', subcategories: ['بوجيهات'] },
];

const DISCOUNT = 5;

const makeInitialSlots = () =>
  BUNDLE_CATEGORIES.map((cat) => ({
    category: cat.name,
    subcategories: cat.subcategories,
    selectedSubcat: null,
    selectedBrand: null,
    selectedProduct: null,
    availableProducts: [] as any[],
    filteredProducts: [] as any[],
    availableBrands: [] as any[],
    isIncluded: true,
    loading: false,
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

  const carSelected = selectedMake && selectedModel && selectedYear;
  const includedSlots = bundleSlots.filter((s) => s.isIncluded && s.selectedProduct);
  const canAddToCart = includedSlots.length >= 2;

  const totalOriginal = includedSlots.reduce((sum, s) => {
    const p = s.selectedProduct;
    return sum + (p?.sale_price > 0 ? p.sale_price : p?.regular_price || 0);
  }, 0);
  const totalDiscounted = totalOriginal * (1 - DISCOUNT / 100);
  const savings = totalOriginal - totalDiscounted;

  useEffect(() => {
    setIsMounted(true);
    fetchMakes();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ✅ KEY FIX: Auto-fetch all slot products as soon as car is fully selected
  useEffect(() => {
    if (selectedMake && selectedModel && selectedYear) {
      fetchAllSlots(selectedMake, selectedModel, selectedYear);
    }
  }, [selectedMake, selectedModel, selectedYear]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Fetch products for ALL slots at once when car is selected ────────────
  async function fetchAllSlots(make: any, model: any, year: any) {
    const yearNum = year ? parseInt(year.value) : null;

    // Set all slots to loading
    setBundleSlots((prev) => prev.map((slot) => ({ ...slot, loading: true })));

    const updatedSlots = await Promise.all(
      BUNDLE_CATEGORIES.map(async (cat) => {
        let query = supabase
          .from('products')
          .select('*')
          .ilike('category', cat.name.trim())
          .ilike('car_make', make.value.trim())
          .ilike('car_model', model.value.trim());

        const { data } = await query;

        // Filter by year compatibility
        const filtered = (data || []).filter((p: any) => {
          if (!yearNum || !p.car_model_year) return true;
          return isYearCompatible(p.car_model_year, String(yearNum));
        });

        const uniqueBrands = Array.from(
          new Set(filtered.map((p: any) => p.brand?.trim()).filter(Boolean))
        ) as string[];

        return {
          category: cat.name,
          subcategories: cat.subcategories,
          selectedSubcat: null,
          selectedBrand: null,
          selectedProduct: null,
          availableProducts: filtered,
          filteredProducts: filtered,
          availableBrands: uniqueBrands.map((b) => ({ value: b, label: b })),
          isIncluded: true,
          loading: false,
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

  // ✅ handleSubcatChange now FILTERS already-fetched products (no new DB call needed)
  function handleSubcatChange(slotIndex: number, subcat: string | null) {
    const updated = [...bundleSlots];
    const slot = updated[slotIndex];

    const filtered = subcat
      ? slot.availableProducts.filter(
          (p: any) => p.subcategory?.trim().toLowerCase() === subcat.trim().toLowerCase()
        )
      : slot.availableProducts;

    const uniqueBrands = Array.from(
      new Set(filtered.map((p: any) => p.brand?.trim()).filter(Boolean))
    ) as string[];

    updated[slotIndex] = {
      ...slot,
      selectedSubcat: subcat,
      selectedBrand: null,
      selectedProduct: null,
      filteredProducts: filtered,
      availableBrands: uniqueBrands.map((b) => ({ value: b, label: b })),
    };
    setBundleSlots(updated);
  }

  function handleBrandChange(slotIndex: number, brand: any) {
    const updated = [...bundleSlots];
    const slot = updated[slotIndex];
    const sourceProducts = slot.selectedSubcat ? slot.filteredProducts : slot.availableProducts;

    const filtered = brand
      ? sourceProducts.filter(
          (p: any) => p.brand?.trim().toLowerCase() === brand.value.toLowerCase()
        )
      : sourceProducts;

    updated[slotIndex] = {
      ...slot,
      selectedBrand: brand,
      selectedProduct: filtered.length === 1 ? filtered[0] : null,
      filteredProducts: filtered,
    };
    setBundleSlots(updated);
  }

  function handleProductChange(slotIndex: number, product: any) {
    const updated = [...bundleSlots];
    updated[slotIndex] = { ...updated[slotIndex], selectedProduct: product };
    setBundleSlots(updated);
  }

  function toggleSlot(slotIndex: number) {
    const currentlyIncluded = bundleSlots.filter((s) => s.isIncluded).length;
    const slot = bundleSlots[slotIndex];
    if (slot.isIncluded && currentlyIncluded <= 2) {
      toast.error('يجب أن يحتوي الطقم على قطعتين على الأقل');
      return;
    }
    const updated = [...bundleSlots];
    updated[slotIndex] = { ...updated[slotIndex], isIncluded: !slot.isIncluded };
    setBundleSlots(updated);
  }

  function addBundleToCart() {
    if (!canAddToCart) {
      toast.error('يجب اختيار منتجين على الأقل لإتمام الطقم');
      return;
    }
    includedSlots.forEach((slot) => {
      const p = slot.selectedProduct;
      const originalPrice = p.sale_price > 0 ? p.sale_price : p.regular_price;
      const discountedPrice = parseFloat((originalPrice * (1 - DISCOUNT / 100)).toFixed(2));
      addToCart({ ...p, price: discountedPrice }, 1);
    });
    toast.success(`🛠️ تمت إضافة الطقم! وفرت ${savings.toFixed(0)} ج.م`);
  }

  const customSelectStyles = {
    control: (base: any) => ({
      ...base,
      height: '44px',
      borderRadius: '10px',
      border: '1px solid #e5e5e5',
      fontSize: '0.88rem',
      direction: 'rtl',
    }),
    menu: (base: any) => ({ ...base, zIndex: 9999, direction: 'rtl' }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isFocused ? '#f0fdf4' : '#fff',
      color: '#1a1a1a',
      fontSize: '0.88rem',
    }),
  };

  if (!isMounted) return null;

  return (
    <div style={{ direction: 'rtl', backgroundColor: '#f9f9f9', minHeight: '100vh', paddingTop: '80px' }}>

      {/* PAGE HEADER */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
        padding: '50px 20px', textAlign: 'center', marginBottom: '40px',
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#22c55e', borderRadius: '20px', padding: '14px', marginBottom: '20px' }}>
          <Wrench size={36} color="#fff" />
        </div>
        <h1 style={{ color: '#fff', fontSize: '2.2rem', fontWeight: '900', marginBottom: '10px' }}>
          طقم الصيانة الذكي
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.05rem', maxWidth: '500px', margin: '0 auto' }}>
          اختر سيارتك وخصص طقم الصيانة المناسب — واحصل على خصم {DISCOUNT}% على السعر الإجمالي
        </p>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 20px 80px' }}>

        {/* CAR SELECTOR */}
        <div style={{ background: '#fff', borderRadius: '20px', padding: '28px', marginBottom: '28px', boxShadow: '0 4px 20px rgba(0,0,0,0.07)' }}>
          <h2 style={{ fontWeight: '900', fontSize: '1.2rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Car size={22} color="#22c55e" />
            اختر سيارتك
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '700', fontSize: '0.82rem', marginBottom: '6px', color: '#555' }}>الماركة</label>
              <Select
                instanceId="bundle-make"
                options={makesOptions}
                styles={customSelectStyles}
                placeholder="اختر الماركة"
                isRtl={true}
                value={selectedMake}
                onChange={(opt: any) => handleMakeChange(opt)}
                isClearable
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '700', fontSize: '0.82rem', marginBottom: '6px', color: '#555' }}>الموديل</label>
              <Select
                instanceId="bundle-model"
                options={modelsOptions}
                styles={customSelectStyles}
                placeholder="اختر الموديل"
                isRtl={true}
                value={selectedModel}
                onChange={(opt: any) => handleModelChange(opt)}
                isDisabled={!selectedMake}
                isClearable
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '700', fontSize: '0.82rem', marginBottom: '6px', color: '#555' }}>سنة الصنع</label>
              <Select
                instanceId="bundle-year"
                options={yearsOptions}
                styles={customSelectStyles}
                placeholder="اختر السنة"
                isRtl={true}
                value={selectedYear}
                onChange={(opt: any) => { setSelectedYear(opt); setBundleSlots(makeInitialSlots()); }}
                isDisabled={!selectedModel}
                isClearable
              />
            </div>
          </div>
        </div>

        {/* BUNDLE SLOTS */}
        <AnimatePresence>
          {carSelected && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h2 style={{ fontWeight: '900', fontSize: '1.2rem' }}>🛠️ محتويات الطقم</h2>
                <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '6px 14px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '800' }}>
                  {includedSlots.length} قطع مختارة
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '28px' }}>
                {bundleSlots.map((slot, idx) => {
                  const displayProducts: any[] =
                    slot.selectedSubcat || slot.selectedBrand
                      ? slot.filteredProducts
                      : slot.availableProducts;

                  const productOptions = displayProducts.map((p: any) => ({
                    value: p.id,
                    label: `${p.name}${p.part_number ? ` — ${p.part_number}` : ''} — ${p.sale_price > 0 ? p.sale_price : p.regular_price} ج.م`,
                    product: p,
                  }));

                  return (
                    <motion.div
                      key={slot.category}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.07 }}
                      style={{
                        background: slot.isIncluded ? '#fff' : '#f5f5f5',
                        borderRadius: '16px',
                        border: slot.selectedProduct && slot.isIncluded
                          ? '2px solid #22c55e'
                          : '1.5px solid #e5e5e5',
                        padding: '20px',
                        opacity: slot.isIncluded ? 1 : 0.55,
                        transition: 'all 0.2s',
                      }}
                    >
                      {/* Slot header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: slot.isIncluded ? '16px' : '0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {slot.selectedProduct && slot.isIncluded
                            ? <CheckCircle2 size={20} color="#22c55e" />
                            : slot.loading
                              ? <div style={{ width: 20, height: 20, borderRadius: '50%', border: '3px solid #22c55e', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                              : <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #ddd' }} />
                          }
                          <span style={{ fontWeight: '900', fontSize: '1rem' }}>{slot.category}</span>
                          {slot.availableProducts.length === 0 && !slot.loading && (
                            <span style={{ fontSize: '0.75rem', color: '#f97316', fontWeight: '700', background: '#fff7ed', padding: '2px 8px', borderRadius: '6px' }}>
                              لا توجد منتجات
                            </span>
                          )}
                          {slot.availableProducts.length > 0 && !slot.loading && (
                            <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: '700', background: '#f0fdf4', padding: '2px 8px', borderRadius: '6px' }}>
                              {slot.availableProducts.length} منتج
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => toggleSlot(idx)}
                          title={slot.isIncluded ? 'إزالة من الطقم' : 'إضافة للطقم'}
                          style={{
                            background: slot.isIncluded ? '#fee2e2' : '#f0fdf4',
                            color: slot.isIncluded ? '#dc2626' : '#16a34a',
                            border: 'none', borderRadius: '8px',
                            padding: '6px 12px', cursor: 'pointer',
                            fontWeight: '700', fontSize: '0.8rem',
                            display: 'flex', alignItems: 'center', gap: '5px',
                          }}
                        >
                          {slot.isIncluded
                            ? <><Trash2 size={13} /> إزالة</>
                            : <><CheckCircle2 size={13} /> إضافة</>
                          }
                        </button>
                      </div>

                      {/* Slot inputs */}
                      {slot.isIncluded && (
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: slot.subcategories.length > 0 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
                          gap: '12px',
                        }}>
                          {/* Subcategory */}
                          {slot.subcategories.length > 0 && (
                            <div>
                              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#666', marginBottom: '5px' }}>النوع / الفيسكوزيتي</label>
                              <Select
                                instanceId={`subcat-${idx}`}
                                options={slot.subcategories.map((s: string) => ({ value: s, label: s }))}
                                styles={customSelectStyles}
                                placeholder="اختر النوع"
                                isRtl={true}
                                value={slot.selectedSubcat ? { value: slot.selectedSubcat, label: slot.selectedSubcat } : null}
                                onChange={(opt: any) => handleSubcatChange(idx, opt?.value ?? null)}
                                isClearable
                              />
                            </div>
                          )}

                          {/* Brand */}
                          <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#666', marginBottom: '5px' }}>العلامة التجارية</label>
                            <Select
                              instanceId={`brand-${idx}`}
                              options={slot.availableBrands}
                              styles={customSelectStyles}
                              placeholder={slot.loading ? 'جاري التحميل...' : slot.availableBrands.length === 0 ? 'لا توجد منتجات' : 'اختر العلامة'}
                              isRtl={true}
                              value={slot.selectedBrand}
                              onChange={(opt: any) => handleBrandChange(idx, opt)}
                              isDisabled={slot.loading || slot.availableBrands.length === 0}
                              isClearable
                              noOptionsMessage={() => 'لا توجد علامات تجارية'}
                            />
                          </div>

                          {/* Product */}
                          <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#666', marginBottom: '5px' }}>المنتج</label>
                            <Select
                              instanceId={`product-${idx}`}
                              options={productOptions}
                              styles={customSelectStyles}
                              placeholder="اختر المنتج"
                              isRtl={true}
                              value={slot.selectedProduct
                                ? productOptions.find((o: any) => o.value === slot.selectedProduct.id) ?? null
                                : null
                              }
                              onChange={(opt: any) => handleProductChange(idx, opt?.product ?? null)}
                              isDisabled={slot.loading || productOptions.length === 0}
                              isClearable
                              noOptionsMessage={() => 'اختر العلامة التجارية أولاً'}
                            />
                          </div>
                        </div>
                      )}

                      {/* Price tag */}
                      {slot.isIncluded && slot.selectedProduct && (
                        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.82rem', color: '#888' }}>السعر الأصلي:</span>
                          <span style={{ textDecoration: 'line-through', color: '#bbb', fontSize: '0.85rem' }}>
                            {slot.selectedProduct.sale_price > 0 ? slot.selectedProduct.sale_price : slot.selectedProduct.regular_price} ج.م
                          </span>
                          <span style={{ color: '#22c55e', fontWeight: '900', fontSize: '1rem' }}>
                            {(
                              (slot.selectedProduct.sale_price > 0
                                ? slot.selectedProduct.sale_price
                                : slot.selectedProduct.regular_price) *
                              (1 - DISCOUNT / 100)
                            ).toFixed(0)} ج.م
                          </span>
                          <span style={{ background: '#fef9c3', color: '#854d0e', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800' }}>
                            خصم {DISCOUNT}%
                          </span>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* BUNDLE SUMMARY */}
              {includedSlots.length >= 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
                    borderRadius: '20px', padding: '28px',
                    position: 'sticky', bottom: '20px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginBottom: '4px' }}>
                        إجمالي الطقم ({includedSlots.length} قطع)
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '2rem', fontWeight: '900', color: '#22c55e' }}>
                          {totalDiscounted.toFixed(0)} ج.م
                        </span>
                        <div>
                          <span style={{ textDecoration: 'line-through', color: 'rgba(255,255,255,0.4)', fontSize: '1rem', display: 'block' }}>
                            {totalOriginal.toFixed(0)} ج.م
                          </span>
                          <span style={{ color: '#fbbf24', fontWeight: '800', fontSize: '0.85rem' }}>
                            وفرت {savings.toFixed(0)} ج.م
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                      {!canAddToCart && (
                        <p style={{ color: '#f87171', fontSize: '0.8rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <AlertCircle size={14} />
                          اختر منتجين على الأقل للحصول على الخصم
                        </p>
                      )}
                      <button
                        onClick={addBundleToCart}
                        disabled={!canAddToCart}
                        style={{
                          padding: '16px 32px',
                          background: canAddToCart
                            ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                            : '#555',
                          color: '#fff', border: 'none', borderRadius: '14px',
                          fontWeight: '900', fontSize: '1.05rem',
                          cursor: canAddToCart ? 'pointer' : 'not-allowed',
                          display: 'flex', alignItems: 'center', gap: '10px',
                          boxShadow: canAddToCart ? '0 6px 20px rgba(34,197,94,0.4)' : 'none',
                          transition: 'all 0.2s',
                        }}
                      >
                        <ShoppingCart size={22} />
                        أضف الطقم للسلة — {totalDiscounted.toFixed(0)} ج.م
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {!carSelected && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#aaa' }}>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            <Car size={70} color="#ddd" style={{ margin: '0 auto 16px' }} />
            <p style={{ fontWeight: '700', fontSize: '1.1rem' }}>اختر ماركة وموديل وسنة سيارتك أولاً</p>
            <p style={{ fontSize: '0.9rem', marginTop: '8px' }}>سيتم عرض قطع الصيانة المتوفرة لسيارتك تلقائياً</p>
          </div>
        )}

      </div>
    </div>
  );
}
