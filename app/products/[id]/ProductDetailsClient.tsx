'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useCart } from '@/context/CartContext'; 
import { 
  ShoppingCart, Car, Calendar, ShieldCheck, 
  ArrowRight, Globe, Plus, Minus, CheckCircle2, Layers, Info, Package, Loader2, ChevronRight, ChevronLeft, Timer
} from 'lucide-react';
import Link from 'next/link';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay } from 'swiper/modules';
import 'swiper/css';

function RelatedProductCard({ p }: { p: any }) {
  const [qty, setQty] = useState(1);
  const { addToCart } = useCart();
  const displayImage = p.image_url || 'https://via.placeholder.com/400?text=Zait+And+Filters';

  return (
    <div style={premiumCardStyle}>
      <Link href={`/products/${p.id}`} style={{ textDecoration: 'none' }}>
        <div style={premiumImageArea}>
          <img src={displayImage} alt={p.name} style={premiumImgFit} />
          {p.sale_price && <div style={smallSaleBadge}>عرض</div>}
        </div>
      </Link>
      <div style={premiumDetails}>
        <span style={premiumBrand}>{p.brand}</span>
        <Link href={`/products/${p.id}`} style={{ textDecoration: 'none' }}>
          <h3 style={premiumName}>{p.name}</h3>
        </Link>
        <div style={premiumPriceRow}>
          <div style={premiumPriceCol}>
             <span style={premiumCurrentPrice}>{p.sale_price || p.regular_price} <small>ج.م</small></span>
             {p.sale_price && <span style={premiumOldPrice}>{p.regular_price}</span>}
          </div>
          <div style={premiumStepper}>
            <button onClick={() => setQty(prev => prev + 1)} style={miniStepBtn}><Plus size={12} /></button>
            <span style={miniQty}>{qty}</span>
            <button onClick={() => qty > 1 && setQty(prev => prev - 1)} style={miniStepBtn}><Minus size={12} /></button>
          </div>
        </div>
        <button onClick={() => addToCart(p, qty)} style={premiumAddBtn}><ShoppingCart size={14} /> إضافة</button>
      </div>
    </div>
  );
}

