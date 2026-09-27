'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import {
  Loader2, Search, X, Download, Package, TrendingUp, TrendingDown,
  DollarSign, Percent, AlertTriangle, Boxes, ChevronDown, ChevronUp, FileSpreadsheet,
  TicketPercent, BadgePercent
} from 'lucide-react';
import toast from 'react-hot-toast';

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
const num = (v: any): number => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
const str = (v: any): string => (v == null ? '' : String(v)).trim();
const fmtDate = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ar-EG'); };
const statusOf = (o: any) => (o.status || 'pending') as string;
const labelOf = (k: string) => STATUSES.find(s => s.key === k)?.label || k;
const orderNo = (o: any) => '#' + str(o.id).slice(0, 8).toUpperCase();
const bucketKey = (l: Pick<Line, 'productId' | 'name' | 'car_make' | 'car_model' | 'car_model_year'>) =>
  l.productId || `~${l.name}|${l.car_make}|${l.car_model}|${l.car_model_year}`;

// Total discount on the order: promo/coupon discount plus wallet discount.
const orderDiscount = (o: any): number =>
  num(o.discount_applied || o.discount_amount || 0) + num(o.wallet_discount || 0);

// ── One row per item inside an order ─────────────────────────────────────────
type Line = {
  key: string;
  orderId: string;
  orderNo: string;
  status: string;
  date: string;
  productId: string;
  name: string;
  brand: string;
  car_make: string;
  car_model: string;
  car_model_year: string;
  cost_price: number;
  price: number;
  quantity: number;
  hasCost: boolean;
  hasDiscount: boolean;
  discountShare: number;
  netUnit: number;
  costTotal: number;
  sellTotal: number;
  netTotal: number;
  profit: number;
};

function flatten(o: any): Line[] {
  const items = Array.isArray(o.items) ? o.items : [];
  const discount = orderDiscount(o);
  // The order's discount is split evenly across its line items, so every row
  // carries `discount / lineCount` and the shares always sum back to the total.
  const share = items.length > 0 ? discount / items.length : 0;
  return items.map((it: any, idx: number) => {
    const qty = Math.max(1, parseInt(it.quantity) || 1);
    const cost = num(it.cost_price);
    const price = num(it.price);
    const sellTotal = price * qty;
    // Clamped so a malformed discount can never push a row's net below zero.
    const discountShare = Math.min(Math.max(share, 0), sellTotal);
    const netTotal = sellTotal - discountShare;
    return {
      key: `${o.id}-${idx}`,
      orderId: str(o.id),
      orderNo: orderNo(o),
      status: statusOf(o),
      date: str(o.created_at),
      productId: str(it.id),
      name: str(it.name) || 'منتج غير معروف',
      brand: str(it.brand),
      car_make: str(it.car_make),
      car_model: str(it.car_model),
      car_model_year: str(it.car_model_year),
      cost_price: cost,
      price,
      quantity: qty,
      hasCost: cost > 0,
      hasDiscount: discount > 0,
      discountShare,
      netUnit: netTotal / qty,
      costTotal: cost * qty,
      sellTotal,
      netTotal,
      profit: netTotal - cost * qty,
    };
  });
}

// ── Aggregated "most sold" bucket per product ────────────────────────────────
type Bucket = {
  key: string;
  name: string;
  brand: string;
  car_make: string;
  car_model: string;
  car_model_year: string;
  quantity: number;
  orderIds: Set<string>;
  costTotal: number;
  sellTotal: number;
  discountTotal: number;
  netTotal: number;
  profit: number;
  missingCost: number;
};

