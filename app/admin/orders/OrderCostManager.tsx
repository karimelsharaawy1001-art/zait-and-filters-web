'use client';
import { useState } from 'react';
import { Wallet, Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/app/lib/supabase';

// Enter the purchase cost per product on the order. Saves item.cost_price on
// the order's items JSON, which the Profits page reads to compute profit.
export default function OrderCostManager({ order, onSaved }: { order: any; onSaved?: (update: { items: any[]; shipping_cost_paid: number }) => void }) {
  const items: any[] = order?.items || [];
  const num = (v: any) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
  const [costs, setCosts] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    items.forEach((it, idx) => { const c = parseFloat(it.cost_price); if (!isNaN(c) && c > 0) init[String(idx)] = String(c); });
    return init;
  });
  const [shipCost, setShipCost] = useState<string>(() => {
    const s = parseFloat(order?.shipping_cost_paid);
    return !isNaN(s) && s > 0 ? String(s) : '';
  });
  const [saving, setSaving] = useState(false);

  if (items.length === 0) return null;

  const totalProfit = items.reduce((s, it, idx) => {
    const price = num(it.price);
    const qty = parseInt(it.quantity) || 1;
    const cost = num(costs[String(idx)] ?? it.cost_price);
    return s + (price - cost) * qty;
  }, 0);
  const netProfit = totalProfit - num(shipCost);

  async function save() {
    setSaving(true);
    try {
      const newItems = items.map((it, idx) => ({ ...it, cost_price: num(costs[String(idx)] ?? it.cost_price) }));
      const shipping_cost_paid = num(shipCost);
      const { error } = await supabase.from('orders').update({ items: newItems, shipping_cost_paid }).eq('id', order.id);
      if (error) { toast.error('تعذّر حفظ التكلفة: ' + error.message); return; }
      toast.success('تم حفظ التكلفة — ستظهر في صفحة الأرباح');
      onSaved?.({ items: newItems, shipping_cost_paid });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', border: '1px solid #eee', marginTop: '16px' }}>
      <h3 style={{ margin: '0 0 4px', color: '#1a1a1a', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
        <Wallet size={18} color="#15803d" /> تكلفة المنتجات (للأرباح)
      </h3>
      <p style={{ color: '#9ca3af', fontSize: '0.78rem', margin: '0 0 14px' }}>
        أدخل سعر تكلفة (شراء) كل منتج. يُحسب الربح تلقائياً ويظهر في صفحة الأرباح.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
        {items.map((it, idx) => {
          const price = num(it.price);
          const qty = parseInt(it.quantity) || 1;
          const cost = num(costs[String(idx)] ?? it.cost_price);
          const profit = (price - cost) * qty;
          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', background: '#f9fafb', border: '1px solid #f0f0f0', borderRadius: '10px', padding: '8px 12px' }}>
              <div style={{ flex: 1, minWidth: '140px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name} <span style={{ color: '#9ca3af', fontWeight: 600 }}>×{qty}</span></div>
                <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
                  البيع: <strong style={{ color: '#15803d' }}>{price.toFixed(0)} ج.م</strong>
                  {cost > 0 && <> · الربح: <strong style={{ color: profit >= 0 ? '#15803d' : '#16a34a' }}>{profit.toFixed(0)} ج.م</strong></>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ fontSize: '0.75rem', color: '#666' }}>التكلفة:</label>
                <input
                  type="number" min={0} step="0.01"
                  placeholder="0"
                  value={costs[String(idx)] ?? ''}
                  onChange={e => setCosts(p => ({ ...p, [String(idx)]: e.target.value }))}
                  style={{ width: '90px', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none' }}
                />
                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>ج.م</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Shipping cost paid to the courier */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', background: '#f9fafb', border: '1px solid #f0f0f0', borderRadius: '10px', padding: '8px 12px', marginBottom: '14px' }}>
        <div style={{ flex: 1, minWidth: '140px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1a1a1a' }}>تكلفة الشحن المدفوعة</div>
          <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
            الشحن المحصّل من العميل: <strong style={{ color: '#15803d' }}>{num(order.shipping_cost).toFixed(0)} ج.م</strong>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '0.75rem', color: '#666' }}>التكلفة:</label>
          <input
            type="number" min={0} step="0.01"
            placeholder="0"
            value={shipCost}
            onChange={e => setShipCost(e.target.value)}
            style={{ width: '90px', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none' }}
          />
          <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>ج.م</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#555' }}>
            ربح المنتجات: <span style={{ color: totalProfit >= 0 ? '#15803d' : '#16a34a' }}>{totalProfit.toFixed(0)} ج.م</span>
          </div>
          <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#1a1a1a' }}>
            صافي الربح بعد الشحن: <span style={{ color: netProfit >= 0 ? '#15803d' : '#16a34a' }}>{netProfit.toFixed(0)} ج.م</span>
          </div>
        </div>
        <button
          onClick={save}
          disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: saving ? '#9ca3af' : 'linear-gradient(135deg, #15803d, #166534)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '0.85rem', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} حفظ التكلفة
        </button>
      </div>
    </div>
  );
}
