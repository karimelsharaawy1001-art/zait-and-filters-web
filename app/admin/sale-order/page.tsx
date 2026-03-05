'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/app/lib/supabase';
import {
  GripVertical,
  Save,
  Loader2,
  Tags,
  CheckCircle2,
  AlertCircle,
  Eye,
  RotateCcw,
  ArrowUpDown,
  Percent,
  Package,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface SaleProduct {
  id: string;
  name: string;
  image_url: string | null;
  regular_price: number;
  sale_price: number;
  brand: string | null;
  category: string | null;
  car_make: string | null;
  car_model: string | null;
  sale_order: number | null;
}

export default function SaleOrderAdminPage() {
  const [products, setProducts] = useState<SaleProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragNode = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchSaleProducts();
  }, []);

  async function fetchSaleProducts() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, image_url, regular_price, sale_price, brand, category, car_make, car_model, sale_order')
        .gt('sale_price', 0)
        .order('sale_order', { ascending: true, nullsFirst: false });

      if (error) throw error;

      const saleProducts = (data || []).filter(
        (p) => Number(p.sale_price) > 0 && Number(p.regular_price) > Number(p.sale_price)
      );

      // Assign initial order to products that don't have one yet
      const normalized = saleProducts.map((p, i) => ({
        ...p,
        sale_order: p.sale_order ?? i + 1,
      }));

      setProducts(normalized);
    } catch (err) {
      console.error(err);
      toast.error('فشل تحميل المنتجات');
    } finally {
      setLoading(false);
    }
  }

  // ── Drag & Drop handlers ──
  function handleDragStart(e: React.DragEvent, index: number) {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Slight delay so the ghost image renders first
    setTimeout(() => {
      if (dragNode.current) dragNode.current.style.opacity = '0.4';
    }, 0);
  }

  function handleDragEnter(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) return;

    const reordered = [...products];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);

    // Reassign sale_order based on new positions
    const updated = reordered.map((p, i) => ({ ...p, sale_order: i + 1 }));
    setProducts(updated);
    setIsDirty(true);
    setDragIndex(null);
    setDragOverIndex(null);
    if (dragNode.current) dragNode.current.style.opacity = '1';
  }

  function handleDragEnd() {
    setDragIndex(null);
    setDragOverIndex(null);
    if (dragNode.current) dragNode.current.style.opacity = '1';
  }

  // ── Move up / down buttons (for mobile) ──
  function moveUp(index: number) {
    if (index === 0) return;
    const reordered = [...products];
    [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]];
    setProducts(reordered.map((p, i) => ({ ...p, sale_order: i + 1 })));
    setIsDirty(true);
  }

  function moveDown(index: number) {
    if (index === products.length - 1) return;
    const reordered = [...products];
    [reordered[index], reordered[index + 1]] = [reordered[index + 1], reordered[index]];
    setProducts(reordered.map((p, i) => ({ ...p, sale_order: i + 1 })));
    setIsDirty(true);
  }

  // ── Auto-sort by discount % ──
  function sortByDiscount() {
    const sorted = [...products].sort((a, b) => {
      const discA = ((a.regular_price - a.sale_price) / a.regular_price) * 100;
      const discB = ((b.regular_price - b.sale_price) / b.regular_price) * 100;
      return discB - discA;
    });
    setProducts(sorted.map((p, i) => ({ ...p, sale_order: i + 1 })));
    setIsDirty(true);
    toast.success('تم الترتيب حسب نسبة الخصم');
  }

  // ── Reset to saved order ──
  async function resetOrder() {
    setIsDirty(false);
    await fetchSaleProducts();
    toast('تم إعادة الترتيب للمحفوظ', { icon: '↩️' });
  }

  // ── Save to Supabase ──
  async function saveOrder() {
    setSaving(true);
    try {
      // Batch update using Promise.all
      await Promise.all(
        products.map((p) =>
          supabase
            .from('products')
            .update({ sale_order: p.sale_order })
            .eq('id', p.id)
        )
      );
      setIsDirty(false);
      toast.success('✅ تم حفظ الترتيب بنجاح!');
    } catch (err) {
      console.error(err);
      toast.error('فشل الحفظ، حاول مرة أخرى');
    } finally {
      setSaving(false);
    }
  }

  const discountPercent = (p: SaleProduct) =>
    Math.round(((p.regular_price - p.sale_price) / p.regular_price) * 100);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9f9f9' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={48} color="#22c55e" style={{ animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
          <p style={{ color: '#666', fontWeight: '700', fontSize: '1rem' }}>جاري تحميل منتجات العروض...</p>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ direction: 'rtl', minHeight: '100vh', backgroundColor: '#f4f6f9', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .product-row {
          background: #fff;
          border-radius: 14px;
          border: 2px solid #f0f0f0;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          cursor: grab;
          transition: all 0.2s ease;
          animation: fadeIn 0.3s ease both;
          user-select: none;
        }
        .product-row:active { cursor: grabbing; }
        .product-row:hover { border-color: #22c55e; box-shadow: 0 4px 20px rgba(34,197,94,0.12); }
        .product-row.drag-over {
          border-color: #22c55e;
          background: #f0fdf4;
          box-shadow: 0 0 0 3px rgba(34,197,94,0.2);
          transform: scale(1.01);
        }
        .product-row.dragging { opacity: 0.4; border-style: dashed; }
        .move-btn {
          width: 30px; height: 30px;
          border-radius: 8px;
          border: 1px solid #e5e5e5;
          background: #fff;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s;
          color: #666;
        }
        .move-btn:hover:not(:disabled) { background: #22c55e; border-color: #22c55e; color: #fff; }
        .move-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .top-btn {
          padding: 10px 20px;
          border-radius: 10px;
          border: none;
          font-weight: 800;
          font-size: 0.88rem;
          cursor: pointer;
          display: flex; align-items: center; gap: 7px;
          transition: all 0.2s;
        }
        .top-btn:hover { transform: translateY(-1px); }
      `}</style>

      {/* ── Header ── */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)', padding: '28px 32px', color: '#fff' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #ff4d4d, #f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Tags size={24} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: '900', margin: 0 }}>ترتيب منتجات العروض</h1>
              <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', margin: '4px 0 0', fontWeight: '600' }}>
                {products.length} منتج بتخفيض • اسحب لإعادة الترتيب
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button className="top-btn" onClick={sortByDiscount} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
              <Percent size={15} />
              ترتيب بالخصم
            </button>

            {isDirty && (
              <button className="top-btn" onClick={resetOrder} style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <RotateCcw size={15} />
                تراجع
              </button>
            )}

            <button
              className="top-btn"
              onClick={saveOrder}
              disabled={saving || !isDirty}
              style={{
                background: isDirty ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'rgba(255,255,255,0.15)',
                color: '#fff',
                border: 'none',
                opacity: saving ? 0.8 : 1,
                boxShadow: isDirty ? '0 4px 14px rgba(34,197,94,0.4)' : 'none',
              }}
            >
              {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={15} />}
              {saving ? 'جاري الحفظ...' : 'حفظ الترتيب'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Info banner ── */}
      <div style={{ maxWidth: '900px', margin: '24px auto 0', padding: '0 20px' }}>
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={17} color="#3b82f6" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '0.82rem', color: '#1e40af', fontWeight: '700' }}>
            الترتيب هنا هو نفس الترتيب الذي سيراه العملاء في صفحة العروض. اسحب البطاقات لإعادة الترتيب ثم اضغط "حفظ الترتيب".
          </span>
        </div>

        {isDirty && (
          <div style={{ marginTop: '10px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '12px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={16} color="#f97316" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.82rem', color: '#c2410c', fontWeight: '700' }}>لديك تغييرات غير محفوظة — لا تنسَ الضغط على "حفظ الترتيب"</span>
          </div>
        )}
      </div>

      {/* ── Product list ── */}
      <div style={{ maxWidth: '900px', margin: '20px auto 60px', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {products.map((product, index) => {
          const disc = discountPercent(product);
          const isDragging = dragIndex === index;
          const isOver = dragOverIndex === index;

          return (
            <div
              key={product.id}
              className={`product-row${isDragging ? ' dragging' : ''}${isOver && !isDragging ? ' drag-over' : ''}`}
              draggable
              ref={isDragging ? dragNode : null}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnter={(e) => handleDragEnter(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              style={{ animationDelay: `${index * 0.03}s` }}
            >
              {/* Position number */}
              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: index === 0 ? 'linear-gradient(135deg, #f59e0b, #d97706)' : index === 1 ? 'linear-gradient(135deg, #9ca3af, #6b7280)' : index === 2 ? 'linear-gradient(135deg, #cd7c2f, #a0522d)' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '0.78rem', fontWeight: '900', color: index < 3 ? '#fff' : '#9ca3af' }}>
                  {index + 1}
                </span>
              </div>

              {/* Drag handle */}
              <GripVertical size={20} color="#ccc" style={{ flexShrink: 0, cursor: 'grab' }} />

              {/* Product image */}
              <div style={{ width: '56px', height: '56px', borderRadius: '10px', overflow: 'hidden', backgroundColor: '#f9f9f9', flexShrink: 0 }}>
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Package size={22} color="#ddd" />
                  </div>
                )}
              </div>

              {/* Product info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '800', color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {product.name}
                </p>
                <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: '#888', fontWeight: '600' }}>
                  {[product.brand, product.car_make, product.car_model].filter(Boolean).join(' · ')}
                </p>
              </div>

              {/* Pricing */}
              <div style={{ textAlign: 'left', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '0.72rem', color: '#bbb', textDecoration: 'line-through' }}>
                    {product.regular_price} ج.م
                  </span>
                  <span style={{ fontSize: '0.95rem', fontWeight: '900', color: '#1a1a1a' }}>
                    {product.sale_price} ج.م
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                  <span style={{ background: 'linear-gradient(135deg, #ff4d4d, #f97316)', color: '#fff', fontSize: '0.7rem', fontWeight: '900', padding: '3px 8px', borderRadius: '6px' }}>
                    -{disc}%
                  </span>
                </div>
              </div>

              {/* Up/Down buttons (mobile-friendly) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
                <button className="move-btn" onClick={() => moveUp(index)} disabled={index === 0} title="تحريك لأعلى">
                  ▲
                </button>
                <button className="move-btn" onClick={() => moveDown(index)} disabled={index === products.length - 1} title="تحريك لأسفل">
                  ▼
                </button>
              </div>
            </div>
          );
        })}

        {products.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 20px', background: '#fff', borderRadius: '20px', color: '#999' }}>
            <Tags size={60} style={{ opacity: 0.3, marginBottom: '16px' }} />
            <h3 style={{ fontWeight: '900', fontSize: '1.3rem', color: '#ccc' }}>لا توجد منتجات بعروض حالياً</h3>
            <p style={{ fontSize: '0.9rem', marginTop: '8px' }}>أضف سعر مخفّض لأي منتج وسيظهر هنا</p>
          </div>
        )}
      </div>

      {/* ── Sticky save bar ── */}
      {isDirty && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(26,26,26,0.97)', backdropFilter: 'blur(12px)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1000, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.88rem', fontWeight: '700' }}>
            🔄 لديك تغييرات غير محفوظة
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={resetOrder} style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem' }}>
              تراجع
            </button>
            <button
              onClick={saveOrder}
              disabled={saving}
              style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff', fontWeight: '900', cursor: 'pointer', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(34,197,94,0.4)' }}
            >
              {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={15} />}
              {saving ? 'جاري الحفظ...' : 'حفظ الترتيب'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}