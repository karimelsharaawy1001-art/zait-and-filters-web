'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/app/lib/supabase';
import {
  GripVertical,
  Save,
  Loader2,
  Tags,
  AlertCircle,
  RotateCcw,
  Percent,
  Package,
  Search,
  X,
  Hash,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

const PAGE_SIZE = 20;

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
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const dragNode = useRef<HTMLDivElement | null>(null);

  useEffect(() => { fetchSaleProducts(); }, []);

  async function fetchSaleProducts() {
    setLoading(true);
    try {
      // Fetch ALL products with a sale_price > 0 in batches (Supabase default limit is 1000)
      let allData: any[] = [];
      let from = 0;
      const batchSize = 1000;

      while (true) {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, image_url, regular_price, sale_price, brand, category, car_make, car_model, sale_order')
          .gt('sale_price', 0)
          .order('sale_order', { ascending: true, nullsFirst: false })
          .range(from, from + batchSize - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;
        allData = [...allData, ...data];
        if (data.length < batchSize) break;
        from += batchSize;
      }

      // Only keep products where sale_price is actually a valid number > 0
      // Remove the regular_price > sale_price filter so we show ALL sale products
      const saleProducts = allData.filter(
        (p) => Number(p.sale_price) > 0
      );

      const normalized = saleProducts.map((p, i) => ({
        ...p,
        sale_order: p.sale_order ?? i + 1,
      }));

      setProducts(normalized);
      const vals: Record<string, string> = {};
      normalized.forEach((p) => { vals[p.id] = String(p.sale_order); });
      setInputValues(vals);
    } catch (err) {
      console.error(err);
      toast.error('فشل تحميل المنتجات');
    } finally {
      setLoading(false);
    }
  }

  function handleOrderInputChange(id: string, raw: string) {
    setInputValues((prev) => ({ ...prev, [id]: raw }));
  }

  function commitOrderInput(id: string) {
    const raw = inputValues[id] ?? '';
    const newPos = parseInt(raw);
    if (isNaN(newPos) || newPos < 1) {
      const current = products.find((p) => p.id === id);
      setInputValues((prev) => ({ ...prev, [id]: String(current?.sale_order ?? '') }));
      return;
    }
    const clamped = Math.min(newPos, products.length);
    const currentIndex = products.findIndex((p) => p.id === id);
    if (currentIndex === -1) return;
    const targetIndex = clamped - 1;
    if (currentIndex === targetIndex) return;

    const reordered = [...products];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    const updated = reordered.map((p, i) => ({ ...p, sale_order: i + 1 }));
    setProducts(updated);
    const vals: Record<string, string> = {};
    updated.forEach((p) => { vals[p.id] = String(p.sale_order); });
    setInputValues(vals);
    setIsDirty(true);
  }

  function handleDragStart(e: React.DragEvent, index: number) {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => { if (dragNode.current) dragNode.current.style.opacity = '0.4'; }, 0);
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
    const updated = reordered.map((p, i) => ({ ...p, sale_order: i + 1 }));
    setProducts(updated);
    const vals: Record<string, string> = {};
    updated.forEach((p) => { vals[p.id] = String(p.sale_order); });
    setInputValues(vals);
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

  function sortByDiscount() {
    const sorted = [...products].sort((a, b) => {
      const discA = ((a.regular_price - a.sale_price) / a.regular_price) * 100;
      const discB = ((b.regular_price - b.sale_price) / b.regular_price) * 100;
      return discB - discA;
    });
    const updated = sorted.map((p, i) => ({ ...p, sale_order: i + 1 }));
    setProducts(updated);
    const vals: Record<string, string> = {};
    updated.forEach((p) => { vals[p.id] = String(p.sale_order); });
    setInputValues(vals);
    setIsDirty(true);
    toast.success('تم الترتيب حسب نسبة الخصم');
  }

  async function resetOrder() {
    setIsDirty(false);
    setSearchQuery('');
    setCurrentPage(1);
    await fetchSaleProducts();
    toast('تم إعادة الترتيب للمحفوظ', { icon: '↩️' });
  }

  async function saveOrder() {
    setSaving(true);
    try {
      // Batch in chunks of 50 to avoid overwhelming the DB
      const chunks = [];
      for (let i = 0; i < products.length; i += 50) {
        chunks.push(products.slice(i, i + 50));
      }
      for (const chunk of chunks) {
        await Promise.all(
          chunk.map((p) =>
            supabase.from('products').update({ sale_order: p.sale_order }).eq('id', p.id)
          )
        );
      }
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
    p.regular_price > 0 ? Math.round(((p.regular_price - p.sale_price) / p.regular_price) * 100) : 0;

  // Filtered list (search does NOT affect the actual order array)
  const filteredProducts = searchQuery.trim()
    ? products.filter((p) => {
        const q = searchQuery.toLowerCase();
        return (
          p.name?.toLowerCase().includes(q) ||
          p.brand?.toLowerCase().includes(q) ||
          p.car_make?.toLowerCase().includes(q) ||
          p.car_model?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q)
        );
      })
    : products;

  // Pagination — applied on top of filtered
  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE);
  const pagedProducts = filteredProducts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Reset to page 1 when search changes
  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9f9f9' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={48} color="#22c55e" style={{ animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
          <p style={{ color: '#666', fontWeight: '700', fontSize: '1rem' }}>جاري تحميل منتجات العروض...</p>
        </div>
        <style>{`@keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }`}</style>
      </div>
    );
  }

  return (
    <div style={{ direction: 'rtl', minHeight: '100vh', backgroundColor: '#f4f6f9', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        @keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)} }
        .product-row {
          background: #fff; border-radius: 14px; border: 2px solid #f0f0f0;
          display: flex; align-items: center; gap: 12px; padding: 12px 14px;
          cursor: grab; transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
          animation: fadeIn 0.25s ease both; user-select: none;
        }
        .product-row:active { cursor: grabbing; }
        .product-row:hover { border-color: #d1fae5; box-shadow: 0 4px 16px rgba(34,197,94,0.1); }
        .product-row.drag-over { border-color: #22c55e; background: #f0fdf4; box-shadow: 0 0 0 3px rgba(34,197,94,0.2); transform: scale(1.01); }
        .product-row.dragging { opacity: 0.35; border-style: dashed; }
        .product-row.search-highlight { border-color: #fbbf24; background: #fffbeb; }
        .order-input {
          width: 58px; height: 40px; border: 2px solid #e5e5e5; border-radius: 10px;
          text-align: center; font-size: 0.95rem; font-weight: 900; color: #1a1a1a;
          outline: none; transition: border-color 0.15s, box-shadow 0.15s;
          background: #f9f9f9; flex-shrink: 0; -moz-appearance: textfield;
        }
        .order-input::-webkit-outer-spin-button, .order-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .order-input:focus { border-color: #22c55e; box-shadow: 0 0 0 3px rgba(34,197,94,0.15); background: #fff; }
        .order-input:hover { border-color: #bbf7d0; }
        .top-btn {
          padding: 10px 18px; border-radius: 10px; border: none; font-weight: 800;
          font-size: 0.85rem; cursor: pointer; display: flex; align-items: center;
          gap: 7px; transition: all 0.15s; white-space: nowrap;
        }
        .top-btn:hover:not(:disabled) { transform: translateY(-1px); }
        .top-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .search-bar {
          width: 100%; height: 46px; padding: 0 44px 0 16px; border: 2px solid #e5e5e5;
          border-radius: 12px; font-size: 0.9rem; font-weight: 600; outline: none;
          transition: border-color 0.15s, box-shadow 0.15s; background: #fff;
          color: #1a1a1a; font-family: system-ui, sans-serif;
        }
        .search-bar:focus { border-color: #22c55e; box-shadow: 0 0 0 3px rgba(34,197,94,0.12); }
        .page-btn {
          width: 36px; height: 36px; border-radius: 9px; border: 1.5px solid #e5e5e5;
          background: #fff; display: flex; align-items: center; justify-content: center;
          cursor: pointer; font-weight: 800; font-size: 0.85rem; color: #1a1a1a;
          transition: all 0.15s;
        }
        .page-btn:hover:not(:disabled) { border-color: #22c55e; color: #22c55e; }
        .page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .page-btn.active { background: #22c55e; border-color: #22c55e; color: #fff; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ background: 'linear-gradient(135deg, #f9fafb 0%, #f0fdf4 100%)', padding: '24px 28px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '46px', height: '46px', borderRadius: '13px', background: 'linear-gradient(135deg, #22c55e, #f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Tags size={22} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: '900', margin: 0, color: '#1a1a1a' }}>ترتيب منتجات العروض</h1>
              <p style={{ fontSize: '0.78rem', color: 'rgba(0,0,0,0.2)', margin: '3px 0 0', fontWeight: '600' }}>
                {products.length} منتج بتخفيض
                {searchQuery && ` • ${filteredProducts.length} نتيجة`}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button className="top-btn" onClick={sortByDiscount}
              style={{ background: 'rgba(0,0,0,0.05)', color: '#374151', border: '1px solid #e5e7eb' }}>
              <Percent size={14} /> ترتيب بالخصم
            </button>
            {isDirty && (
              <button className="top-btn" onClick={resetOrder}
                style={{ background: 'rgba(0,0,0,0.08)', color: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.08)' }}>
                <RotateCcw size={14} /> تراجع
              </button>
            )}
            <button className="top-btn" onClick={saveOrder} disabled={saving || !isDirty}
              style={{ background: isDirty ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'rgba(0,0,0,0.06)', color: isDirty ? '#fff' : '#9ca3af', border: 'none', boxShadow: isDirty ? '0 4px 14px rgba(34,197,94,0.4)' : 'none' }}>
              {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
              {saving ? 'جاري الحفظ...' : 'حفظ الترتيب'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Search + tips ── */}
      <div style={{ maxWidth: '960px', margin: '20px auto 0', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ position: 'relative' }}>
          <input className="search-bar" type="text" placeholder="ابحث باسم المنتج، الماركة، السيارة، الفئة..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          <Search size={17} color="#6b7280" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', background: '#f3f4f6', border: 'none', borderRadius: '6px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9ca3af' }}>
              <X size={13} />
            </button>
          )}
        </div>

        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '11px', padding: '11px 14px', display: 'flex', alignItems: 'flex-start', gap: '9px' }}>
          <AlertCircle size={16} color="#3b82f6" style={{ flexShrink: 0, marginTop: '1px' }} />
          <span style={{ fontSize: '0.8rem', color: '#1e40af', fontWeight: '700', lineHeight: 1.6 }}>
            ابحث عن المنتج، ثم اكتب رقم الموضع في خانة <strong>#</strong> واضغط <strong>Enter</strong> لنقله فوراً. يمكنك أيضاً السحب والإفلات. اضغط <strong>"حفظ الترتيب"</strong> عند الانتهاء.
          </span>
        </div>

        {isDirty && (
          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '11px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '9px' }}>
            <AlertCircle size={15} color="#f97316" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.8rem', color: '#c2410c', fontWeight: '700' }}>لديك تغييرات غير محفوظة — لا تنسَ الضغط على "حفظ الترتيب"</span>
          </div>
        )}

        {searchQuery && filteredProducts.length === 0 && (
          <div style={{ background: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: '11px', padding: '12px 14px', textAlign: 'center', color: '#16a34a', fontWeight: '700', fontSize: '0.85rem' }}>
            لا توجد نتائج لـ "{searchQuery}"
          </div>
        )}
      </div>

      {/* ── Column headers ── */}
      {pagedProducts.length > 0 && (
        <div style={{ maxWidth: '960px', margin: '14px auto 0', padding: '0 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 14px', color: '#374151', fontSize: '0.7rem', fontWeight: '800', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            <div style={{ width: '34px', textAlign: 'center' }}>رقم</div>
            <div style={{ width: '18px' }} />
            <div style={{ width: '56px' }} />
            <div style={{ flex: 1 }}>المنتج</div>
            <div style={{ width: '100px', textAlign: 'left' }}>السعر</div>
            <div style={{ width: '58px', textAlign: 'center' }}>موضع</div>
          </div>
        </div>
      )}

      {/* ── Product list ── */}
      <div style={{ maxWidth: '960px', margin: '8px auto 0', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {pagedProducts.map((product) => {
          const realIndex = products.findIndex((p) => p.id === product.id);
          const disc = discountPercent(product);
          const isDragging = dragIndex === realIndex;
          const isOver = dragOverIndex === realIndex;
          const isHighlighted = !!searchQuery;

          return (
            <div
              key={product.id}
              className={['product-row', isDragging ? 'dragging' : '', isOver && !isDragging ? 'drag-over' : '', isHighlighted ? 'search-highlight' : ''].filter(Boolean).join(' ')}
              draggable
              ref={isDragging ? dragNode : null}
              onDragStart={(e) => handleDragStart(e, realIndex)}
              onDragEnter={(e) => handleDragEnter(e, realIndex)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, realIndex)}
              onDragEnd={handleDragEnd}
            >
              {/* Position badge */}
              <div style={{
                width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
                background: product.sale_order === 1 ? 'linear-gradient(135deg,#f59e0b,#d97706)' :
                  product.sale_order === 2 ? 'linear-gradient(135deg,#9ca3af,#6b7280)' :
                  product.sale_order === 3 ? 'linear-gradient(135deg,#cd7c2f,#a0522d)' : '#f3f4f6',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '900', color: (product.sale_order ?? 99) <= 3 ? '#fff' : '#9ca3af' }}>
                  {product.sale_order}
                </span>
              </div>

              <GripVertical size={18} color="#d1d5db" style={{ flexShrink: 0, cursor: 'grab' }} />

              <div style={{ width: '56px', height: '56px', borderRadius: '10px', overflow: 'hidden', backgroundColor: '#f9f9f9', flexShrink: 0 }}>
                {product.image_url
                  ? <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={20} color="#ddd" /></div>}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: '800', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {product.name}
                </p>
                <p style={{ margin: '3px 0 0', fontSize: '0.73rem', color: '#6b7280', fontWeight: '600' }}>
                  {[product.brand, product.car_make, product.car_model, product.category].filter(Boolean).join(' · ')}
                </p>
              </div>

              <div style={{ textAlign: 'left', flexShrink: 0, minWidth: '90px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                  {product.regular_price > product.sale_price && (
                    <span style={{ fontSize: '0.7rem', color: '#9ca3af', textDecoration: 'line-through' }}>{product.regular_price} ج.م</span>
                  )}
                  <span style={{ fontSize: '0.9rem', fontWeight: '900', color: '#1a1a1a' }}>{product.sale_price} ج.م</span>
                </div>
                {disc > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                    <span style={{ background: 'linear-gradient(135deg,#22c55e,#f97316)', color: '#fff', fontSize: '0.68rem', fontWeight: '900', padding: '2px 7px', borderRadius: '5px' }}>
                      -{disc}%
                    </span>
                  </div>
                )}
              </div>

              <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                <label style={{ fontSize: '0.62rem', color: '#374151', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <Hash size={9} /> موضع
                </label>
                <input
                  className="order-input"
                  type="number"
                  min={1}
                  max={products.length}
                  value={inputValues[product.id] ?? product.sale_order ?? ''}
                  onChange={(e) => handleOrderInputChange(product.id, e.target.value)}
                  onBlur={() => commitOrderInput(product.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  title={`أدخل موضعاً بين 1 و ${products.length} ثم اضغط Enter`}
                />
              </div>
            </div>
          );
        })}

        {products.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 20px', background: '#fff', borderRadius: '20px', color: '#6b7280' }}>
            <Tags size={56} style={{ opacity: 0.25, marginBottom: '14px' }} />
            <h3 style={{ fontWeight: '900', fontSize: '1.2rem', color: '#9ca3af', margin: '0 0 8px' }}>لا توجد منتجات بعروض حالياً</h3>
            <p style={{ fontSize: '0.85rem' }}>أضف سعر مخفّض لأي منتج وسيظهر هنا</p>
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={{ maxWidth: '960px', margin: '16px auto 100px', padding: '0 20px' }}>
          <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #f0f0f0', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: '600' }}>
              صفحة <strong style={{ color: '#1a1a1a' }}>{currentPage}</strong> من <strong style={{ color: '#1a1a1a' }}>{totalPages}</strong>
              {' '}· عرض <strong style={{ color: '#22c55e' }}>{(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredProducts.length)}</strong> من <strong style={{ color: '#1a1a1a' }}>{filteredProducts.length}</strong> منتج
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button className="page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(1)} title="الأولى">
                <ChevronRight size={14} /><ChevronRight size={14} style={{ marginRight: '-8px' }} />
              </button>
              <button className="page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                <ChevronRight size={16} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let page: number;
                if (totalPages <= 5) {
                  page = i + 1;
                } else if (currentPage <= 3) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + i;
                } else {
                  page = currentPage - 2 + i;
                }
                return (
                  <button key={page} className={`page-btn${currentPage === page ? ' active' : ''}`}
                    onClick={() => setCurrentPage(page)}>
                    {page}
                  </button>
                );
              })}
              <button className="page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                <ChevronLeft size={16} />
              </button>
              <button className="page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)} title="الأخيرة">
                <ChevronLeft size={14} /><ChevronLeft size={14} style={{ marginLeft: '-8px' }} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sticky save bar ── */}
      {isDirty && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(14px)', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1000, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
          <span style={{ color: 'rgba(0,0,0,0.35)', fontSize: '0.85rem', fontWeight: '700' }}>
            🔄 لديك تغييرات غير محفوظة
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={resetOrder} style={{ padding: '9px 16px', borderRadius: '9px', border: '1px solid #e5e7eb', background: '#f3f4f6', color: '#374151', fontWeight: '700', cursor: 'pointer', fontSize: '0.83rem' }}>
              تراجع
            </button>
            <button onClick={saveOrder} disabled={saving}
              style={{ padding: '9px 22px', borderRadius: '9px', border: 'none', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontWeight: '900', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '7px', boxShadow: '0 4px 14px rgba(34,197,94,0.4)' }}>
              {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
              {saving ? 'جاري الحفظ...' : 'حفظ الترتيب'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}