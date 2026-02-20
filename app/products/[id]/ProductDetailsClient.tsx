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
  const [imgError, setImgError] = useState(false);
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

  if (loading && !product) return <div style={loaderWrapper}><Loader2 className="animate-spin" color="#27ae60" size={50} /></div>;
  if (!product) return <div style={{ textAlign: 'center', padding: '100px' }}>المنتج غير موجود.</div>;

  const imageUrl = !imgError && product.image_url ? product.image_url : null;

  return (
    <>
      {/* Responsive styles injected */}
      <style>{`
        .product-page-wrapper {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px 16px 60px;
          direction: rtl;
          background-color: #fff;
          min-height: 100vh;
        }

        .product-main-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 50px;
          margin-bottom: 50px;
        }

        .product-image-box {
          background: #f9f9f9;
          border-radius: 24px;
          border: 1px solid #f0f0f0;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 320px;
          overflow: hidden;
          position: relative;
        }

        .product-main-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          border-radius: 24px;
        }

        .product-img-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: #bbb;
          font-size: 0.9rem;
          font-weight: 700;
          padding: 40px;
          text-align: center;
        }

        .product-info-section {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .action-row-mobile {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .add-to-cart-btn {
          flex: 1;
          background: #27ae60;
          color: #fff;
          border: none;
          border-radius: 15px;
          padding: 16px 20px;
          font-weight: bold;
          font-size: 1rem;
          cursor: pointer;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
          box-shadow: 0 10px 20px rgba(39, 174, 96, 0.2);
          font-family: inherit;
        }

        .qty-stepper {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #f5f5f5;
          padding: 8px 14px;
          border-radius: 15px;
          flex-shrink: 0;
        }

        @media (max-width: 768px) {
          .product-page-wrapper {
            padding: 12px 12px 80px;
          }

          .product-main-grid {
            grid-template-columns: 1fr;
            gap: 20px;
            margin-bottom: 30px;
          }

          .product-image-box {
            min-height: 260px;
            border-radius: 18px;
          }

          .product-main-img {
            border-radius: 18px;
          }

          .product-title-mobile {
            font-size: 1.6rem !important;
            line-height: 1.3 !important;
          }

          .product-price-mobile {
            font-size: 1.8rem !important;
          }

          .spec-grid-mobile {
            grid-template-columns: 1fr 1fr !important;
            gap: 12px !important;
          }

          .action-row-mobile {
            flex-direction: column;
            gap: 10px;
          }

          .add-to-cart-btn {
            width: 100%;
            padding: 18px;
            font-size: 1.1rem;
            border-radius: 18px;
          }

          .qty-stepper {
            width: 100%;
            justify-content: center;
          }

          .related-header-mobile {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
          }
        }

        @media (max-width: 480px) {
          .product-image-box {
            min-height: 220px;
          }

          .spec-grid-mobile {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>

      <div className="product-page-wrapper">

        {/* Breadcrumb */}
        <div style={navPath}>
          <Link href="/store" style={backLink}><ArrowRight size={18} /> المتجر</Link>
          <span style={pathDivider}>/</span>
          <span style={currentPath}>{product.category}</span>
        </div>

        {/* Main Grid */}
        <div className="product-main-grid">

          {/* Image */}
          <div className="product-image-box">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={product.name}
                className="product-main-img"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="product-img-placeholder">
                <Package size={60} color="#ddd" />
                <span>لا توجد صورة للمنتج</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="product-info-section">

            <div style={brandHeader}>
              <span style={brandTag}>{product.brand}</span>
              <div style={stockStatus}><CheckCircle2 size={16} /> متوفر</div>
            </div>

            <h1 className="product-title-mobile" style={productTitle}>{product.name}</h1>

            <div style={priceContainer}>
              {product.sale_price && Number(product.sale_price) > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span className="product-price-mobile" style={currentPrice}>{product.sale_price} <small>ج.م</small></span>
                  <span style={{ color: '#bbb', textDecoration: 'line-through', fontSize: '1rem' }}>{product.regular_price} ج.م</span>
                </div>
              ) : (
                <span className="product-price-mobile" style={currentPrice}>{product.regular_price} <small>ج.م</small></span>
              )}
            </div>

            {/* Specs */}
            <div style={specCard}>
              <div style={specHeader}>
                <Info size={18} color="#27ae60" />
                <h3 style={specCardTitle}>المواصفات الفنية</h3>
              </div>
              <div className="spec-grid-mobile" style={specGrid}>
                <div style={specItem}><span style={specLabel}>الماركة</span><span style={specValue}><Car size={14} /> {product.car_make}</span></div>
                <div style={specItem}><span style={specLabel}>الموديل</span><span style={specValue}><Layers size={14} /> {product.car_model}</span></div>
                <div style={specItem}><span style={specLabel}>السنة</span><span style={specValue}><Calendar size={14} /> {product.car_model_year || 'الكل'}</span></div>
                <div style={specItem}><span style={specLabel}>المنشأ</span><span style={specValue}><Globe size={14} /> {product.country_of_origin || 'أصلي'}</span></div>
                <div style={specItem}><span style={specLabel}>القسم</span><span style={specValue}>{product.category}</span></div>
                <div style={specItem}><span style={specLabel}>القسم الفرعي</span><span style={specValue}>{product.subcategory || '-'}</span></div>
                <div style={specItem}><span style={specLabel}>الضمان</span><span style={specValue}><Timer size={14} /> {product.warranty_duration || 'ضمان استبدال'}</span></div>
              </div>
            </div>

            {/* Qty + Cart */}
            <div className="action-row-mobile">
              <div className="qty-stepper">
                <button onClick={() => setQty(prev => prev + 1)} style={stepBtn}><Plus size={18} /></button>
                <span style={qtyValue}>{qty}</span>
                <button onClick={() => qty > 1 && setQty(prev => prev - 1)} style={stepBtn}><Minus size={18} /></button>
              </div>
              <button onClick={() => addToCart(product, qty)} className="add-to-cart-btn">
                <ShoppingCart size={20} /> إضافة للسلة
              </button>
            </div>

            {/* Trust Badges */}
            <div style={trustBadges}>
              <div style={badgeItem}><ShieldCheck size={16} color="#27ae60" /> قطع غيار أصلية ومختبرة</div>
              <div style={badgeItem}><ShieldCheck size={16} color="#27ae60" /> مطابقة 100% لمواصفات سيارتك</div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div style={descriptionSection}>
          <h2 style={descTitle}>وصف المنتج</h2>
          <div style={descContent}>{generateAutoDescription()}</div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section style={carouselFullWrapper}>
            <div className="related-header-mobile" style={relatedHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Package size={24} color="#27ae60" />
                <h2 style={relatedTitle}>قطع غيار لسيارة {product.car_make} {product.car_model}</h2>
              </div>
              <div style={customNavWrapper}>
                <button id="prev-related" style={navCircleBtn}><ChevronRight size={22} /></button>
                <button id="next-related" style={navCircleBtn}><ChevronLeft size={22} /></button>
              </div>
            </div>

            <div style={swiperOuterContainer}>
              <Swiper
                modules={[Navigation, Autoplay]}
                spaceBetween={14}
                slidesPerView={1.3}
                navigation={{ prevEl: '#prev-related', nextEl: '#next-related' }}
                breakpoints={{
                  480: { slidesPerView: 2.2 },
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
    </>
  );
}

// Styles
const carouselFullWrapper: any = { marginTop: '40px', borderTop: '1px solid #f0f0f0', paddingTop: '30px' };
const relatedHeader: any = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' };
const relatedTitle: any = { fontSize: '1.3rem', fontWeight: '900', color: '#1a1a1a', margin: 0 };
const customNavWrapper: any = { display: 'flex', gap: '10px' };
const navCircleBtn: any = { width: '38px', height: '38px', borderRadius: '50%', border: '1px solid #eee', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#1a1a1a' };
const swiperOuterContainer: any = { position: 'relative', width: '100%' };
const premiumCardStyle: any = { background: '#fff', borderRadius: '18px', border: '1px solid #f0f0f0', overflow: 'hidden', height: '100%', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column' };
const premiumImageArea: any = { height: '150px', background: '#f8f9fa', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' };
const premiumImgFit: any = { width: '100%', height: '100%', objectFit: 'cover' };
const smallSaleBadge: any = { position: 'absolute', top: '8px', right: '8px', background: '#e74c3c', color: '#fff', padding: '2px 8px', borderRadius: '6px', fontSize: '0.6rem', fontWeight: 'bold' };
const premiumDetails: any = { padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' };
const premiumBrand: any = { fontSize: '0.7rem', fontWeight: 'bold', color: '#27ae60' };
const premiumName: any = { fontSize: '0.88rem', fontWeight: '800', color: '#1a1a1a', height: '2.4em', overflow: 'hidden', lineHeight: '1.2' };
const premiumPriceRow: any = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', background: '#f9f9f9', padding: '8px', borderRadius: '10px' };
const premiumPriceCol: any = { display: 'flex', flexDirection: 'column' };
const premiumCurrentPrice: any = { fontSize: '0.95rem', fontWeight: '900', color: '#1a1a1a' };
const premiumOldPrice: any = { fontSize: '0.7rem', color: '#bbb', textDecoration: 'line-through' };
const premiumStepper: any = { display: 'flex', alignItems: 'center', gap: '5px' };
const miniStepBtn: any = { width: '22px', height: '22px', borderRadius: '50%', border: 'none', background: '#27ae60', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };
const miniQty: any = { fontSize: '0.8rem', fontWeight: 'bold', color: '#27ae60', minWidth: '15px', textAlign: 'center' };
const premiumAddBtn: any = { width: '100%', background: '#1a1a1a', color: '#fff', border: 'none', padding: '10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontFamily: 'inherit' };
const navPath: any = { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', fontSize: '0.88rem', color: '#888', flexWrap: 'wrap' };
const backLink: any = { display: 'flex', alignItems: 'center', gap: '5px', textDecoration: 'none', color: '#1a1a1a', fontWeight: 'bold' };
const pathDivider: any = { color: '#ccc' };
const currentPath: any = { color: '#27ae60' };
const brandHeader: any = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const brandTag: any = { background: '#1a1a1a', color: '#fff', padding: '4px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold' };
const stockStatus: any = { display: 'flex', alignItems: 'center', gap: '6px', color: '#27ae60', fontSize: '0.85rem', fontWeight: 'bold' };
const productTitle: any = { fontSize: '2rem', fontWeight: '900', color: '#1a1a1a', lineHeight: '1.3', margin: 0 };
const priceContainer: any = { display: 'flex', alignItems: 'baseline', gap: '15px' };
const currentPrice: any = { fontSize: '2.2rem', fontWeight: '900', color: '#1a1a1a' };
const specCard: any = { background: '#fcfcfc', border: '1px solid #f0f0f0', borderRadius: '20px', padding: '20px' };
const specHeader: any = { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', borderBottom: '1px solid #f0f0f0', paddingBottom: '10px' };
const specCardTitle: any = { fontSize: '1rem', fontWeight: '800', color: '#1a1a1a', margin: 0 };
const specGrid: any = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' };
const specItem: any = { display: 'flex', flexDirection: 'column', gap: '4px' };
const specLabel: any = { fontSize: '0.75rem', color: '#888', fontWeight: 'bold' };
const specValue: any = { fontSize: '0.9rem', color: '#1a1a1a', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px' };
const stepBtn: any = { border: 'none', background: '#fff', width: '34px', height: '34px', borderRadius: '50%', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' };
const qtyValue: any = { fontSize: '1.2rem', fontWeight: 'bold', color: '#27ae60', minWidth: '28px', textAlign: 'center' };
const loaderWrapper: any = { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' };
const trustBadges: any = { display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' };
const badgeItem: any = { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#555', fontWeight: '600' };
const descriptionSection: any = { borderTop: '1px solid #eee', paddingTop: '30px', marginBottom: '40px' };
const descTitle: any = { fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '16px' };
const descContent: any = { lineHeight: '1.8', color: '#666', fontSize: '1rem' };