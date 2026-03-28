'use client';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useCart } from '@/context/CartContext';
import {
  ShoppingCart, Car, Calendar, ShieldCheck,
  ArrowRight, Globe, Plus, Minus, CheckCircle2, Layers, Info, Package, Loader2, ChevronRight, ChevronLeft, Timer,
  Share2, Check, Copy, Facebook, Twitter, Zap, Eye, AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';


// ─── Urgency Counters (inline — before Add to Cart) ───────────────────────────
function UrgencyCounters({ productId }: { productId: string }) {
  const seed = productId
    ? productId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
    : 42;

  const initViewers = 8  + (seed % 18);
  const initStock   = 5  + (seed % 14);

  const [viewers, setViewers] = useState(initViewers);
  const [stock,   setStock]   = useState(initStock);
  const [viewerFlash, setViewerFlash] = useState(false);
  const [stockFlash,  setStockFlash]  = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const tick = () => {
      setViewers(prev => {
        const delta = Math.random() < 0.55 ? 1 : -1;
        const next = Math.min(30, Math.max(5, prev + delta));
        if (next !== prev) { setViewerFlash(true); setTimeout(() => setViewerFlash(false), 500); }
        return next;
      });
    };
    const id = setInterval(tick, 7000 + Math.random() * 7000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const tick = () => {
      setStock(prev => {
        if (prev <= 5) return prev;
        if (Math.random() < 0.35) {
          setStockFlash(true); setTimeout(() => setStockFlash(false), 600);
          return prev - 1;
        }
        return prev;
      });
    };
    const id = setInterval(tick, 45000 + Math.random() * 45000);
    return () => clearInterval(id);
  }, []);

  const isLow = stock <= 8;
  const isMid = stock > 8 && stock <= 14;
  const stockColor  = isLow ? '#dc2626' : isMid ? '#d97706' : '#16a34a';
  const stockAccent = isLow ? 'rgba(220,38,38,0.1)' : isMid ? 'rgba(217,119,6,0.1)' : 'rgba(22,163,74,0.1)';

  if (!visible) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
      {/* Viewers card */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: 'rgba(239,246,255,0.95)', border: '1px solid rgba(191,219,254,0.8)', borderRadius: '14px', direction: 'rtl' }}>
        <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Eye size={16} color="#2563eb" />
        </div>
        <div>
          <div style={{ fontSize: '0.62rem', fontWeight: '700', color: '#9ca3af', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '1px' }}>مشاهدون الآن</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: '900', color: '#1e3a8a', lineHeight: 1, transition: 'transform 0.25s', transform: viewerFlash ? 'scale(1.2)' : 'scale(1)' }}>{viewers}</span>
            <span style={{ fontSize: '0.72rem', fontWeight: '600', color: '#374151' }}>يشاهدون</span>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 0 3px rgba(34,197,94,0.22)', display: 'inline-block', flexShrink: 0 }} />
          </div>
        </div>
      </div>

      {/* Stock card */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: isLow ? 'rgba(255,241,241,0.97)' : isMid ? 'rgba(255,251,235,0.97)' : 'rgba(240,253,244,0.97)', border: `1px solid ${isLow ? 'rgba(254,202,202,0.8)' : isMid ? 'rgba(253,230,138,0.8)' : 'rgba(187,247,208,0.8)'}`, borderRadius: '14px', direction: 'rtl' }}>
        <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: stockAccent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <AlertTriangle size={16} color={stockColor} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.62rem', fontWeight: '700', color: '#9ca3af', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '1px' }}>المخزون</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: '900', color: stockColor, lineHeight: 1, transition: 'transform 0.25s', transform: stockFlash ? 'scale(1.2)' : 'scale(1)' }}>{stock}</span>
            <span style={{ fontSize: '0.72rem', fontWeight: '600', color: '#374151' }}>قطعة فقط</span>
          </div>
          <div style={{ height: '3px', background: 'rgba(0,0,0,0.08)', borderRadius: '99px', overflow: 'hidden', marginTop: '4px' }}>
            <div style={{ height: '100%', borderRadius: '99px', width: `${Math.round((stock / 30) * 100)}%`, background: `linear-gradient(90deg, ${stockColor}99, ${stockColor})`, transition: 'width 0.9s ease' }} />
          </div>
        </div>
      </div>
    </div>
  );
}