export default function ProductDetailsClient({ initialProduct, productId }: { initialProduct: any, productId: string }) {
  const [product, setProduct] = useState<any>(initialProduct);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(!initialProduct);
  const [qty, setQty] = useState(1);
  const { addToCart } = useCart();

  useEffect(() => {
    async function fetchRelated() {
      if (product) {
        const { data: related } = await supabase.from('products')
          .select('*')
          .eq('car_make', product.car_make)
          .eq('car_model', product.car_model)
          .neq('id', product.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (related) {
          const subcatCountMap = new Map();
          const filtered = related.filter(item => {
            const count = subcatCountMap.get(item.subcategory) || 0;
            if (count < 2) {
              subcatCountMap.set(item.subcategory, count + 1);
              return true;
            }
            return false;
          });
          setRelatedProducts(filtered);
        }
      }
    }
    fetchRelated();
  }, [product]);

  const generateAutoDescription = () => {
    if (!product) return "";
    const name = product.name || "هذا المنتج";
    const brand = product.brand || "ماركة أصلية";
    const make = product.car_make || "";
    const model = product.car_model || "";
    const year = product.car_model_year ? `موديل ${product.car_model_year}` : "";
    
    let origin = product.country_of_origin || "";
    const originMap: Record<string, string> = {
      'صيني': 'الصين', 'كوري': 'كوريا', 'ياباني': 'اليابان',
      'ألماني': 'ألمانيا', 'تركي': 'تركيا', 'إيطالي': 'إيطاليا'
    };
    const correctedOrigin = originMap[origin] || origin;

    let desc = `احصل الآن على ${name} بجودة عالية من ماركة ${brand}.`;
    if (make || model) desc += ` تم تصميم هذه القطعة خصيصاً لتناسب سيارات ${make} ${model} ${year}.`;
    if (correctedOrigin) desc += ` تتميز هذه القطعة بأنها مصنعة في ${correctedOrigin}، مما يضمن لك أداءً مثالياً وعمراً افتراضياً طويلاً على الطريق.`;
    return desc;
  };

  if (loading && !product) return <div style={loaderWrapper}><Loader2 className="animate-spin" color="#27ae60" size={50}/></div>;
  if (!product) return <div style={{textAlign:'center',padding:'100px'}}>المنتج غير موجود.</div>;

  return (
    <div style={pageWrapper}>
      <div style={navPath}>
        <Link href="/store" style={backLink}><ArrowRight size={18} /> المتجر</Link>
        <span style={pathDivider}>/</span>
        <span style={currentPath}>{product.category}</span>
      </div>

      <div style={mainContent}>
        <div style={imageSection}>
          <div style={mainImageWrapper}>
            <img src={product.image_url || 'https://via.placeholder.com/600'} alt={product.name} style={mainImg} />
          </div>
        </div>

        <div style={infoSection}>
          <div style={brandHeader}>
            <span style={brandTag}>{product.brand}</span>
            <div style={stockStatus}><CheckCircle2 size={16} /> متوفر</div>
          </div>
          <h1 style={productTitle}>{product.name}</h1>
          <div style={priceContainer}>
             <span style={currentPrice}>{product.sale_price || product.regular_price} <small>ج.م</small></span>
          </div>

          <div style={specCard}>
            <div style={specHeader}><Info size={18} color="#27ae60" /><h3 style={specCardTitle}>المواصفات الفنية</h3></div>
            <div style={specGrid}>
              <div style={specItem}><span style={specLabel}>الماركة</span><span style={specValue}><Car size={16} /> {product.car_make}</span></div>
              <div style={specItem}><span style={specLabel}>الموديل</span><span style={specValue}><Layers size={16} /> {product.car_model}</span></div>
              <div style={specItem}><span style={specLabel}>السنة</span><span style={specValue}><Calendar size={16} /> {product.car_model_year || 'الكل'}</span></div>
              <div style={specItem}><span style={specLabel}>المنشأ</span><span style={specValue}><Globe size={16} /> {product.country_of_origin || 'أصلي'}</span></div>
              <div style={specItem}><span style={specLabel}>القسم</span><span style={specValue}>{product.category}</span></div>
              <div style={specItem}><span style={specLabel}>القسم الفرعي</span><span style={specValue}>{product.subcategory || '-'}</span></div>
              <div style={specItem}><span style={specLabel}>مدة الضمان</span><span style={specValue}><Timer size={16} /> {product.warranty_duration || 'ضمان استبدال'}</span></div>
            </div>
          </div>

          <div style={actionRow}>
            <div style={qtyStepper}>
              <button onClick={() => setQty(prev => prev + 1)} style={stepBtn}><Plus size={20} /></button>
              <span style={qtyValue}>{qty}</span>
              <button onClick={() => qty > 1 && setQty(prev => prev - 1)} style={stepBtn}><Minus size={20} /></button>
            </div>
            <button onClick={() => addToCart(product, qty)} style={addToCartBtn}><ShoppingCart size={22} /> إضافة للسلة</button>
          </div>

          <div style={trustBadges}>
            <div style={badgeItem}><ShieldCheck size={18} color="#27ae60" /> قطع غيار أصلية ومختبرة</div>
            <div style={badgeItem}><ShieldCheck size={18} color="#27ae60" /> مطابقة 100% لمواصفات سيارتك</div>
          </div>
        </div>
      </div>

      <div style={descriptionSection}>
        <h2 style={descTitle}>وصف المنتج</h2>
        <div style={descContent}>
          {generateAutoDescription()}
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <section style={carouselFullWrapper}>
          <div style={relatedHeader}>
            <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
              <Package size={26} color="#27ae60" />
              <h2 style={relatedTitle}>قطع غيار لسيارة {product.car_make} {product.car_model}</h2>
            </div>
            <div style={customNavWrapper}>
              <button id="prev-related" style={navCircleBtn}><ChevronRight size={24} /></button>
              <button id="next-related" style={navCircleBtn}><ChevronLeft size={24} /></button>
            </div>
          </div>

          <div style={swiperOuterContainer}>
            <Swiper
              modules={[Navigation, Autoplay]}
              spaceBetween={20}
              slidesPerView={1.2}
              navigation={{ prevEl: '#prev-related', nextEl: '#next-related' }}
              breakpoints={{
                768: { slidesPerView: 3 },
                1024: { slidesPerView: 5 }
              }}
              autoplay={{ delay: 3500 }}
              style={{ padding: '10px 10px 30px' }}
            >
              {relatedProducts.map((rp) => (
                <SwiperSlide key={rp.id}>
                  <RelatedProductCard p={rp} />
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </section>
      )}
    </div>
  );
}

// الستايلات (نفس اللي بعتها بدون تغيير)
const carouselFullWrapper: any = { marginTop: '50px', borderTop: '1px solid #f0f0f0', paddingTop: '40px' };
const relatedHeader: any = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' };
const relatedTitle: any = { fontSize: '1.5rem', fontWeight: '900', color: '#1a1a1a' };
const customNavWrapper: any = { display: 'flex', gap: '10px' };
const navCircleBtn: any = { width: '40px', height: '40px', borderRadius: '50%', border: '1px solid #eee', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#1a1a1a' };
const swiperOuterContainer: any = { position: 'relative', width: '100%' };
const premiumCardStyle: any = { background: '#fff', borderRadius: '20px', border: '1px solid #f0f0f0', overflow: 'hidden', height: '100%', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column' };
const premiumImageArea: any = { height: '150px', background: '#f8f9fa', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '15px' };
const premiumImgFit: any = { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' };
const smallSaleBadge: any = { position: 'absolute', top: '10px', right: '10px', background: '#e74c3c', color: '#fff', padding: '2px 8px', borderRadius: '6px', fontSize: '0.6rem', fontWeight: 'bold' };
const premiumDetails: any = { padding: '15px', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' };
const premiumBrand: any = { fontSize: '0.7rem', fontWeight: 'bold', color: '#27ae60' };
const premiumName: any = { fontSize: '0.9rem', fontWeight: '800', color: '#1a1a1a', height: '2.4em', overflow: 'hidden', lineHeight: '1.2' };
const premiumPriceRow: any = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', background: '#f9f9f9', padding: '8px', borderRadius: '12px' };
const premiumPriceCol: any = { display: 'flex', flexDirection: 'column' };
const premiumCurrentPrice: any = { fontSize: '0.95rem', fontWeight: '1000', color: '#1a1a1a' };
const premiumOldPrice: any = { fontSize: '0.7rem', color: '#bbb', textDecoration: 'line-through' };
const premiumStepper: any = { display: 'flex', alignItems: 'center', gap: '6px' };
const miniStepBtn: any = { width: '22px', height: '22px', borderRadius: '50%', border: 'none', background: '#27ae60', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };
const miniQty: any = { fontSize: '0.8rem', fontWeight: 'bold', color: '#27ae60', minWidth: '15px', textAlign: 'center' };
const premiumAddBtn: any = { width: '100%', background: '#1a1a1a', color: '#fff', border: 'none', padding: '10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' };
const pageWrapper: any = { maxWidth: '1200px', margin: '0 auto', padding: '40px 20px', direction: 'rtl', backgroundColor: '#fff', minHeight: '100vh' };
const navPath: any = { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '30px', fontSize: '0.9rem', color: '#888' };
const backLink: any = { display: 'flex', alignItems: 'center', gap: '5px', textDecoration: 'none', color: '#1a1a1a', fontWeight: 'bold' };
const pathDivider: any = { color: '#ccc' };
const currentPath: any = { color: '#27ae60' };
const mainContent: any = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '50px', marginBottom: '50px' };
const imageSection: any = { display: 'flex', flexDirection: 'column' };
const mainImageWrapper: any = { backgroundColor: '#f9f9f9', borderRadius: '30px', padding: '40px', border: '1px solid #f0f0f0', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' };
const mainImg: any = { maxWidth: '100%', maxHeight: '450px', objectFit: 'contain' };
const infoSection: any = { display: 'flex', flexDirection: 'column', gap: '20px' };
const brandHeader: any = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const brandTag: any = { background: '#1a1a1a', color: '#fff', padding: '4px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold' };
const stockStatus: any = { display: 'flex', alignItems: 'center', gap: '6px', color: '#27ae60', fontSize: '0.85rem', fontWeight: 'bold' };
const productTitle: any = { fontSize: '2.2rem', fontWeight: '900', color: '#1a1a1a', lineHeight: '1.2' };
const priceContainer: any = { display: 'flex', alignItems: 'baseline', gap: '15px' };
const currentPrice: any = { fontSize: '2.5rem', fontWeight: '1000', color: '#1a1a1a' };
const specCard: any = { background: '#fcfcfc', border: '1px solid #f0f0f0', borderRadius: '24px', padding: '25px' };
const specHeader: any = { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #f0f0f0', paddingBottom: '10px' };
const specCardTitle: any = { fontSize: '1.1rem', fontWeight: '800', color: '#1a1a1a', margin: 0 };
const specGrid: any = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' };
const specItem: any = { display: 'flex', flexDirection: 'column', gap: '5px' };
const specLabel: any = { fontSize: '0.8rem', color: '#888', fontWeight: 'bold' };
const specValue: any = { fontSize: '0.95rem', color: '#1a1a1a', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' };
const actionRow: any = { display: 'flex', gap: '15px', marginTop: '10px' };
const qtyStepper: any = { display: 'flex', alignItems: 'center', gap: '15px', background: '#f5f5f5', padding: '8px 15px', borderRadius: '15px' };
const stepBtn: any = { border: 'none', background: '#fff', width: '35px', height: '35px', borderRadius: '50%', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' };
const qtyValue: any = { fontSize: '1.2rem', fontWeight: 'bold', color: '#27ae60' };
const addToCartBtn: any = { flex: 1, background: '#27ae60', color: '#fff', border: 'none', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', boxShadow: '0 10px 20px rgba(39, 174, 96, 0.2)' };
const loaderWrapper: any = { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' };
const trustBadges: any = { display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '10px' };
const badgeItem: any = { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#555', fontWeight: '600' };
const descriptionSection: any = { borderTop: '1px solid #eee', paddingTop: '40px', marginBottom: '60px' };
const descTitle: any = { fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '20px' };
const descContent: any = { lineHeight: '1.7', color: '#666', fontSize: '1.05rem' };