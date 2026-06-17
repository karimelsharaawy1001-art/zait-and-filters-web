'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import {
  RotateCcw, Search, X, Loader2, CheckCircle, XCircle, Undo2,
  ChevronDown, ChevronUp, Eye, ExternalLink, User, Phone, Package,
  RefreshCw, AlertCircle, FileText, MessageSquare, Check, Minus, Square, CheckSquare,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

const returnStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending:  { label: 'قيد المراجعة', color: '#c2410c', bg: '#fff7ed' },
  approved: { label: 'تمت الموافقة', color: '#15803d', bg: '#f0fdf4' },
  rejected: { label: 'مرفوض',        color: '#dc2626', bg: '#fef2f2' },
  refunded: { label: 'تم الاسترجاع', color: '#6d28d9', bg: '#f5f3ff' },
};

export default function AdminReturns() {
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReturn, setSelectedReturn] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchReturns();
    // Real-time subscription for new returns
    const channel = supabase.channel('returns-channel')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'return_requests' },
        (payload) => {
          setReturns(prev => [payload.new, ...prev]);
          const req: any = payload.new;
          toast.success(`📦 طلب استرجاع جديد من ${req.customer_name || 'عميل'}`, {
            duration: 6000,
            position: 'top-center',
          });
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'return_requests' },
        (payload) => {
          setReturns(prev => prev.map(r => r.id === (payload.new as any).id ? payload.new : r));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchReturns() {
    try {
      const { data, error } = await supabase
        .from('return_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setReturns(data || []);
    } catch (err: any) {
      toast.error('فشل تحميل طلبات الاسترجاع: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateReturnStatus(id: string, newStatus: string) {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('return_requests')
        .update({
          status: newStatus,
          admin_notes: adminNotes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
      setReturns(prev => prev.map(r =>
        r.id === id ? { ...r, status: newStatus, admin_notes: adminNotes } : r
      ));
      if (selectedReturn?.id === id) setSelectedReturn((prev: any) => ({ ...prev, status: newStatus, admin_notes: adminNotes }));
      setShowDetailModal(false);
      setAdminNotes('');
      toast.success(getStatusLabel(newStatus));
    } catch (err: any) {
      toast.error('فشل التحديث: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  }

  function getStatusLabel(status: string) {
    const map: Record<string, string> = {
      approved: '✅ تمت الموافقة على طلب الاسترجاع',
      rejected: '❌ تم رفض طلب الاسترجاع',
      refunded: '💰 تم استرجاع المنتجات',
    };
    return map[status] || status;
  }

  const getFilteredReturns = () => {
    let list = statusFilter === 'all' ? returns : returns.filter(r => r.status === statusFilter);
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(r =>
        r.customer_name?.toLowerCase().includes(q) ||
        r.customer_phone?.includes(q) ||
        r.id?.toLowerCase().includes(q)
      );
    }
    return list;
  };

  const filteredReturns = getFilteredReturns();

  function StatusBadge({ status }: { status: string }) {
    const config = returnStatusConfig[status] || returnStatusConfig.pending;
    return (
      <span style={{
        fontSize: '0.72rem', fontWeight: '900', padding: '4px 12px',
        borderRadius: '8px', background: config.bg, color: config.color,
        display: 'inline-flex', alignItems: 'center', gap: '5px',
        whiteSpace: 'nowrap',
      }}>
        {status === 'pending' && <Clock size={12} />}
        {status === 'approved' && <CheckCircle size={12} />}
        {status === 'rejected' && <XCircle size={12} />}
        {status === 'refunded' && <Undo2 size={12} />}
        {config.label}
      </span>
    );
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('ar-EG', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  // ── Detail Modal ──
  function DetailModal({ req, onClose }: { req: any; onClose: () => void }) {
    const [notes, setNotes] = useState(req.admin_notes || '');
    const [submitting, setSubmitting] = useState(false);
    const config = returnStatusConfig[req.status] || returnStatusConfig.pending;

    async function handleAction(newStatus: string) {
      setSubmitting(true);
      try {
        const { error } = await supabase
          .from('return_requests')
          .update({
            status: newStatus,
            admin_notes: notes.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', req.id);
        if (error) throw error;
        setReturns(prev => prev.map(r => r.id === req.id ? { ...r, status: newStatus, admin_notes: notes } : r));
        toast.success(`✅ تم تحديث حالة طلب الاسترجاع`);
        onClose();
      } catch (err: any) {
        toast.error('فشل: ' + err.message);
      } finally { setSubmitting(false); }
    }

    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 3000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '12px', backdropFilter: 'blur(4px)',
      }} onClick={onClose}>
        <div onClick={e => e.stopPropagation()} style={{
          background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '640px',
          maxHeight: '90vh', overflowY: 'auto', padding: '28px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.25)', direction: 'rtl',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '900', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RotateCcw size={20} color="#f59e0b" /> تفاصيل طلب الاسترجاع
              </h3>
              <div style={{ fontSize: '0.78rem', color: '#888', marginTop: '4px' }}>
                #{req.id?.slice(0, 8).toUpperCase()} — {formatDate(req.created_at)}
              </div>
            </div>
            <button onClick={onClose} style={{
              background: '#f5f5f5', border: 'none', borderRadius: '50%',
              width: '34px', height: '34px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <X size={18} color="#666" />
            </button>
          </div>

          {/* Status */}
          <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#555' }}>الحالة:</span>
            <StatusBadge status={req.status} />
          </div>

          {/* Customer Info */}
          <div style={{
            background: '#f9fafb', borderRadius: '14px', padding: '14px 16px',
            marginBottom: '16px', border: '1px solid #f0f0f0',
          }}>
            <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#888', marginBottom: '8px', letterSpacing: '0.5px' }}>بيانات العميل</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <User size={14} color="#22c55e" />
              <span style={{ fontWeight: '800', color: '#1a1a1a' }}>{req.customer_name}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Phone size={14} color="#22c55e" />
              <span style={{ color: '#555', fontWeight: '600' }}>{req.customer_phone}</span>
            </div>
          </div>

          {/* Order Link */}
          <a
            href={`/admin/orders?search=${req.order_id?.slice(0, 8)}`}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: '#eff6ff', border: '1px solid #dbeafe',
              borderRadius: '10px', padding: '10px 14px', marginBottom: '16px',
              textDecoration: 'none', color: '#1e40af', fontWeight: '700',
              fontSize: '0.85rem',
            }}
          >
            <ExternalLink size={14} />
            عرض الطلب الأصلي — #{req.order_id?.slice(0, 8).toUpperCase()}
          </a>

          {/* Items */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#1a1a1a', marginBottom: '8px' }}>
              المنتجات المطلوب استرجاعها ({req.items?.length || 0}):
            </div>
            {(req.items || []).map((item: any, i: number) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', marginBottom: '6px',
                borderRadius: '10px', background: '#f9fafb', border: '1px solid #f0f0f0',
              }}>
                <img
                  src={item.image || '/placeholder.png'}
                  alt=""
                  style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'contain', background: '#fff', flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#1a1a1a' }}>{item.name}</div>
                  <div style={{ fontSize: '0.72rem', color: '#22c55e', fontWeight: '700' }}>
                    {parseFloat(item.price).toLocaleString()} ج.م
                  </div>
                </div>
                <div style={{
                  background: '#f0fdf4', color: '#16a34a', padding: '2px 10px',
                  borderRadius: '6px', fontSize: '0.82rem', fontWeight: '800',
                }}>
                  ×{item.quantity}
                </div>
                <div style={{ fontWeight: '900', fontSize: '0.85rem', color: '#1a1a1a', minWidth: '70px', textAlign: 'left' }}>
                  {(parseFloat(item.price) * item.quantity).toLocaleString()} ج.م
                </div>
              </div>
            ))}
          </div>

          {/* Reason */}
          <div style={{
            background: '#fff7ed', borderRadius: '12px', padding: '14px 16px',
            marginBottom: '16px', border: '1px solid #fed7aa',
          }}>
            <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#c2410c', marginBottom: '4px' }}>
              سبب الاسترجاع:
            </div>
            <div style={{ fontSize: '0.85rem', color: '#9a3412' }}>{req.reason}</div>
          </div>

          {/* Admin Notes */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '800', color: '#1a1a1a', marginBottom: '8px' }}>
              ملاحظات الإدارة
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="أكتب ملاحظاتك هنا... (سيظهر للعميل)"
              rows={3}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: '12px',
                border: '1px solid #e5e5e5', fontSize: '0.9rem',
                outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Actions (only for pending/approved) */}
          {req.status === 'pending' && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => handleAction('approved')}
                disabled={submitting}
                style={{
                  flex: 1, padding: '13px', border: 'none', borderRadius: '12px',
                  background: submitting ? '#ccc' : 'linear-gradient(135deg, #22c55e, #16a34a)',
                  color: '#fff', fontWeight: '900', fontSize: '0.9rem',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
              >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                الموافقة على الاسترجاع
              </button>
              <button
                onClick={() => handleAction('rejected')}
                disabled={submitting}
                style={{
                  flex: 1, padding: '13px', border: 'none', borderRadius: '12px',
                  background: submitting ? '#ccc' : '#fee2e2',
                  color: '#dc2626', fontWeight: '900', fontSize: '0.9rem',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
              >
                <XCircle size={18} />
                رفض الطلب
              </button>
            </div>
          )}

          {req.status === 'approved' && (
            <button
              onClick={() => handleAction('refunded')}
              disabled={submitting}
              style={{
                width: '100%', padding: '13px', border: 'none', borderRadius: '12px',
                background: submitting ? '#ccc' : 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                color: '#fff', fontWeight: '900', fontSize: '0.9rem',
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <Undo2 size={18} />}
              تأكيد استرجاع المنتجات (Refund)
            </button>
          )}

          {req.status === 'refunded' && (
            <div style={{
              textAlign: 'center', padding: '16px', background: '#f5f3ff',
              borderRadius: '12px', border: '1px solid #ddd6fe',
              color: '#6d28d9', fontWeight: '800', fontSize: '0.9rem',
            }}>
              ✅ تم استرجاع المنتجات بنجاح
            </div>
          )}

          {req.status === 'rejected' && (
            <div style={{
              textAlign: 'center', padding: '16px', background: '#fef2f2',
              borderRadius: '12px', border: '1px solid #fecaca',
              color: '#dc2626', fontWeight: '800', fontSize: '0.9rem',
            }}>
              ❌ تم رفض طلب الاسترجاع
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '12px', color: '#64748b' }}>
      <Loader2 size={28} className="animate-spin" />
      جاري تحميل طلبات الاسترجاع...
    </div>
  );

  const pendingCount = returns.filter(r => r.status === 'pending').length;

  return (
    <div style={{ direction: 'rtl', fontFamily: "'Cairo', sans-serif" }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* ── Detail Modal ── */}
      {showDetailModal && selectedReturn && (
        <DetailModal req={selectedReturn} onClose={() => { setShowDetailModal(false); setSelectedReturn(null); }} />
      )}

      {/* ── Header ── */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: '900', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <RotateCcw size={24} color="#f59e0b" /> طلبات الاسترجاع
              <span style={{
                background: pendingCount > 0 ? '#dc2626' : '#e2e8f0',
                color: pendingCount > 0 ? '#fff' : '#94a3b8',
                borderRadius: '8px', padding: '2px 10px', fontSize: '0.8rem',
              }}>
                {returns.length}
              </span>
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '4px 0 0', fontWeight: '600' }}>
              إدارة طلبات استرجاع المنتجات من العملاء
            </p>
          </div>
          <button
            onClick={fetchReturns}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0',
              borderRadius: '10px', padding: '9px 16px', fontWeight: '700',
              fontSize: '0.85rem', cursor: 'pointer',
            }}
          >
            <RefreshCw size={16} /> تحديث
          </button>
        </div>
      </div>

      {/* ── Search & Filter ── */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{
          flex: '1', display: 'flex', alignItems: 'center', gap: '10px',
          background: '#fff', border: `1.5px solid ${searchQuery ? '#f59e0b' : '#e2e8f0'}`,
          borderRadius: '12px', padding: '10px 14px', minWidth: '200px',
          transition: 'all 0.15s', boxShadow: searchQuery ? '0 0 0 3px rgba(245,158,11,0.1)' : 'none',
        }}>
          <Search size={18} color={searchQuery ? '#f59e0b' : '#94a3b8'} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="ابحث بالاسم أو رقم الهاتف..."
            style={{
              flex: 1, border: 'none', outline: 'none', fontSize: '0.9rem',
              fontFamily: 'inherit', background: 'transparent',
            }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={16} color="#94a3b8" />
            </button>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{
            padding: '10px 14px', borderRadius: '12px', border: '1.5px solid #e2e8f0',
            fontSize: '0.9rem', fontWeight: '700', outline: 'none',
            background: '#fff', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <option value="all">جميع الحالات</option>
          <option value="pending">قيد المراجعة ({returns.filter(r => r.status === 'pending').length})</option>
          <option value="approved">تمت الموافقة ({returns.filter(r => r.status === 'approved').length})</option>
          <option value="rejected">مرفوض ({returns.filter(r => r.status === 'rejected').length})</option>
          <option value="refunded">تم الاسترجاع ({returns.filter(r => r.status === 'refunded').length})</option>
        </select>
      </div>

      {/* ── Status Tabs ── */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: 'الكل', color: '#1a1a1a' },
          { key: 'pending', label: '⏳ قيد المراجعة', color: '#c2410c' },
          { key: 'approved', label: '✅ تمت الموافقة', color: '#15803d' },
          { key: 'rejected', label: '❌ مرفوض', color: '#dc2626' },
          { key: 'refunded', label: '💰 تم الاسترجاع', color: '#6d28d9' },
        ].map(tab => {
          const count = tab.key === 'all' ? returns.length : returns.filter(r => r.status === tab.key).length;
          const isActive = statusFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 14px', borderRadius: '10px', cursor: 'pointer',
                fontWeight: '800', fontSize: '0.8rem', border: 'none',
                background: isActive ? tab.color : '#fff',
                color: isActive ? '#fff' : tab.color,
                boxShadow: isActive ? `0 4px 12px ${tab.color}33` : '0 1px 3px rgba(0,0,0,0.08)',
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
              <span style={{
                background: isActive ? 'rgba(255,255,255,0.25)' : `${tab.color}15`,
                color: isActive ? '#fff' : tab.color,
                borderRadius: '6px', padding: '1px 7px', fontSize: '0.75rem', fontWeight: '900',
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Returns List ── */}
      {filteredReturns.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8', background: '#fff', borderRadius: '16px' }}>
          <RotateCcw size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <p style={{ fontSize: '0.95rem', fontWeight: '700' }}>لا توجد طلبات استرجاع</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredReturns.map((req: any) => {
            const config = returnStatusConfig[req.status] || returnStatusConfig.pending;
            const items = req.items || [];
            const totalQty = items.reduce((s: number, i: any) => s + (i.quantity || 0), 0);

            return (
              <div
                key={req.id}
                onClick={() => { setSelectedReturn(req); setShowDetailModal(true); }}
                style={{
                  background: '#fff', borderRadius: '14px', padding: '16px 18px',
                  border: req.status === 'pending' ? '1.5px solid #fed7aa' : '1px solid #f0f0f0',
                  boxShadow: req.status === 'pending' ? '0 2px 12px rgba(245,158,11,0.08)' : '0 1px 4px rgba(0,0,0,0.03)',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = req.status === 'pending' ? '0 2px 12px rgba(245,158,11,0.08)' : '0 1px 4px rgba(0,0,0,0.03)'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: '900', color: '#1a1a1a' }}>
                        {req.customer_name}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#888', fontFamily: 'monospace' }}>
                        #{req.id?.slice(0, 8).toUpperCase()}
                      </span>
                      <StatusBadge status={req.status} />
                    </div>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.78rem', color: '#64748b' }}>
                      <span>{req.customer_phone}</span>
                      <span>🛍️ {totalQty} قطعة من {items.length} منتج</span>
                      <span>📋 #{req.order_id?.slice(0, 8).toUpperCase()}</span>
                      <span>📅 {formatDate(req.created_at)}</span>
                    </div>
                    {req.reason && (
                      <div style={{
                        marginTop: '8px', fontSize: '0.78rem', color: '#9a3412',
                        background: '#fff7ed', borderRadius: '8px', padding: '6px 10px',
                        display: 'inline-block', border: '1px solid #fed7aa',
                      }}>
                        <span style={{ fontWeight: '800' }}>السبب:</span> {req.reason}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button
                      onClick={e => { e.stopPropagation(); setSelectedReturn(req); setShowDetailModal(true); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0',
                        borderRadius: '8px', padding: '7px 12px', fontWeight: '700',
                        fontSize: '0.78rem', cursor: 'pointer',
                      }}
                    >
                      <Eye size={14} /> عرض
                    </button>
                  </div>
                </div>

                {/* Item Previews */}
                {items.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                    {items.slice(0, 4).map((item: any, i: number) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        background: '#f9fafb', borderRadius: '8px',
                        padding: '4px 8px', border: '1px solid #f0f0f0',
                      }}>
                        <img src={item.image || '/placeholder.png'} alt="" style={{
                          width: '22px', height: '22px', borderRadius: '4px',
                          objectFit: 'contain', background: '#fff',
                        }} />
                        <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#555', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.name}
                        </span>
                        <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#16a34a' }}>×{item.quantity}</span>
                      </div>
                    ))}
                    {items.length > 4 && (
                      <span style={{ fontSize: '0.72rem', color: '#888', fontWeight: '700', padding: '4px 0' }}>
                        +{items.length - 4} أخرى
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


