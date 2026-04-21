// app/admin/reviews/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Star, Trash2, RefreshCw, Clock, User, Package } from 'lucide-react';

// Use service role client so we can read all reviews (including unapproved)
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Review {
  id: string;
  product_id: string;
  customer_name: string;
  customer_email: string | null;
  rating: number;
  comment: string;
  is_approved: boolean;
  created_at: string;
  product?: { name: string; brand: string; image_url: string | null };
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={14} fill={i <= rating ? '#f59e0b' : 'none'} color={i <= rating ? '#f59e0b' : '#d1d5db'} />
      ))}
    </div>
  );
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'all'>('pending');
  const [acting, setActing] = useState<string | null>(null);

  const fetchReviews = async () => {
    setLoading(true);
    // Use fetch to call our API route which uses service role
    try {
      const res = await fetch('/api/admin/reviews');
      const data = await res.json();
      setReviews(data.reviews || []);
    } catch (err: any) {
      toast.error('خطأ في تحميل التقييمات: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReviews(); }, []);

  const approve = async (id: string) => {
    setActing(id);
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_approved: true }),
      });
      if (!res.ok) throw new Error('فشل الموافقة');
      setReviews(prev => prev.map(r => r.id === id ? { ...r, is_approved: true } : r));
      toast.success('تم الموافقة على التقييم ✅');
    } catch (err: any) { toast.error(err.message); }
    finally { setActing(null); }
  };

  const reject = async (id: string) => {
    setActing(id);
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_approved: false }),
      });
      if (!res.ok) throw new Error('فشل الرفض');
      setReviews(prev => prev.map(r => r.id === id ? { ...r, is_approved: false } : r));
      toast.success('تم رفض التقييم');
    } catch (err: any) { toast.error(err.message); }
    finally { setActing(null); }
  };

  const deleteReview = async (id: string) => {
    if (!confirm('حذف هذا التقييم نهائياً؟')) return;
    setActing(id);
    try {
      const res = await fetch(`/api/admin/reviews?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('فشل الحذف');
      setReviews(prev => prev.filter(r => r.id !== id));
      toast.success('تم الحذف');
    } catch (err: any) { toast.error(err.message); }
    finally { setActing(null); }
  };

  const filtered = reviews.filter(r => {
    if (filter === 'pending') return !r.is_approved;
    if (filter === 'approved') return r.is_approved;
    return true;
  });

  const pendingCount = reviews.filter(r => !r.is_approved).length;
  const approvedCount = reviews.filter(r => r.is_approved).length;

  return (
    <div style={{ direction: 'rtl', fontFamily: "'Cairo', sans-serif", color: '#1e293b' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
        .rv-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; margin-bottom: 12px; transition: box-shadow 0.15s; }
        .rv-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
        .rv-btn { border: none; border-radius: 9px; padding: 8px 16px; cursor: pointer; font-weight: 700; font-size: 0.82rem; font-family: 'Cairo', sans-serif; display: inline-flex; align-items: center; gap: 6px; transition: opacity 0.12s; }
        .rv-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .rv-btn:hover:not(:disabled) { opacity: 0.85; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: '900', margin: 0, color: '#0f172a' }}>إدارة التقييمات</h1>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '3px 0 0', fontWeight: '600' }}>راجع وافق أو ارفض تقييمات العملاء قبل نشرها</p>
        </div>
        <button onClick={fetchReviews} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '9px', cursor: 'pointer', fontWeight: '700', fontSize: '0.82rem', fontFamily: "'Cairo', sans-serif" }}>
          <RefreshCw size={14} /> تحديث
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
        {[
          { label: 'في الانتظار', value: pendingCount, color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
          { label: 'معتمدة', value: approvedCount, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
          { label: 'الكل', value: reviews.length, color: '#0f172a', bg: '#f8fafc', border: '#e2e8f0' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: '10px', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: '900', color: s.color, lineHeight: 1 }}>{s.value}</span>
            <span style={{ fontSize: '0.72rem', fontWeight: '700', color: s.color }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
        {([['pending', 'في الانتظار'], ['approved', 'معتمدة'], ['all', 'الكل']] as const).map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)} style={{ padding: '7px 16px', background: filter === val ? '#0f172a' : '#f1f5f9', color: filter === val ? '#fff' : '#64748b', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', fontFamily: "'Cairo', sans-serif" }}>
            {label} {val === 'pending' && pendingCount > 0 && <span style={{ background: '#dc2626', color: '#fff', borderRadius: '6px', padding: '0 6px', fontSize: '0.7rem', marginRight: '4px' }}>{pendingCount}</span>}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
          <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 12px' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          جاري التحميل...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#cbd5e1', background: '#fff', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
          <Star size={40} strokeWidth={1} style={{ display: 'block', margin: '0 auto 12px' }} />
          <p style={{ fontWeight: '700' }}>لا توجد تقييمات</p>
        </div>
      ) : (
        filtered.map(review => (
          <div key={review.id} className="rv-card">
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              {/* Product image */}
              <div style={{ width: '52px', height: '52px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                {review.product?.image_url
                  ? <img src={review.product.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  : <Package size={20} color="#cbd5e1" />}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Top row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600', marginBottom: '2px' }}>
                      {review.product?.brand && <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '1px 7px', borderRadius: '4px', fontWeight: '700', marginLeft: '6px' }}>{review.product.brand}</span>}
                      {review.product?.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <User size={12} color="#94a3b8" />
                        <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a' }}>{review.customer_name}</span>
                      </div>
                      {review.customer_email && <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{review.customer_email}</span>}
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        {new Date(review.created_at).toLocaleDateString('ar-EG', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  {/* Status badge */}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '7px', fontSize: '0.75rem', fontWeight: '800', background: review.is_approved ? '#dcfce7' : '#fef3c7', color: review.is_approved ? '#15803d' : '#92400e', flexShrink: 0 }}>
                    {review.is_approved ? <CheckCircle size={11} /> : <Clock size={11} />}
                    {review.is_approved ? 'معتمد' : 'في الانتظار'}
                  </div>
                </div>

                {/* Stars */}
                <div style={{ margin: '8px 0 6px' }}>
                  <StarDisplay rating={review.rating} />
                </div>

                {/* Comment */}
                <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: '1.6', margin: '0 0 12px', background: '#f8fafc', padding: '10px 14px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                  {review.comment}
                </p>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {!review.is_approved && (
                    <button onClick={() => approve(review.id)} disabled={acting === review.id} className="rv-btn" style={{ background: '#dcfce7', color: '#15803d' }}>
                      {acting === review.id ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={13} />}
                      موافقة
                    </button>
                  )}
                  {review.is_approved && (
                    <button onClick={() => reject(review.id)} disabled={acting === review.id} className="rv-btn" style={{ background: '#fef3c7', color: '#92400e' }}>
                      {acting === review.id ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <XCircle size={13} />}
                      إلغاء الاعتماد
                    </button>
                  )}
                  <button onClick={() => deleteReview(review.id)} disabled={acting === review.id} className="rv-btn" style={{ background: '#fff1f2', color: '#e11d48' }}>
                    <Trash2 size={13} /> حذف
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}