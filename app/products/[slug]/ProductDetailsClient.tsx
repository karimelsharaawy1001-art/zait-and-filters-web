'use client';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/app/lib/supabase';
import { useCart } from '@/context/CartContext';
import {
  ShoppingCart, Car, Calendar, ShieldCheck,
  ArrowRight, Globe, Plus, Minus, CheckCircle2, Layers, Info, Package, Loader2,
  ChevronRight, ChevronLeft, Timer, Share2, Check, Copy, Facebook, Twitter,
  Zap, Star, Send, User, LayoutGrid, Tag
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Swiper, SwiperSlide } from 'swiper/react';
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
          <Star size={24} fill={(hover || value) >= i ? '#f59e0b' : 'none'} color={(hover || value) >= i ? '#f59e0b' : '#d1d5db'} />
        </button>
      ))}
    </div>
  );
}

function StarDisplay({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size} fill={i <= rating ? '#f59e0b' : 'none'} color={i <= rating ? '#f59e0b' : '#d1d5db'} />
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
    <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.1 }} variants={fadeUp}
      className="pdp-section"
      style={{ background: '#fff', borderRadius: '24px', padding: '24px', marginBottom: '20px', border: '1px solid #f1f5f9', direction: 'rtl' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '900', margin: 0, color: '#0f172a' }}>تقييمات العملاء</h2>
          {reviews.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '20px', padding: '4px 12px' }}>
              <StarDisplay rating={Math.round(avgRating)} />
              <span style={{ fontSize: '0.88rem', fontWeight: '800', color: '#92400e' }}>{avgRating.toFixed(1)}</span>
              <span style={{ fontSize: '0.78rem', color: '#b45309' }}>({reviews.length})</span>
            </div>
          )}
        </div>
        {!submitted ? (
          <button onClick={() => setShowForm(f => !f)}
            style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 18px', background: showForm ? '#f1f5f9' : '#0f172a', color: showForm ? '#64748b' : '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '0.88rem', fontFamily: 'inherit', transition: 'all 0.15s' }}>
            <Star size={15} fill={showForm ? 'none' : '#fff'} /> {showForm ? 'إلغاء' : 'اكتب تقييماً'}
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', color: '#15803d', fontWeight: '700', fontSize: '0.85rem' }}>
            <Check size={14} /> شكراً! تقييمك قيد المراجعة
          </div>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '22px', marginBottom: '24px', overflow: 'hidden' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '800', margin: '0 0 16px', color: '#0f172a' }}>أضف تقييمك</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>الاسم *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="اسمك" style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${errors.name ? '#fca5a5' : '#e2e8f0'}`, borderRadius: '10px', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const }} />
                {errors.name && <p style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: '600', margin: '4px 0 0' }}>{errors.name}</p>}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>الإيميل (اختياري)</label>
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const }} dir="ltr" />
              </div>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>التقييم *</label>
              <StarSelector value={form.rating} onChange={r => setForm(f => ({ ...f, rating: r }))} />
              {errors.rating && <p style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: '600', margin: '4px 0 0' }}>{errors.rating}</p>}
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>تعليقك *</label>
              <textarea value={form.comment} onChange={e => setForm(f => ({ ...f, comment: e.target.value }))} placeholder="شاركنا رأيك في المنتج..." rows={4} style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${errors.comment ? '#fca5a5' : '#e2e8f0'}`, borderRadius: '10px', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none', resize: 'vertical' as const, minHeight: '90px', boxSizing: 'border-box' as const }} />
              {errors.comment && <p style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: '600', margin: '4px 0 0' }}>{errors.comment}</p>}
            </div>
            {errors.submit && <p style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: '600', marginBottom: '12px' }}>{errors.submit}</p>}
            <button onClick={handleSubmit} disabled={submitting}
              style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '12px 24px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '11px', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: '800', fontSize: '0.9rem', fontFamily: 'inherit', opacity: submitting ? 0.7 : 1 }}>
              {submitting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={15} />}
              {submitting ? 'جاري الإرسال...' : 'إرسال التقييم'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {loadingReviews ? (
        <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 8px' }} />
        </div>
      ) : reviews.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#cbd5e1', background: '#f8fafc', borderRadius: '14px' }}>
          <Star size={36} strokeWidth={1} style={{ display: 'block', margin: '0 auto 10px' }} />
          <p style={{ fontWeight: '700', fontSize: '0.95rem' }}>لا توجد تقييمات بعد — كن أول من يقيّم!</p>
        </div>
      ) : (
        <motion.div initial="hidden" animate="show" variants={stagger} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {reviews.map(r => (
            <motion.div key={r.id} variants={fadeUp} style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '16px', padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg,#22c55e,#16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <User size={18} color="#fff" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0f172a' }}>{r.customer_name}</div>
                    <StarDisplay rating={r.rating} />
                  </div>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600' }}>
                  {new Date(r.created_at).toLocaleDateString('ar-EG', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: '1.65', margin: 0 }}>{r.comment}</p>
            </motion.div>
          ))}
        </motion.div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
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
  const whatsappText = encodeURIComponent(`🛒 ${productName} - ${productBrand}\n💰 السعر: ${price} ج.م${carMake ? `\n🚗 لسيارة: ${carMake} ${carModel || ''}` : ''}\n🔗 ${url}`);
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  const twitterUrl  = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${productName} - ${productBrand} | ${price} ج.م`)}&url=${encodeURIComponent(url)}`;
  const whatsappUrl = `https://wa.me/?text=${whatsappText}`;
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
      <button onClick={handleShare} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 18px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem', color: '#334155', fontFamily: 'inherit' }}>
        <Share2 size={17} /> مشاركة
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 999 }} />
            <motion.div initial={{ opacity: 0, scale: 0.92, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 8 }}
              style={{ position: 'absolute', bottom: 'calc(100% + 10px)', right: 0, backgroundColor: '#fff', borderRadius: '18px', boxShadow: '0 12px 40px rgba(0,0,0,0.14)', border: '1px solid #f1f5f9', padding: '12px', zIndex: 1000, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '6px', direction: 'rtl' }}>
              <p style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '700', margin: '0 4px 4px' }}>شارك عبر</p>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} style={btnStyle('#25D366')}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                واتساب
              </a>
              <a href={facebookUrl} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} style={btnStyle('#1877F2')}><Facebook size={17} fill="white" color="white" /> فيسبوك</a>
              <a href={twitterUrl} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} style={btnStyle('#000')}><Twitter size={17} fill="white" color="white" /> تويتر</a>
              <div style={{ height: '1px', background: '#f1f5f9', margin: '2px 0' }} />
              <button onClick={() => { copyLink(); setOpen(false); }} style={{ ...btnStyle('#475569'), border: 'none', cursor: 'pointer', width: '100%', fontFamily: 'inherit' }}>
                {copied ? <Check size={17} /> : <Copy size={17} />}{copied ? 'تم النسخ!' : 'نسخ الرابط'}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {copied && !open && (
        <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', right: 0, backgroundColor: '#0f172a', color: '#fff', padding: '6px 14px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: '700', whiteSpace: 'nowrap', zIndex: 1000, display: 'flex', alignItems: 'center', gap: '6px' }}>
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
    <motion.div whileHover={{ y: -6, boxShadow: '0 20px 50px rgba(34,197,94,0.14)' }} transition={{ duration: 0.25 }}
      style={{ background: '#fff', borderRadius: '20px', border: '1px solid #f1f5f9', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
      <Link href={`/products/${p.slug || p.id}`} style={{ textDecoration: 'none', display: 'block', position: 'relative', height: '160px', background: '#f8fafc', overflow: 'hidden' }}>
        {displayImage ? (
          <Image src={displayImage} alt={p.name} fill sizes="(max-width:768px) 50vw, 25vw" style={{ objectFit: 'cover' }} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><Package size={36} color="#e2e8f0" /></div>
        )}
        {hasSale && (
          <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', padding: '3px 8px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: '900' }}>
            -{Math.round(((p.regular_price - p.sale_price) / p.regular_price) * 100)}%
          </div>
        )}
      </Link>
      <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ color: '#22c55e', fontWeight: '800', fontSize: '0.72rem', textTransform: 'uppercase' as const, letterSpacing: '0.4px' }}>{p.brand}</span>
        <Link href={`/products/${p.slug || p.id}`} style={{ textDecoration: 'none' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a', lineHeight: '1.35', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden', margin: 0 }}>{p.name}</h3>
        </Link>
        {(() => {
          const univ = ['universal','عام','all','الكل',''];
          const mk = (p.car_make||'').trim();
          const mo = (p.car_model||'').trim();
          if (!mk || univ.includes(mk.toLowerCase())) return null;
          const cleanMo = univ.includes(mo.toLowerCase()) ? '' : mo;
          return (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '4px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', color: '#15803d', fontWeight: '700', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '3px 8px', alignSelf: 'flex-start' as const, maxWidth: '100%', overflow: 'hidden' }}>
                <Car size={10} style={{ flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{mk}{cleanMo ? ' ' + cleanMo : ''}</span>
              </span>
              {p.car_model_year && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: '#1d4ed8', fontWeight: '700', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '2px 8px', alignSelf: 'flex-start' as const }}>
                  <Calendar size={9} />{p.car_model_year}
                </span>
              )}
            </div>
          );
        })()}
        <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '8px' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#0f172a' }}>{price}</span>
            <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#0f172a' }}>ج.م</span>
            {hasSale && <span style={{ fontSize: '0.72rem', color: '#aaa', textDecoration: 'line-through' }}>{p.regular_price} ج.م</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f8fafc', borderRadius: '10px', padding: '4px 8px', border: '1px solid #e2e8f0' }}>
              <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}><Minus size={11} /></button>
              <span style={{ fontSize: '0.85rem', fontWeight: '900', color: '#22c55e', minWidth: '16px', textAlign: 'center' }}>{qty}</span>
              <button onClick={() => setQty(q => q + 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}><Plus size={11} /></button>
            </div>
            <button onClick={() => addToCart({ ...p, price }, qty)} style={{ flex: 1, background: '#0f172a', color: '#fff', border: 'none', padding: '9px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
              <ShoppingCart size={13} /> أضف
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Spec Item ────────────────────────────────────────────────────────────────
function SpecItem({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <motion.div variants={fadeUp} style={{ background: '#f8fafc', borderRadius: '14px', padding: '12px 14px', border: '1px solid #f1f5f9' }}>
      <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '700', marginBottom: '4px', textTransform: 'uppercase' as const, letterSpacing: '0.4px' }}>{label}</div>
      <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
        {icon && <span style={{ flexShrink: 0 }}>{icon}</span>}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, minWidth: 0, flex: 1 }}>{value}</span>
      </div>
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ProductDetailsClient({ initialProduct, productId }: { initialProduct: any; productId: string }) {
  const [product] = useState<any>(initialProduct);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [subcategoryImages, setSubcategoryImages] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);
  const [imgError, setImgError] = useState(false);
  const swiperRef = useRef<any>(null);
  const { addToCart } = useCart();

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
    <div style={{ textAlign: 'center', padding: '100px 20px', color: '#94a3b8' }}>
      <Package size={48} style={{ margin: '0 auto 16px', display: 'block' }} />
      <p style={{ fontWeight: '700' }}>المنتج غير موجود.</p>
    </div>
  );

  const imageUrl = !imgError && product.image_url ? product.image_url : null;
  const displayPrice = product.sale_price && Number(product.sale_price) > 0 ? product.sale_price : product.regular_price;
  const hasSale = product.sale_price && Number(product.sale_price) > 0;
  const savingsAmt = hasSale ? (product.regular_price - product.sale_price) : 0;
  const discPct = hasSale ? Math.round((savingsAmt / product.regular_price) * 100) : 0;
  const productSlug = product.slug || productId;

  const slides: { type: 'image' | 'video'; src: string }[] = [];
  if (product.video_url) {
    const m = product.video_url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/|v\/))([A-Za-z0-9_-]{11})/);
    if (m) slides.push({ type: 'video', src: m[1] });
  }
  if (imageUrl) slides.push({ type: 'image', src: imageUrl });

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
        .pdp-slider { border-radius: 28px; overflow: hidden; background: #f8fafc; border: 1px solid #f1f5f9; box-shadow: 0 4px 32px rgba(0,0,0,0.06); height: 460px; position: relative; }
        .pdp-slider .swiper { height: 460px; }
        .pdp-slider .swiper-slide { display: flex; align-items: center; justify-content: center; height: 460px !important; position: relative; background: #f8fafc; }
        .pdp-slider .swiper-pagination-bullet { background: #22c55e; opacity: 0.4; }
        .pdp-slider .swiper-pagination-bullet-active { opacity: 1; transform: scale(1.3); }
        .pdp-info { display: flex; flex-direction: column; gap: 22px; }
        .pdp-btn-primary { width: 100%; padding: 16px; background: linear-gradient(135deg,#22c55e 0%,#16a34a 100%); color: #fff; border: none; border-radius: 16px; font-weight: 900; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 8px 24px rgba(34,197,94,0.35); font-family: inherit; transition: all 0.2s; letter-spacing: 0.3px; text-decoration: none; }
        .pdp-btn-primary:hover { box-shadow: 0 12px 32px rgba(34,197,94,0.5); transform: translateY(-2px); }
        .pdp-btn-secondary { width: 100%; padding: 15px; background: #0f172a; color: #fff; border: none; border-radius: 16px; font-weight: 800; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; font-family: inherit; transition: all 0.2s; }
        .pdp-btn-secondary:hover { background: #1e293b; transform: translateY(-1px); }
        .pdp-stepper { display: flex; align-items: center; gap: 0; background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 14px; overflow: hidden; }
        .pdp-step-btn { width: 44px; height: 48px; background: none; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #64748b; transition: background 0.15s; }
        .pdp-step-btn:hover { background: #f1f5f9; color: #0f172a; }
        .pdp-qty { font-size: 1.1rem; font-weight: 900; color: '#0f172a'; min-width: 36px; text-align: center; }
        .pdp-trust-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 12px; font-size: 0.85rem; color: #475569; font-weight: '700'; }
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
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', fontSize: '0.85rem', color: '#94a3b8', flexWrap: 'wrap' as const }}>
          <Link href="/store" style={{ display: 'flex', alignItems: 'center', gap: '5px', textDecoration: 'none', color: '#475569', fontWeight: '700' }}>
            <ArrowRight size={16} /> المتجر
          </Link>
          <ChevronLeft size={14} color="#cbd5e1" />
          {product.category && <><span style={{ color: '#94a3b8' }}>{product.category}</span><ChevronLeft size={14} color="#cbd5e1" /></>}
          <span style={{ color: '#22c55e', fontWeight: '700', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{product.name}</span>
        </motion.div>

        <div className="pdp-grid">

          {/* ── Media ── */}
          <div className="pdp-media">
            <motion.div variants={slideLeft} initial="hidden" animate="show">
              {slides.length === 0 ? (
                <div className="pdp-slider" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center', color: '#cbd5e1' }}><Package size={64} /><p style={{ fontWeight: '700', marginTop: '12px' }}>لا توجد صورة</p></div>
                </div>
              ) : (
                <div className="pdp-slider">
                  <Swiper modules={[Pagination]} onSwiper={s => { swiperRef.current = s; }}
                    pagination={slides.length > 1 ? { clickable: true } : false} slidesPerView={1} style={{ height: '100%' }}>
                    {slides.map((slide, i) => (
                      <SwiperSlide key={i}>
                        {slide.type === 'image' ? (
                          <Image src={slide.src} alt={product.name} fill priority={i === 0} sizes="(max-width:900px) 100vw, 50vw"
                            style={{ objectFit: 'contain', padding: '16px' }} onError={() => setImgError(true)} />
                        ) : (
                          <iframe src={`https://www.youtube.com/embed/${slide.src}?rel=0&modestbranding=1`} title="فيديو" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ width: '100%', height: '100%', border: 'none', display: 'block' }} />
                        )}
                      </SwiperSlide>
                    ))}
                  </Swiper>
                  {slides.length > 1 && (
                    <>
                      <button onClick={() => swiperRef.current?.slidePrev()} style={{ position: 'absolute', top: '50%', right: '14px', transform: 'translateY(-50%)', zIndex: 20, width: '40px', height: '40px', borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.95)', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={20} /></button>
                      <button onClick={() => swiperRef.current?.slideNext()} style={{ position: 'absolute', top: '50%', left: '14px', transform: 'translateY(-50%)', zIndex: 20, width: '40px', height: '40px', borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.95)', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={20} /></button>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          </div>

          {/* ── Info ── */}
          <motion.div className="pdp-info" variants={slideRight} initial="hidden" animate="show">

            {/* Brand + Stock */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ background: '#0f172a', color: '#fff', padding: '6px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '800', letterSpacing: '0.5px', textTransform: 'uppercase' as const }}>{product.brand}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16a34a', fontSize: '0.85rem', fontWeight: '700' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulseDot 2s ease-in-out infinite' }} />
                متوفر في المخزون
              </div>
            </div>

            {/* Title */}
            <h1 style={{ fontSize: '1.9rem', fontWeight: '900', color: '#0f172a', lineHeight: '1.25', margin: 0, letterSpacing: '-0.5px' }}>{product.name}</h1>

            {/* Price block */}
            <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '20px', padding: '18px 20px' }}>
              {hasSale ? (
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                    <span style={{ fontSize: '2.4rem', fontWeight: '900', color: '#0f172a', lineHeight: 1 }}>{product.sale_price}</span>
                    <span style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a' }}>ج.م</span>
                    <span style={{ fontSize: '1rem', color: '#aaa', textDecoration: 'line-through', fontWeight: '600' }}>{product.regular_price} ج.م</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '900' }}>خصم {discPct}%</span>
                    <span style={{ fontSize: '0.82rem', color: '#16a34a', fontWeight: '800' }}>وفّرت {savingsAmt.toFixed(0)} ج.م</span>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '2.4rem', fontWeight: '900', color: '#0f172a', lineHeight: 1 }}>{product.regular_price}</span>
                  <span style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a' }}>ج.م</span>
                </div>
              )}
            </div>

            {/* Compatibility + Category pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '8px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '20px', padding: '6px 14px', fontSize: '0.82rem', fontWeight: '800', color: '#15803d' }}>
                <Car size={14} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, maxWidth: '180px' }}>{compatText}</span>
              </span>
              {product.car_model_year && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '20px', padding: '6px 14px', fontSize: '0.82rem', fontWeight: '800', color: '#1d4ed8' }}>
                  <Calendar size={14} />{product.car_model_year}
                </span>
              )}
              {product.category && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '6px 14px', fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>
                  <LayoutGrid size={13} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, maxWidth: '160px' }}>{product.category}</span>
                </span>
              )}
              {product.subcategory && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '6px 14px', fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>
                  <Tag size={13} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, maxWidth: '160px' }}>{product.subcategory}</span>
                </span>
              )}
            </div>

            {/* Specs grid */}
            <motion.div initial="hidden" animate="show" variants={stagger}
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {product.country_of_origin && <SpecItem label="المنشأ" value={product.country_of_origin} icon={<Globe size={14} color="#22c55e" />} />}
              <SpecItem label="الضمان" value={product.warranty || product.warranty_duration || 'ضمان استبدال'} icon={<Timer size={14} color="#22c55e" />} />
              {product.sku && <SpecItem label="كود المنتج" value={product.sku} icon={<Info size={14} color="#22c55e" />} />}
            </motion.div>

            {/* Qty + Cart */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch' }}>
              <div className="pdp-stepper">
                <button className="pdp-step-btn" onClick={() => setQty(q => q + 1)}><Plus size={18} /></button>
                <span className="pdp-qty" style={{ fontSize: '1.1rem', fontWeight: '900', color: '#0f172a', minWidth: '36px', textAlign: 'center' as const }}>{qty}</span>
                <button className="pdp-step-btn" onClick={() => qty > 1 && setQty(q => q - 1)}><Minus size={18} /></button>
              </div>
              <button onClick={() => addToCart(product, qty)} className="pdp-btn-secondary" style={{ flex: 1 }}>
                <ShoppingCart size={20} /> إضافة للسلة
              </button>
            </div>

            <Link href={`/checkout?buyNow=true&productId=${productId}&price=${displayPrice}`}
              onClick={() => addToCart({ ...product, price: displayPrice }, qty)}
              className="pdp-btn-primary">
              <Zap size={20} fill="#fff" /> اشتري الآن — {displayPrice} ج.م
            </Link>

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
                  {b.icon}<span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>{b.text}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Description */}
        <div className="pdp-section"
          style={{ background: '#fff', borderRadius: '24px', padding: '24px', marginBottom: '14px', border: '1px solid #f1f5f9' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '900', marginBottom: '14px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Info size={20} color="#22c55e" /> وصف المنتج
          </h2>
          <p style={{ lineHeight: '1.85', color: '#64748b', fontSize: '0.95rem', margin: 0 }}>{generateDesc()}</p>
        </div>

        {/* Reviews */}
        <ReviewsSection productId={productId} />

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' as const, gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Package size={22} color="#22c55e" />
                <h2 style={{ fontSize: '1.25rem', fontWeight: '900', margin: 0, color: '#0f172a' }}>منتجات مشابهة</h2>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button id="prev-related" style={{ width: '38px', height: '38px', borderRadius: '50%', border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><ChevronRight size={20} /></button>
                <button id="next-related" style={{ width: '38px', height: '38px', borderRadius: '50%', border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><ChevronLeft size={20} /></button>
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
