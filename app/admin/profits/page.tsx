'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import {
  Search, X, ChevronDown, ChevronUp, DollarSign, TrendingUp,
  TrendingDown, Save, Loader2, Calendar, FileText, Package
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminProfits() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  type CostMap = Record<string, Record<number, number>>;
  const [costPrices, setCostPrices] = useState<CostMap>({});
  const [extraCosts, setExtraCosts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    setLoading(true);
    try {
      let q = supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (dateFrom) q = q.gte('created_at', new Date(dateFrom).toISOString());
      if (dateTo) q = q.lte('created_at', new Date(dateTo + 'T23:59:59').toISOString());
      const { data, error } = await q;
      if (error) throw error;
      setOrders(data || []);
      const costs: CostMap = {};
      const extras: Record<string, number> = {};
      (data || []).forEach((order: any) => {
        extras[order.id] = parseFloat(order.extra_costs || 0);
        const items = order.items || [];
        const orderCosts: Record<number, number> = {};
        items.forEach((item: any, idx: number) => {
          orderCosts[idx] = parseFloat(item.cost_price || 0);
        });
        costs[order.id] = orderCosts;
      });
      setCostPrices(costs);
      setExtraCosts(extras);
    } catch (err: any) {
      toast.error('خطأ في جلب الطلبات: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveItemCost(orderId: string, itemIndex: number, costPrice: number) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const items = [...(order.items || [])];
    items[itemIndex] = { ...items[itemIndex], cost_price: costPrice };
    const { error } = await supabase.from('orders').update({ items }).eq('id', orderId);
    if (error) { toast.error('فشل حفظ التكلفة: ' + error.message); return; }
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, items } : o));
  }

  async function saveExtraCosts(orderId: string) {
    const val = extraCosts[orderId] || 0;
    const { error } = await supabase.from('orders').update({ extra_costs: val }).eq('id', orderId);
    if (error) { toast.error('فشل حفظ التكاليف الإضافية: ' + error.message); return; }
    toast.success('تم حفظ التكاليف الإضافية');
  }

  function calcItemProfit(item: any): number {
    const price = parseFloat(item.price || 0);
    const qty = parseInt(item.quantity || 1);
    const cost = 0;
    return (price - cost) * qty;
  }

  function calcOrderNetProfit(order: any): number {
    const items = order.items || [];
    const grossProfit = items.reduce((sum: number, item: any, idx: number) => {
      const price = parseFloat(item.price || 0);
      const qty = parseInt(item.quantity || 1);
      const cost = costPrices[order.id]?.[idx] ?? parseFloat(item.cost_price || 0);
      return sum + (price - cost) * qty;
    }, 0);
    const extras = extraCosts[order.id] || 0;
    return grossProfit - extras;
  }

  function totalRevenue(): number {
    return orders.reduce((s, o) => s + parseFloat(o.total_price || 0), 0);
  }

  function totalNetProfit(): number {
    return orders.reduce((s, o) => s + calcOrderNetProfit(o), 0);
  }

  function totalExtraCosts(): number {
    return Object.values(extraCosts).reduce((s, v) => s + (v || 0), 0);
  }

  const filteredOrders = orders;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#15803d', fontWeight: '900', fontSize: '1.2rem', gap: '12px' }}>
        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
        جاري تحميل بيانات الأرباح...
      </div>
    );
  }

  return (
    <div style={{ direction: 'rtl', padding: 'clamp(12px, 2vw, 24px)' }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes slideDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        .cost-input:focus { border-color: #22c55e !important; outline: none; box-shadow: 0 0 0 3px rgba(34,197,94,0.15); }
        @media (max-width: 640px) {
          .profits-table { display: none !important; }
          .profits-cards { display: flex !important; }
        }
        @media (min-width: 641px) {
          .profits-table { display: block !important; }
          .profits-cards { display: none !important; }
        }
      `}</style>

      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: 'clamp(1.3rem, 4vw, 2rem)', fontWeight: '900', color: '#1a1a1a', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <DollarSign size={28} color="#22c55e" /> إدارة الأرباح
        </h1>
        <p style={{ color: '#666', fontSize: '0.92rem', margin: 0 }}>أدخل تكلفة كل منتج يدوياً لحساب صافي الربح</p>
      </div>

      {/* ── Date Filter ── */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '20px', background: '#fff', padding: '16px 20px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#666', marginBottom: '5px' }}>من تاريخ</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            style={{ height: '42px', padding: '0 12px', border: '1px solid #e5e5e5', borderRadius: '10px', fontSize: '0.88rem', color: '#1a1a1a', background: '#fff' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#666', marginBottom: '5px' }}>إلى تاريخ</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            style={{ height: '42px', padding: '0 12px', border: '1px solid #e5e5e5', borderRadius: '10px', fontSize: '0.88rem', color: '#1a1a1a', background: '#fff' }} />
        </div>
        <button onClick={fetchOrders}
          style={{ height: '42px', padding: '0 20px', background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={16} /> عرض الفترة
        </button>
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(''); setDateTo(''); setTimeout(fetchOrders, 0); }}
            style={{ height: '42px', padding: '0 16px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <X size={14} /> إلغاء الفلتر
          </button>
        )}
      </div>

      {/* ── Summary Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'إجمالي الإيرادات', value: totalRevenue().toLocaleString(), color: '#15803d', icon: <TrendingUp size={20} />, bg: '#f0fdf4' },
          { label: 'صافي الربح', value: totalNetProfit().toLocaleString(), color: totalNetProfit() >= 0 ? '#15803d' : '#dc2626', icon: <DollarSign size={20} />, bg: totalNetProfit() >= 0 ? '#f0fdf4' : '#fef2f2' },
          { label: 'عدد الطلبات', value: filteredOrders.length.toLocaleString(), color: '#1e40af', icon: <Package size={20} />, bg: '#eff6ff' },
          { label: 'إجمالي التكاليف الإضافية', value: totalExtraCosts().toLocaleString(), color: '#d97706', icon: <TrendingDown size={20} />, bg: '#fffbeb' },
        ].map((card, i) => (
          <div key={i} style={{ background: card.bg, borderRadius: '14px', padding: '18px 20px', border: `1px solid ${card.color}22` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ color: card.color }}>{card.icon}</span>
              <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#666' }}>{card.label}</span>
            </div>
            <div style={{ fontSize: 'clamp(1.2rem, 3vw, 1.8rem)', fontWeight: '900', color: card.color }}>{card.value} ج.م</div>
          </div>
        ))}
      </div>

      {/* ── Orders ── */}
      {filteredOrders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#aaa', fontSize: '1rem', background: '#fff', borderRadius: '16px', border: '1px solid #eee' }}>
          <Package size={48} style={{ margin: '0 auto 16px', display: 'block', opacity: 0.3 }} />
          لا توجد طلبات في هذه الفترة
        </div>
      ) : (
        <>
          {/* DESKTOP TABLE */}
          <div className="profits-table" style={{ background: '#fff', borderRadius: '16px', border: '1px solid #eee', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fcfcfc', borderBottom: '1px solid #eee' }}>
                  <th style={thStyle}></th>
                  <th style={thStyle}>العميل</th>
                  <th style={thStyle}>التاريخ</th>
                  <th style={thStyle}>المنتجات / التكلفة</th>
                  <th style={thStyle}>تكاليف إضافية</th>
                  <th style={thStyle}>ربح المنتجات</th>
                  <th style={thStyle}>صافي الربح</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const isExpanded = expandedOrderId === order.id;
                  const items = order.items || [];
                  const grossProfit = items.reduce((sum: number, item: any, idx: number) => {
                    const price = parseFloat(item.price || 0);
                    const qty = parseInt(item.quantity || 1);
                    const cost = costPrices[order.id]?.[idx] ?? parseFloat(item.cost_price || 0);
                    return sum + (price - cost) * qty;
                  }, 0);
                  const extras = extraCosts[order.id] || 0;
                  const netProfit = grossProfit - extras;

                  return (
                    <>
                      <tr key={order.id} onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                        style={{ borderBottom: '1px solid #f5f5f5', cursor: 'pointer', background: isExpanded ? '#f0fdf4' : '#fff' }}>
                        <td style={{ ...tdStyle, width: '40px' }}>
                          {isExpanded ? <ChevronUp size={18} color="#22c55e" /> : <ChevronDown size={18} color="#aaa" />}
                        </td>
                        <td style={tdStyle}>
                          <div style={{ fontWeight: '800', color: '#1a1a1a' }}>{order.customer_name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#888', fontFamily: 'monospace' }}>#{order.id.slice(0, 8).toUpperCase()}</div>
                        </td>
                        <td style={{ ...tdStyle, fontSize: '0.82rem', color: '#555' }}>
                          {new Date(order.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                        </td>
                        <td style={tdStyle}>
                          <div style={{ fontSize: '0.82rem', color: '#15803d', fontWeight: '700' }}>{items.length} منتج</div>
                        </td>
                        <td style={tdStyle} onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input type="number" min={0} step="0.01"
                              value={extraCosts[order.id] ?? 0}
                              onChange={e => setExtraCosts(p => ({ ...p, [order.id]: parseFloat(e.target.value) || 0 }))}
                              onBlur={() => saveExtraCosts(order.id)}
                              style={{ width: '90px', height: '34px', border: '1px solid #e5e5e5', borderRadius: '8px', textAlign: 'center', fontSize: '0.85rem', fontWeight: '700', background: '#fff' }}
                            />
                            <span style={{ fontSize: '0.72rem', color: '#888' }}>ج.م</span>
                          </div>
                        </td>
                        <td style={{ ...tdStyle, fontWeight: '800', color: grossProfit >= 0 ? '#15803d' : '#dc2626' }}>
                          {grossProfit.toLocaleString()} ج.م
                        </td>
                        <td style={{ ...tdStyle, fontWeight: '900', fontSize: '1rem', color: netProfit >= 0 ? '#15803d' : '#dc2626' }}>
                          {netProfit.toLocaleString()} ج.م
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${order.id}-expanded`}>
                          <td colSpan={7} style={{ padding: '0 16px 16px', background: '#fafff8', borderBottom: '1px solid #e0f2e9' }}>
                            <div style={{ animation: 'slideDown 0.2s ease' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {items.map((item: any, idx: number) => {
                                  const price = parseFloat(item.price || 0);
                                  const qty = parseInt(item.quantity || 1);
                                  const cost = costPrices[order.id]?.[idx] !== undefined ? costPrices[order.id][idx] : parseFloat(item.cost_price || 0);
                                  const itemProfit = (price - cost) * qty;
                                  return (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: '#fff', borderRadius: '10px', border: '1px solid #e8f5e9' }}>
                                      <img src={item.image_url || '/placeholder.png'} alt=""
                                        style={{ width: '44px', height: '44px', objectFit: 'contain', borderRadius: '8px', background: '#f9f9f9', flexShrink: 0 }} />
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                                        <div style={{ fontSize: '0.72rem', color: '#888' }}>
                                          {item.brand && <span>{item.brand} • </span>}
                                          سعر البيع: {price.toLocaleString()} ج.م × {qty}
                                        </div>
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                        <div style={{ textAlign: 'center' }}>
                                          <div style={{ fontSize: '0.68rem', fontWeight: '700', color: '#888', marginBottom: '2px' }}>التكلفة</div>
                                          <input type="number" min={0} step="0.01"
                                            value={costPrices[order.id]?.[idx] ?? ''}
                                            onChange={e => {
                                              const v = parseFloat(e.target.value) || 0;
                                              setCostPrices(p => ({
                                                ...p,
                                                [order.id]: { ...(p[order.id] || {}), [idx]: v }
                                              }));
                                            }}
                                            onBlur={() => saveItemCost(order.id, idx, costPrices[order.id]?.[idx] || 0)}
                                            className="cost-input"
                                            style={{ width: '85px', height: '34px', border: '1px solid #e5e5e5', borderRadius: '8px', textAlign: 'center', fontSize: '0.85rem', fontWeight: '700', background: '#fff' }}
                                          />
                                        </div>
                                        <div style={{ textAlign: 'center', minWidth: '80px' }}>
                                          <div style={{ fontSize: '0.68rem', fontWeight: '700', color: '#888', marginBottom: '2px' }}>الربح</div>
                                          <div style={{ fontWeight: '900', fontSize: '0.88rem', color: itemProfit >= 0 ? '#15803d' : '#dc2626' }}>
                                            {itemProfit.toLocaleString()} ج.م
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', padding: '14px 18px', background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderRadius: '12px' }}>
                                <div>
                                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem', fontWeight: '700' }}>ملخص الطلب</span>
                                  <div style={{ display: 'flex', gap: '20px', marginTop: '6px', flexWrap: 'wrap' }}>
                                    <span style={{ color: '#22c55e', fontSize: '0.82rem', fontWeight: '700' }}>إجمالي المنتجات: {parseFloat(order.total_price || 0).toLocaleString()} ج.م</span>
                                    <span style={{ color: '#fbbf24', fontSize: '0.82rem', fontWeight: '700' }}>ربح المنتجات: {grossProfit.toLocaleString()} ج.م</span>
                                    <span style={{ color: extraCosts[order.id] > 0 ? '#f87171' : '#22c55e', fontSize: '0.82rem', fontWeight: '700' }}>تكاليف إضافية: {(extraCosts[order.id] || 0).toLocaleString()} ج.م</span>
                                  </div>
                                </div>
                                <div style={{ textAlign: 'left' }}>
                                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', fontWeight: '700' }}>صافي الربح</div>
                                  <div style={{ fontSize: '1.4rem', fontWeight: '900', color: netProfit >= 0 ? '#22c55e' : '#f87171' }}>
                                    {netProfit.toLocaleString()} ج.م
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARDS */}
          <div className="profits-cards" style={{ display: 'none', flexDirection: 'column', gap: '12px' }}>
            {filteredOrders.map((order) => {
              const isExpanded = expandedOrderId === order.id;
              const items = order.items || [];
              const grossProfit = items.reduce((sum: number, item: any, idx: number) => {
                const price = parseFloat(item.price || 0);
                const qty = parseInt(item.quantity || 1);
                const cost = costPrices[order.id]?.[idx] ?? parseFloat(item.cost_price || 0);
                return sum + (price - cost) * qty;
              }, 0);
              const extras = extraCosts[order.id] || 0;
              const netProfit = grossProfit - extras;

              return (
                <div key={order.id} style={{ background: '#fff', borderRadius: '16px', border: isExpanded ? '2px solid #22c55e' : '1px solid #eee', overflow: 'hidden' }}>
                  <div onClick={() => setExpandedOrderId(isExpanded ? null : order.id)} style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '800', color: '#1a1a1a' }}>{order.customer_name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#888' }}>#{order.id.slice(0, 8).toUpperCase()} • {new Date(order.created_at).toLocaleDateString('ar-EG')}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '0.68rem', color: '#888', fontWeight: '700' }}>صافي الربح</div>
                        <div style={{ fontWeight: '900', color: netProfit >= 0 ? '#15803d' : '#dc2626' }}>{netProfit.toLocaleString()} ج.م</div>
                      </div>
                      {isExpanded ? <ChevronUp size={18} color="#22c55e" /> : <ChevronDown size={18} color="#aaa" />}
                    </div>
                  </div>
                  {isExpanded && (
                    <div style={{ padding: '0 14px 14px', borderTop: '1px solid #e8f5e9', background: '#fafff8' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '12px' }}>
                        {items.map((item: any, idx: number) => {
                          const price = parseFloat(item.price || 0);
                          const qty = parseInt(item.quantity || 1);
                          const cost = costPrices[order.id]?.[idx] ?? parseFloat(item.cost_price || 0);
                          const itemProfit = (price - cost) * qty;
                          return (
                            <div key={idx} style={{ background: '#fff', borderRadius: '10px', padding: '10px', border: '1px solid #e8f5e9' }}>
                              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                <img src={item.image_url || '/placeholder.png'} alt="" style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '6px', background: '#f9f9f9', flexShrink: 0 }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: '700', fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                                  <div style={{ fontSize: '0.7rem', color: '#888' }}>{price.toLocaleString()} ج.م × {qty}</div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: '0.65rem', fontWeight: '700', color: '#888', marginBottom: '2px' }}>التكلفة</div>
                                  <input type="number" min={0} step="0.01"
                                    value={costPrices[order.id]?.[idx] ?? ''}
                                    onChange={e => {
                                      const v = parseFloat(e.target.value) || 0;
                                      setCostPrices(p => ({ ...p, [order.id]: { ...(p[order.id] || {}), [idx]: v } }));
                                    }}
                                    onBlur={() => saveItemCost(order.id, idx, costPrices[order.id]?.[idx] || 0)}
                                    style={{ width: '100%', height: '34px', border: '1px solid #e5e5e5', borderRadius: '8px', textAlign: 'center', fontSize: '0.85rem', fontWeight: '700' }} />
                                </div>
                                <div style={{ flex: 1, textAlign: 'center', paddingTop: '14px' }}>
                                  <div style={{ fontSize: '0.65rem', fontWeight: '700', color: '#888', marginBottom: '2px' }}>الربح</div>
                                  <div style={{ fontWeight: '900', color: itemProfit >= 0 ? '#15803d' : '#dc2626' }}>{itemProfit.toLocaleString()}</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', padding: '10px 0', borderTop: '1px solid #e0f2e9' }}>
                        <span style={{ fontSize: '0.82rem', color: '#555', fontWeight: '700' }}>تكاليف إضافية</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input type="number" min={0} step="0.01"
                            value={extraCosts[order.id] ?? 0}
                            onChange={e => setExtraCosts(p => ({ ...p, [order.id]: parseFloat(e.target.value) || 0 }))}
                            onBlur={() => saveExtraCosts(order.id)}
                            style={{ width: '90px', height: '34px', border: '1px solid #e5e5e5', borderRadius: '8px', textAlign: 'center', fontSize: '0.85rem', fontWeight: '700' }} />
                          <span style={{ fontSize: '0.72rem', color: '#888' }}>ج.م</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', padding: '12px 14px', background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderRadius: '10px' }}>
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', fontWeight: '700' }}>صافي الربح</span>
                        <span style={{ fontSize: '1.2rem', fontWeight: '900', color: netProfit >= 0 ? '#22c55e' : '#f87171' }}>{netProfit.toLocaleString()} ج.م</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Export hint */}
      {filteredOrders.length > 0 && (
        <div style={{ marginTop: '20px', padding: '14px 18px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#92400e', fontWeight: '700' }}>
          <FileText size={18} color="#d97706" />
          يمكنك تعديل تكلفة أي منتج وسيتم الحفظ تلقائياً عند مغادرة الحقل. استخدم فلتر التاريخ لعرض تقارير فترة محددة.
        </div>
      )}
    </div>
  );
}

const thStyle: any = { padding: '14px 16px', fontSize: '0.78rem', color: '#888', fontWeight: 'bold', whiteSpace: 'nowrap', textAlign: 'right' };
const tdStyle: any = { padding: '14px 16px', fontSize: '0.88rem', color: '#333', verticalAlign: 'middle' };
