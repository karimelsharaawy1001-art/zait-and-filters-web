'use client';
import { useEffect, useState, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { supabase } from '@/app/lib/supabase';
import { useCart } from '@/context/CartContext';
import {
  ShoppingCart, Car, Calendar, ShieldCheck,
  ArrowRight, Globe, Plus, Minus, CheckCircle2, Layers, Info, Package, Loader2,
  ChevronRight, ChevronLeft, Timer, Share2, Check, Copy, Facebook, Twitter,
  Zap, Star, Send, User, LayoutGrid, Tag, Play
} from 'lucide-react';
import Link from 'next/link';
import { Swiper, SwiperSlide } from 'swiper/react';
import { optimizeImageUrl } from '@/lib/images';
import ImageLightbox from '@/components/ImageLightbox';
import { Navigation, Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

// ─── Animation variants ───────────────────────────────────────────────────────
const fadeUp:    any = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } } };
const stagger:   any = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const slideLeft: any = { hidden: { opacity: 0, x: 30 }, show: { opacity: 1, x: 0, transition: { duration: 0.5, ease: 'easeOut' } } };
const slideRight:any = { hidden: { opacity: 0, x: -30 }, show: { opacity: 1, x: 0, transition: { duration: 0.5, ease: 'easeOut' } } };

// ─── Stars ────────────────────────────────────────────────────────────────────
function StarSelector({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} type="button"
          onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}>
          <Star size={24} fill={(hover || value) >= i ? '#f59e0b' : 'none'} color={(hover || value) >= i ? '#f59e0b' : '#6b7280'} />
        </button>
      ))}
    </div>
  );
}

function StarDisplay({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size} fill={i <= rating ? '#f59e0b' : 'none'} color={i <= rating ? '#f59e0b' : '#6b7280'} />
      ))}
    </div>
  );
}

// ─── Reviews ──────────────────────────────────────────────────────────────────
interface Review { id: string; customer_name: string; rating: number; comment: string; created_at: string; }