// ─── Share Buttons ─────────────────────────────────────────────────────────────
function ShareButtons({ productName, productBrand, price, carMake, carModel, productSlug }: {
  productName: string;
  productBrand: string;
  price: number | string;
  carMake?: string;
  carModel?: string;
  productSlug: string;  // ← now uses slug instead of id
}) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  // ── URL now uses slug ──────────────────────────────────────────────────────
  const url = `https://zaitandfilters.com/products/${productSlug}`;

  const whatsappText = encodeURIComponent(
    `🛒 ${productName} - ${productBrand}\n💰 السعر: ${price} ج.م${carMake ? `\n🚗 لسيارة: ${carMake} ${carModel || ''}` : ''}\n🔗 ${url}`
  );
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  const twitterUrl  = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${productName} - ${productBrand} | ${price} ج.م`)}&url=${encodeURIComponent(url)}`;
  const whatsappUrl = `https://wa.me/?text=${whatsappText}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${productName} - ${productBrand}`,
          text: `${productName} - ${productBrand}\n💰 ${price} ج.م`,
          url,
        });
      } catch { /* user cancelled */ }
    } else {
      setOpen(prev => !prev);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block', flexShrink: 0 }}>
      <button
        onClick={handleShare}
        title="مشاركة المنتج"
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '14px 18px',
          backgroundColor: '#f3f4f6',
          border: '1px solid #e5e7eb',
          borderRadius: '15px',
          cursor: 'pointer',
          fontWeight: '800',
          fontSize: '0.95rem',
          color: '#1a1a1a',
          fontFamily: 'inherit',
          whiteSpace: 'nowrap',
        }}
      >
        <Share2 size={18} /> مشاركة
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 999 }} />
          <div style={{
            position: 'absolute',
            bottom: 'calc(100% + 10px)',
            right: 0,
            backgroundColor: '#fff',
            borderRadius: '16px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
            border: '1px solid #f0f0f0',
            padding: '10px',
            zIndex: 1000,
            minWidth: '195px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            direction: 'rtl',
          }}>
            <p style={{ fontSize: '0.72rem', color: '#aaa', fontWeight: '700', margin: '0 4px 4px', textAlign: 'right' }}>
              شارك المنتج عبر
            </p>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
              onClick={() => setOpen(false)} style={shareBtnStyle('#25D366')}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              واتساب
            </a>
            <a href={facebookUrl} target="_blank" rel="noopener noreferrer"
              onClick={() => setOpen(false)} style={shareBtnStyle('#1877F2')}>
              <Facebook size={17} fill="white" color="white" /> فيسبوك
            </a>
            <a href={twitterUrl} target="_blank" rel="noopener noreferrer"
              onClick={() => setOpen(false)} style={shareBtnStyle('#000')}>
              <Twitter size={17} fill="white" color="white" /> تويتر / X
            </a>
            <div style={{ height: '1px', backgroundColor: '#f0f0f0', margin: '2px 0' }} />
            <button
              onClick={() => { copyLink(); setOpen(false); }}
              style={{ ...shareBtnStyle('#6b7280'), border: 'none', cursor: 'pointer', width: '100%', fontFamily: 'inherit' } as React.CSSProperties}
            >
              {copied ? <Check size={17} /> : <Copy size={17} />}
              {copied ? 'تم النسخ!' : 'نسخ الرابط'}
            </button>
          </div>
        </>
      )}

      {copied && !open && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 8px)', right: 0,
          backgroundColor: '#1a1a1a', color: '#fff',
          padding: '6px 14px', borderRadius: '8px',
          fontSize: '0.8rem', fontWeight: '700',
          whiteSpace: 'nowrap', zIndex: 1000,
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <Check size={13} color="#22c55e" /> تم نسخ الرابط!
        </div>
      )}
    </div>
  );
}

