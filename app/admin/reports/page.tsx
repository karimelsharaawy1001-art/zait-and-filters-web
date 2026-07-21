'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import { Loader2, TrendingUp, TrendingDown, DollarSign, Package, Percent, ChevronDown, ChevronUp, AlertTriangle, X } from 'lucide-react';

// ── Order statuses (same keys used across the admin) ──────────────────────────
const STATUSES: { key: string; label: string; color: string }[] = [
  { key: 'pending_payment', label: 'انتظار الدفع', color: '#60a5fa' },
  { key: 'pending',         label: 'جديد',         color: '#fb923c' },
  { key: 'processing',      label: 'تجهيز',        color: '#a16207' },
  { key: 'shipped',         label: 'شحن',          color: '#0369a1' },
  { key: 'delivered',       label: 'توصيل',        color: '#15803d' },
  { key: 'cancelled',       label: 'ملغي',         color: '#b91c1c' },
  { key: 'refunded',        label: 'مسترجع',       color: '#a78bfa' },
];

const egp = (n: number) => `${Math.round(n).toLocaleString('ar-EG')} ج.م`;
const ymd = (d: Date) => d.toISOString().slice(0, 10);

// ── Per-order money math ──────────────────────────────────────────────────────
// Gross = value of purchased items minus applied discounts, EXCLUDING shipping.
const itemsSubtotal = (o: any) => (Array.isArray(o.items) ? o.items : []).reduce(
  (s: number, i: any) => s + (parseFloat(i.price || 0) || 0) * (parseInt(i.quantity) || 1), 0);
const discountsOf = (o: any) =>
  (parseFloat(o.discount_applied || o.discount_amount || 0) || 0) + (parseFloat(o.wallet_discount || 0) || 0);
const grossOf   = (o: any) => Math.max(0, itemsSubtotal(o) - discountsOf(o));

const prodCost  = (o: any) => (Array.isArray(o.items) ? o.items : []).reduce(
  (s: number, i: any) => s + (parseFloat(i.cost_price || 0) || 0) * (parseInt(i.quantity) || 1), 0);
const shipCharged = (o: any) => parseFloat(o.shipping_cost || 0) || 0;   // collected from customer
const shipCost  = (o: any) => parseFloat(o.shipping_cost_paid || 0) || 0; // paid to courier
const extraCost = (o: any) => parseFloat(o.extra_costs || 0) || 0;
const costOf    = (o: any) => prodCost(o) + shipCost(o) + extraCost(o);
// Shipping is a pass-through: what we collected offsets what we paid.
const netOf     = (o: any) => grossOf(o) + shipCharged(o) - costOf(o);
// An order with items but no cost entered makes profit look inflated
const missingCost = (o: any) => (Array.isArray(o.items) ? o.items : []).some((i: any) => !parseFloat(i.cost_price || 0));

