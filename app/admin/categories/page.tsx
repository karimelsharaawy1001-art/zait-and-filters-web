'use client';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/app/lib/supabase';
import { Loader2, Pencil, Trash2, Check, X, Image as ImageIcon, GitMerge, Upload, ChevronDown, ChevronRight } from 'lucide-react';

interface SubcatData {
  name: string;
  productCount: number;
  imageUrl: string | null;
  imageId: string | null; // id in category_images table
}
interface CategoryData {
  name: string;
  productCount: number;
  imageUrl: string | null;
  imageId: string | null;
  subcategories: SubcatData[];
}

type ModalType =
  | { type: 'rename-cat'; cat: string }
  | { type: 'rename-sub'; cat: string; sub: string }
  | { type: 'merge-cat'; cat: string }
  | { type: 'merge-sub'; cat: string; sub: string }
  | { type: 'image-cat'; cat: string; currentUrl: string | null; imageId: string | null }
  | { type: 'image-sub'; cat: string; sub: string; currentUrl: string | null; imageId: string | null }
  | null;

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<ModalType>(null);
  const [modalValue, setModalValue] = useState('');
  const [mergeTarget, setMergeTarget] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function fetchData() {
    setLoading(true);
    const [{ data: products }, { data: catImages }] = await Promise.all([
      supabase.from('products').select('category, subcategory'),
      supabase.from('category_images').select('id, name, image_url'),
    ]);

    const imageMap: Record<string, { url: string; id: string }> = {};
    for (const ci of catImages || []) {
      if (ci.name) imageMap[ci.name.trim()] = { url: ci.image_url, id: ci.id };
    }

    const catMap: Record<string, { count: number; subcats: Record<string, number> }> = {};
    for (const p of products || []) {
      const cat = p.category?.trim();
      const sub = p.subcategory?.trim();
      if (!cat) continue;
      if (!catMap[cat]) catMap[cat] = { count: 0, subcats: {} };
      catMap[cat].count++;
      if (sub) catMap[cat].subcats[sub] = (catMap[cat].subcats[sub] || 0) + 1;
    }

    const result: CategoryData[] = Object.entries(catMap)
      .sort(([a], [b]) => a.localeCompare(b, 'ar'))
      .map(([name, d]) => ({
        name,
        productCount: d.count,
        imageUrl: imageMap[name]?.url || null,
        imageId: imageMap[name]?.id || null,
        subcategories: Object.entries(d.subcats)
          .sort(([a], [b]) => a.localeCompare(b, 'ar'))
          .map(([sub, count]) => ({
            name: sub,
            productCount: count,
            imageUrl: imageMap[sub]?.url || null,
            imageId: imageMap[sub]?.id || null,
          })),
      }));

    setCategories(result);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  const toggleExpand = (cat: string) => {
    setExpanded(prev => {
      const n = new Set(prev);
      n.has(cat) ? n.delete(cat) : n.add(cat);
      return n;
    });
  };

  const closeModal = () => { setModal(null); setModalValue(''); setMergeTarget(''); };

  // ── Rename ─────────────────────────────────────────────────────────────────
  const handleRename = async () => {
    if (!modal || !modalValue.trim()) return;
    setSaving(true);
    if (modal.type === 'rename-cat') {
      await supabase.from('products').update({ category: modalValue.trim() }).eq('category', modal.cat);
      // also update category_images name
      const ci = categories.find(c => c.name === modal.cat);
      if (ci?.imageId) await supabase.from('category_images').update({ name: modalValue.trim() }).eq('id', ci.imageId);
    } else if (modal.type === 'rename-sub') {
      await supabase.from('products').update({ subcategory: modalValue.trim() }).eq('category', modal.cat).eq('subcategory', modal.sub);
      const sub = categories.find(c => c.name === modal.cat)?.subcategories.find(s => s.name === modal.sub);
      if (sub?.imageId) await supabase.from('category_images').update({ name: modalValue.trim() }).eq('id', sub.imageId);
    }
    setSaving(false);
    closeModal();
    fetchData();
  };

  // ── Merge ──────────────────────────────────────────────────────────────────
  const handleMerge = async () => {
    if (!modal || !mergeTarget.trim()) return;
    setSaving(true);
    if (modal.type === 'merge-cat') {
      await supabase.from('products').update({ category: mergeTarget.trim() }).eq('category', modal.cat);
    } else if (modal.type === 'merge-sub') {
      await supabase.from('products').update({ subcategory: mergeTarget.trim() }).eq('category', modal.cat).eq('subcategory', modal.sub);
    }
    setSaving(false);
    closeModal();
    fetchData();
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDeleteCat = async (cat: CategoryData) => {
    if (!confirm(`حذف فئة "${cat.name}"؟ سيمسح الفئة والقسم الفرعي من ${cat.productCount} منتج.`)) return;
    setSaving(true);
    await supabase.from('products').update({ category: null, subcategory: null }).eq('category', cat.name);
    setSaving(false);
    fetchData();
  };

  const handleDeleteSub = async (cat: string, sub: SubcatData) => {
    if (!confirm(`حذف قسم "${sub.name}"؟ سيمسحه من ${sub.productCount} منتج.`)) return;
    setSaving(true);
    await supabase.from('products').update({ subcategory: null }).eq('category', cat).eq('subcategory', sub.name);
    setSaving(false);
    fetchData();
  };

  // ── Upload image ───────────────────────────────────────────────────────────
  const handleImageUpload = async (file: File) => {
    if (!modal || (modal.type !== 'image-cat' && modal.type !== 'image-sub')) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `categories/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('product-images').upload(path, file);
    if (upErr) { alert('خطأ في الرفع: ' + upErr.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path);

    const name = modal.type === 'image-cat' ? modal.cat : modal.sub;
    const imageId = modal.imageId;

    if (imageId) {
      await supabase.from('category_images').update({ image_url: publicUrl }).eq('id', imageId);
    } else {
      await supabase.from('category_images').insert([{ name, image_url: publicUrl }]);
    }
    setUploading(false);
    closeModal();
    fetchData();
  };

  const handleUrlSave = async () => {
    if (!modal || (modal.type !== 'image-cat' && modal.type !== 'image-sub')) return;
    if (!modalValue.trim()) return;
    setSaving(true);
    const name = modal.type === 'image-cat' ? modal.cat : modal.sub;
    const imageId = modal.imageId;
    if (imageId) {
      await supabase.from('category_images').update({ image_url: modalValue.trim() }).eq('id', imageId);
    } else {
      await supabase.from('category_images').insert([{ name, image_url: modalValue.trim() }]);
    }
    setSaving(false);
    closeModal();
    fetchData();
  };

  const totalSubs = categories.reduce((s, c) => s + c.subcategories.length, 0);
  const totalProducts = categories.reduce((s, c) => s + c.productCount, 0);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
      <Loader2 className="animate-spin" size={28} color="#16a34a" />
    </div>
  );

  return (
    <div style={{ direction: 'rtl', fontFamily: "'Cairo', sans-serif", color: '#1e293b', maxWidth: '900px' }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');

        .ib { background: none; border: none; cursor: pointer; padding: 4px 5px; border-radius: 6px; display: inline-flex; align-items: center; transition: background 0.1s; }
        .ib:hover { background: #f1f5f9; }
        .ib.red:hover { background: #fee2e2; }
        .ib.green:hover { background: #dcfce7; }
        .ib.blue:hover { background: #dbeafe; }

        .cat-row { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid #f1f5f9; cursor: pointer; transition: background 0.1s; }
        .cat-row:hover { background: #f8fafc; }
        .sub-row { display: flex; align-items: center; gap: 8px; padding: 7px 12px 7px 12px; border-bottom: 1px solid #f8fafc; transition: background 0.1s; }
        .sub-row:hover { background: #f0fdf4; }

        .pill { font-size: 0.65rem; font-weight: 700; padding: 1px 7px; border-radius: 10px; }

        .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal { background: #fff; border-radius: 16px; padding: 24px; width: 100%; max-width: 420px; box-shadow: 0 20px 60px rgba(0,0,0,0.15); direction: rtl; }
        .modal-title { font-size: 1rem; font-weight: 800; margin-bottom: 16px; color: #0f172a; }
        .modal-input { width: 100%; padding: 9px 12px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 0.85rem; font-family: 'Cairo', sans-serif; outline: none; color: #1e293b; }
        .modal-input:focus { border-color: #16a34a; }
        .modal-btn { padding: 9px 18px; border-radius: 8px; border: none; cursor: pointer; font-weight: 700; font-size: 0.82rem; font-family: 'Cairo', sans-serif; transition: opacity 0.1s; }
        .modal-btn:hover { opacity: 0.85; }
        .modal-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .thumb { width: 32px; height: 32px; border-radius: 6px; object-fit: cover; border: 1px solid #e2e8f0; flex-shrink: 0; }
        .thumb-placeholder { width: 32px; height: 32px; border-radius: 6px; background: #f1f5f9; border: 1px dashed #cbd5e1; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: '18px' }}>
        <h1 style={{ fontSize: '1.2rem', fontWeight: '900', margin: 0, color: '#0f172a' }}>إدارة الفئات والأقسام</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.72rem', margin: '3px 0 0', fontWeight: '600' }}>التعديل هنا يؤثر فوراً على جميع المنتجات المرتبطة</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
        {[
          { label: 'فئات رئيسية', value: categories.length, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
          { label: 'أقسام فرعية', value: totalSubs, color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' },
          { label: 'إجمالي المنتجات', value: totalProducts, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: '10px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: '900', color: s.color, lineHeight: 1 }}>{s.value}</span>
            <span style={{ fontSize: '0.7rem', fontWeight: '700', color: s.color, opacity: 0.8 }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Column headers */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', marginBottom: '4px' }}>
        <span style={{ flex: 1, fontSize: '0.65rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>الفئة / القسم</span>
        <span style={{ width: '60px', fontSize: '0.65rem', fontWeight: '700', color: '#94a3b8', textAlign: 'center' }}>المنتجات</span>
        <span style={{ width: '90px', fontSize: '0.65rem', fontWeight: '700', color: '#94a3b8', textAlign: 'center' }}>إجراءات</span>
      </div>

      {/* List */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        {categories.map((cat, ci) => {
          const isOpen = expanded.has(cat.name);
          return (
            <div key={cat.name} style={{ borderBottom: ci < categories.length - 1 ? '1px solid #f1f5f9' : 'none' }}>

              {/* ── Category row ── */}
              <div className="cat-row" onClick={() => cat.subcategories.length > 0 && toggleExpand(cat.name)}>
                {/* Arrow */}
                <span style={{ width: '14px', color: '#94a3b8', flexShrink: 0 }}>
                  {cat.subcategories.length > 0
                    ? (isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />)
                    : null}
                </span>

                {/* Image */}
                {cat.imageUrl
                  ? <img src={cat.imageUrl} className="thumb" alt={cat.name} />
                  : <div className="thumb-placeholder"><ImageIcon size={12} color="#cbd5e1" /></div>
                }

                {/* Name */}
                <span style={{ flex: 1, fontWeight: '800', fontSize: '0.88rem', color: '#0f172a' }}>{cat.name}</span>

                {/* Sub count pill */}
                {cat.subcategories.length > 0 && (
                  <span className="pill" style={{ background: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd' }}>
                    {cat.subcategories.length} فرعي
                  </span>
                )}

                {/* Product count */}
                <span style={{ width: '60px', textAlign: 'center', fontSize: '0.78rem', fontWeight: '700', color: '#64748b' }}>{cat.productCount}</span>

                {/* Actions */}
                <div style={{ width: '90px', display: 'flex', justifyContent: 'flex-end', gap: '2px' }} onClick={e => e.stopPropagation()}>
                  <button className="ib blue" title="تغيير الصورة" onClick={() => setModal({ type: 'image-cat', cat: cat.name, currentUrl: cat.imageUrl, imageId: cat.imageId })}>
                    <ImageIcon size={13} color="#0284c7" />
                  </button>
                  <button className="ib" title="تعديل الاسم" onClick={() => { setModal({ type: 'rename-cat', cat: cat.name }); setModalValue(cat.name); }}>
                    <Pencil size={13} color="#64748b" />
                  </button>
                  <button className="ib green" title="دمج مع فئة أخرى" onClick={() => { setModal({ type: 'merge-cat', cat: cat.name }); }}>
                    <GitMerge size={13} color="#16a34a" />
                  </button>
                  <button className="ib red" title="حذف" onClick={() => handleDeleteCat(cat)}>
                    <Trash2 size={13} color="#ef4444" />
                  </button>
                </div>
              </div>

              {/* ── Subcategories ── */}
              {isOpen && cat.subcategories.map((sub, si) => (
                <div key={sub.name} className="sub-row" style={{ borderBottom: si < cat.subcategories.length - 1 ? '1px solid #f8fafc' : 'none', background: '#fafefa' }}>
                  <span style={{ width: '14px', flexShrink: 0 }} />
                  <span style={{ width: '2px', height: '18px', background: '#d1fae5', borderRadius: '2px', flexShrink: 0 }} />
                  <span style={{ width: '8px', flexShrink: 0 }} />

                  {/* Image */}
                  {sub.imageUrl
                    ? <img src={sub.imageUrl} className="thumb" alt={sub.name} />
                    : <div className="thumb-placeholder"><ImageIcon size={11} color="#cbd5e1" /></div>
                  }

                  {/* Name */}
                  <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: '600', color: '#334155' }}>{sub.name}</span>

                  {/* Product count */}
                  <span style={{ width: '60px', textAlign: 'center', fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8' }}>{sub.productCount}</span>

                  {/* Actions */}
                  <div style={{ width: '90px', display: 'flex', justifyContent: 'flex-end', gap: '2px' }}>
                    <button className="ib blue" title="تغيير الصورة" onClick={() => setModal({ type: 'image-sub', cat: cat.name, sub: sub.name, currentUrl: sub.imageUrl, imageId: sub.imageId })}>
                      <ImageIcon size={12} color="#0284c7" />
                    </button>
                    <button className="ib" title="تعديل الاسم" onClick={() => { setModal({ type: 'rename-sub', cat: cat.name, sub: sub.name }); setModalValue(sub.name); }}>
                      <Pencil size={12} color="#64748b" />
                    </button>
                    <button className="ib green" title="دمج مع قسم آخر" onClick={() => setModal({ type: 'merge-sub', cat: cat.name, sub: sub.name })}>
                      <GitMerge size={12} color="#16a34a" />
                    </button>
                    <button className="ib red" title="حذف" onClick={() => handleDeleteSub(cat.name, sub)}>
                      <Trash2 size={12} color="#ef4444" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px 14px', fontSize: '0.75rem', color: '#92400e', fontWeight: '600' }}>
        ℹ️ لإضافة فئة جديدة، أضف منتجاً بفئة جديدة من صفحة إضافة منتج — ستظهر هنا تلقائياً.
      </div>

      {/* ══════════════════ MODALS ══════════════════ */}

      {modal && (
        <div className="overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>

            {/* ── Rename modal ── */}
            {(modal.type === 'rename-cat' || modal.type === 'rename-sub') && (
              <>
                <div className="modal-title">
                  {modal.type === 'rename-cat' ? `تعديل اسم الفئة: ${modal.cat}` : `تعديل اسم القسم: ${modal.sub}`}
                </div>
                <input className="modal-input" value={modalValue} onChange={e => setModalValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') closeModal(); }}
                  autoFocus placeholder="الاسم الجديد" />
                <div style={{ display: 'flex', gap: '8px', marginTop: '14px', justifyContent: 'flex-end' }}>
                  <button className="modal-btn" style={{ background: '#f1f5f9', color: '#64748b' }} onClick={closeModal}>إلغاء</button>
                  <button className="modal-btn" style={{ background: '#16a34a', color: '#fff' }} onClick={handleRename} disabled={saving}>
                    {saving ? 'جاري الحفظ...' : 'حفظ'}
                  </button>
                </div>
              </>
            )}

            {/* ── Merge modal ── */}
            {(modal.type === 'merge-cat' || modal.type === 'merge-sub') && (
              <>
                <div className="modal-title">
                  {modal.type === 'merge-cat'
                    ? `دمج فئة "${modal.cat}" مع:`
                    : `دمج قسم "${modal.sub}" مع:`}
                </div>
                <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '12px', fontWeight: '600' }}>
                  جميع المنتجات ستنتقل إلى الفئة/القسم الذي تختاره.
                </p>
                <select
                  className="modal-input"
                  value={mergeTarget}
                  onChange={e => setMergeTarget(e.target.value)}
                  style={{ appearance: 'auto' }}
                >
                  <option value="">اختر الوجهة...</option>
                  {modal.type === 'merge-cat'
                    ? categories.filter(c => c.name !== modal.cat).map(c => (
                        <option key={c.name} value={c.name}>{c.name} ({c.productCount} منتج)</option>
                      ))
                    : categories.find(c => c.name === modal.cat)?.subcategories
                        .filter(s => s.name !== modal.sub)
                        .map(s => (
                          <option key={s.name} value={s.name}>{s.name} ({s.productCount} منتج)</option>
                        ))
                  }
                </select>
                <div style={{ display: 'flex', gap: '8px', marginTop: '14px', justifyContent: 'flex-end' }}>
                  <button className="modal-btn" style={{ background: '#f1f5f9', color: '#64748b' }} onClick={closeModal}>إلغاء</button>
                  <button className="modal-btn" style={{ background: '#16a34a', color: '#fff' }} onClick={handleMerge} disabled={saving || !mergeTarget}>
                    {saving ? 'جاري الدمج...' : 'دمج'}
                  </button>
                </div>
              </>
            )}

            {/* ── Image modal ── */}
            {(modal.type === 'image-cat' || modal.type === 'image-sub') && (
              <>
                <div className="modal-title">
                  {modal.type === 'image-cat' ? `صورة الفئة: ${modal.cat}` : `صورة القسم: ${modal.sub}`}
                </div>

                {modal.currentUrl && (
                  <img src={modal.currentUrl} alt="current" style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '10px', marginBottom: '14px', border: '1px solid #e2e8f0' }} />
                )}

                {/* Upload */}
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
                <button
                  className="modal-btn"
                  style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', width: '100%', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {uploading ? 'جاري الرفع...' : 'رفع صورة من الجهاز'}
                </button>

                {/* URL input */}
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '600', marginBottom: '5px' }}>أو أدخل رابط مباشر</div>
                <input className="modal-input" value={modalValue} onChange={e => setModalValue(e.target.value)} placeholder="https://..." style={{ marginBottom: '10px', direction: 'ltr' }} />

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button className="modal-btn" style={{ background: '#f1f5f9', color: '#64748b' }} onClick={closeModal}>إلغاء</button>
                  <button className="modal-btn" style={{ background: '#16a34a', color: '#fff' }} onClick={handleUrlSave} disabled={saving || !modalValue.trim()}>
                    {saving ? 'جاري الحفظ...' : 'حفظ الرابط'}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}