function shareBtnStyle(bg: string): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: '9px',
    padding: '9px 12px',
    backgroundColor: bg, color: '#fff',
    borderRadius: '10px', textDecoration: 'none',
    fontWeight: '800', fontSize: '0.88rem',
    direction: 'rtl',
  };
}
// ──────────────────────────────────────────────────────────────────────────────

// ─── YouTube embed helper ─────────────────────────────────────────────────────
function getYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/|v\/))([A-Za-z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

function YouTubeEmbed({ url }: { url: string }) {
  const videoId = getYouTubeId(url);
  if (!videoId) return null;
  return (
    <div style={{ borderTop: '1px solid #eee', paddingTop: '30px', marginBottom: '40px' }}>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '16px', direction: 'rtl' }}>
        🎬 فيديو المنتج
      </h2>
      <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', borderRadius: '20px', overflow: 'hidden', background: '#000' }}>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
          title="فيديو المنتج"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
        />
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────


function RelatedProductCard({ p, subcategoryImages }: { p: any; subcategoryImages: Record<string, string> }) {
  const [qty, setQty] = useState(1);
  const { addToCart } = useCart();

  const subcatKey = p.subcategory?.trim().toUpperCase();
  const fallbackImage = subcategoryImages[subcatKey] || null;
  const displayImage = p.image_url || fallbackImage || null;
  const country = p.country_of_origin || p.country_origin || p.origin || null;

  // ── Use slug for URL, fallback to id if slug missing ──────────────────────
  const productHref = `/products/${p.slug || p.id}`;

  return (
    <div style={premiumCardStyle}>
      <Link href={productHref} style={{ textDecoration: 'none' }}>
        <div style={{ ...premiumImageArea }} className="related-card-img-wrap">
          {displayImage ? (
            <img src={displayImage} alt={p.name} style={premiumImgFit} />
          ) : (
            <div style={noImgPlaceholder}>
              <Package size={32} color="#ddd" />
            </div>
          )}
          {p.sale_price && Number(p.sale_price) > 0 && (
            <div style={smallSaleBadge}>
              -{Math.round(((p.regular_price - p.sale_price) / p.regular_price) * 100)}%
            </div>
          )}
        </div>
      </Link>

      <div style={premiumDetails}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={premiumBrand}>{p.brand}</span>
          {country && (
            <span style={countryBadge}><Globe size={10} /> {country}</span>
          )}
        </div>

        {/* ── Slug-based link on product name ── */}
        <Link href={productHref} style={{ textDecoration: 'none' }}>
          <h3 style={premiumName}>{p.name}</h3>
        </Link>

        <div style={carInfoBox}>
          {p.car_make && (
            <div style={carInfoRow}>
              <Car size={11} color="#27ae60" />
              <span>{p.car_make}{p.car_model ? ` · ${p.car_model}` : ''}</span>
            </div>
          )}
          {p.car_model_year && (
            <div style={carInfoRow}><Calendar size={11} color="#27ae60" /><span>{p.car_model_year}</span></div>
          )}
          {p.subcategory && (
            <div style={carInfoRow}><Layers size={11} color="#27ae60" /><span>{p.subcategory}</span></div>
          )}
        </div>

        <div style={premiumPriceRow}>
          <div style={premiumPriceCol}>
            <span style={premiumCurrentPrice}>
              {p.sale_price && Number(p.sale_price) > 0 ? p.sale_price : p.regular_price}
              <small style={{ fontSize: '0.65rem', fontWeight: '600', marginRight: '2px' }}> ج.م</small>
            </span>
            {p.sale_price && Number(p.sale_price) > 0 && (
              <span style={premiumOldPrice}>{p.regular_price} ج.م</span>
            )}
          </div>
          <div style={premiumStepper}>
            <button onClick={() => setQty(prev => prev + 1)} style={miniStepBtn}><Plus size={12} /></button>
            <span style={miniQty}>{qty}</span>
            <button onClick={() => qty > 1 && setQty(prev => prev - 1)} style={miniStepBtn}><Minus size={12} /></button>
          </div>
        </div>

        <button onClick={() => addToCart({ ...p, price: p.sale_price || p.regular_price }, qty)} style={premiumAddBtn}>
          <ShoppingCart size={14} /> إضافة
        </button>
      </div>
    </div>
  );
}


export default function ProductDetailsClient({ initialProduct, productId }: { initialProduct: any, productId: string }) {
  const [product, setProduct] = useState<any>(initialProduct);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [subcategoryImages, setSubcategoryImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(!initialProduct);
  const [qty, setQty] = useState(1);
  const [imgError, setImgError] = useState(false);
  const swiperRef = useRef<any>(null);
  const { addToCart } = useCart();

  useEffect(() => {
    async function fetchRelated() {
      if (!product) return;

      const [relatedRes, subcatRes] = await Promise.all([
        supabase.from('products')
          .select('*')
          .eq('car_make', product.car_make)
          .eq('car_model', product.car_model)
          .neq('id', product.id)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase.from('category_images').select('name, image_url'),
      ]);

      if (subcatRes.data) {
        const map: Record<string, string> = {};
        subcatRes.data.forEach(img => {
          if (img.name && img.image_url) {
            map[img.name.trim().toUpperCase()] = img.image_url;
          }
        });
        setSubcategoryImages(map);
      }

      if (relatedRes.data) {
        const subcatCountMap = new Map();
        const filtered = relatedRes.data.filter(item => {
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
  const displayPrice = product.sale_price && Number(product.sale_price) > 0 ? product.sale_price : product.regular_price;

  // ── Slug for share buttons and buy-now link ────────────────────────────────
  const productSlug = product.slug || productId;

  return (
    <>
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

        /* ── Media Slider ── */
        .media-slider-wrap {
          border-radius: 24px;
          border: 1px solid #f0f0f0;
          overflow: hidden;
          background: #f9f9f9;
          position: relative;
        }
        .media-slider-wrap .swiper {
          height: 420px;
        }
        .media-slider-wrap .swiper-slide {
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f9f9f9;
        }
        .media-slider-wrap .swiper-pagination-bullet {
          background: #27ae60;
          opacity: 0.4;
          width: 8px;
          height: 8px;
        }
        .media-slider-wrap .swiper-pagination-bullet-active {
          opacity: 1;
          transform: scale(1.2);
        }
        .media-slider-wrap .swiper-button-prev,
        .media-slider-wrap .swiper-button-next {
          width: 34px;
          height: 34px;
          background: rgba(255,255,255,0.92);
          border-radius: 50%;
          box-shadow: 0 2px 10px rgba(0,0,0,0.12);
          color: #1a1a1a;
        }
        .media-slider-wrap .swiper-button-prev::after,
        .media-slider-wrap .swiper-button-next::after {
          font-size: 13px;
          font-weight: 900;
        }
        .media-slider-wrap .swiper-button-disabled {
          opacity: 0 !important;
        }
        @media (max-width: 768px) {
          .media-slider-wrap .swiper {
            height: 300px;
          }
          .media-slider-wrap {
            border-radius: 18px;
          }
        }
        @media (max-width: 480px) {
          .media-slider-wrap .swiper {
            height: 250px;
          }
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
          border-radius: 11px;
          padding: 11px 14px;
          font-weight: 700;
          font-size: 0.88rem;
          cursor: pointer;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 6px;
          box-shadow: 0 6px 16px rgba(39, 174, 96, 0.25);
          font-family: inherit;
          transition: all 0.18s;
        }

        .add-to-cart-btn:hover {
          background: #219a55;
          transform: translateY(-1px);
          box-shadow: 0 10px 20px rgba(39, 174, 96, 0.35);
        }

        .buy-now-btn {
          width: 100%;
          background: linear-gradient(135deg, #f97316, #ea580c);
          color: #fff;
          border: none;
          border-radius: 11px;
          padding: 11px 14px;
          font-weight: 900;
          font-size: 0.88rem;
          cursor: pointer;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 6px;
          box-shadow: 0 6px 16px rgba(249, 115, 22, 0.26);
          font-family: inherit;
          text-decoration: none;
          transition: all 0.18s;
        }

        .buy-now-btn:hover {
          background: linear-gradient(135deg, #ea580c, #c2410c);
          transform: translateY(-1px);
          box-shadow: 0 10px 20px rgba(249, 115, 22, 0.4);
        }

        @media (max-width: 768px) {
          .buy-now-btn, .add-to-cart-btn {
            padding: 12px 14px;
            font-size: 0.92rem;
            border-radius: 12px;
          }
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

        .share-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .related-swiper .swiper-slide {
          height: auto !important;
        }

        /* ── Related card image zoom ── */
        .related-card-img-wrap {
          overflow: hidden;
        }
        .related-card-img-wrap img {
          transition: transform 0.35s ease;
        }
        .related-card-img-wrap:hover img {
          transform: scale(1.08);
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

          .share-row {
            width: 100%;
          }
          .share-row > div {
            width: 100%;
          }
          .share-row > div > button:first-child {
            width: 100% !important;
            justify-content: center;
          }

          .related-header-mobile {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
          }
        }

        @media (max-width: 480px) {
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

          {/* ── Media Slider ── */}
          {(() => {
            const slides: { type: 'image' | 'video'; src: string }[] = [];
            if (product.video_url) {
              const match = product.video_url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/|v\/))([A-Za-z0-9_-]{11})/);
              if (match) slides.push({ type: 'video', src: match[1] });
            }
            if (imageUrl) slides.push({ type: 'image', src: imageUrl });
            if (slides.length === 0) {
              return (
                <div className="media-slider-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '420px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: '#bbb' }}>
                    <Package size={60} color="#ddd" />
                    <span style={{ fontSize: '0.9rem', fontWeight: '700' }}>لا توجد صورة للمنتج</span>
                  </div>
                </div>
              );
            }
            return (
              <div className="media-slider-wrap" style={{ position: 'relative' }}>
                <Swiper
                  modules={[Pagination]}
                  onSwiper={(swiper) => { swiperRef.current = swiper; }}
                  pagination={slides.length > 1 ? { clickable: true } : false}
                  slidesPerView={1}
                  allowTouchMove={false}
                  style={{ height: '100%' }}
                >
                  {slides.map((slide, i) => (
                    <SwiperSlide key={i}>
                      {slide.type === 'image' ? (
                        <img
                          src={slide.src}
                          alt={product.name}
                          onError={() => setImgError(true)}
                          style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '24px', display: 'block' }}
                        />
                      ) : (
                        <iframe
                          src={`https://www.youtube.com/embed/${slide.src}?rel=0&modestbranding=1`}
                          title="فيديو المنتج"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                        />
                      )}
                    </SwiperSlide>
                  ))}
                </Swiper>

                {slides.length > 1 && (
                  <>
                    <button
                      onClick={() => swiperRef.current?.slidePrev()}
                      aria-label="السابق"
                      style={{
                        position: 'absolute', top: '50%', right: '10px',
                        transform: 'translateY(-50%)',
                        zIndex: 20, width: '36px', height: '36px',
                        borderRadius: '50%', border: 'none',
                        background: 'rgba(255,255,255,0.92)',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
                        cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: '16px', color: '#1a1a1a', fontWeight: '900',
                      }}
                    >‹</button>
                    <button
                      onClick={() => swiperRef.current?.slideNext()}
                      aria-label="التالي"
                      style={{
                        position: 'absolute', top: '50%', left: '10px',
                        transform: 'translateY(-50%)',
                        zIndex: 20, width: '36px', height: '36px',
                        borderRadius: '50%', border: 'none',
                        background: 'rgba(255,255,255,0.92)',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
                        cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: '16px', color: '#1a1a1a', fontWeight: '900',
                      }}
                    >›</button>
                  </>
                )}
              </div>
            );
          })()}

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

            {/* Urgency counters */}
            <UrgencyCounters productId={productId} />

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

            {/* Buy Now — uses slug in checkout URL */}
            <Link
              href={`/checkout?buyNow=true&productId=${productId}&price=${displayPrice}`}
              onClick={() => addToCart({ ...product, price: displayPrice }, qty)}
              className="buy-now-btn"
            >
              <Zap size={20} fill="#fff" />
              اشتري الآن
            </Link>

            {/* Share row — now passes productSlug instead of productId */}
            <div className="share-row">
              <ShareButtons
                productName={product.name}
                productBrand={product.brand}
                price={displayPrice}
                carMake={product.car_make}
                carModel={product.car_model}
                productSlug={productSlug}
              />
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
                spaceBetween={12}
                slidesPerView={1}
                navigation={{ prevEl: '#prev-related', nextEl: '#next-related' }}
                breakpoints={{
                  0:    { slidesPerView: 2,  spaceBetween: 10 },
                  480:  { slidesPerView: 2,  spaceBetween: 12 },
                  768:  { slidesPerView: 3,  spaceBetween: 14 },
                  1024: { slidesPerView: 4,  spaceBetween: 16 },
                }}
                autoplay={{ delay: 3500, disableOnInteraction: false }}
                className="related-swiper"
                style={{ padding: '10px 4px 30px' }}
              >
                {relatedProducts.map((rp) => (
                  <SwiperSlide key={rp.id} style={{ height: 'auto' }}>
                    <RelatedProductCard p={rp} subcategoryImages={subcategoryImages} />
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


// ─── Styles ────────────────────────────────────────────────────────────────────
const carouselFullWrapper: any = { marginTop: '40px', borderTop: '1px solid #f0f0f0', paddingTop: '30px' };
const relatedHeader: any = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' };
const relatedTitle: any = { fontSize: '1.3rem', fontWeight: '900', color: '#1a1a1a', margin: 0 };
const customNavWrapper: any = { display: 'flex', gap: '10px' };
const navCircleBtn: any = { width: '38px', height: '38px', borderRadius: '50%', border: '1px solid #eee', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#1a1a1a' };
const swiperOuterContainer: any = { position: 'relative', width: '100%' };

const premiumCardStyle: any = { background: '#fff', borderRadius: '16px', border: '1px solid #f0f0f0', overflow: 'hidden', height: '100%', boxShadow: '0 4px 15px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', width: '100%' };
const premiumImageArea: any = { height: '160px', background: '#f8f9fa', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', flexShrink: 0 };
const premiumImgFit: any = { width: '100%', height: '100%', objectFit: 'contain', padding: '10px' };
const noImgPlaceholder: any = { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' };
const smallSaleBadge: any = { position: 'absolute', top: '8px', right: '8px', background: '#e74c3c', color: '#fff', padding: '2px 7px', borderRadius: '6px', fontSize: '0.6rem', fontWeight: 'bold' };
const premiumDetails: any = { padding: '10px 12px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' };
const premiumBrand: any = { fontSize: '0.7rem', fontWeight: '800', color: '#27ae60' };
const countryBadge: any = { display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.6rem', color: '#888', fontWeight: '700', background: '#f5f5f5', padding: '2px 6px', borderRadius: '5px' };
const premiumName: any = { fontSize: '0.85rem', fontWeight: '800', color: '#1a1a1a', lineHeight: '1.3', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', margin: '2px 0' };
const carInfoBox: any = { background: '#f8fdf9', borderRadius: '8px', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '2px' };
const carInfoRow: any = { display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.68rem', color: '#555', fontWeight: '700' };
const premiumPriceRow: any = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', background: '#f9f9f9', padding: '7px 8px', borderRadius: '10px' };
const premiumPriceCol: any = { display: 'flex', flexDirection: 'column' };
const premiumCurrentPrice: any = { fontSize: '0.95rem', fontWeight: '900', color: '#1a1a1a' };
const premiumOldPrice: any = { fontSize: '0.65rem', color: '#bbb', textDecoration: 'line-through' };
const premiumStepper: any = { display: 'flex', alignItems: 'center', gap: '5px' };
const miniStepBtn: any = { width: '22px', height: '22px', borderRadius: '50%', border: 'none', background: '#27ae60', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 };
const miniQty: any = { fontSize: '0.8rem', fontWeight: 'bold', color: '#27ae60', minWidth: '15px', textAlign: 'center' };
const premiumAddBtn: any = { width: '100%', background: '#1a1a1a', color: '#fff', border: 'none', padding: '9px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '6px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', fontFamily: 'inherit' };

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