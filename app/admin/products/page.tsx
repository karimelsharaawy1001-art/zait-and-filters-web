'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';

// Searchable dropdown (react-select) — same lib the store uses.
const Select: any = dynamic(() => import('react-select'), { ssr: false });
// Creatable variant — lets you type a NEW value (new brand/category/car…).
const Creatable: any = dynamic(() => import('react-select/creatable'), { ssr: false });

function generateSlug(name: string, brand: string, carMake: string, carModel: string): string {
  const raw = `${brand}-${carMake}-${carModel}`.toLowerCase()
    .replace(/[^a-zA-Z0-9\-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return `${raw || 'product'}-${Math.random().toString(36).substring(2, 9)}`;
}

// One row of product fields — reused for quick-add and inline edit.
function ProductForm({ initial, categories, brands, makes, models, onSubmit, onCancel, submitLabel, busy }: {
  initial?: any; categories: string[]; subcategories?: string[]; brands: string[]; makes: string[]; models: string[];
  onSubmit: (v: any) => void; onCancel?: () => void; submitLabel: string; busy?: boolean;
}) {
  const [f, setF] = useState(() => ({
    name: initial?.name || '', category: initial?.category || '', subcategory: initial?.subcategory || '',
    brand: initial?.brand || '', car_make: initial?.car_make || '', car_model: initial?.car_model || '',
    car_model_year: initial?.car_model_year || '',
    regular_price: initial?.regular_price != null ? String(initial.regular_price) : '',
    sale_price: initial?.sale_price != null ? String(initial.sale_price) : '',
    image_url: initial?.image_url || '',
  }));
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  // Subcategories depend on the category chosen IN this form — fetch them live.
  const [subcategories, setSubcategories] = useState<string[]>(initial?.subcategory ? [initial.subcategory] : []);
  useEffect(() => {
    if (!f.category) { setSubcategories([]); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('products').select('subcategory').eq('category', f.category);
      if (!cancelled && data) {
        setSubcategories(Array.from(new Set(data.map((i: any) => i.subcategory).filter(Boolean))).sort() as string[]);
      }
    })();
    return () => { cancelled = true; };
  }, [f.category]);
  const opt = (v: string) => (v ? { value: v, label: v } : null);
  const cs: any = { control: (b: any, s: any) => ({ ...b, minHeight: '38px', borderColor: s.isFocused ? '#22c55e' : '#d1d5db', boxShadow: 'none', fontSize: '0.82rem' }), menu: (b: any) => ({ ...b, zIndex: 40, fontSize: '0.82rem' }), option: (b: any, s: any) => ({ ...b, backgroundColor: s.isSelected ? '#22c55e' : s.isFocused ? '#f0fdf4' : '#fff', color: s.isSelected ? '#fff' : '#1a1a1a' }) };
  const inp: any = { width: '100%', padding: '9px 10px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' };
  const wrap: any = { display: 'flex', flexDirection: 'column', gap: '3px' };
  const lab: any = { fontSize: '0.68rem', fontWeight: '800', color: '#6b7280' };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', alignItems: 'end' }}>
      <div style={{ ...wrap, gridColumn: '1 / -1' }}><span style={lab}>اسم المنتج *</span><input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="اسم المنتج" style={inp} /></div>
      <div style={{ ...wrap, gridColumn: '1 / -1' }}>
        <span style={lab}>🔗 رابط الصورة</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input dir="ltr" value={f.image_url} onChange={(e) => set('image_url', e.target.value)} placeholder="https://..." style={inp} />
          <div style={{ width: '40px', height: '40px', flexShrink: 0, borderRadius: '8px', overflow: 'hidden', border: '1px solid #d1d5db', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {f.image_url ? <img src={f.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span style={{ fontSize: '1rem' }}>📦</span>}
          </div>
        </div>
      </div>
      <div style={wrap}><span style={lab}>القسم الرئيسي</span><Creatable isClearable placeholder="اختر/أضف" formatCreateLabel={(v: string) => `إضافة "${v}"`} styles={cs} options={categories.map((c) => ({ value: c, label: c }))} value={opt(f.category)} onChange={(o: any) => set('category', o?.value || '')} /></div>
      <div style={wrap}><span style={lab}>القسم الفرعي</span><Creatable isClearable placeholder="اختر/أضف" formatCreateLabel={(v: string) => `إضافة "${v}"`} styles={cs} options={subcategories.map((c) => ({ value: c, label: c }))} value={opt(f.subcategory)} onChange={(o: any) => set('subcategory', o?.value || '')} /></div>
      <div style={wrap}><span style={lab}>العلامة التجارية</span><Creatable isClearable placeholder="اختر/أضف" formatCreateLabel={(v: string) => `إضافة "${v}"`} styles={cs} options={brands.map((c) => ({ value: c, label: c }))} value={opt(f.brand)} onChange={(o: any) => set('brand', o?.value || '')} /></div>
      <div style={wrap}><span style={lab}>الماركة (السيارة)</span><Creatable isClearable placeholder="اختر/أضف" formatCreateLabel={(v: string) => `إضافة "${v}"`} styles={cs} options={makes.map((c) => ({ value: c, label: c }))} value={opt(f.car_make)} onChange={(o: any) => set('car_make', o?.value || '')} /></div>
      <div style={wrap}><span style={lab}>الموديل</span><Creatable isClearable placeholder="اختر/أضف" formatCreateLabel={(v: string) => `إضافة "${v}"`} styles={cs} options={models.map((c) => ({ value: c, label: c }))} value={opt(f.car_model)} onChange={(o: any) => set('car_model', o?.value || '')} /></div>
      <div style={wrap}><span style={lab}>السنة</span><input value={f.car_model_year} onChange={(e) => set('car_model_year', e.target.value)} placeholder="2015-2024 أو عام" style={inp} /></div>
      <div style={wrap}><span style={lab}>السعر الأساسي *</span><input type="number" value={f.regular_price} onChange={(e) => set('regular_price', e.target.value)} placeholder="0" style={inp} /></div>
      <div style={wrap}><span style={lab}>سعر الخصم</span><input type="number" value={f.sale_price} onChange={(e) => set('sale_price', e.target.value)} placeholder="—" style={{ ...inp, borderColor: '#22c55e' }} /></div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={() => onSubmit(f)} disabled={busy} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '9px 18px', background: busy ? '#9ca3af' : '#22c55e', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '800', fontSize: '0.82rem', cursor: busy ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} {submitLabel}
        </button>
        {onCancel && <button onClick={onCancel} style={{ padding: '9px 14px', background: '#f3f4f6', color: '#6b7280', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.82rem', cursor: 'pointer' }}>إلغاء</button>}
      </div>
    </div>
  );
}

const toOpts = (arr: string[]) => arr.map((x) => ({ value: x, label: x }));
const searchableSelectStyles: any = {
  control: (b: any, s: any) => ({ ...b, minHeight: '40px', backgroundColor: '#fff', borderColor: s.isFocused ? '#22c55e' : '#d1d5db', boxShadow: s.isFocused ? '0 0 0 3px rgba(34,197,94,0.15)' : 'none', borderRadius: '8px', fontSize: '0.85rem', '&:hover': { borderColor: '#22c55e' } }),
  menu: (b: any) => ({ ...b, zIndex: 30, fontSize: '0.85rem' }),
  option: (b: any, s: any) => ({ ...b, backgroundColor: s.isSelected ? '#22c55e' : s.isFocused ? '#f0fdf4' : '#fff', color: s.isSelected ? '#fff' : '#1a1a1a', cursor: 'pointer' }),
  singleValue: (b: any) => ({ ...b, color: '#1a1a1a' }),
  placeholder: (b: any) => ({ ...b, color: '#9ca3af' }),
};

// A searchable filter dropdown that behaves like the old <select>.
function FilterSelect({ value, onChange, options, placeholder = 'الكل', disabled = false, instanceId }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
  placeholder?: string; disabled?: boolean; instanceId: string;
}) {
  const selected = options.find((o) => o.value === value) || null;
  return (
    <Select
      instanceId={instanceId}
      isDisabled={disabled}
      isClearable
      isSearchable
      placeholder={placeholder}
      noOptionsMessage={() => 'لا توجد نتائج'}
      options={options}
      value={selected}
      onChange={(opt: any) => onChange(opt?.value ?? '')}
      styles={searchableSelectStyles}
    />
  );
}
import {
  Eye,
  Edit3,
  DollarSign,
  Trash2,
  Check,
  X,
  Loader2,
  FileDown,
  FileUp,
  ClipboardList,
  CheckSquare,
  Square,
  Minus,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
} from 'lucide-react';


const PAGE_SIZE_OPTIONS = [20, 50, 100, 200, 'الكل'] as const;
const ALL_PAGE_SIZE = 100000;


// ── Confirmation Modal ────────────────────────────────────────────────────────
function ConfirmModal({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        direction: 'rtl',
      }}
    >
      <div
        style={{
          backgroundColor: '#e5e7eb',
          border: '1px solid #22c55e44',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '420px',
          width: '90%',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.06)',
        }}
      >
        <AlertTriangle size={48} color="#22c55e" style={{ margin: '0 auto 16px' }} />
        <p
          style={{
            color: '#fff',
            fontSize: '1rem',
            fontWeight: '700',
            lineHeight: '1.6',
            marginBottom: '28px',
          }}
        >
          {message}
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '12px 28px',
              backgroundColor: '#ffffff',
              color: '#6b7280',
              border: '1px solid #d1d5db',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '0.9rem',
            }}
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '12px 28px',
              backgroundColor: '#22c55e',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: '900',
              fontSize: '0.9rem',
            }}
          >
            تأكيد الحذف
          </button>
        </div>
      </div>
    </div>
  );
}


