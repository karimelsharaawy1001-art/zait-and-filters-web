'use client';
import { useState, useMemo } from 'react';
import { Tag, MessageCircle, Globe, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/app/lib/supabase';
import { priceChangeWhatsAppLink } from '@/app/lib/whatsapp';

// Panel inside the order detail modal to (1) notify the customer on WhatsApp
// about product price changes, and (2) push the new price to the website.
export default function OrderPriceManager({ order }: { order: any }) {
  const items: any[] = order?.items || [];
  const [newPrices, setNewPrices] = useState<Record<string, string>>({});
  const [savingWeb, setSavingWeb] = useState(false);

  // Only rows where a valid, different new price was entered.
  const changes = useMemo(() => {
    return items
      .map((it, idx) => {
        const key = String(it.id ?? idx);
        const raw = newPrices[key];
        const np = parseFloat(raw ?? '');
        const old = parseFloat(it.price);
        if (isNaN(np) || np <= 0 || np === old) return null;
        return { key, id: it.id, name: it.name || 'منتج', slug: it.slug, oldPrice: old || 0, newPrice: np };
      })
      .filter(Boolean) as { key: string; id?: string; name: string; slug?: string; oldPrice: number; newPrice: number }[];
  }, [items, newPrices]);

  function notifyCustomer() {
    if (changes.length === 0) return toast.error('أدخل السعر الجديد لمنتج واحد على الأقل');
    const link = priceChangeWhatsAppLink(order, changes.map(c => ({ name: c.name, oldPrice: c.oldPrice, newPrice: c.newPrice })));
    if (!link) return toast.error('لا يوجد رقم هاتف صالح لهذا العميل');
    window.open(link, '_blank', 'noopener,noreferrer');
  }

  async function updateWebsitePrices() {
    const updatable = changes.filter(c => c.id);
    if (updatable.length === 0) return toast.error('أدخل السعر الجديد لمنتج له صفحة على الموقع');
    setSavingWeb(true);
    let ok = 0;
    try {
      for (const c of updatable) {
        // Set the displayed price to the new value and clear any active sale.
        const { error } = await supabase
          .from('products')
          .update({ regular_price: c.newPrice, sale_price: null })
          .eq('id', c.id);
        if (error) { console.error('update price error:', error); toast.error(`تعذّر تحديث ${c.name}: ${error.message}`); }
        else ok++;
      }
      if (ok > 0) toast.success(`تم تحديث سعر ${ok} منتج على الموقع`);
    } finally {
      setSavingWeb(false);
    }
  }

  if (items.length === 0) return null;

  return (
    <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', border: '1px solid #eee', marginTop: '16px' }}>
      <h3 style={{ margin: '0 0 4px', color: '#1a1a1a', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
        <Tag size={18} color="#f59e0b" /> تغيير الأسعار وإخطار العميل
      </h3>
      <p style={{ color: '#9ca3af', fontSize: '0.78rem', margin: '0 0 14px' }}>
        أدخل السعر الجديد للمنتجات التي تغيّر سعرها، ثم أخطر العميل عبر واتساب أو حدّث السعر على الموقع.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
        {items.map((it, idx) => {
          const key = String(it.id ?? idx);
          const old = parseFloat(it.price) || 0;
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', background: '#f9fafb', border: '1px solid #f0f0f0', borderRadius: '10px', padding: '8px 12px' }}>
              <div style={{ flex: 1, minWidth: '140px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</div>
                <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
                  السعر الحالي: <strong style={{ color: '#15803d' }}>{old.toFixed(0)} ج.م</strong>
                  {!it.id && <span style={{ color: '#16a34a', marginRight: 6 }}>· غير مرتبط بصفحة منتج</span>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ fontSize: '0.75rem', color: '#666' }}>سعر جديد:</label>
                <input
                  type="number"
                  min={0}
                  placeholder={old ? String(old.toFixed(0)) : '0'}
                  value={newPrices[key] ?? ''}
                  onChange={e => setNewPrices(p => ({ ...p, [key]: e.target.value }))}
                  style={{ width: '90px', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none' }}
                />
                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>ج.م</span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={notifyCustomer}
          disabled={changes.length === 0}
          style={{ flex: 1, minWidth: '180px', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 16px', background: changes.length === 0 ? '#e5e7eb' : '#25D366', color: changes.length === 0 ? '#9ca3af' : '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '0.85rem', cursor: changes.length === 0 ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
        >
          <MessageCircle size={16} /> إخطار العميل بواتساب
        </button>
        <button
          onClick={updateWebsitePrices}
          disabled={savingWeb || changes.filter(c => c.id).length === 0}
          style={{ flex: 1, minWidth: '180px', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 16px', background: (savingWeb || changes.filter(c => c.id).length === 0) ? '#e5e7eb' : 'linear-gradient(135deg, #15803d, #166534)', color: (savingWeb || changes.filter(c => c.id).length === 0) ? '#9ca3af' : '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '0.85rem', cursor: (savingWeb || changes.filter(c => c.id).length === 0) ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
        >
          {savingWeb ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />} تحديث السعر على الموقع
        </button>
      </div>
    </div>
  );
}