function aggregate(lines: Line[]): Bucket[] {
  const map = new Map<string, Bucket>();
  for (const l of lines) {
    const key = bucketKey(l);
    let b = map.get(key);
    if (!b) {
      b = {
        key, name: l.name, brand: l.brand, car_make: l.car_make, car_model: l.car_model,
        car_model_year: l.car_model_year, quantity: 0, orderIds: new Set(),
        costTotal: 0, sellTotal: 0, discountTotal: 0, netTotal: 0,
        profit: 0, missingCost: 0,
      };
      map.set(key, b);
    }
    // Older orders may predate brand capture — keep the first one we actually have.
    if (!b.brand && l.brand) b.brand = l.brand;
    b.quantity += l.quantity;
    b.orderIds.add(l.orderId);
    b.costTotal += l.costTotal;
    b.sellTotal += l.sellTotal;
    b.discountTotal += l.discountShare;
    b.netTotal += l.netTotal;
    b.profit += l.profit;
    if (!l.hasCost) b.missingCost += l.quantity;
  }
  return [...map.values()];
}

// Aggregated row as rendered/sorted — `orderIds` collapses to a plain count.
type Row = Omit<Bucket, 'orderIds'> & { orders: number };

export default function SoldItemsPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selected, setSelected] = useState<string[]>(STATUSES.map(s => s.key));
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'lines' | 'top'>('lines');
  const [sortKey, setSortKey] = useState<keyof Row>('quantity');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [exporting, setExporting] = useState(false);

  // Re-fetch whenever the selected period changes.
  useEffect(() => { fetchOrders(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [dateFrom, dateTo]);

  async function fetchOrders() {
    setLoading(true);
    try {
      // Supabase caps a select at 1000 rows by default, so page through in batches.
      const all: any[] = [];
      const batchSize = 1000;
      let from = 0;
      while (true) {
        let q = supabase
          .from('orders')
          .select('id, created_at, status, items, discount_applied, discount_amount, wallet_discount, promo_code')
          .order('created_at', { ascending: false })
          .range(from, from + batchSize - 1);
        if (dateFrom) q = q.gte('created_at', new Date(dateFrom).toISOString());
        if (dateTo)   q = q.lte('created_at', new Date(dateTo + 'T23:59:59').toISOString());
        const { data, error } = await q;
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < batchSize) break;
        from += batchSize;
      }
      setOrders(all);
    } catch (err: any) {
      console.error(err);
      toast.error('فشل تحميل الطلبات: ' + (err?.message || 'خطأ غير معروف'));
    } finally {
      setLoading(false);
    }
  }

  function applyPreset(preset: string) {
    const now = new Date();
    if (preset === 'today')           { setDateFrom(ymd(now)); setDateTo(ymd(now)); }
    else if (preset === 'week')       { const d = new Date(now); d.setDate(d.getDate() - 6); setDateFrom(ymd(d)); setDateTo(ymd(now)); }
    else if (preset === 'month')      { setDateFrom(ymd(new Date(now.getFullYear(), now.getMonth(), 1))); setDateTo(ymd(now)); }
    else if (preset === 'lastMonth')  {
      setDateFrom(ymd(new Date(now.getFullYear(), now.getMonth() - 1, 1)));
      setDateTo(ymd(new Date(now.getFullYear(), now.getMonth(), 0)));
    }
    else if (preset === 'last90')     { const d = new Date(now); d.setDate(d.getDate() - 89); setDateFrom(ymd(d)); setDateTo(ymd(now)); }
    else { setDateFrom(''); setDateTo(''); }
  }

  const toggleStatus = (k: string) =>
    setSelected(prev => (prev.includes(k) ? prev.filter(s => s !== k) : [...prev, k]));

  // ── Flatten → filter by status → filter by search ──────────────────────────
  const lines = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders
      .filter(o => selected.includes(statusOf(o)))
      .flatMap(flatten)
      .filter(l =>
        !q ||
        l.name.toLowerCase().includes(q) ||
        l.brand.toLowerCase().includes(q) ||
        l.car_make.toLowerCase().includes(q) ||
        l.car_model.toLowerCase().includes(q) ||
        l.car_model_year.toLowerCase().includes(q)
      )
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [orders, selected, search]);

  const totals = useMemo(() => {
    const quantity = lines.reduce((s, l) => s + l.quantity, 0);
    const cost = lines.reduce((s, l) => s + l.costTotal, 0);
    const sell = lines.reduce((s, l) => s + l.sellTotal, 0);
    const discount = lines.reduce((s, l) => s + l.discountShare, 0);
    const net = lines.reduce((s, l) => s + l.netTotal, 0);
    const missing = lines.filter(l => !l.hasCost);
    return {
      quantity, cost, sell, discount, net,
      profit: net - cost,
      margin: net > 0 ? ((net - cost) / net) * 100 : 0,
      orderCount: new Set(lines.map(l => l.orderId)).size,
      discountedOrders: new Set(lines.filter(l => l.hasDiscount).map(l => l.orderId)).size,
      missingLines: missing.length,
      missingQuantity: missing.reduce((s, l) => s + l.quantity, 0),
    };
  }, [lines]);

  const top = useMemo<Row[]>(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return aggregate(lines)
      .map(({ orderIds, ...b }) => ({ ...b, orders: orderIds.size }))
      .sort((a, b) => (Number(a[sortKey]) - Number(b[sortKey])) * dir);
  }, [lines, sortKey, sortDir]);

  const toggleSort = (k: keyof Row) => {
    if (k === sortKey) setSortDir(d => (d === 'desc' ? 'asc' : 'desc'));
    else { setSortKey(k); setSortDir('desc'); }
  };

  const sortTh = (k: keyof Row, label: string) => (
    <th style={{ ...th, cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort(k)}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        {label}
        {sortKey === k && (sortDir === 'desc' ? <ChevronDown size={13} /> : <ChevronUp size={13} />)}
      </span>
    </th>
  );

  // ── CSV export (mirrors the products page pattern) ─────────────────────────
  const exportCsv = () => {
    if (view === 'lines' ? lines.length === 0 : top.length === 0) {
      toast.error('لا توجد بيانات للتصدير');
      return;
    }
    setExporting(true);
    const safe = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    let content: string;

    if (view === 'lines') {
      const headers = 'رقم الطلب,التاريخ,الحالة,اسم المنتج,البراند,ماركة السيارة,الموديل,سنة الموديل,الكمية,سعر التكلفة,سعر البيع,حصة الخصم,صافي السعر,إجمالي التكلفة,إجمالي البيع,صافي البيع,الربح\n';
      const rows = lines.map(l =>
        [safe(l.orderNo), safe(fmtDate(l.date)), safe(labelOf(l.status)), safe(l.name),
         safe(l.brand), safe(l.car_make), safe(l.car_model), safe(l.car_model_year), l.quantity,
         l.hasCost ? l.cost_price : '', l.price, l.discountShare, l.netUnit,
         l.costTotal, l.sellTotal, l.netTotal, l.profit].join(',')
      ).join('\n');
      content = headers + rows;
    } else {
      const headers = 'اسم المنتج,البراند,ماركة السيارة,الموديل,سنة الموديل,الكمية المباعة,عدد الطلبات,إجمالي المبيعات,إجمالي الخصم,صافي المبيعات,إجمالي التكلفة,صافي الربح\n';
      const rows = top.map(b =>
        [safe(b.name), safe(b.brand), safe(b.car_make), safe(b.car_model), safe(b.car_model_year),
         b.quantity, b.orders, b.sellTotal, b.discountTotal, b.netTotal,
         b.costTotal, b.profit].join(',')
      ).join('\n');
      content = headers + rows;
    }

    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const range = dateFrom || dateTo ? `_${dateFrom || 'بداية'}_${dateTo || 'النهاية'}` : '';
    link.download = `المنتجات_المباعة${range}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    setExporting(false);
    toast.success(`تم تصدير ${view === 'lines' ? lines.length : top.length} صف`);
  };

  const hasFilter = Boolean(dateFrom || dateTo || search.trim());

  const resetFilters = () => {
    setDateFrom(''); setDateTo(''); setSearch('');
    setSelected(STATUSES.map(s => s.key));
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#15803d', fontWeight: '900', gap: '12px' }}>
      <Loader2 className="animate-spin" size={26} /> جاري تحميل الأصناف المباعة...
    </div>
  );

  return (
    <div style={{ direction: 'rtl', padding: '10px 0 60px' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .si-cards { display: none; flex-direction: column; gap: 10px; }
        @media (max-width: 1000px) {
          .si-table { display: none !important; }
          .si-cards { display: flex !important; }
        }
        @media (min-width: 1001px) { .si-table { display: block !important; } .si-cards { display: none !important; } }
        @media (max-width: 600px) {
          .si-title { font-size: 1.4rem !important; }
          .si-date { flex: 1 1 100%; }
          .si-date input { width: 100%; box-sizing: border-box; }
          .si-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .si-preset { flex: 1 1 auto; justify-content: center; }
          .si-view button { flex: 1 1 auto; justify-content: center; }
        }
      `}} />

      <div style={{ marginBottom: '22px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h1 className="si-title" style={{ fontSize: '1.9rem', fontWeight: '900', color: '#1a1a1a', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            🧾 المنتجات المباعة
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: '6px 0 0' }}>
            اختر الفترة الزمنية لعرض كل صنف تم بيعه بالتكلفة وسعر البيع — الخصم يُوزّع بالتساوي على أصناف الطلب
          </p>
        </div>
        <button onClick={exportCsv} disabled={exporting} style={exportBtn}>
          {exporting ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
          تصدير CSV
        </button>
      </div>

      {/* ── Filters ── */}
      <div style={card}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '16px' }}>
          <div className="si-date">
            <label style={lab}>من تاريخ</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inp} />
          </div>
          <div className="si-date">
            <label style={lab}>إلى تاريخ</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inp} />
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', flex: '1 1 100%' }}>
            {[
              ['today', 'اليوم'], ['week', 'آخر 7 أيام'], ['month', 'هذا الشهر'],
              ['lastMonth', 'الشهر الماضي'], ['last90', 'آخر 90 يوم'], ['all', 'كل الفترة'],
            ].map(([k, l]) => (
              <button key={k} className="si-preset" onClick={() => applyPreset(k)} style={presetBtn}>{l}</button>
            ))}
          </div>
          {hasFilter && (
            <button onClick={resetFilters} style={{ ...presetBtn, background: '#fef2f2', color: '#b91c1c', borderColor: '#fecaca' }}>
              <X size={13} /> إلغاء الكل
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 240px', minWidth: 0 }}>
            <label style={lab}>بحث</label>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', right: '11px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="اسم المنتج، البراند، ماركة السيارة، الموديل أو السنة"
                style={{ ...inp, paddingRight: '34px', width: '100%' }}
              />
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #f0f0f0', marginTop: '14px', paddingTop: '14px' }}>
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
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
            <button onClick={() => setSelected(STATUSES.map(s => s.key))} style={linkBtn}>تحديد الكل</button>
            <button onClick={() => setSelected([])} style={linkBtn}>إلغاء الكل</button>
            <button onClick={() => setSelected(['delivered'])} style={linkBtn}>الموصّلة فقط</button>
            <button onClick={() => setSelected(['pending', 'processing', 'shipped', 'delivered'])} style={linkBtn}>المحصّلة فقط</button>
          </div>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="si-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px', margin: '18px 0' }}>
        {[
          { label: 'عدد الأصناف',    value: lines.length.toLocaleString('ar-EG'),       color: '#1a1a1a', bg: '#f9fafb', icon: <Package size={20} /> },
          { label: 'إجمالي الكمية',  value: totals.quantity.toLocaleString('ar-EG'),    color: '#1a1a1a', bg: '#f9fafb', icon: <Boxes size={20} /> },
          { label: 'عدد الطلبات',    value: totals.orderCount.toLocaleString('ar-EG'), color: '#1a1a1a', bg: '#f9fafb', icon: <FileSpreadsheet size={20} /> },
          { label: 'إجمالي المبيعات', value: egp(totals.sell),                         color: '#1a1a1a', bg: '#f9fafb', icon: <TrendingUp size={20} /> },
          { label: `الخصومات (${totals.discountedOrders} طلب)`, value: `- ${egp(totals.discount)}`, color: '#7c3aed', bg: '#f5f3ff', icon: <TicketPercent size={20} /> },
          { label: 'صافي المبيعات',  value: egp(totals.net),                          color: '#15803d', bg: '#f0fdf4', icon: <BadgePercent size={20} /> },
          { label: 'إجمالي التكلفة', value: egp(totals.cost),                         color: '#d97706', bg: '#fffbeb', icon: <TrendingDown size={20} /> },
          { label: 'صافي الربح',     value: egp(totals.profit),                        color: totals.profit >= 0 ? '#15803d' : '#b91c1c', bg: totals.profit >= 0 ? '#f0fdf4' : '#fef2f2', icon: <DollarSign size={20} /> },
          { label: 'هامش الربح',     value: `${totals.margin.toFixed(1)}%`,            color: totals.margin >= 0 ? '#15803d' : '#b91c1c', bg: '#eff6ff', icon: <Percent size={20} /> },
        ].map((c, i) => (
          <div key={i} style={{ ...card, background: c.bg, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: c.color, marginBottom: '8px' }}>
              {c.icon}<span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#6b7280' }}>{c.label}</span>
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: '900', color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {totals.missingLines > 0 && (
        <div style={{ marginBottom: '14px', background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: '12px', padding: '12px 14px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.82rem', color: '#92400e', fontWeight: '600', lineHeight: 1.6 }}>
            <strong>{totals.missingLines}</strong> صنف ({totals.missingQuantity} قطعة) بدون تكلفة مُدخلة — الأرباح ستظهر أعلى من الحقيقة.
            أدخل التكاليف من صفحة <strong>الأرباح</strong> ليكون التقرير دقيقاً.
          </div>
        </div>
      )}

      {/* ── View toggle ── */}
      <div className="si-view" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <button onClick={() => setView('lines')} style={viewBtn(view === 'lines')}>
          <Package size={15} /> تفاصيل الأصناف ({lines.length})
        </button>
        <button onClick={() => setView('top')} style={viewBtn(view === 'top')}>
          <TrendingUp size={15} /> الأكثر مبيعاً ({top.length})
        </button>
      </div>

      {/* ── Detail: one row per item ── */}
      {view === 'lines' ? (
        <div style={card}>
          <div className="si-cards">
            {lines.map(l => {
              const st = STATUSES.find(s => s.key === l.status);
              return (
                <div key={l.key} style={mCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: '900', color: '#16a34a', fontSize: '0.8rem' }}>{l.orderNo}</span>
                    <span style={{ fontSize: '0.7rem', fontWeight: '900', color: st?.color, background: '#fff', border: `1px solid ${st?.color}33`, borderRadius: '7px', padding: '2px 8px' }}>{labelOf(l.status)}</span>
                  </div>
                  <div style={{ fontWeight: '900', color: '#1a1a1a', fontSize: '0.92rem', marginBottom: '2px' }}>{l.name}</div>
                  <div style={{ fontSize: '0.74rem', color: '#6b7280', marginBottom: '8px' }}>
                    {l.brand ? `${l.brand} • ` : ''}{[l.car_make, l.car_model, l.car_model_year].filter(Boolean).join(' • ') || '—'} • {fmtDate(l.date)}
                  </div>
                  <div style={mRow}><span>الكمية</span><span style={vStrong}>{l.quantity}</span></div>
                  <div style={mRow}>
                    <span>سعر التكلفة</span>
                    <span style={{ color: l.hasCost ? '#d97706' : '#9ca3af' }}>{l.hasCost ? egp(l.cost_price) : 'غير مُدخَل'}</span>
                  </div>
                  <div style={mRow}><span>سعر البيع</span><span style={vStrong}>{egp(l.price)}</span></div>
                  <div style={mRow}>
                    <span>حصة الخصم</span>
                    <span style={{ color: l.discountShare > 0 ? '#7c3aed' : '#9ca3af' }}>{l.discountShare > 0 ? `- ${egp(l.discountShare)}` : '—'}</span>
                  </div>
                  <div style={mRow}><span>صافي السعر</span><span style={vStrong}>{egp(l.netUnit)}</span></div>
                  <div style={mTotal}>
                    <span>الربح</span>
                    <span style={{ color: l.profit >= 0 ? '#15803d' : '#b91c1c' }}>{egp(l.profit)}</span>
                  </div>
                </div>
              );
            })}
            {lines.length === 0 && <div style={{ ...mCard, textAlign: 'center', color: '#9ca3af' }}>لا توجد أصناف مطابقة للفلاتر</div>}
          </div>

          <div className="si-table" style={{ overflowX: 'auto', maxHeight: '620px', overflowY: 'auto' }}>
            <table style={{ ...table, minWidth: '1340px' }}>
              <thead><tr style={{ background: '#f9fafb', position: 'sticky', top: 0 }}>
                <th style={th}>رقم الطلب</th><th style={th}>التاريخ</th><th style={th}>الحالة</th>
                <th style={th}>اسم المنتج</th><th style={th}>البراند</th><th style={th}>ماركة السيارة</th><th style={th}>الموديل</th><th style={th}>سنة الموديل</th>
                <th style={th}>الكمية</th><th style={th}>سعر التكلفة</th><th style={th}>سعر البيع</th>
                <th style={{ ...th, color: '#7c3aed' }}>حصة الخصم</th><th style={th}>صافي السعر</th>
                <th style={th}>إجمالي التكلفة</th><th style={th}>إجمالي البيع</th><th style={th}>صافي البيع</th><th style={th}>الربح</th>
              </tr></thead>
              <tbody>
                {lines.map(l => {
                  const st = STATUSES.find(s => s.key === l.status);
                  return (
                    <tr key={l.key} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ ...td, fontFamily: 'monospace', fontWeight: '800', color: '#16a34a' }}>{l.orderNo}</td>
                      <td style={{ ...td, whiteSpace: 'nowrap' }}>{fmtDate(l.date)}</td>
                      <td style={{ ...td, color: st?.color, fontWeight: '800' }}>{labelOf(l.status)}</td>
                      <td style={{ ...td, fontWeight: '800', color: '#1a1a1a', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={l.name}>{l.name}</td>
                      <td style={{ ...td, fontWeight: '800', color: '#1f2937' }}>{l.brand || '—'}</td>
                      <td style={td}>{l.car_make || '—'}</td>
                      <td style={td}>{l.car_model || '—'}</td>
                      <td style={td}>{l.car_model_year || '—'}</td>
                      <td style={{ ...td, fontWeight: '900' }}>{l.quantity}</td>
                      <td style={{ ...td, color: l.hasCost ? '#d97706' : '#9ca3af' }}>{l.hasCost ? egp(l.cost_price) : 'غير مُدخَل'}</td>
                      <td style={{ ...td, fontWeight: '800' }}>{egp(l.price)}</td>
                      <td style={{ ...td, color: l.discountShare > 0 ? '#7c3aed' : '#9ca3af', fontWeight: l.discountShare > 0 ? '800' : undefined }}>
                        {l.discountShare > 0 ? `- ${egp(l.discountShare)}` : '—'}
                      </td>
                      <td style={{ ...td, fontWeight: '800', color: l.discountShare > 0 ? '#7c3aed' : '#1a1a1a' }}>{egp(l.netUnit)}</td>
                      <td style={td}>{egp(l.costTotal)}</td>
                      <td style={td}>{egp(l.sellTotal)}</td>
                      <td style={{ ...td, fontWeight: '800', color: '#15803d' }}>{egp(l.netTotal)}</td>
                      <td style={{ ...td, fontWeight: '900', color: l.profit >= 0 ? '#15803d' : '#b91c1c' }}>{egp(l.profit)}</td>
                    </tr>
                  );
                })}
                {lines.length === 0 && <tr><td style={td} colSpan={17}>لا توجد أصناف مطابقة للفلاتر</td></tr>}
              </tbody>
              {lines.length > 0 && (
                <tfoot>
                  <tr style={{ background: '#f0fdf4', borderTop: '2px solid #16a34a' }}>
                    <td style={{ ...td, fontWeight: '900' }} colSpan={8}>الإجمالي ({lines.length} صنف)</td>
                    <td style={{ ...td, fontWeight: '900' }}>{totals.quantity}</td>
                    <td style={td}>—</td>
                    <td style={td}>—</td>
                    <td style={{ ...td, fontWeight: '900', color: '#7c3aed' }}>- {egp(totals.discount)}</td>
                    <td style={td}>—</td>
                    <td style={{ ...td, fontWeight: '900', color: '#d97706' }}>{egp(totals.cost)}</td>
                    <td style={{ ...td, fontWeight: '900' }}>{egp(totals.sell)}</td>
                    <td style={{ ...td, fontWeight: '900', color: '#15803d' }}>{egp(totals.net)}</td>
                    <td style={{ ...td, fontWeight: '900', color: totals.profit >= 0 ? '#15803d' : '#b91c1c' }}>{egp(totals.profit)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      ) : (
        /* ── Aggregated: most sold products ── */
        <div style={card}>
          <div className="si-cards">
            {top.map((b, i) => (
              <div key={b.key} style={mCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: '900', color: '#16a34a' }}>#{i + 1}</span>
                  <span style={vStrong}>{b.quantity} قطعة</span>
                </div>
                <div style={{ fontWeight: '900', color: '#1a1a1a', fontSize: '0.92rem' }}>{b.name}</div>
                <div style={{ fontSize: '0.74rem', color: '#6b7280', marginBottom: '8px' }}>
                  {b.brand ? `${b.brand} • ` : ''}{[b.car_make, b.car_model, b.car_model_year].filter(Boolean).join(' • ') || '—'}
                </div>
                <div style={mRow}><span>عدد الطلبات</span><span style={vStrong}>{b.orders}</span></div>
                <div style={mRow}><span>إجمالي المبيعات</span><span>{egp(b.sellTotal)}</span></div>
                <div style={mRow}>
                  <span>إجمالي الخصم</span>
                  <span style={{ color: b.discountTotal > 0 ? '#7c3aed' : '#9ca3af' }}>{b.discountTotal > 0 ? `- ${egp(b.discountTotal)}` : '—'}</span>
                </div>
                <div style={mRow}><span>صافي المبيعات</span><span style={vStrong}>{egp(b.netTotal)}</span></div>
                <div style={mRow}><span>إجمالي التكلفة</span><span style={{ color: '#d97706' }}>{egp(b.costTotal)}</span></div>
                <div style={mTotal}>
                  <span>الربح</span>
                  <span style={{ color: b.profit >= 0 ? '#15803d' : '#b91c1c' }}>{egp(b.profit)}</span>
                </div>
              </div>
            ))}
            {top.length === 0 && <div style={{ ...mCard, textAlign: 'center', color: '#9ca3af' }}>لا توجد أصناف مطابقة للفلاتر</div>}
          </div>

          <div className="si-table" style={{ overflowX: 'auto', maxHeight: '620px', overflowY: 'auto' }}>
            <table style={{ ...table, minWidth: '1000px' }}>
              <thead><tr style={{ background: '#f9fafb', position: 'sticky', top: 0 }}>
                <th style={{ ...th, width: '46px' }}>#</th>
                <th style={th}>اسم المنتج</th><th style={th}>البراند</th><th style={th}>ماركة السيارة</th><th style={th}>الموديل</th><th style={th}>سنة الموديل</th>
                {sortTh('quantity', 'الكمية المباعة')}
                {sortTh('orders', 'عدد الطلبات')}
                <th style={th}>إجمالي المبيعات</th>
                <th style={{ ...th, color: '#7c3aed' }}>إجمالي الخصم</th>
                {sortTh('netTotal', 'صافي المبيعات')}
                <th style={th}>إجمالي التكلفة</th>
                {sortTh('profit', 'صافي الربح')}
              </tr></thead>
              <tbody>
                {top.map((b, i) => (
                  <tr key={b.key} style={{ borderBottom: '1px solid #f3f4f6', background: i === 0 ? '#f0fdf4' : undefined }}>
                    <td style={{ ...td, fontWeight: '900', color: i === 0 ? '#16a34a' : '#9ca3af' }}>{i + 1}</td>
                    <td style={{ ...td, fontWeight: '800', color: '#1a1a1a', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={b.name}>{b.name}</td>
                    <td style={{ ...td, fontWeight: '800', color: '#1f2937' }}>{b.brand || '—'}</td>
                    <td style={td}>{b.car_make || '—'}</td>
                    <td style={td}>{b.car_model || '—'}</td>
                    <td style={td}>{b.car_model_year || '—'}</td>
                    <td style={{ ...td, fontWeight: '900' }}>{b.quantity}{b.missingCost > 0 && <span title={`${b.missingCost} قطعة بدون تكلفة`} style={{ color: '#d97706' }}> ⚠️</span>}</td>
                    <td style={td}>{b.orders}</td>
                    <td style={td}>{egp(b.sellTotal)}</td>
                    <td style={{ ...td, color: b.discountTotal > 0 ? '#7c3aed' : '#9ca3af', fontWeight: b.discountTotal > 0 ? '800' : undefined }}>
                      {b.discountTotal > 0 ? `- ${egp(b.discountTotal)}` : '—'}
                    </td>
                    <td style={{ ...td, fontWeight: '800', color: '#15803d' }}>{egp(b.netTotal)}</td>
                    <td style={{ ...td, color: '#d97706' }}>{egp(b.costTotal)}</td>
                    <td style={{ ...td, fontWeight: '900', color: b.profit >= 0 ? '#15803d' : '#b91c1c' }}>{egp(b.profit)}</td>
                  </tr>
                ))}
                {top.length === 0 && <tr><td style={td} colSpan={13}>لا توجد أصناف مطابقة للفلاتر</td></tr>}
              </tbody>
              {top.length > 0 && (
                <tfoot>
                  <tr style={{ background: '#f0fdf4', borderTop: '2px solid #16a34a' }}>
                    <td style={td} colSpan={6}>الإجمالي ({top.length} منتج)</td>
                    <td style={{ ...td, fontWeight: '900' }}>{totals.quantity}</td>
                    <td style={{ ...td, fontWeight: '900' }}>{totals.orderCount}</td>
                    <td style={{ ...td, fontWeight: '900' }}>{egp(totals.sell)}</td>
                    <td style={{ ...td, fontWeight: '900', color: '#7c3aed' }}>- {egp(totals.discount)}</td>
                    <td style={{ ...td, fontWeight: '900', color: '#15803d' }}>{egp(totals.net)}</td>
                    <td style={{ ...td, fontWeight: '900', color: '#d97706' }}>{egp(totals.cost)}</td>
                    <td style={{ ...td, fontWeight: '900', color: totals.profit >= 0 ? '#15803d' : '#b91c1c' }}>{egp(totals.profit)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
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
const exportBtn: any = { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '10px', border: '1.5px solid #16a34a', background: '#f0fdf4', color: '#15803d', fontWeight: '900', fontSize: '0.84rem', cursor: 'pointer' };
const table: any = { width: '100%', borderCollapse: 'collapse', textAlign: 'right' };
const th: any = { padding: '10px 12px', fontSize: '0.75rem', color: '#6b7280', fontWeight: '900', whiteSpace: 'nowrap', borderBottom: '2px solid #f0f0f0' };
const td: any = { padding: '10px 12px', fontSize: '0.82rem', color: '#374151', whiteSpace: 'nowrap' };
const mCard: any = { background: '#f9fafb', border: '1px solid #eee', borderRadius: '12px', padding: '12px 14px' };
const mRow: any = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#374151', fontWeight: '600', padding: '3px 0' };
const mTotal: any = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.92rem', fontWeight: '900', borderTop: '1px dashed #d1d5db', paddingTop: '8px', marginTop: '6px' };
const vStrong: any = { fontWeight: '900', color: '#1a1a1a' };
const viewBtn = (active: boolean): any => ({
  display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 18px',
  borderRadius: '10px', cursor: 'pointer', fontWeight: '800', fontSize: '0.85rem',
  background: active ? '#16a34a' : '#fff',
  color: active ? '#fff' : '#6b7280',
  border: active ? '1.5px solid #16a34a' : '1.5px solid #e5e7eb',
});