export default function AdminProducts() {
  const router = useRouter();
  const searchParams = useSearchParams();


  const [products, setProducts] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);


  // ── Read initial filter state from URL ──
  const [currentPage, setCurrentPage] = useState(() => Number(searchParams.get('page') || 1));
  const [searchName, setSearchName] = useState(() => searchParams.get('name') || '');
  // ── NEW: search by ID ──
  const [searchId, setSearchId] = useState(() => searchParams.get('id') || '');
const [searchSku, setSearchSku] = useState(() => searchParams.get('sku') || '');
  const [filterMake, setFilterMake] = useState(() => searchParams.get('make') || '');
  const [filterModel, setFilterModel] = useState(() => searchParams.get('model') || '');
  const [filterCategory, setFilterCategory] = useState(() => searchParams.get('category') || '');
  const [filterSubcategory, setFilterSubcategory] = useState(() => searchParams.get('subcategory') || '');
  const [filterYear, setFilterYear] = useState(() => searchParams.get('year') || '');
  const [filterBrand, setFilterBrand] = useState(() => searchParams.get('brand') || '');
  const [filterImage, setFilterImage] = useState<'' | 'with' | 'without'>(() => (searchParams.get('image') as '' | 'with' | 'without') || '');
  const [filterStatus, setFilterStatus] = useState<'' | 'active' | 'inactive'>(() => (searchParams.get('status') as '' | 'active' | 'inactive') || '');
  const [sortBy, setSortBy] = useState(() => searchParams.get('sortBy') || 'created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc');


  const [availableMakes, setAvailableMakes] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableSubcategories, setAvailableSubcategories] = useState<string[]>([]);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);


  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ regular_price: '', sale_price: '' });
  const [imageEdits, setImageEdits] = useState<Record<string, string>>({});
  const [savingImageId, setSavingImageId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<number>(20);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [expandedEditId, setExpandedEditId] = useState<string | null>(null);
  const [savingForm, setSavingForm] = useState(false);

  async function addProductQuick(v: any) {
    if (!v.name.trim()) { toast.error('اكتب اسم المنتج'); return; }
    const reg = Number(v.regular_price);
    if (!v.regular_price || isNaN(reg)) { toast.error('اكتب السعر الأساسي'); return; }
    setSavingForm(true);
    const row = {
      name: v.name.trim(), brand: v.brand || null, category: v.category || null, subcategory: v.subcategory || null,
      car_make: v.car_make || 'عام', car_model: v.car_model || 'عام', car_model_year: v.car_model_year || 'عام',
      regular_price: reg, sale_price: v.sale_price ? Number(v.sale_price) : null,
      image_url: v.image_url?.trim() || null,
      slug: generateSlug(v.name, v.brand || '', v.car_make || '', v.car_model || ''), is_active: true,
    };
    const { error } = await supabase.from('products').insert([row]);
    setSavingForm(false);
    if (error) { toast.error('فشل الإضافة: ' + error.message); return; }
    toast.success('تمت إضافة المنتج ✅');
    setShowQuickAdd(false);
    fetchProducts();
    fetchUniqueValues('car_make', setAvailableMakes);
    fetchUniqueValues('category', setAvailableCategories);
    fetchUniqueValues('brand', setAvailableBrands);
  }

  async function updateProductQuick(id: string, v: any) {
    if (!v.name.trim()) { toast.error('اكتب اسم المنتج'); return; }
    const reg = Number(v.regular_price);
    if (!v.regular_price || isNaN(reg)) { toast.error('اكتب السعر الأساسي'); return; }
    setSavingForm(true);
    const patch = {
      name: v.name.trim(), brand: v.brand || null, category: v.category || null, subcategory: v.subcategory || null,
      car_make: v.car_make || null, car_model: v.car_model || null, car_model_year: v.car_model_year || null,
      regular_price: reg, sale_price: v.sale_price ? Number(v.sale_price) : null,
      image_url: v.image_url?.trim() || null,
    };
    const { error } = await supabase.from('products').update(patch).eq('id', id);
    setSavingForm(false);
    if (error) { toast.error('فشل الحفظ: ' + error.message); return; }
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    setExpandedEditId(null);
    toast.success('تم حفظ التعديلات ✅');
  }
  const [priceEdits, setPriceEdits] = useState<Record<string, { r: string; s: string }>>({});
  const [savingPriceId, setSavingPriceId] = useState<string | null>(null);

  const getPrice = (p: any) => priceEdits[p.id] ?? { r: p.regular_price != null ? String(p.regular_price) : '', s: p.sale_price != null ? String(p.sale_price) : '' };
  const priceDirty = (p: any) => {
    const e = priceEdits[p.id]; if (!e) return false;
    return e.r !== (p.regular_price != null ? String(p.regular_price) : '') || e.s !== (p.sale_price != null ? String(p.sale_price) : '');
  };
  async function saveInlinePrice(id: string) {
    const e = priceEdits[id]; if (!e) return;
    const reg = e.r.trim() === '' ? null : Number(e.r);
    const sale = e.s.trim() === '' ? null : Number(e.s);
    if (reg == null || isNaN(reg)) { toast.error('أدخل سعرًا أساسيًا صحيحًا'); return; }
    if (sale != null && isNaN(sale)) { toast.error('سعر الخصم غير صحيح'); return; }
    setSavingPriceId(id);
    const { error } = await supabase.from('products').update({ regular_price: reg, sale_price: sale }).eq('id', id);
    setSavingPriceId(null);
    if (error) { toast.error('فشل تحديث السعر'); return; }
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, regular_price: reg, sale_price: sale } : p)));
    setPriceEdits((prev) => { const n = { ...prev }; delete n[id]; return n; });
    toast.success('تم تحديث السعر ✅');
  }
  function renderInlinePrice(product: any) {
    const val = getPrice(product);
    const dirty = priceDirty(product);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <input type="number" placeholder="الأساسي" value={val.r}
            onChange={(e) => setPriceEdits((prev) => ({ ...prev, [product.id]: { ...getPrice(product), r: e.target.value } }))}
            onKeyDown={(e) => { if (e.key === 'Enter' && dirty) saveInlinePrice(product.id); }}
            style={{ ...miniInputStyle, width: '78px' }} />
          <input type="number" placeholder="الخصم" value={val.s}
            onChange={(e) => setPriceEdits((prev) => ({ ...prev, [product.id]: { ...getPrice(product), s: e.target.value } }))}
            onKeyDown={(e) => { if (e.key === 'Enter' && dirty) saveInlinePrice(product.id); }}
            style={{ ...miniInputStyle, width: '78px', borderColor: '#22c55e' }} />
        </div>
        <button onClick={() => saveInlinePrice(product.id)} disabled={!dirty || savingPriceId === product.id}
          title="حفظ السعر"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', flexShrink: 0, border: 'none', borderRadius: '6px', cursor: (!dirty || savingPriceId === product.id) ? 'not-allowed' : 'pointer', background: dirty ? '#22c55e' : '#e5e7eb', color: '#fff' }}>
          {savingPriceId === product.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
        </button>
      </div>
    );
  }

  async function handleUpdateImage(id: string) {
    const url = (imageEdits[id] ?? '').trim();
    setSavingImageId(id);
    const { error } = await supabase.from('products').update({ image_url: url || null }).eq('id', id);
    setSavingImageId(null);
    if (error) { toast.error('فشل حفظ رابط الصورة'); return; }
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, image_url: url || null } : p)));
    setImageEdits((prev) => { const n = { ...prev }; delete n[id]; return n; });
    toast.success('تم حفظ رابط الصورة ✅');
  }


  // ── MULTI-SELECT STATE ──
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);


  // ── MODAL STATE ──
  const [modal, setModal] = useState<{ message: string; onConfirm: () => void } | null>(null);


  // ── IMPORT PROGRESS ──
  const [importing, setImporting] = useState(false);


  // ── Sync filters to URL whenever they change ──────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams();
    if (currentPage > 1) params.set('page', String(currentPage));
    if (searchName) params.set('name', searchName);
    if (searchId) params.set('id', searchId);
