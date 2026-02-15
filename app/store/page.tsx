'use client';
import { useEffect, useState, Suspense, useMemo, memo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';
import Link from 'next/link';
import { useCart } from '@/context/CartContext'; 
import { 
  Loader2, Car, ShoppingCart, ChevronRight, ChevronLeft, Filter
} from 'lucide-react';
import toast from 'react-hot-toast';

// --- مكون كارت المنتج (حافظنا على كل بياناتك) ---
const ProductCard = memo(({ p }: { p: any }) => {
  const { addToCart } = useCart(); 
  const country = p.country_origin || p.country_of_origin || p.origin || 'أصلي';
  const price = Number(p.sale_price || p.regular_price || 0);

  return (
    <div style={shiekCardStyle}>
      <Link href={`/products/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div style={shiekImageArea}>
          {p.image_url ? <img src={p.image_url} alt={p.name} style={shiekImgFit} loading="lazy" /> : <div style={{ background: '#eee', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Car size={30} color="#ccc" /></div>}
          <div style={shiekOriginBadge}>{country}</div>
        </div>
        <div style={shiekDetailsArea}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span style={shiekBrandText}>{p.brand}</span>
            <span style={carCompatTag}>{p.category || 'عام'}</span>
          </div>
          <h3 style={shiekProductName}>{p.name}</h3>
          <div style={specsBox}>
            <div style={specLine}><b>{p.car_make} {p.car_model}</b></div>
            <div style={specLine}><b>{p.car_model_year || 'الكل'}</b></div>
          </div>
          <div style={shiekPriceRow}>
            <span style={newPriceText}>{price} ج.م</span>
          </div>
          <button 
            onClick={(e) => { e.preventDefault(); addToCart({...p, price}, 1); toast.success('تمت الإضافة'); }} 
            style={shiekAddBtn}
          >
            <ShoppingCart size={16} /> أضف إلى السلة
          </button>
        </div>
      </Link>
    </div>
  );
});

function StoreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [allProducts, setAllProducts] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    async function init() {
      setLoading(true);
      // جلب البيانات كاملة (سحبنا 10000 سجل لضمان عدم ضياع "فيرنا")
      const { data } = await supabase.from('products').select('*').range(0, 9999).order('created_at', { ascending: false });
      if (data) setAllProducts(data);
      setLoading(false);
    }
    init();
  }, []);

  // 1. منطق الفلترة (جعلناه Case-Insensitive لضمان ظهور النتائج)
  const filteredProducts = useMemo(() => {
    let list = [...allProducts];
    const m = searchParams.get('make')?.toLowerCase();
    const mo = searchParams.get('model')?.toLowerCase();
    const c = searchParams.get('cat')?.toLowerCase();
    const s = searchParams.get('sub')?.toLowerCase();
    const y = searchParams.get('year');

    if (m) list = list.filter(p => p.car_make?.toLowerCase().trim() === m);
    if (mo) list = list.filter(p => p.car_model?.toLowerCase().trim() === mo);
    if (c) list = list.filter(p => p.category?.toLowerCase().trim() === c);
    if (s) list = list.filter(p => p.subcategory?.toLowerCase().trim() === s);
    if (y) list = list.filter(p => p.car_model_year?.toString().includes(y));

    return list;
  }, [allProducts, searchParams]);

  // 2. تقسيم الصفحات (للأداء)
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const displayProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => { setCurrentPage(1); }, [searchParams]);

  // 3. خيارات الفلاتر (نفس المنطق الأصلي لكنه "مرن")
  const filterOptions = useMemo(() => {
    const getUnique = (key: string) => Array.from(new Set(allProducts.map(i => i[key]?.trim()).filter(Boolean))).sort();
    
    // الموديلات المرتبطة بالماركة المختارة
    const selMake = searchParams.get('make')?.toLowerCase();
    const models = Array.from(new Set(
      allProducts.filter(p => !selMake || p.car_make?.toLowerCase().trim() === selMake).map(i => i.car_model?.trim()).filter(Boolean)
    )).sort();

    // الأقسام الفرعية المرتبطة بالقسم الرئيسي
    const selCat = searchParams.get('cat')?.toLowerCase();
    const subCats = Array.from(new Set(
      allProducts.filter(p => !selCat || p.category?.toLowerCase().trim() === selCat).map(i => i.subcategory?.trim()).filter(Boolean)
    )).sort();

    return {
      makes: getUnique('car_make'),
      models,
      cats: getUnique('category'),
      subCats,
      years: Array.from(new Set(allProducts.map(i => i.car_model_year?.toString().match(/\d{4}/g)).flat().filter(Boolean))).sort().reverse()
    };
  }, [allProducts, searchParams]);

  const onFilterChange = (key: string, val: string) => {
    const p = new URLSearchParams(window.location.search);
    if (val) p.set(key, val); else p.delete(key);
    if (key === 'make') p.delete('model');
    if (key === 'cat') p.delete('sub');
    router.push(`/store?${p.toString()}`);
  };

  return (
    <div style={{ backgroundColor: '#fcfcfc', minHeight: '100vh', direction: 'rtl', padding: '20px' }}>
      <div style={mainLayoutWrapper}>
        <aside style={sidebarStyle}>
          <div style={sidebarHeader}><Filter size={16} /> تصفية البحث</div>
          <div style={{padding: '15px', display:'flex', flexDirection:'column', gap:'15px'}}>
             <div><label style={labelS}>الماركة</label><select style={selectS} value={searchParams.get('make') || ''} onChange={e => onFilterChange('make', e.target.value)}><option value="">الكل</option>{filterOptions.makes.map(i => <option key={i} value={i}>{i}</option>)}</select></div>
             <div><label style={labelS}>الموديل</label><select style={selectS} value={searchParams.get('model') || ''} onChange={e => onFilterChange('model', e.target.value)}><option value="">الكل</option>{filterOptions.models.map(i => <option key={i} value={i}>{i}</option>)}</select></div>
             <div><label style={labelS}>سنة الصنع</label><select style={selectS} value={searchParams.get('year') || ''} onChange={e => onFilterChange('year', e.target.value)}><option value="">الكل</option>{filterOptions.years.map(i => <option key={i} value={i}>{i}</option>)}</select></div>
             <div><label style={labelS}>القسم الرئيسي</label><select style={selectS} value={searchParams.get('cat') || ''} onChange={e => onFilterChange('cat', e.target.value)}><option value="">الكل</option>{filterOptions.cats.map(i => <option key={i} value={i}>{i}</option>)}</select></div>
             <div><label style={labelS}>القسم الفرعي</label><select style={selectS} value={searchParams.get('sub') || ''} onChange={e => onFilterChange('sub', e.target.value)}><option value="">الكل</option>{filterOptions.subCats.map(i => <option key={i} value={i}>{i}</option>)}</select></div>
             <button style={resetBtn} onClick={() => router.push('/store')}>إعادة ضبط</button>
          </div>
        </aside>

        <main style={{ flex: 1 }}>
          {loading ? (
            <div style={{textAlign:'center', padding:'100px'}}><Loader2 className="animate-spin" size={40} color="#27ae60" /></div>
          ) : (
            <>
              <div style={shiekGrid}>
                {displayProducts.map(p => <ProductCard p={p} key={p.id} />)}
              </div>

              {totalPages > 1 && (
                <div style={pagCenterContainer}>
                  <div style={compactPagBox}>
                    <button disabled={currentPage === totalPages} onClick={() => { setCurrentPage(v => v + 1); window.scrollTo(0,0); }} style={currentPage === totalPages ? pagBtnDisabled : pagBtnSmall}>التالي</button>
                    <span style={pagInfoText}>صفحة <b>{currentPage}</b> من {totalPages}</span>
                    <button disabled={currentPage === 1} onClick={() => { setCurrentPage(v => v - 1); window.scrollTo(0,0); }} style={currentPage === 1 ? pagBtnDisabled : pagBtnSmall}>السابق</button>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function StorePage() { return <Suspense fallback={null}><StoreContent /></Suspense>; }

// --- الأنماط الجمالية (ثابتة كما تحب) ---
const mainLayoutWrapper: any = { maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '25px', flexWrap: 'wrap' };
const sidebarStyle: any = { width: '250px', background: '#fff', borderRadius: '16px', border: '1px solid #eee', height: 'fit-content', position: 'sticky', top: '20px' };
const sidebarHeader: any = { padding: '15px', background: '#27ae60', color: '#fff', borderRadius: '16px 16px 0 0', fontWeight: 'bold', textAlign: 'center' };
const labelS = { display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '5px', color: '#555' };
const selectS = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.85rem', outline: 'none' };
const resetBtn = { width: '100%', marginTop: '10px', padding: '10px', border: 'none', background: '#fef2f2', borderRadius: '8px', cursor: 'pointer', color: '#ef4444', fontWeight: 'bold' };
const shiekGrid: any = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' };
const shiekCardStyle: any = { background: '#fff', borderRadius: '16px', border: '1px solid #eee', overflow: 'hidden' };
const shiekImageArea: any = { height: '180px', background: '#f9f9f9', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const shiekImgFit: any = { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' };
const shiekOriginBadge: any = { position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(255,255,255,0.8)', padding: '3px 6px', borderRadius: '5px', fontSize: '0.65rem' };
const carCompatTag = { fontSize: '0.65rem', color: '#27ae60', background: '#eefcf5', padding: '2px 6px', borderRadius: '5px' };
const shiekDetailsArea: any = { padding: '15px' };
const shiekBrandText: any = { color: '#27ae60', fontWeight: 'bold', fontSize: '0.7rem' };
const shiekProductName: any = { fontSize: '0.9rem', fontWeight: 'bold', margin: '8px 0', height: '38px', overflow: 'hidden' };
const specsBox = { background: '#f8f9fa', padding: '8px', borderRadius: '8px', marginBottom: '10px' };
const specLine = { fontSize: '0.75rem', color: '#666', marginBottom: '3px' };
const shiekPriceRow: any = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' };
const newPriceText: any = { fontSize: '1.2rem', fontWeight: 'bold' };
const shiekAddBtn: any = { width: '100%', background: '#1a1a1a', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' };
const pagCenterContainer: any = { display: 'flex', justifyContent: 'center', marginTop: '40px', width: '100%' };
const compactPagBox: any = { display: 'flex', alignItems: 'center', gap: '15px', background: '#fff', padding: '8px 20px', borderRadius: '30px', border: '1px solid #eee', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' };
const pagBtnSmall: any = { padding: '6px 15px', borderRadius: '20px', border: '1px solid #eee', background: '#fcfcfc', color: '#1a1a1a', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' };
const pagBtnDisabled: any = { ...pagBtnSmall, opacity: 0.3, cursor: 'not-allowed', background: '#eee' };
const pagInfoText = { fontSize: '0.85rem', color: '#666' };