function ReviewsSection({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', rating: 0, comment: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch(`/api/reviews?product_id=${productId}`)
      .then(r => r.json())
      .then(d => { setReviews(d.reviews || []); setLoadingReviews(false); });
  }, [productId]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'الاسم مطلوب';
    if (form.rating === 0) e.rating = 'اختر تقييماً';
    if (form.comment.trim().length < 10) e.comment = 'اكتب تعليقاً (10 أحرف على الأقل)';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, customer_name: form.name, customer_email: form.email || null, rating: form.rating, comment: form.comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSubmitted(true); setShowForm(false);
      setForm({ name: '', email: '', rating: 0, comment: '' });
    } catch (err: unknown) {
      setErrors({ submit: err instanceof Error ? err.message : 'حدث خطأ' });
    } finally { setSubmitting(false); }
  };

  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <m.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.1 }} variants={fadeUp}
      className="pdp-section"
      style={{ background: '#ffffff', borderRadius: '24px', padding: '24px', marginBottom: '20px', border: '1px solid #f3f4f6', direction: 'rtl' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '900', margin: 0, color: '#1a1a1a' }}>تقييمات العملاء</h2>
          {reviews.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', border: '1px solid #166534', borderRadius: '20px', padding: '4px 12px' }}>
              <StarDisplay rating={Math.round(avgRating)} />
              <span style={{ fontSize: '0.88rem', fontWeight: '800', color: '#fbbf24' }}>{avgRating.toFixed(1)}</span>
              <span style={{ fontSize: '0.78rem', color: '#fbbf24' }}>({reviews.length})</span>
            </div>
          )}
        </div>
        {!submitted ? (
          <button onClick={() => setShowForm(f => !f)}
            style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 18px', background: showForm ? '#f3f4f6' : '#e5e7eb', color: showForm ? '#6b7280' : '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '0.88rem', fontFamily: 'inherit', transition: 'all 0.15s' }}>
            <Star size={15} fill={showForm ? 'none' : '#fff'} /> {showForm ? 'إلغاء' : 'اكتب تقييماً'}
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#f0fdf4', border: '1px solid #166534', borderRadius: '10px', color: '#15803d', fontWeight: '700', fontSize: '0.85rem' }}>
            <Check size={14} /> شكراً! تقييمك قيد المراجعة
          </div>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <m.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '22px', marginBottom: '24px', overflow: 'hidden' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '800', margin: '0 0 16px', color: '#1a1a1a' }}>أضف تقييمك</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#6b7280', marginBottom: '6px' }}>الاسم *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="اسمك" style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${errors.name ? '#16a34a' : '#e5e7eb'}`, borderRadius: '10px', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const }} />
                {errors.name && <p style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: '600', margin: '4px 0 0' }}>{errors.name}</p>}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#6b7280', marginBottom: '6px' }}>الإيميل (اختياري)</label>
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const }} dir="ltr" />
              </div>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#6b7280', marginBottom: '6px' }}>التقييم *</label>
              <StarSelector value={form.rating} onChange={r => setForm(f => ({ ...f, rating: r }))} />
              {errors.rating && <p style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: '600', margin: '4px 0 0' }}>{errors.rating}</p>}
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#6b7280', marginBottom: '6px' }}>تعليقك *</label>
              <textarea value={form.comment} onChange={e => setForm(f => ({ ...f, comment: e.target.value }))} placeholder="شاركنا رأيك في المنتج..." rows={4} style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${errors.comment ? '#16a34a' : '#e5e7eb'}`, borderRadius: '10px', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none', resize: 'vertical' as const, minHeight: '90px', boxSizing: 'border-box' as const }} />
              {errors.comment && <p style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: '600', margin: '4px 0 0' }}>{errors.comment}</p>}
            </div>
            {errors.submit && <p style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: '600', marginBottom: '12px' }}>{errors.submit}</p>}
            <button onClick={handleSubmit} disabled={submitting}
              style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '12px 24px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '11px', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: '800', fontSize: '0.9rem', fontFamily: 'inherit', opacity: submitting ? 0.7 : 1 }}>
              {submitting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={15} />}
              {submitting ? 'جاري الإرسال...' : 'إرسال التقييم'}
            </button>
          </m.div>
        )}
      </AnimatePresence>

      {loadingReviews ? (
        <div style={{ textAlign: 'center', padding: '30px', color: '#6b7280' }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 8px' }} />
        </div>
      ) : reviews.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#374151', background: '#f9fafb', borderRadius: '14px' }}>
          <Star size={36} strokeWidth={1} style={{ display: 'block', margin: '0 auto 10px' }} />
          <p style={{ fontWeight: '700', fontSize: '0.95rem' }}>لا توجد تقييمات بعد — كن أول من يقيّم!</p>
        </div>
      ) : (
        <m.div initial="hidden" animate="show" variants={stagger} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {reviews.map(r => (
            <m.div key={r.id} variants={fadeUp} style={{ background: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: '16px', padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg,#22c55e,#16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <User size={18} color="#fff" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#1a1a1a' }}>{r.customer_name}</div>
                    <StarDisplay rating={r.rating} />
                  </div>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>
                  {new Date(r.created_at).toLocaleDateString('ar-EG', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <p style={{ fontSize: '0.9rem', color: '#374151', lineHeight: '1.65', margin: 0 }}>{r.comment}</p>
            </m.div>
          ))}
        </m.div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </m.div>
  );
}

// ─── Share Buttons ─────────────────────────────────────────────────────────────
function ShareButtons({ productName, productBrand, price, carMake, carModel, productSlug }: {
  productName: string; productBrand: string; price: number | string;
  carMake?: string; carModel?: string; productSlug: string;
}) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const url = `https://zaitandfilters.com/products/${productSlug}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  const twitterUrl  = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${productName} - ${productBrand} | ${price} ج.م`)}&url=${encodeURIComponent(url)}`;
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(url); } catch {
      const el = document.createElement('textarea'); el.value = url; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el);
    }
    setCopied(true); setTimeout(() => setCopied(false), 2500);
  };
  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: `${productName} - ${productBrand}`, text: `${productName} - ${productBrand}\n💰 ${price} ج.م`, url }); } catch { /* cancelled */ }
    } else { setOpen(prev => !prev); }
  };
  const btnStyle = (bg: string): React.CSSProperties => ({ display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 12px', backgroundColor: bg, color: '#fff', borderRadius: '10px', textDecoration: 'none', fontWeight: '800', fontSize: '0.88rem', direction: 'rtl' as const });
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={handleShare} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 18px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '14px', cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem', color: '#374151', fontFamily: 'inherit' }}>
        <Share2 size={17} /> مشاركة
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 999 }} />
            <m.div initial={{ opacity: 0, scale: 0.92, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 8 }}
              style={{ position: 'absolute', bottom: 'calc(100% + 10px)', right: 0, backgroundColor: '#ffffff', borderRadius: '18px', boxShadow: '0 12px 40px rgba(0,0,0,0.14)', border: '1px solid #f3f4f6', padding: '12px', zIndex: 1000, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '6px', direction: 'rtl' }}>
              <p style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: '700', margin: '0 4px 4px' }}>شارك عبر</p>
              <a href={facebookUrl} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} style={btnStyle('#1877F2')}><Facebook size={17} fill="white" color="white" /> فيسبوك</a>
              <a href={twitterUrl} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} style={btnStyle('#1a1a1a')}><Twitter size={17} fill="white" color="white" /> تويتر</a>
              <div style={{ height: '1px', background: '#f3f4f6', margin: '2px 0' }} />
              <button onClick={() => { copyLink(); setOpen(false); }} style={{ ...btnStyle('#6b7280'), border: 'none', cursor: 'pointer', width: '100%', fontFamily: 'inherit' }}>
                {copied ? <Check size={17} /> : <Copy size={17} />}{copied ? 'تم النسخ!' : 'نسخ الرابط'}
              </button>
            </m.div>
          </>
        )}
      </AnimatePresence>
      {copied && !open && (
        <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', right: 0, backgroundColor: '#ffffff', color: '#1a1a1a', padding: '6px 14px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: '700', whiteSpace: 'nowrap', zIndex: 1000, display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #e5e7eb' }}>
          <Check size={13} color="#22c55e" /> تم نسخ الرابط!
        </div>
      )}
    </div>
  );
}