if (searchSku) params.set('sku', searchSku);
    if (filterMake) params.set('make', filterMake);
    if (filterModel) params.set('model', filterModel);
    if (filterCategory) params.set('category', filterCategory);
    if (filterSubcategory) params.set('subcategory', filterSubcategory);
    if (filterYear) params.set('year', filterYear);
    if (filterBrand) params.set('brand', filterBrand);
    if (filterImage) params.set('image', filterImage);
    if (filterStatus) params.set('status', filterStatus);
    if (sortBy !== 'created_at') params.set('sortBy', sortBy);
    if (sortOrder !== 'desc') params.set('sortOrder', sortOrder);


    const newUrl = params.toString()
      ? `/admin/products?${params.toString()}`
      : '/admin/products';


    router.replace(newUrl, { scroll: false });
  }, [currentPage, searchName, searchId, searchSku, filterMake, filterModel, filterCategory, filterSubcategory, filterYear, filterBrand, filterImage, filterStatus, sortBy, sortOrder]);


  useEffect(() => {
    fetchUniqueValues('car_make', setAvailableMakes);
    fetchUniqueValues('category', setAvailableCategories);
    fetchUniqueValues('brand', setAvailableBrands);
  }, []);



  useEffect(() => {
    if (filterMake) {
      fetchUniqueValues('car_model', setAvailableModels, 'car_make', filterMake);
    } else {
      setAvailableModels([]);
      setFilterModel('');
    }
  }, [filterMake]);


  useEffect(() => {
    if (filterCategory) {
      fetchUniqueValues('subcategory', setAvailableSubcategories, 'category', filterCategory);
    } else {
      setAvailableSubcategories([]);
      setFilterSubcategory('');
    }
  }, [filterCategory]);


  useEffect(() => {
    fetchProducts();
  }, [
    currentPage,
    searchName,
    searchId,
    searchSku,
    filterMake,
    filterModel,
    filterCategory,
    filterSubcategory,
    filterYear,
    filterBrand,
    filterImage,
    filterStatus,
    sortBy,
    sortOrder,
    pageSize,
  ]);


  useEffect(() => {
    setSelectedIds(new Set());
  }, [currentPage, filterMake, filterModel, filterCategory, filterSubcategory, filterYear, filterBrand]);


  async function fetchUniqueValues(
    column: string,
    setter: (vals: string[]) => void,
    filterCol?: string,
    filterVal?: string,
  ) {
    let query = supabase.from('products').select(column);
    if (filterCol && filterVal) query = query.eq(filterCol, filterVal);
    const { data } = await query;
    if (data) {
      const uniqueValues = Array.from(
        new Set(data.map((i: any) => i[column]).filter(Boolean)),
      ) as string[];
      setter(uniqueValues.sort());
    }
  }


  const buildFilteredQuery = () => {
    let query = supabase.from('products').select('*', { count: 'exact' });
    if (searchName) query = query.ilike('name', `%${searchName}%`);
    if (searchId) query = query.ilike('id', `%${searchId}%`);
if (searchSku) query = query.ilike('sku', `%${searchSku}%`);
    if (filterMake === '__universal__') {
      query = query.or('car_make.is.null,car_make.eq.');
    } else if (filterMake) {
      query = query.eq('car_make', filterMake);
    }
    if (filterModel) query = query.eq('car_model', filterModel);
    if (filterCategory) query = query.eq('category', filterCategory);
    if (filterSubcategory) query = query.eq('subcategory', filterSubcategory);
    if (filterYear) query = query.ilike('car_model_year', `%${filterYear}%`);
    if (filterBrand) query = query.eq('brand', filterBrand);
    if (filterImage === 'with') query = query.not('image_url', 'is', null).neq('image_url', '');
    if (filterImage === 'without') query = query.or('image_url.is.null,image_url.eq.');
    if (filterStatus === 'active') query = query.eq('is_active', true);
    if (filterStatus === 'inactive') query = query.eq('is_active', false);
    return query;
  };


  async function fetchProducts() {
    setLoading(true);
    let query = buildFilteredQuery();
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);
    const { data, count } = await query;
    if (data) setProducts(data);
    if (typeof count === 'number') setTotalCount(count);
    setLoading(false);
  }


  const toggleStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('products')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    if (!error) {
      setProducts(products.map((p) => (p.id === id ? { ...p, is_active: !currentStatus } : p)));
    }
  };


  const handleUpdatePrice = async (id: string) => {
    const { error } = await supabase
      .from('products')
      .update({
        regular_price: parseFloat(editData.regular_price),
        sale_price: editData.sale_price ? parseFloat(editData.sale_price) : null,
      })
      .eq('id', id);
    if (!error) {
      setProducts(products.map((p) => (p.id === id ? { ...p, ...editData } : p)));
      setEditingId(null);
      toast.success('تم تحديث السعر');
    }
  };


  // ── DELETE SINGLE with modal ──────────────────────────────────────────────
  const deleteProduct = (id: string) => {
    setModal({
      message:
        'هل أنت متأكد من حذف هذا المنتج نهائياً؟ لا يمكن التراجع عن هذا الإجراء.',
      onConfirm: async () => {
        setModal(null);
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) {
          toast.error('حدث خطأ أثناء الحذف: ' + error.message);
        } else {
          toast.success('تم حذف المنتج');
          fetchProducts();
        }
      },
    });
  };


  // ── MULTI-SELECT HANDLERS ─────────────────────────────────────────────────
  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };


  const isAllSelected = products.length > 0 && products.every((p) => selectedIds.has(p.id));
  const isPartialSelected =
    products.some((p) => selectedIds.has(p.id)) && !isAllSelected;


  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        products.forEach((p) => next.delete(p.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        products.forEach((p) => next.add(p.id));
        return next;
      });
    }
  };


  // ── BULK DELETE with modal ────────────────────────────────────────────────
  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setModal({
      message: `هل أنت متأكد من حذف ${selectedIds.size} منتج نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`,
      onConfirm: async () => {
        setModal(null);
        setBulkDeleting(true);
        const idsArray = Array.from(selectedIds);
        const { error } = await supabase.from('products').delete().in('id', idsArray);
        setBulkDeleting(false);
        if (error) {
          toast.error('حدث خطأ أثناء الحذف: ' + error.message);
        } else {
          toast.success(`تم حذف ${idsArray.length} منتج بنجاح`);
          setSelectedIds(new Set());
          fetchProducts();
        }
      },
    });
  };


  // ── EXPORT ───────────────────────────────────────────────────────────────
  const exportToCSV = async () => {
    setLoading(true);
    let exportQuery = supabase.from('products').select('id,sku,name,brand,category,subcategory,car_make,car_model,car_model_year,regular_price,sale_price,warranty,is_active,country_of_origin,image_url');
    if (searchName) exportQuery = exportQuery.ilike('name', `%${searchName}%`);
    if (searchSku) exportQuery = exportQuery.ilike('sku', `%${searchSku}%`);
    if (filterMake === '__universal__') { exportQuery = exportQuery.or('car_make.is.null,car_make.eq.'); }
    else if (filterMake) { exportQuery = exportQuery.eq('car_make', filterMake); }
    if (filterModel) exportQuery = exportQuery.eq('car_model', filterModel);
    if (filterCategory) exportQuery = exportQuery.eq('category', filterCategory);
    if (filterSubcategory) exportQuery = exportQuery.eq('subcategory', filterSubcategory);
    if (filterYear) exportQuery = exportQuery.ilike('car_model_year', `%${filterYear}%`);
    if (filterBrand) exportQuery = exportQuery.eq('brand', filterBrand);
    const { data } = await exportQuery;
    if (!data || data.length === 0) {
      toast.error('لا توجد منتجات مطابقة للفلاتر الحالية لتصديرها');
      setLoading(false);
      return;
    }
    const safe = (val: any) =>
      val === null || val === undefined ? '' : String(val);
    const headers =
      'ID,sku,name,brand,category,subcategory,car_make,car_model,car_model_year,regular_price,sale_price,warranty,is_active,country_of_origin,image_url,delete\n';
    const rows = data
      .map((p: any) =>
        [
          `"${safe(p.id)}"`,
          `"${safe(p.sku)}"`,
          `"${safe(p.name)}"`,
          `"${safe(p.brand)}"`,
          `"${safe(p.category)}"`,
          `"${safe(p.subcategory)}"`,
          `"${safe(p.car_make)}"`,
          `"${safe(p.car_model)}"`,
          `"${safe(p.car_model_year)}"`,
          safe(p.regular_price),
          safe(p.sale_price),
          `"${safe(p.warranty)}"`,
          p.is_active ? 1 : 0,
          `"${safe(p.country_of_origin)}"`,
          `"${safe(p.image_url)}"`,
          '0',
        ].join(','),
      )
      .join('\n');
    const csvContent = '\uFEFF' + headers + rows;
    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `مخزن_مصدر_${new Date().toLocaleDateString('ar-EG')}.csv`;
    link.click();
    setLoading(false);
    toast.success(`تم تصدير ${data.length} منتج`);
  };


  const downloadTemplate = () => {
    const headers =
      'ID,sku,name,brand,category,subcategory,car_make,car_model,car_model_year,regular_price,sale_price,warranty,is_active,country_of_origin,image_url,delete\n';
    const example =
      ',,تيل فرامل صني,Hi-Q,فرامل,تيل,نيسان,صني,2015-2024,1200,1100,6,1,كوري,https://res.cloudinary.com/example.jpg,0';
    const csvContent = '\uFEFF' + headers + example;
    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'قالب_المنتجات.csv';
    link.click();
  };


  // ── IMPORT ───────────────────────────────────────────────────────────────
  const handleImport = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = async (event: any) => {
      const text = event.target.result;
      const lines = text.split('\n').slice(1);
      const imported: any[] = [];

      for (const line of lines) {
        if (!line.trim()) continue;
        const cols: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            cols.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        cols.push(current.trim());
        if (cols.length < 6 || !cols[2]) continue;

        let warrantyVal = cols[11];
        if (warrantyVal && !isNaN(Number(warrantyVal))) {
          warrantyVal = `${warrantyVal} شهور`;
        }

        imported.push({
          id: cols[0],
          sku: cols[1] || null,
          name: cols[2],
          brand: cols[3],
          category: cols[4],
          subcategory: cols[5],
          car_make: cols[6],
          car_model: cols[7],
          car_model_year: cols[8],
          regular_price: parseFloat(cols[9]),
          sale_price: cols[10] ? parseFloat(cols[10]) : null,
          warranty: warrantyVal,
          is_active: cols[12] === '1' || cols[12]?.toLowerCase() === 'true',
          country_of_origin: cols[13],
          image_url: cols[14],
          delete: cols[15],
        });
      } // ← closes the for loop

      if (imported.length === 0) {
        toast.error('لم يتم العثور على منتجات صالحة في الملف');
        return;
      }

      setImporting(true);
      const IMPORT_BATCH = 500;
      const totalBatches = Math.ceil(imported.length / IMPORT_BATCH);
      const importToast = toast.loading(`جاري استيراد ${imported.length} منتج (${totalBatches} دفعة)...`);

      let totalUpdated = 0;
      let totalInserted = 0;
      let totalErrors = 0;

      try {
        for (let i = 0; i < imported.length; i += IMPORT_BATCH) {
          const batch = imported.slice(i, i + IMPORT_BATCH);
          const batchNum = Math.floor(i / IMPORT_BATCH) + 1;
          toast.loading(`دفعة ${batchNum} من ${totalBatches} (${batch.length} منتج)...`, { id: importToast });

          const res = await fetch('/api/admin/import-products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ products: batch }),
          });

          // Guard against non-JSON (413, 500 HTML pages, etc.)
          const contentType = res.headers.get('content-type') || '';
          if (!contentType.includes('application/json')) {
            totalErrors++;
            toast.error(`خطأ في الدفعة ${batchNum}: الـ server رجّع ${res.status} (${res.statusText})`, { duration: 4000 });
            continue;
          }

          const result = await res.json();
          if (result.error) {
            totalErrors++;
            toast.error(`خطأ في الدفعة ${batchNum}: ${result.error}`, { duration: 4000 });
          } else {
            totalUpdated  += result.updateCount  || 0;
            totalInserted += result.insertCount  || 0;
            totalErrors   += result.errorCount   || 0;
          }
        }

        toast.dismiss(importToast);
        setImporting(false);

        toast.success(`✅ تحديث ${totalUpdated} | إضافة ${totalInserted}${totalErrors > 0 ? ` | ⚠️ ${totalErrors} أخطاء` : ''}`, { duration: 6000 });
        fetchProducts();

      } catch (err: any) {
        toast.dismiss(importToast);
        setImporting(false);
        toast.error('خطأ في الاتصال: ' + err.message);
      }
    }; // ← closes reader.onload

    reader.readAsText(file);
  };


  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const renderSortIcon = (column: string) => {
    if (sortBy !== column) return <ArrowUpDown size={14} color="#6b7280" style={{ marginRight: '4px', verticalAlign: 'middle' }} />;
    return sortOrder === 'asc'
      ? <ChevronUp size={14} color="#2ecc71" style={{ marginRight: '4px', verticalAlign: 'middle' }} />
      : <ChevronDown size={14} color="#2ecc71" style={{ marginRight: '4px', verticalAlign: 'middle' }} />;
  };

  const sortableThStyle: any = { ...thStyle, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' };

  // ── Build the edit URL with current filters encoded as ?from=... ──────────
  const buildEditUrl = (productId: string) => {
    const params = new URLSearchParams();
    if (currentPage > 1) params.set('page', String(currentPage));
    if (searchName) params.set('name', searchName);
    if (searchId) params.set('id', searchId); // ── NEW ──
    if (filterMake) params.set('make', filterMake);
    if (filterModel) params.set('model', filterModel);
    if (filterCategory) params.set('category', filterCategory);
    if (filterSubcategory) params.set('subcategory', filterSubcategory);
    if (filterYear) params.set('year', filterYear);
    if (filterBrand) params.set('brand', filterBrand);
    if (filterImage) params.set('image', filterImage);
    if (filterStatus) params.set('status', filterStatus);
    if (sortBy !== 'created_at') params.set('sortBy', sortBy);
    if (sortOrder !== 'desc') params.set('sortOrder', sortOrder);


    const returnUrl = params.toString()
      ? `/admin/products?${params.toString()}`
      : '/admin/products';


    return `/admin/products/edit/${productId}?returnUrl=${encodeURIComponent(returnUrl)}`;
  };


  return (
    <div style={{ direction: 'rtl', color: '#1a1a1a', fontFamily: 'sans-serif' }}>
      <style>{`
        @media (max-width: 640px) {
          .prod-desktop-table { display: none !important; }
          .prod-mobile-cards  { display: flex !important; }
          .prod-filters-grid  { grid-template-columns: 1fr 1fr !important; gap: 10px !important; padding: 14px !important; }
          .prod-header-btns   { flex-direction: column !important; width: 100%; }
          .prod-header-btns > * { width: 100%; justify-content: center; }
          .prod-pagination    { gap: 10px !important; }
        }
        @media (min-width: 641px) {
          .prod-mobile-cards { display: none !important; }
        }
        .prod-card { background: #ffffff; border: 1px solid #f9fafb; border-radius: 14px; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
        .prod-card-selected { border-color: #22c55e55 !important; background: rgba(34,197,94,0.06) !important; }
        .prod-card-row { display: flex; align-items: center; gap: 10px; }
        .prod-card-actions { display: grid; grid-template-columns: repeat(4, 1fr); border-top: 1px solid #f9fafb; padding-top: 10px; gap: 6px; }
        .prod-action-btn { display: flex; flex-direction: column; align-items: center; gap: 3px; font-size: 0.65rem; color: #9ca3af; background: #e5e7eb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 4px; cursor: pointer; text-decoration: none; transition: background 0.15s; }
        .prod-action-btn:active { background: #1a1a1a; }
      `}</style>

      {/* ── Confirmation Modal ── */}
      {modal && (
        <ConfirmModal
          message={modal.message}
          onConfirm={modal.onConfirm}
          onCancel={() => setModal(null)}
        />
      )}


      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <h1 style={{ color: '#2ecc71', fontWeight: '900', fontSize: 'clamp(1rem, 5vw, 1.5rem)', margin: 0 }}>إدارة المخزن ({totalCount})</h1>
        <div className="prod-header-btns" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={downloadTemplate} style={secondaryBtnStyle}>
            <ClipboardList size={16} /> القالب
          </button>
          <label
            style={{
              ...secondaryBtnStyle,
              opacity: importing ? 0.6 : 1,
              pointerEvents: importing ? 'none' : 'auto',
            }}
          >
            <FileUp size={16} /> {importing ? 'جاري الاستيراد...' : 'استيراد'}
            <input
              type="file"
              accept=".csv"
              onChange={handleImport}
              style={{ display: 'none' }}
            />
          </label>
          <button
            onClick={exportToCSV}
            disabled={loading}
            style={{ ...secondaryBtnStyle, backgroundColor: '#2ecc71', color: '#1a1a1a' }}
          >
            <FileDown size={16} /> {loading ? 'جاري التحميل...' : 'تصدير الفلتر الحالي'}
          </button>
        </div>
      </div>


      {/* Filters */}
      <div
        className="prod-filters-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '15px',
          marginBottom: '20px',
          backgroundColor: '#ffffff',
          padding: '20px',
          borderRadius: '12px',
        }}
      >
        <div>
          <label style={labelStyle}>بحث بالاسم</label>
          <input
            type="text"
            placeholder="ابحث..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchProducts()}
            style={filterInputStyle}
          />
        </div>
        {/* ── NEW: Search by ID ── */}
        <div>
  <label style={labelStyle}>بحث بالـ SKU</label>
  <input
    type="text"
    placeholder="1000001"
    value={searchSku}
    onChange={(e) => { setSearchSku(e.target.value); setCurrentPage(1); }}
    onKeyDown={(e) => e.key === 'Enter' && fetchProducts()}
    style={filterInputStyle}
  />