export default function ReportsPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selected, setSelected] = useState<string[]>(['pending', 'processing', 'shipped', 'delivered']);
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => { fetchOrders(); /* eslint-disable-next-line */ }, [dateFrom, dateTo]);

  async function fetchOrders() {
    setLoading(true);
    let q = supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (dateFrom) q = q.gte('created_at', new Date(dateFrom).toISOString());
    if (dateTo)   q = q.lte('created_at', new Date(dateTo + 'T23:59:59').toISOString());
    const { data } = await q;
    setOrders(data || []);
    setLoading(false);
  }

  function applyPreset(preset: string) {
    const now = new Date();
    if (preset === 'today')      { setDateFrom(ymd(now)); setDateTo(ymd(now)); }
    else if (preset === 'week')  { const d = new Date(now); d.setDate(d.getDate() - 6); setDateFrom(ymd(d)); setDateTo(ymd(now)); }
    else if (preset === 'month') { setDateFrom(ymd(new Date(now.getFullYear(), now.getMonth(), 1))); setDateTo(ymd(now)); }
    else if (preset === 'lastMonth') {
      setDateFrom(ymd(new Date(now.getFullYear(), now.getMonth() - 1, 1)));
      setDateTo(ymd(new Date(now.getFullYear(), now.getMonth(), 0)));
    }
    else { setDateFrom(''); setDateTo(''); }
  }

  const toggleStatus = (k: string) =>
    setSelected(prev => prev.includes(k) ? prev.filter(s => s !== k) : [...prev, k]);

  // ── Filtered set + totals ───────────────────────────────────────────────────
  const rows = useMemo(
    () => orders.filter(o => selected.includes(o.status || 'pending')),
    [orders, selected]
  );

  const totals = useMemo(() => {
    const gross = rows.reduce((s, o) => s + grossOf(o), 0);
    const discounts = rows.reduce((s, o) => s + discountsOf(o), 0);
    const product = rows.reduce((s, o) => s + prodCost(o), 0);
    const shipping = rows.reduce((s, o) => s + shipCost(o), 0);
    const shipRev = rows.reduce((s, o) => s + shipCharged(o), 0);
    const extra = rows.reduce((s, o) => s + extraCost(o), 0);
    const cost = product + shipping + extra;
    const net = gross + shipRev - cost;
    return { gross, discounts, product, shipping, shipRev, extra, cost, net, count: rows.length,
             margin: gross > 0 ? (net / gross) * 100 : 0,
             missing: rows.filter(missingCost).length };
  }, [rows]);

  // Per-status breakdown
  const byStatus = useMemo(() => STATUSES.map(st => {
    const list = rows.filter(o => (o.status || 'pending') === st.key);
    const gross = list.reduce((s, o) => s + grossOf(o), 0);
    const cost = list.reduce((s, o) => s + costOf(o), 0);
    const net = list.reduce((s, o) => s + netOf(o), 0);
    return { ...st, count: list.length, gross, cost, net };
  }).filter(s => s.count > 0), [rows]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#15803d', fontWeight: '900', gap: '12px' }}>
      <Loader2 className="animate-spin" size={26} /> جاري تحميل التقرير...
    </div>
  );

  return (
    <div style={{ direction: 'rtl', padding: '10px 0 60px' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 900px) { .rep-table { display: none !important; } .rep-cards { display: flex !important; } }
        @media (min-width: 901px) { .rep-table { display: block !important; } .rep-cards { display: none !important; } }
      `}} />

      <div style={{ marginBottom: '22px' }}>
        <h1 style={{ fontSize: '1.9rem', fontWeight: '900', color: '#1a1a1a', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          📑 تقارير الأرباح
        </h1>
        <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: '6px 0 0' }}>
          اختر الفترة وحالات الطلبات لعرض الإيرادات والتكاليف وصافي الربح
        </p>
      </div>

      {/* ── Filters ── */}
      <div style={card}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '16px' }}>
          <div>
            <label style={lab}>من تاريخ</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lab}>إلى تاريخ</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inp} />
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[['today','اليوم'],['week','آخر 7 أيام'],['month','هذا الشهر'],['lastMonth','الشهر الماضي'],['all','الكل']].map(([k, l]) => (
              <button key={k} onClick={() => applyPreset(k)} style={presetBtn}>{l}</button>
            ))}
          </div>
          {(dateFrom || dateTo) && (
            <button onClick={() => applyPreset('all')} style={{ ...presetBtn, background: '#fef2f2', color: '#b91c1c', borderColor: '#fecaca' }}>
              <X size={13} /> إلغاء الفلتر
            </button>
          )}
        </div>

        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '14px' }}>
          <label style={{ ...lab, marginBottom: '8px' }}>حالات الطلبات المحتسبة</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {STATUSES.map(st => {
              const on = selected.includes(st.key);
              return (
                <button key={st.key} onClick={() => toggleStatus(st.key)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', cursor: 'pointer',
                    fontWeight: '800', fontSize: '0.82rem', transition: '0.15s',
                    background: on ? '#f0fdf4' : '#fff', color: on ? '#15803d' : '#9ca3af',
                    border: on ? '2px solid #16a34a' : '2px solid #e5e7eb' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: on ? st.color : '#d1d5db' }} />
                  {st.label}
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button onClick={() => setSelected(STATUSES.map(s => s.key))} style={linkBtn}>تحديد الكل</button>
            <button onClick={() => setSelected([])} style={linkBtn}>إلغاء الكل</button>
            <button onClick={() => setSelected(['delivered'])} style={linkBtn}>الموصّلة فقط</button>
          </div>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', margin: '18px 0' }}>
        {[
          { label: 'عدد الطلبات',     value: totals.count.toLocaleString('ar-EG'), color: '#1a1a1a', bg: '#f9fafb', icon: <Package size={20} /> },
          { label: 'إجمالي المبيعات (بدون الشحن)', value: egp(totals.gross),       color: '#15803d', bg: '#f0fdf4', icon: <TrendingUp size={20} /> },
          { label: 'إجمالي التكلفة',  value: egp(totals.cost),                     color: '#d97706', bg: '#fffbeb', icon: <TrendingDown size={20} /> },
          { label: 'صافي الربح',      value: egp(totals.net),                      color: totals.net >= 0 ? '#15803d' : '#b91c1c', bg: totals.net >= 0 ? '#f0fdf4' : '#fef2f2', icon: <DollarSign size={20} /> },
          { label: 'هامش الربح',      value: `${totals.margin.toFixed(1)}%`,       color: totals.margin >= 0 ? '#15803d' : '#b91c1c', bg: '#eff6ff', icon: <Percent size={20} /> },
        ].map((c, i) => (
          <div key={i} style={{ ...card, background: c.bg, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: c.color, marginBottom: '8px' }}>
              {c.icon}<span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#6b7280' }}>{c.label}</span>
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: '900', color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* ── Revenue composition ── */}
      <div style={{ ...card, marginBottom: '14px' }}>
        <h3 style={h3}>مكوّنات الإيراد</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {[
            { l: 'قيمة المنتجات قبل الخصم', v: totals.gross + totals.discounts, c: '#1a1a1a' },
            { l: 'الخصومات المطبقة', v: -totals.discounts, c: '#16a34a' },
            { l: 'إجمالي المبيعات (بدون الشحن)', v: totals.gross, c: '#15803d' },
            { l: 'إيراد الشحن المحصّل', v: totals.shipRev, c: '#3b82f6' },
          ].map((r, i) => (
            <div key={i} style={{ background: '#f9fafb', borderRadius: '12px', padding: '14px' }}>
              <div style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: '700', marginBottom: '4px' }}>{r.l}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '900', color: r.c }}>{egp(r.v)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Cost composition ── */}
      <div style={card}>
        <h3 style={h3}>مكوّنات التكلفة</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {[
            { l: 'تكلفة المنتجات', v: totals.product },
            { l: 'تكلفة الشحن المدفوعة', v: totals.shipping },
            { l: 'تكاليف إضافية', v: totals.extra },
          ].map((r, i) => (
            <div key={i} style={{ background: '#f9fafb', borderRadius: '12px', padding: '14px' }}>
              <div style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: '700', marginBottom: '4px' }}>{r.l}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#1a1a1a' }}>{egp(r.v)}</div>
              <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '2px' }}>
                {totals.cost > 0 ? `${((r.v / totals.cost) * 100).toFixed(1)}% من التكلفة` : '—'}
              </div>
            </div>
          ))}
        </div>
        {totals.missing > 0 && (
          <div style={{ marginTop: '14px', background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: '12px', padding: '12px 14px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.82rem', color: '#92400e', fontWeight: '600', lineHeight: 1.6 }}>
              <strong>{totals.missing}</strong> طلب بها منتجات بدون تكلفة مُدخلة — صافي الربح سيظهر أعلى من الحقيقة.
              أدخل التكاليف من صفحة <strong>الأرباح</strong> ليكون التقرير دقيقاً.
            </div>
          </div>
        )}
      </div>

      {/* ── Breakdown toggle ── */}
      <button onClick={() => setShowBreakdown(v => !v)}
        style={{ ...presetBtn, margin: '18px 0 0', padding: '12px 20px', fontSize: '0.9rem', background: '#f0fdf4', color: '#15803d', borderColor: '#bbf7d0' }}>
        {showBreakdown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        {showBreakdown ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
      </button>

      {showBreakdown && (
        <>
          {/* Per-status */}
          <div style={{ ...card, marginTop: '14px' }}>
            <h3 style={h3}>التفصيل حسب الحالة</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={table}>
                <thead><tr style={{ background: '#f9fafb' }}>
                  <th style={th}>الحالة</th><th style={th}>عدد الطلبات</th><th style={th}>المبيعات</th><th style={th}>التكلفة</th><th style={th}>صافي الربح</th>
                </tr></thead>
                <tbody>
                  {byStatus.map(s => (
                    <tr key={s.key} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={td}><span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '800', color: s.color }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color }} />{s.label}</span></td>
                      <td style={td}>{s.count}</td>
                      <td style={td}>{egp(s.gross)}</td>
                      <td style={{ ...td, color: '#d97706' }}>{egp(s.cost)}</td>
                      <td style={{ ...td, fontWeight: '900', color: s.net >= 0 ? '#15803d' : '#b91c1c' }}>{egp(s.net)}</td>
                    </tr>
                  ))}
                  {byStatus.length === 0 && <tr><td style={td} colSpan={5}>لا توجد طلبات مطابقة</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Per-order */}
          <div style={{ ...card, marginTop: '14px' }}>
            <h3 style={h3}>تفاصيل الطلبات ({rows.length})</h3>
            <div style={{ overflowX: 'auto', maxHeight: '560px', overflowY: 'auto' }}>
              <table style={table}>
                <thead><tr style={{ background: '#f9fafb', position: 'sticky', top: 0 }}>
                  <th style={th}>رقم الطلب</th><th style={th}>التاريخ</th><th style={th}>العميل</th><th style={th}>الحالة</th>
                  <th style={th}>المنتجات</th><th style={th}>الخصم</th><th style={th}>المبيعات</th>
                  <th style={th}>تكلفة المنتجات</th><th style={th}>شحن محصّل</th><th style={th}>شحن مدفوع</th><th style={th}>إضافية</th><th style={th}>صافي الربح</th>
                </tr></thead>
                <tbody>
                  {rows.map(o => {
                    const st = STATUSES.find(s => s.key === (o.status || 'pending'));
                    const net = netOf(o);
                    return (
                      <tr key={o.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ ...td, fontFamily: 'monospace', fontWeight: '800', color: '#16a34a' }}>#{o.id.slice(0, 8).toUpperCase()}</td>
                        <td style={{ ...td, whiteSpace: 'nowrap' }}>{new Date(o.created_at).toLocaleDateString('ar-EG')}</td>
                        <td style={{ ...td, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.customer_name}</td>
                        <td style={{ ...td, color: st?.color, fontWeight: '800' }}>{st?.label || o.status}</td>
                        <td style={td}>{egp(itemsSubtotal(o))}</td>
                        <td style={{ ...td, color: '#16a34a' }}>{discountsOf(o) > 0 ? `- ${egp(discountsOf(o))}` : '—'}</td>
                        <td style={{ ...td, fontWeight: '800' }}>{egp(grossOf(o))}</td>
                        <td style={{ ...td, color: missingCost(o) ? '#d97706' : '#555' }}>
                          {egp(prodCost(o))}{missingCost(o) && ' ⚠️'}
                        </td>
                        <td style={{ ...td, color: '#3b82f6' }}>{egp(shipCharged(o))}</td>
                        <td style={td}>{egp(shipCost(o))}</td>
                        <td style={td}>{egp(extraCost(o))}</td>
                        <td style={{ ...td, fontWeight: '900', color: net >= 0 ? '#15803d' : '#b91c1c' }}>{egp(net)}</td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 && <tr><td style={td} colSpan={12}>لا توجد طلبات مطابقة للفلاتر</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const card: any = { background: '#fff', borderRadius: '16px', border: '1px solid #eee', padding: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' };
const lab: any = { display: 'block', fontSize: '0.75rem', fontWeight: '800', color: '#6b7280', marginBottom: '6px' };
const inp: any = { padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #e5e7eb', fontSize: '0.88rem', outline: 'none', fontFamily: 'inherit' };
const presetBtn: any = { display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '9px 14px', borderRadius: '10px', border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer' };
const linkBtn: any = { background: 'none', border: 'none', color: '#16a34a', fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer', padding: 0, textDecoration: 'underline' };
const h3: any = { fontSize: '1rem', fontWeight: '900', color: '#1a1a1a', margin: '0 0 14px' };
const table: any = { width: '100%', borderCollapse: 'collapse', textAlign: 'right', minWidth: '640px' };
const th: any = { padding: '10px 12px', fontSize: '0.75rem', color: '#6b7280', fontWeight: '900', whiteSpace: 'nowrap', borderBottom: '2px solid #f0f0f0' };
const td: any = { padding: '10px 12px', fontSize: '0.82rem', color: '#374151', whiteSpace: 'nowrap' };