// ─── Related Product Card ─────────────────────────────────────────────────────
function RelatedProductCard({ p, subcategoryImages }: { p: any; subcategoryImages: Record<string, string> }) {
  const [qty, setQty] = useState(1);
  const { addToCart } = useCart();
  const displayImage = p.image_url || subcategoryImages[p.subcategory?.trim().toUpperCase()] || null;
  const price = p.sale_price && Number(p.sale_price) > 0 ? p.sale_price : p.regular_price;
  const hasSale = p.sale_price && Number(p.sale_price) > 0;
  return (
    <m.div whileHover={{ y: -6, boxShadow: '0 20px 50px rgba(34,197,94,0.14)' }} transition={{ duration: 0.25 }}
      style={{ background: '#ffffff', borderRadius: '20px', border: '1px solid #f3f4f6', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
      <Link href={`/products/${p.slug || p.id}`} style={{ textDecoration: 'none', display: 'block', position: 'relative', height: '160px', background: '#f9fafb', overflow: 'hidden' }}>
        {displayImage ? (
          <img src={optimizeImageUrl(displayImage)} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><Package size={36} color="#e5e7eb" /></div>
        )}
        {hasSale && (
          <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'linear-gradient(135deg,#16a34a,#16a34a)', color: '#fff', padding: '3px 8px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: '900' }}>
            -{Math.round(((p.regular_price - p.sale_price) / p.regular_price) * 100)}%
          </div>
        )}
      </Link>
      <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ color: '#22c55e', fontWeight: '800', fontSize: '0.72rem', textTransform: 'uppercase' as const, letterSpacing: '0.4px' }}>{p.brand}</span>
        <Link href={`/products/${p.slug || p.id}`} style={{ textDecoration: 'none' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#1a1a1a', lineHeight: '1.35', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden', margin: 0 }}>{p.name}</h3>
        </Link>
        {(() => {
          const univ = ['universal','عام','all','الكل',''];
          const mk = (p.car_make||'').trim();
          const mo = (p.car_model||'').trim();
          if (!mk || univ.includes(mk.toLowerCase())) return null;
          const cleanMo = univ.includes(mo.toLowerCase()) ? '' : mo;
          return (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '4px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', color: '#15803d', fontWeight: '700', background: '#f0fdf4', border: '1px solid #166534', borderRadius: '12px', padding: '3px 8px', alignSelf: 'flex-start' as const, maxWidth: '100%', overflow: 'hidden' }}>
                <Car size={10} style={{ flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{mk}{cleanMo ? ' ' + cleanMo : ''}</span>
              </span>
              {p.car_model_year && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: '#60a5fa', fontWeight: '700', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '2px 8px', alignSelf: 'flex-start' as const }}>
                  <Calendar size={9} />{p.car_model_year}
                </span>
              )}
            </div>
          );
        })()}
        <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '8px' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#1a1a1a' }}>{price}</span>
            <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#1a1a1a' }}>ج.م</span>
            {hasSale && <span style={{ fontSize: '0.72rem', color: '#6b7280', textDecoration: 'line-through' }}>{p.regular_price} ج.م</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f9fafb', borderRadius: '10px', padding: '4px 8px', border: '1px solid #e5e7eb' }}>
              <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}><Minus size={11} /></button>
              <span style={{ fontSize: '0.85rem', fontWeight: '900', color: '#22c55e', minWidth: '16px', textAlign: 'center' }}>{qty}</span>
              <button onClick={() => setQty(q => q + 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}><Plus size={11} /></button>
            </div>
            <button onClick={() => addToCart({ ...p, price }, qty)} style={{ flex: 1, background: '#22c55e', color: '#fff', border: 'none', padding: '9px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
              <ShoppingCart size={13} /> أضف
            </button>
          </div>
        </div>
      </div>
    </m.div>
  );
}

// ─── Spec Item ────────────────────────────────────────────────────────────────
function SpecItem({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <m.div variants={fadeUp} style={{ background: '#f9fafb', borderRadius: '14px', padding: '12px 14px', border: '1px solid #f3f4f6' }}>
      <div style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: '700', marginBottom: '4px', textTransform: 'uppercase' as const, letterSpacing: '0.4px' }}>{label}</div>
      <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#1a1a1a', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
        {icon && <span style={{ flexShrink: 0, marginTop: '1px' }}>{icon}</span>}
        <span style={{ wordBreak: 'break-word' as const, minWidth: 0, flex: 1 }}>{value}</span>
      </div>
    </m.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ProductDetailsClient({ initialProduct, productId }: { initialProduct: any; productId: string }) {
  const [product] = useState<any>(initialProduct);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [subcategoryImages, setSubcategoryImages] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);
  const [imgError, setImgError] = useState(false);
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);
  const [playYoutube, setPlayYoutube] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const swiperRef = useRef<any>(null);
  const { addToCart, cartItems } = useCart();

  useEffect(() => {
    if (!product) return;
    async function fetchRelated() {
      const [relatedRes, subcatRes] = await Promise.all([
        supabase.from('products').select('*').eq('car_make', product.car_make).eq('car_model', product.car_model).neq('id', product.id).order('created_at', { ascending: false }).limit(50),
        supabase.from('category_images').select('name, image_url'),
      ]);
      if (subcatRes.data) {
        const map: Record<string, string> = {};
        subcatRes.data.forEach((img: any) => { if (img.name && img.image_url) map[img.name.trim().toUpperCase()] = img.image_url; });
        setSubcategoryImages(map);
      }
      if (relatedRes.data) {
        const subcatMap = new Map<string, number>();
        setRelatedProducts(relatedRes.data.filter(item => {
          const count = subcatMap.get(item.subcategory) || 0;
          if (count < 2) { subcatMap.set(item.subcategory, count + 1); return true; }
          return false;
        }));
      }
    }
    fetchRelated();
  }, [product]);

  const generateDesc = () => {
    if (!product) return '';
    const originMap: Record<string, string> = { 'صيني': 'الصين', 'كوري': 'كوريا', 'ياباني': 'اليابان', 'ألماني': 'ألمانيا', 'تركي': 'تركيا', 'إيطالي': 'إيطاليا' };
    const origin = originMap[product.country_of_origin] || product.country_of_origin || '';
    let d = `احصل الآن على ${product.name || 'هذا المنتج'} بجودة عالية من ماركة ${product.brand || 'أصلية'}.`;
    if (product.car_make || product.car_model) d += ` تم تصميم هذه القطعة خصيصاً لسيارات ${product.car_make || ''} ${product.car_model || ''} ${product.car_model_year ? `موديل ${product.car_model_year}` : ''}.`;
    if (origin) d += ` مصنّعة في ${origin} مما يضمن أداءً مثالياً وعمراً افتراضياً طويلاً.`;
    return d;
  };

  if (!product) return (
    <div style={{ textAlign: 'center', padding: '100px 20px', color: '#6b7280' }}>
      <Package size={48} style={{ margin: '0 auto 16px', display: 'block' }} />
      <p style={{ fontWeight: '700' }}>المنتج غير موجود.</p>
    </div>
  );

  const isOutOfStock = product.is_active === false || (product.stock_quantity != null && Number(product.stock_quantity) === 0);
  const imageUrl = !imgError && product.image_url ? product.image_url : null;
  const displayPrice = product.sale_price && Number(product.sale_price) > 0 ? product.sale_price : product.regular_price;
  const hasSale = product.sale_price && Number(product.sale_price) > 0;
  const savingsAmt = hasSale ? (product.regular_price - product.sale_price) : 0;
  const discPct = hasSale ? Math.round((savingsAmt / product.regular_price) * 100) : 0;
  const productSlug = product.slug || productId;

  const slides: { type: 'image' | 'video' | 'youtube'; src: string }[] = [];
  // Product image FIRST so the photo is always the primary/visible slide,
  // falling back to the category/subcategory image for video-only products.
  const fallbackImg =
    subcategoryImages[(product.category || '').trim().toUpperCase()] ||
    subcategoryImages[(product.subcategory || '').trim().toUpperCase()] ||
    null;
  const effectiveImage = imageUrl || fallbackImg;
  if (effectiveImage) slides.push({ type: 'image', src: effectiveImage });
  // Then the video (YouTube any variant, or a direct/Cloudinary video file).
  const videoUrl = product.video_url ? String(product.video_url) : '';
  if (videoUrl) {
    const yt = videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/|v\/))([A-Za-z0-9_-]{11})/);
    if (yt) {
      slides.push({ type: 'youtube', src: yt[1] });
    } else if (/\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(videoUrl) || /res\.cloudinary\.com\/.+\/video\//.test(videoUrl)) {
      slides.push({ type: 'video', src: videoUrl });
    }
  }

  const univ = ['universal', 'عام', 'all', 'الكل', ''];
  const make = (product.car_make || '').trim();
  const model = (product.car_model || '').trim();
  const compatText = univ.includes(make.toLowerCase()) ? 'جميع السيارات' : `${make}${univ.includes(model.toLowerCase()) ? '' : ' ' + model}`;

  return (
    <>
      <style>{`
        .pdp-wrapper { max-width: 1200px; margin: 0 auto; padding: 20px 16px 24px; direction: rtl; }
        .pdp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 32px; align-items: start; }
        .pdp-media { position: sticky; top: 100px; }
        .pdp-slider { border-radius: 28px; overflow: hidden; background: #f9fafb; border: 1px solid #f3f4f6; box-shadow: 0 4px 32px rgba(0,0,0,0.06); height: 460px; position: relative; }
        .pdp-slider .swiper { height: 460px; }
        .pdp-slider .swiper-slide { display: flex; align-items: center; justify-content: center; height: 460px !important; position: relative; background: #f9fafb; }
        .pdp-slider .swiper-pagination-bullet { background: #22c55e; opacity: 0.4; }
        .pdp-slider .swiper-pagination-bullet-active { opacity: 1; transform: scale(1.3); }
        .pdp-info { display: flex; flex-direction: column; gap: 22px; }
        .pdp-btn-primary { width: 100%; padding: 16px; background: linear-gradient(135deg,#22c55e 0%,#16a34a 100%); color: #fff; border: none; border-radius: 16px; font-weight: 900; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 8px 24px rgba(34,197,94,0.35); font-family: inherit; transition: all 0.2s; letter-spacing: 0.3px; text-decoration: none; }
        .pdp-btn-primary:hover { box-shadow: 0 12px 32px rgba(34,197,94,0.5); transform: translateY(-2px); }
        .pdp-btn-secondary { width: 100%; padding: 15px; background: #0f172a; color: #fff; border: 1.5px solid #0f172a; border-radius: 16px; font-weight: 800; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; font-family: inherit; transition: all 0.2s; }
        .pdp-btn-secondary:hover { background: #000; border-color: #000; transform: translateY(-1px); }
        .pdp-stepper { display: flex; align-items: center; gap: 0; background: #f9fafb; border: 1.5px solid #e5e7eb; border-radius: 14px; overflow: hidden; }
        .pdp-step-btn { width: 44px; height: 48px; background: none; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #6b7280; transition: background 0.15s; }
        .pdp-step-btn:hover { background: #f0fdf4; color: #16a34a; }
        .pdp-qty { font-size: 1.1rem; font-weight: 900; color: '#1a1a1a'; min-width: 36px; text-align: center; }
        .pdp-trust-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: #f9fafb; border: 1px solid #f3f4f6; border-radius: 12px; font-size: 0.85rem; color: #6b7280; font-weight: '700'; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulseDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.8)} }
        @media (max-width: 900px) {
          .pdp-grid { grid-template-columns: 1fr; gap: 16px; margin-bottom: 20px; }
          .pdp-media { position: static; }
          .pdp-slider { height: 300px; border-radius: 18px; }
          .pdp-slider .swiper { height: 300px; }
          .pdp-slider .swiper-slide { height: 300px !important; }
        }
        @media (max-width: 768px) {
          .pdp-wrapper { padding: 12px 12px 8px; }
          .pdp-info { gap: 12px; }
          .pdp-section { padding: 16px !important; border-radius: 16px !important; margin-bottom: 14px !important; }
          .pdp-btn-primary { padding: 14px !important; font-size: 0.95rem !important; border-radius: 14px !important; }
          .pdp-btn-secondary { padding: 13px !important; font-size: 0.95rem !important; border-radius: 14px !important; }
          .pdp-step-btn { width: 40px !important; height: 44px !important; }
          .pdp-trust-item { padding: 8px 10px !important; font-size: 0.78rem !important; }
        }
        @media (max-width: 480px) {
          .pdp-slider { height: 240px; border-radius: 16px; }
          .pdp-slider .swiper { height: 240px; }
          .pdp-slider .swiper-slide { height: 240px !important; }
          .pdp-info { gap: 10px; }
          .pdp-section { padding: 14px !important; }
        }
        .related-swiper .swiper-slide { height: auto !important; }
      `}</style>

      <div className="pdp-wrapper">

        {/* Breadcrumb */}
        <m.div initial={false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', fontSize: '0.85rem', color: '#6b7280', flexWrap: 'wrap' as const }}>
          <Link href="/store" style={{ display: 'flex', alignItems: 'center', gap: '5px', textDecoration: 'none', color: '#6b7280', fontWeight: '700' }}>
            <ArrowRight size={16} /> المتجر
          </Link>
          <ChevronLeft size={14} color="#374151" />
          {product.category && <><span style={{ color: '#6b7280' }}>{product.category}</span><ChevronLeft size={14} color="#374151" /></>}
          <span style={{ color: '#22c55e', fontWeight: '700', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{product.name}</span>
        </m.div>

        <div className="pdp-grid">

          {/* ── Media ── */}
          <div className="pdp-media">
            <div>
              {slides.length === 0 ? (
                <div className="pdp-slider" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center', color: '#374151' }}><Package size={64} /><p style={{ fontWeight: '700', marginTop: '12px' }}>لا توجد صورة</p></div>
                </div>
              ) : (
                <>
                  {/* Swiper-free, SSR-safe gallery */}
                  <div className="pdp-slider">
                    {(() => {
                      const slide = slides[Math.min(activeSlide, slides.length - 1)];
                      if (slide.type === 'image') {
                        return <img src={optimizeImageUrl(slide.src)} alt={product.name} onClick={() => setZoomSrc(optimizeImageUrl(slide.src))} style={{ width: '100%', height: '100%', objectFit: 'contain', cursor: 'zoom-in' }} onError={() => setImgError(true)} />;
                      }
                      if (slide.type === 'youtube') {
                        return playYoutube ? (
                          <iframe src={`https://www.youtube-nocookie.com/embed/${slide.src}?autoplay=1&rel=0&modestbranding=1&playsinline=1`} title="فيديو" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ width: '100%', height: '100%', border: 'none', display: 'block' }} />
                        ) : (
                          <button type="button" onClick={() => setPlayYoutube(true)} aria-label="تشغيل الفيديو"
                            style={{ position: 'relative', width: '100%', height: '100%', border: 'none', padding: 0, cursor: 'pointer', background: '#ffffff', display: 'block' }}>
                            <img src={`https://img.youtube.com/vi/${slide.src}/hqdefault.jpg`} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
                            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(0,0,0,0.06)' }}>
                                <Play size={30} color="#fff" fill="#fff" style={{ marginRight: -3 }} />
                              </span>
                            </span>
                          </button>
                        );
                      }
                      return <video src={slide.src} controls playsInline preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#ffffff', display: 'block' }} />;
                    })()}
                  </div>
                  {slides.length > 1 && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px', justifyContent: 'center', flexWrap: 'wrap' as const }}>
                      {slides.map((s, i) => (
                        <button key={i} type="button" onClick={() => { setActiveSlide(i); setPlayYoutube(false); }}
                          style={{ width: '56px', height: '56px', borderRadius: '10px', overflow: 'hidden', border: activeSlide === i ? '2px solid #16a34a' : '2px solid #e5e7eb', padding: 0, cursor: 'pointer', background: '#f9fafb', position: 'relative', flexShrink: 0 }}>
                          <img src={s.type === 'youtube' ? `https://img.youtube.com/vi/${s.src}/default.jpg` : optimizeImageUrl(s.src)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          {s.type !== 'image' && (
                            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.05)' }}>
                              <Play size={16} color="#fff" fill="#fff" />
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {zoomSrc && <ImageLightbox src={zoomSrc} alt={product.name} onClose={() => setZoomSrc(null)} />}

          {/* ── Info ── */}
          <div className="pdp-info">

            {/* Brand + Stock */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ background: '#f0fdf4', color: '#15803d', padding: '6px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '800', letterSpacing: '0.5px', textTransform: 'uppercase' as const, border: '1px solid #bbf7d0' }}>{product.brand}</span>
              {isOutOfStock ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16a34a', fontSize: '0.85rem', fontWeight: '800', background: '#f0fdf4', border: '1px solid #166534', borderRadius: '20px', padding: '5px 12px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
                  نفذت الكمية
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16a34a', fontSize: '0.85rem', fontWeight: '700' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulseDot 2s ease-in-out infinite' }} />
                  متوفر في المخزون
                </div>
              )}
            </div>

            {/* Title */}
            <h1 style={{ fontSize: '1.9rem', fontWeight: '900', color: '#1a1a1a', lineHeight: '1.25', margin: 0, letterSpacing: '-0.5px' }}>{product.name}</h1>

            {/* Price block */}
            <div style={{ background: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: '20px', padding: '18px 20px' }}>
              {hasSale ? (
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                    <span style={{ fontSize: '2.4rem', fontWeight: '900', color: '#1a1a1a', lineHeight: 1 }}>{product.sale_price}</span>
                    <span style={{ fontSize: '1rem', fontWeight: '700', color: '#1a1a1a' }}>ج.م</span>
                    <span style={{ fontSize: '1rem', color: '#6b7280', textDecoration: 'line-through', fontWeight: '600' }}>{product.regular_price} ج.م</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ background: 'linear-gradient(135deg,#16a34a,#16a34a)', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '900' }}>خصم {discPct}%</span>
                    <span style={{ fontSize: '0.82rem', color: '#16a34a', fontWeight: '800' }}>وفّرت {savingsAmt.toFixed(0)} ج.م</span>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '2.4rem', fontWeight: '900', color: '#1a1a1a', lineHeight: 1 }}>{product.regular_price}</span>
                  <span style={{ fontSize: '1rem', fontWeight: '700', color: '#1a1a1a' }}>ج.م</span>
                </div>
              )}
            </div>

            {/* Compatibility + Category pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '8px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f0fdf4', border: '1px solid #166534', borderRadius: '20px', padding: '6px 14px', fontSize: '0.82rem', fontWeight: '800', color: '#15803d' }}>
                <Car size={14} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, maxWidth: '180px' }}>{compatText}</span>
              </span>
              {product.car_model_year && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '20px', padding: '6px 14px', fontSize: '0.82rem', fontWeight: '800', color: '#60a5fa' }}>
                  <Calendar size={14} />{product.car_model_year}
                </span>
              )}
              {product.category && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '20px', padding: '6px 14px', fontSize: '0.82rem', fontWeight: '700', color: '#6b7280' }}>
                  <LayoutGrid size={13} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, maxWidth: '160px' }}>Category: {product.category}</span>
                </span>
              )}
              {product.subcategory && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '20px', padding: '6px 14px', fontSize: '0.82rem', fontWeight: '700', color: '#6b7280' }}>
                  <Tag size={13} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, maxWidth: '160px' }}>Subcategory: {product.subcategory}</span>
                </span>
              )}
            </div>

            {/* Specs grid */}
            <div
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {product.country_of_origin && <SpecItem label="المنشأ" value={product.country_of_origin} icon={<Globe size={14} color="#22c55e" />} />}
              <SpecItem label="الضمان" value={product.warranty || product.warranty_duration || 'ضمان استبدال'} icon={<Timer size={14} color="#22c55e" />} />
              {product.sku && <SpecItem label="كود المنتج" value={product.sku} icon={<Info size={14} color="#22c55e" />} />}
            </div>

            {/* Qty + Cart */}
            {isOutOfStock ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: '#f9fafb', border: '2px solid #e5e7eb', borderRadius: '16px', padding: '16px', color: '#9ca3af', fontWeight: '800', fontSize: '1rem' }}>
                <ShoppingCart size={20} color="#6b7280" />
                نفذت الكمية — غير متوفر حالياً
              </div>
            ) : (() => {
              const cartQty = cartItems.find((i: any) => i.id === product.id)?.quantity ?? 0;
              if (cartQty > 0) return (
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '10px' }}>
                  {/* Already in cart — show stepper with clear label */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '2px solid #22c55e', borderRadius: '16px', padding: '10px 16px' }}>
                    <button onClick={() => addToCart({ ...product, price: displayPrice }, -1)}
                      style={{ width: '36px', height: '36px', borderRadius: '10px', border: 'none', background: '#22c55e', color: '#fff', fontSize: '1.4rem', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                    <div style={{ textAlign: 'center' as const }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#16a34a', lineHeight: 1 }}>{cartQty}</div>
                      <div style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: '800', marginTop: '2px' }}>✓ في السلة</div>
                    </div>
                    <button onClick={() => addToCart({ ...product, price: displayPrice }, 1)}
                      style={{ width: '36px', height: '36px', borderRadius: '10px', border: 'none', background: '#22c55e', color: '#fff', fontSize: '1.4rem', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                </div>
              );
              return (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch' }}>
                  <div className="pdp-stepper">
                    <button className="pdp-step-btn" onClick={() => setQty(q => q + 1)}><Plus size={18} /></button>
                    <span className="pdp-qty" style={{ fontSize: '1.1rem', fontWeight: '900', color: '#1a1a1a', minWidth: '36px', textAlign: 'center' as const }}>{qty}</span>
                    <button className="pdp-step-btn" onClick={() => qty > 1 && setQty(q => q - 1)}><Minus size={18} /></button>
                  </div>
                  <button onClick={() => addToCart({ ...product, price: displayPrice }, qty)} className="pdp-btn-secondary" style={{ flex: 1 }}>
                    <ShoppingCart size={20} /> إضافة للسلة
                  </button>
                </div>
              );
            })()}

            {isOutOfStock ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: '#ffffff', border: '2px solid #e5e7eb', borderRadius: '16px', padding: '18px', color: '#9ca3af', fontWeight: '800', fontSize: '1.05rem', cursor: 'not-allowed' }}>
                <Zap size={20} color="#6b7280" /> المنتج غير متاح للشراء حالياً
              </div>
            ) : (
              <Link href={`/checkout?buyNow=true&productId=${productId}&price=${displayPrice}`}
                onClick={() => addToCart({ ...product, price: displayPrice }, qty)}
                className="pdp-btn-primary">
                <Zap size={20} fill="#fff" /> اشتري الآن — {displayPrice} ج.م
              </Link>
            )}

            {/* Share */}
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <ShareButtons productName={product.name} productBrand={product.brand} price={displayPrice} carMake={product.car_make} carModel={product.car_model} productSlug={productSlug} />
            </div>

            {/* Trust badges */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { icon: <ShieldCheck size={16} color="#22c55e" />, text: 'قطع غيار أصلية 100%' },
                { icon: <ShieldCheck size={16} color="#22c55e" />, text: 'شحن لباب البيت' },
                { icon: <ShieldCheck size={16} color="#22c55e" />, text: 'ضمان استبدال' },
                { icon: <ShieldCheck size={16} color="#22c55e" />, text: 'مطابق لسيارتك' },
              ].map((b, i) => (
                <div key={i} className="pdp-trust-item">
                  {b.icon}<span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#6b7280' }}>{b.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="pdp-section"
          style={{ background: '#ffffff', borderRadius: '24px', padding: '24px', marginBottom: '14px', border: '1px solid #f3f4f6' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '900', marginBottom: '14px', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Info size={20} color="#22c55e" /> وصف المنتج
          </h2>
          <p style={{ lineHeight: '1.85', color: '#6b7280', fontSize: '0.95rem', margin: 0 }}>{generateDesc()}</p>
        </div>

        {/* Reviews */}
        <ReviewsSection productId={productId} />

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' as const, gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Package size={22} color="#22c55e" />
                <h2 style={{ fontSize: '1.25rem', fontWeight: '900', margin: 0, color: '#1a1a1a' }}>منتجات مشابهة</h2>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button id="prev-related" style={{ width: '38px', height: '38px', borderRadius: '50%', border: '1px solid #e5e7eb', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><ChevronRight size={20} /></button>
                <button id="next-related" style={{ width: '38px', height: '38px', borderRadius: '50%', border: '1px solid #e5e7eb', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><ChevronLeft size={20} /></button>
              </div>
            </div>
            <Swiper modules={[Navigation, Autoplay]} spaceBetween={14} slidesPerView={1}
              navigation={{ prevEl: '#prev-related', nextEl: '#next-related' }}
              breakpoints={{ 0: { slidesPerView: 2 }, 480: { slidesPerView: 2 }, 768: { slidesPerView: 3 }, 1024: { slidesPerView: 4 } }}
              autoplay={{ delay: 3500, disableOnInteraction: false }} className="related-swiper"
              style={{ padding: '8px 4px 28px' }}>
              {relatedProducts.map(rp => (
                <SwiperSlide key={rp.id} style={{ height: 'auto' }}>
                  <RelatedProductCard p={rp} subcategoryImages={subcategoryImages} />
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        )}
      </div>
    </>
  );
}