</div>
        <div>
          <label style={labelStyle}>القسم الرئيسي</label>
          <FilterSelect
            instanceId="filter-category"
            value={filterCategory}
            onChange={(v) => { setFilterCategory(v); setCurrentPage(1); }}
            options={toOpts(availableCategories)}
          />
        </div>
        <div>
          <label style={labelStyle}>القسم الفرعي</label>
          <FilterSelect
            instanceId="filter-subcategory"
            value={filterSubcategory}
            onChange={(v) => { setFilterSubcategory(v); setCurrentPage(1); }}
            options={toOpts(availableSubcategories)}
            disabled={!filterCategory}
          />
        </div>
        <div>
          <label style={labelStyle}>الماركة</label>
          <FilterSelect
            instanceId="filter-make"
            value={filterMake}
            onChange={(v) => { setFilterMake(v); setCurrentPage(1); }}
            options={[{ value: '__universal__', label: '🌐 عام (بدون سيارة)' }, ...toOpts(availableMakes)]}
          />
        </div>
        <div>
          <label style={labelStyle}>الموديل</label>
          <FilterSelect
            instanceId="filter-model"
            value={filterModel}
            onChange={(v) => { setFilterModel(v); setCurrentPage(1); }}
            options={toOpts(availableModels)}
            disabled={!filterMake}
          />
        </div>
        <div>
          <label style={labelStyle}>السنة</label>
          <input
            type="text"
            placeholder="2020"
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            style={filterInputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>العلامة التجارية</label>
          <FilterSelect
            instanceId="filter-brand"
            value={filterBrand}
            onChange={(v) => { setFilterBrand(v); setCurrentPage(1); }}
            options={toOpts(availableBrands)}
          />
        </div>
        <div>
          <label style={labelStyle}>الصورة</label>
          <select
            value={filterImage}
            onChange={(e) => {
              setFilterImage(e.target.value as '' | 'with' | 'without');
              setCurrentPage(1);
            }}
            style={filterInputStyle}
          >
            <option value="">الكل</option>
            <option value="with">📷 مع صور</option>
            <option value="without">📦 بدون صور</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>الحالة</label>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value as '' | 'active' | 'inactive');
              setCurrentPage(1);
            }}
            style={filterInputStyle}
          >
            <option value="">الكل</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>


      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div style={bulkBarStyle}>
          <span style={{ color: '#1a1a1a', fontWeight: '700', fontSize: '0.95rem' }}>
            تم تحديد{' '}
            <span style={{ color: '#22c55e', fontSize: '1.1rem' }}>{selectedIds.size}</span>{' '}
            منتج
          </span>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => setSelectedIds(new Set())}
              style={{ ...secondaryBtnStyle, color: '#6b7280' }}
            >
              <X size={15} /> إلغاء التحديد
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              style={{
                ...secondaryBtnStyle,
                backgroundColor: '#22c55e',
                color: '#fff',
                border: 'none',
              }}
            >
              <Trash2 size={15} />
              {bulkDeleting ? 'جاري الحذف...' : `حذف ${selectedIds.size} منتج`}
            </button>
          </div>
        </div>
      )}


      {/* ── Quick Add ── */}
      <div style={{ marginBottom: '16px' }}>
        <button
          onClick={() => setShowQuickAdd((s) => !s)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 20px', background: showQuickAdd ? '#f3f4f6' : 'linear-gradient(135deg,#22c55e,#16a34a)', color: showQuickAdd ? '#374151' : '#fff', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer' }}
        >
          {showQuickAdd ? <X size={18} /> : <Check size={18} />} {showQuickAdd ? 'إغلاق الإضافة السريعة' : '➕ إضافة منتج سريع'}
        </button>
        {showQuickAdd && (
          <div style={{ marginTop: '12px', background: '#fff', border: '2px solid #22c55e', borderRadius: '14px', padding: '18px' }}>
            <ProductForm
              categories={availableCategories} subcategories={availableSubcategories}
              brands={availableBrands} makes={availableMakes} models={availableModels}
              onSubmit={addProductQuick} submitLabel="إضافة المنتج" busy={savingForm}
            />
          </div>
        )}
      </div>

      {/* ── Desktop Table ── */}
      <div
        className="prod-desktop-table"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '15px',
          border: '1px solid #e5e7eb',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch' as any,
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', minWidth: '800px' }}>
          <thead>
            <tr style={{ backgroundColor: '#e5e7eb', color: '#2ecc71' }}>
              <th style={{ ...thStyle, width: '40px', textAlign: 'center' }}>
                <button
                  onClick={toggleSelectAll}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto',
                  }}
                  title={isAllSelected ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                >
                  {isAllSelected ? (
                    <CheckSquare size={20} color="#22c55e" />
                  ) : isPartialSelected ? (
                    <Minus
                      size={20}
                      color="#f1c40f"
                      style={{ border: '2px solid #f1c40f', borderRadius: '4px' }}
                    />
                  ) : (
                    <Square size={20} color="#6b7280" />
                  )}
                </button>
              </th>
              <th style={{ ...sortableThStyle }} onClick={() => handleSort('is_active')}>الحالة{renderSortIcon('is_active')}</th>
              <th style={{ ...sortableThStyle }} onClick={() => handleSort('name')}>الصورة والاسم{renderSortIcon('name')}</th>
              {/* ── NEW: ID column header ── */}
              <th style={{ ...sortableThStyle }} onClick={() => handleSort('id')}>ID{renderSortIcon('id')}</th>
<th style={{ ...sortableThStyle }} onClick={() => handleSort('sku')}>SKU{renderSortIcon('sku')}</th>
              <th style={{ ...sortableThStyle }} onClick={() => handleSort('brand')}>العلامة التجارية{renderSortIcon('brand')}</th>
              <th style={{ ...sortableThStyle }} onClick={() => handleSort('car_make')}>السيارة{renderSortIcon('car_make')}</th>
              <th style={{ ...sortableThStyle }} onClick={() => handleSort('car_model')}>الموديل{renderSortIcon('car_model')}</th>
              <th style={{ ...sortableThStyle }} onClick={() => handleSort('car_model_year')}>السنة{renderSortIcon('car_model_year')}</th>
              <th style={{ ...sortableThStyle }} onClick={() => handleSort('regular_price')}>السعر{renderSortIcon('regular_price')}</th>
              <th style={thStyle}>إدارة</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '40px' }}>
                  جاري التحميل...
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const isSelected = selectedIds.has(product.id);
                return [
                  <tr
                    key={product.id}
                    style={{
                      borderBottom: '1px solid #e5e7eb',
                      backgroundColor: isSelected
                        ? 'rgba(255, 77, 77, 0.08)'
                        : 'transparent',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <td style={{ ...tdStyle, textAlign: 'center', width: '40px' }}>
                      <button
                        onClick={() => toggleSelectOne(product.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto',
                        }}
                      >
                        {isSelected ? (
                          <CheckSquare size={18} color="#22c55e" />
                        ) : (
                          <Square size={18} color="#6b7280" />
                        )}
                      </button>
                    </td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => toggleStatus(product.id, product.is_active)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '25px',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          border: 'none',
                          cursor: 'pointer',
                          backgroundColor: product.is_active ? '#2ecc7133' : '#d1d5db',
                          color: product.is_active ? '#2ecc71' : '#9ca3af',
                        }}
                      >
                        {product.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>


                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, background: '#ffffff', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {product.image_url
                            ? <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            : <span style={{ fontSize: '1.2rem' }}>📦</span>
                          }
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', minWidth: 0 }}>
                          <span>{product.name}</span>
                          {(() => {
                            const val = imageEdits[product.id] ?? product.image_url ?? '';
                            const dirty = imageEdits[product.id] !== undefined && (imageEdits[product.id] ?? '') !== (product.image_url ?? '');
                            return (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <input
                                  type="url"
                                  dir="ltr"
                                  placeholder="🔗 رابط الصورة..."
                                  value={val}
                                  onChange={(e) => setImageEdits((prev) => ({ ...prev, [product.id]: e.target.value }))}
                                  onKeyDown={(e) => { if (e.key === 'Enter' && dirty) handleUpdateImage(product.id); }}
                                  style={{ width: '230px', maxWidth: '100%', padding: '5px 8px', fontSize: '0.72rem', border: `1px solid ${dirty ? '#22c55e' : '#e5e7eb'}`, borderRadius: '6px', outline: 'none', color: '#374151', background: '#fff' }}
                                />
                                <button
                                  onClick={() => handleUpdateImage(product.id)}
                                  disabled={!dirty || savingImageId === product.id}
                                  title="حفظ رابط الصورة"
                                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', flexShrink: 0, border: 'none', borderRadius: '6px', cursor: (!dirty || savingImageId === product.id) ? 'not-allowed' : 'pointer', background: dirty ? '#22c55e' : '#e5e7eb', color: '#fff' }}
                                >
                                  {savingImageId === product.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                </button>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </td>


                    <td style={tdStyle}>
  <span
    title={product.id}
    style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#555', cursor: 'default', userSelect: 'all' }}
  >
    {product.id.slice(0, 8)}…
  </span>
</td>
<td style={tdStyle}>
  <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#2ecc71', fontWeight: '700' }}>
    {product.sku || '—'}
  </span>
</td>


                    <td style={tdStyle}>{product.brand}</td>
                    <td style={tdStyle}>{product.car_make}</td>
                    <td style={tdStyle}>{product.car_model}</td>
                    <td style={tdStyle}>{product.car_model_year}</td>
                    <td style={tdStyle}>
                      {renderInlinePrice(product)}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <Link href={`/products/${product.id}`} target="_blank" title="عرض">
                          <Eye size={18} color="#2ecc71" />
                        </Link>
                        {/* ── Edit button now carries the returnUrl ── */}
                        <Link href={buildEditUrl(product.id)} title="تعديل">
                          <Edit3 size={18} color="#f1c40f" />
                        </Link>
                        <button
                          onClick={() => setExpandedEditId((cur) => (cur === product.id ? null : product.id))}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                          title="تعديل سريع بدون فتح صفحة"
                        >
                          <Edit3 size={18} color={expandedEditId === product.id ? '#16a34a' : '#3b82f6'} />
                        </button>
                        <button
                          onClick={() => deleteProduct(product.id)}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                          title="حذف"
                        >
                          <Trash2 size={18} color="#22c55e" />
                        </button>
                      </div>
                    </td>
                  </tr>,
                  expandedEditId === product.id ? (
                    <tr key={product.id + '-edit'}>
                      <td colSpan={11} style={{ padding: '18px', background: '#f0fdf4', borderBottom: '2px solid #22c55e' }}>
                        <ProductForm
                          initial={product}
                          categories={availableCategories} subcategories={availableSubcategories}
                          brands={availableBrands} makes={availableMakes} models={availableModels}
                          onSubmit={(v) => updateProductQuick(product.id, v)}
                          onCancel={() => setExpandedEditId(null)}
                          submitLabel="حفظ التعديلات" busy={savingForm}
                        />
                      </td>
                    </tr>
                  ) : null,
                ];
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Mobile Cards ── */}
      <div className="prod-mobile-cards" style={{ display: 'none', flexDirection: 'column', gap: '10px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>جاري التحميل...</div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>لا توجد منتجات</div>
        ) : products.map((product) => {
          const isSelected = selectedIds.has(product.id);
          return (
            <div key={product.id} className={`prod-card${isSelected ? ' prod-card-selected' : ''}`}>
              {/* Top row: checkbox + image + name */}
              <div className="prod-card-row">
                <button
                  onClick={() => toggleSelectOne(product.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: 0 }}
                >
                  {isSelected
                    ? <CheckSquare size={20} color="#22c55e" />
                    : <Square size={20} color="#6b7280" />}
                </button>
                <div style={{ width: '50px', height: '50px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, background: '#ffffff', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {product.image_url
                    ? <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    : <span style={{ fontSize: '1.2rem' }}>📦</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '700', fontSize: '0.88rem', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</div>
                  <div style={{ fontSize: '0.72rem', color: '#555', marginTop: '2px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {product.brand && <span style={{ color: '#2ecc71' }}>{product.brand}</span>}
                    {product.car_make && <span>• {product.car_make} {product.car_model}</span>}
                    {product.car_model_year && <span style={{ color: '#9ca3af' }}>{product.car_model_year}</span>}
                  </div>
                  {product.sku && (
                    <div style={{ fontSize: '0.68rem', color: '#2ecc71', fontFamily: 'monospace', marginTop: '2px' }}>SKU: {product.sku}</div>
                  )}
                </div>
              </div>

              {/* Middle row: status + price */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #1a1a1a', paddingTop: '8px' }}>
                <button
                  onClick={() => toggleStatus(product.id, product.is_active)}
                  style={{
                    padding: '5px 12px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 'bold',
                    border: 'none', cursor: 'pointer',
                    backgroundColor: product.is_active ? '#2ecc7133' : '#d1d5db',
                    color: product.is_active ? '#2ecc71' : '#9ca3af',
                  }}
                >
                  {product.is_active ? '● نشط' : '○ معطل'}
                </button>

                {renderInlinePrice(product)}
              </div>

              {/* Action buttons */}
              <div className="prod-card-actions">
                <Link href={`/products/${product.slug || product.id}`} target="_blank" className="prod-action-btn">
                  <Eye size={16} color="#2ecc71" />
                  <span>عرض</span>
                </Link>
                <Link href={buildEditUrl(product.id)} className="prod-action-btn">
                  <Edit3 size={16} color="#f1c40f" />
                  <span>تعديل</span>
                </Link>
                <button
                  onClick={() => setExpandedEditId((cur) => (cur === product.id ? null : product.id))}
                  className="prod-action-btn"
                >
                  <Edit3 size={16} color={expandedEditId === product.id ? '#16a34a' : '#3b82f6'} />
                  <span>تعديل سريع</span>
                </button>
                <button onClick={() => deleteProduct(product.id)} className="prod-action-btn" style={{ borderColor: '#22c55e33' }}>
                  <Trash2 size={16} color="#22c55e" />
                  <span style={{ color: '#22c55e' }}>حذف</span>
                </button>
              </div>

              {expandedEditId === product.id && (
                <div style={{ marginTop: '12px', padding: '14px', background: '#f0fdf4', border: '2px solid #22c55e', borderRadius: '12px' }}>
                  <ProductForm
                    initial={product}
                    categories={availableCategories} subcategories={availableSubcategories}
                    brands={availableBrands} makes={availableMakes} models={availableModels}
                    onSubmit={(v) => updateProductQuick(product.id, v)}
                    onCancel={() => setExpandedEditId(null)}
                    submitLabel="حفظ التعديلات" busy={savingForm}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      <div
        className="prod-pagination"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '16px',
          marginTop: '24px',
          paddingBottom: '20px',
          flexWrap: 'wrap',
        }}
      >
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((p) => p - 1)}
          style={pageBtnStyle}
        >
          ← السابق
        </button>
        <span style={{ color: '#666', fontSize: '0.85rem' }}>صفحة {currentPage} · {totalCount} منتج</span>
        <button
          disabled={currentPage * pageSize >= totalCount}
          onClick={() => setCurrentPage((p) => p + 1)}
          style={pageBtnStyle}
        >
          التالي →
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: 'auto' }}>
          <span style={{ color: '#666', fontSize: '0.82rem' }}>عرض</span>
          <select
            value={pageSize === ALL_PAGE_SIZE ? 'الكل' : String(pageSize)}
            onChange={(e) => { const v = e.target.value; setPageSize(v === 'الكل' ? ALL_PAGE_SIZE : Number(v)); setCurrentPage(1); }}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.82rem', cursor: 'pointer', background: '#fff', color: '#1a1a1a' }}
          >
            {PAGE_SIZE_OPTIONS.map((o) => <option key={String(o)} value={String(o)}>{o}</option>)}
          </select>
          <span style={{ color: '#666', fontSize: '0.82rem' }}>لكل صفحة</span>
        </div>
      </div>
    </div>
  );
}


const labelStyle = { display: 'block', fontSize: '0.8rem', color: '#555', marginBottom: '8px' };
const filterInputStyle = { width: '100%', padding: '12px', backgroundColor: '#ffffff', border: '1px solid #e5e7eb', color: '#1a1a1a', borderRadius: '10px', outline: 'none', fontSize: '0.85rem' };
const secondaryBtnStyle: any = { padding: '8px 15px', backgroundColor: '#e5e7eb', color: '#9ca3af', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' };
const thStyle: any = { padding: '18px 15px', fontSize: '0.9rem' };
const tdStyle: any = { padding: '15px', color: '#374151', fontSize: '0.85rem' };
const miniInputStyle: any = { width: '80px', padding: '8px', backgroundColor: '#ffffff', color: '#1a1a1a', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.8rem', outline: 'none' };
const pageBtnStyle: any = { padding: '10px 25px', backgroundColor: '#e5e7eb', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '10px', cursor: 'pointer' };
const bulkBarStyle: any = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f0fdf4', border: '1px solid #22c55e44', borderRadius: '12px', padding: '12px 16px', marginBottom: '14px', gap: '10px', flexWrap: 'wrap' };