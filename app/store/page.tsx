'use client';
import { useEffect, useState, Suspense, useMemo, memo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';
import Link from 'next/link';
import { useCart } from '@/context/CartContext'; 
import { 
  Loader2, Car, ShoppingCart, ChevronRight, ChevronLeft, Filter, Globe, Settings2, Calendar, LayoutGrid, Tags, X
} from 'lucide-react';
import toast from 'react-hot-toast';



// --- مكون كارت المنتج (نفس تصميم الصفحة الرئيسية) ---
const ProductCard = memo(({ p }: { p: any }) => {
  const { addToCart } = useCart(); 
  const country = p.country_origin || p.country_of_origin || p.origin || 'أصلي';
  const price = Number(p.sale_price || p.regular_price || 0);
  const regularPrice = Number(p.regular_price || 0);
  const salePrice = Number(p.sale_price || 0);
  const hasDiscount = salePrice > 0 && regularPrice > salePrice;
  const discountPercent = hasDiscount ? Math.round(((regularPrice - salePrice) / regularPrice) * 100) : 0;


  return (
    <div style={productCardModern}>
      {/* Discount or Trending Badge */}
      {hasDiscount ? (
        <div style={discountBadge}>-{discountPercent}%</div>
      ) : (
        <div style={trendingBadge}>تريند ✨</div>
      )}


      {/* Product Image */}
      <Link href={`/products/${p.id}`} style={imgContainerStyle}>
        {p.image_url ? (
          <img src={p.image_url} alt={p.name} style={imgFillStyle} loading="lazy" />
        ) : (
          <div style={{ background: '#f9f9f9', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Car size={40} color="#ccc" />
          </div>
        )}
        <div style={carMakeBadge}>
          <Car size={9} /> {p.car_make}
        </div>
      </Link>


      {/* Product Details */}
      <div style={productDetailsArea}>
        {/* Brand and Origin */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={brandTextStyle}>{p.brand}</span>
          <div style={originBadgeStyle}>
            <Globe size={14} color="#22c55e" />
            <span>{country}</span>
          </div>
        </div>


        {/* Product Name */}
        <h3 style={productNameStyle}>{p.name}</h3>


        {/* Car Info Box */}
        <div style={carInfoBox}>
          <div style={carInfoItem}>
            <Settings2 size={14} color="#22c55e" />
            <span>{p.car_make} {p.car_model}</span>
          </div>
          <div style={carInfoItem}>
            <Calendar size={14} color="#22c55e" />
            <span>{p.car_model_year || 'الكل'}</span>
          </div>
          <div style={carInfoItemGreen}>
            <LayoutGrid size={14} />
            <span>{p.category}</span>
          </div>
          <div style={carInfoItemSecondary}>
            <Tags size={14} />
            <span>{p.subcategory || 'عام'}</span>
          </div>
        </div>


        {/* Pricing */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            {hasDiscount && (
              <span style={originalPriceStyle}>{regularPrice} ج.م</span>
            )}
            <span style={currentPriceStyle}>{price} ج.م</span>
          </div>


          {/* Add to Cart Button */}
          <button 
            onClick={(e) => { e.preventDefault(); addToCart({...p, price}, 1); toast.success('تمت الإضافة'); }} 
            style={addToCartButton}
          >
            <ShoppingCart size={16} /> أضف إلى السلة
          </button>
        </div>
      </div>
    </div>
  );
});



function StoreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [allProducts, setAllProducts] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const itemsPerPage = 16;



  useEffect(() => {
    async function init() {
      setLoading(true);
      const { data } = await supabase.from('products').select('*').range(0, 9999).order('created_at', { ascending: false });
      if (data) setAllProducts(data);
      setLoading(false);
    }
    init();
  }, []);



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



  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const displayProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);


  useEffect(() => { setCurrentPage(1); }, [searchParams]);


  const filterOptions = useMemo(() => {
    const getUnique = (key: string) => Array.from(new Set(allProducts.map(i => i[key]?.trim()).filter(Boolean))).sort();
    
    const selMake = searchParams.get('make')?.toLowerCase();
    const models = Array.from(new Set(
      allProducts.filter(p => !selMake || p.car_make?.toLowerCase().trim() === selMake).map(i => i.car_model?.trim()).filter(Boolean)
    )).sort();


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
      <style dangerouslySetInnerHTML={{ __html: `
        .modern-grid-responsive {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }
        
        .mobile-filter-overlay {
          display: none;
        }
        
        .mobile-filter-toggle {
          display: none;
        }
        
        @media (max-width: 768px) {
          .modern-grid-responsive {
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
          }
          
          .desktop-sidebar {
            display: none !important;
          }
          
          .mobile-filter-toggle {
            display: flex;
            position: fixed;
            bottom: 80px;
            left: 20px;
            z-index: 999;
            background: #22c55e;
            color: #fff;
            border: none;
            padding: 15px;
            border-radius: 50%;
            box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
            cursor: pointer;
            align-items: center;
            justify-content: center;
          }
          
          .mobile-filter-overlay {
            display: block;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1000;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
          }
          
          .mobile-filter-overlay.open {
            opacity: 1;
            pointer-events: all;
          }
          
          .mobile-filter-panel {
            position: fixed;
            top: 0;
            right: -100%;
            width: 85%;
            max-width: 350px;
            height: 100%;
            background: #fff;
            z-index: 1001;
            transition: right 0.3s ease;
            overflow-y: auto;
            box-shadow: -4px 0 12px rgba(0, 0, 0, 0.1);
          }
          
          .mobile-filter-panel.open {
            right: 0;
          }
        }
      `}} />
      
      {/* Mobile Filter Toggle Button */}
      <button 
        className="mobile-filter-toggle" 
        onClick={() => setFilterOpen(true)}
        aria-label="فتح الفلاتر"
      >
        <Filter size={24} />
      </button>
      
      {/* Mobile Filter Overlay */}
      <div 
        className={`mobile-filter-overlay ${filterOpen ? 'open' : ''}`}
        onClick={() => setFilterOpen(false)}
      />
      
      {/* Mobile Filter Panel */}
      <aside className={`mobile-filter-panel ${filterOpen ? 'open' : ''}`}>
        <div style={{...sidebarHeader, justifyContent: 'space-between'}}>
          <span style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <Filter size={16} /> تصفية البحث
          </span>
          <button 
            onClick={() => setFilterOpen(false)}
            style={{background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '5px'}}
          >
            <X size={20} />
          </button>
        </div>
        <div style={{padding: '15px', display:'flex', flexDirection:'column', gap:'15px'}}>
           <div><label style={labelS}>الماركة</label><select style={selectS} value={searchParams.get('make') || ''} onChange={e => onFilterChange('make', e.target.value)}><option value="">الكل</option>{filterOptions.makes.map(i => <option key={i} value={i}>{i}</option>)}</select></div>
           <div><label style={labelS}>الموديل</label><select style={selectS} value={searchParams.get('model') || ''} onChange={e => onFilterChange('model', e.target.value)}><option value="">الكل</option>{filterOptions.models.map(i => <option key={i} value={i}>{i}</option>)}</select></div>
           <div><label style={labelS}>سنة الصنع</label><select style={selectS} value={searchParams.get('year') || ''} onChange={e => onFilterChange('year', e.target.value)}><option value="">الكل</option>{filterOptions.years.map(i => <option key={i} value={i}>{i}</option>)}</select></div>
           <div><label style={labelS}>القسم الرئيسي</label><select style={selectS} value={searchParams.get('cat') || ''} onChange={e => onFilterChange('cat', e.target.value)}><option value="">الكل</option>{filterOptions.cats.map(i => <option key={i} value={i}>{i}</option>)}</select></div>
           <div><label style={labelS}>القسم الفرعي</label><select style={selectS} value={searchParams.get('sub') || ''} onChange={e => onFilterChange('sub', e.target.value)}><option value="">الكل</option>{filterOptions.subCats.map(i => <option key={i} value={i}>{i}</option>)}</select></div>
           <button style={resetBtn} onClick={() => { router.push('/store'); setFilterOpen(false); }}>إعادة ضبط</button>
        </div>
      </aside>
      
      <div style={mainLayoutWrapper}>
        {/* Desktop Sidebar */}
        <aside className="desktop-sidebar" style={sidebarStyle}>
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
            <div style={{textAlign:'center', padding:'100px'}}><Loader2 className="animate-spin" size={40} color="#22c55e" /></div>
          ) : (
            <>
              <div className="modern-grid-responsive">
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


// --- الأنماط (Updated to match homepage) ---
const mainLayoutWrapper: any = { maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '25px', flexWrap: 'wrap' };
const sidebarStyle: any = { width: '250px', background: '#fff', borderRadius: '16px', border: '1px solid #eee', height: 'fit-content', position: 'sticky', top: '20px' };
const sidebarHeader: any = { padding: '15px', background: '#22c55e', color: '#fff', borderRadius: '16px 16px 0 0', fontWeight: 'bold', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' };
const labelS = { display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '5px', color: '#555' };
const selectS = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.85rem', outline: 'none' };
const resetBtn = { width: '100%', marginTop: '10px', padding: '10px', border: 'none', background: '#fef2f2', borderRadius: '8px', cursor: 'pointer', color: '#ef4444', fontWeight: 'bold' };


// Product Card Styles (matching homepage exactly)
const productCardModern: any = { 
  background: '#fff', 
  borderRadius: '18px', 
  border: '1px solid #f2f2f2', 
  overflow: 'hidden',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  transition: 'all 0.3s ease'
};


const discountBadge: any = { 
  position: 'absolute', 
  top: '8px', 
  right: '8px', 
  backgroundColor: '#ff4d4d', 
  color: '#fff', 
  padding: '2px 6px', 
  borderRadius: '5px', 
  fontSize: '0.6rem', 
  fontWeight: '900', 
  zIndex: 10 
};


const trendingBadge: any = { 
  position: 'absolute', 
  top: '8px', 
  right: '8px', 
  backgroundColor: '#22c55e', 
  color: '#fff', 
  padding: '2px 6px', 
  borderRadius: '5px', 
  fontSize: '0.6rem', 
  fontWeight: '900', 
  zIndex: 10 
};


const imgContainerStyle: any = { 
  background: '#f9f9f9', 
  height: '200px', 
  width: '100%', 
  display: 'flex', 
  alignItems: 'center', 
  justifyContent: 'center', 
  position: 'relative', 
  cursor: 'pointer', 
  overflow: 'hidden',
  textDecoration: 'none'
};


const imgFillStyle: any = { 
  width: '100%', 
  height: '100%', 
  objectFit: 'contain', 
  padding: '15px', 
  transition: 'transform 0.3s ease' 
};


const carMakeBadge: any = { 
  position: 'absolute', 
  bottom: '6px', 
  left: '6px', 
  background: 'rgba(255,255,255,0.9)', 
  padding: '2px 6px', 
  borderRadius: '5px', 
  fontSize: '0.65rem', 
  fontWeight: '800',
  display: 'flex',
  alignItems: 'center',
  gap: '4px'
};


const productDetailsArea: any = { 
  padding: '15px', 
  flex: 1, 
  display: 'flex', 
  flexDirection: 'column' 
};


const brandTextStyle: any = { 
  color: '#22c55e', 
  fontWeight: '800', 
  fontSize: '0.8rem' 
};


const originBadgeStyle: any = { 
  display: 'flex', 
  alignItems: 'center', 
  gap: '4px', 
  color: '#666', 
  fontWeight: '700',
  fontSize: '0.75rem'
};


const productNameStyle: any = { 
  fontSize: '1rem', 
  fontWeight: '900', 
  marginBottom: '4px', 
  height: '45px', 
  overflow: 'hidden',
  lineHeight: '1.4',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical'
};


const carInfoBox: any = { 
  background: '#f9f9f9', 
  padding: '10px', 
  borderRadius: '10px', 
  marginBottom: '10px',
  display: 'flex',
  flexDirection: 'column',
  gap: '3px'
};


const carInfoItem: any = {
  fontSize: '0.8rem', 
  color: '#1a1a1a', 
  fontWeight: '800', 
  display: 'flex', 
  alignItems: 'center', 
  gap: '6px'
};


const carInfoItemGreen: any = {
  fontSize: '0.8rem', 
  color: '#22c55e', 
  fontWeight: '800', 
  display: 'flex', 
  alignItems: 'center', 
  gap: '6px'
};


const carInfoItemSecondary: any = {
  fontSize: '0.8rem', 
  color: '#888', 
  fontWeight: '700', 
  display: 'flex', 
  alignItems: 'center', 
  gap: '6px'
};


const originalPriceStyle: any = { 
  display: 'block', 
  color: '#bbb', 
  textDecoration: 'line-through', 
  fontSize: '0.75rem' 
};


const currentPriceStyle: any = { 
  fontSize: '1.2rem', 
  fontWeight: '900',
  color: '#1a1a1a'
};


const addToCartButton: any = { 
  width: '100%', 
  padding: '12px', 
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
  fontSize: '1rem', 
  transition: '0.2s' 
};


const pagCenterContainer: any = { display: 'flex', justifyContent: 'center', marginTop: '40px', width: '100%' };
const compactPagBox: any = { display: 'flex', alignItems: 'center', gap: '15px', background: '#fff', padding: '8px 20px', borderRadius: '30px', border: '1px solid #eee', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' };
const pagBtnSmall: any = { padding: '6px 15px', borderRadius: '20px', border: '1px solid #eee', background: '#fcfcfc', color: '#1a1a1a', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' };
const pagBtnDisabled: any = { ...pagBtnSmall, opacity: 0.3, cursor: 'not-allowed', background: '#eee' };
const pagInfoText = { fontSize: '0.85rem', color: '#666' };
