'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import { Loader2, Pencil, Trash2, Check, X, ChevronDown, ChevronUp, Plus } from 'lucide-react';

interface CategoryData {
  name: string;
  productCount: number;
  subcategories: { name: string; productCount: number }[];
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  // Editing state
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editingSubcat, setEditingSubcat] = useState<{ cat: string; sub: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  // Add new
  const [addingCat, setAddingCat] = useState(false);
  const [addingSubcat, setAddingSubcat] = useState<string | null>(null); // parent cat name
  const [newValue, setNewValue] = useState('');

  async function fetchCategories() {
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('category, subcategory');

    if (!data) { setLoading(false); return; }

    // Build structure
    const catMap: Record<string, { productCount: number; subcats: Record<string, number> }> = {};

    for (const row of data) {
      const cat = row.category?.trim();
      const sub = row.subcategory?.trim();
      if (!cat) continue;
      if (!catMap[cat]) catMap[cat] = { productCount: 0, subcats: {} };
      catMap[cat].productCount++;
      if (sub) {
        catMap[cat].subcats[sub] = (catMap[cat].subcats[sub] || 0) + 1;
      }
    }

    const result: CategoryData[] = Object.entries(catMap)
      .sort(([a], [b]) => a.localeCompare(b, 'ar'))
      .map(([name, data]) => ({
        name,
        productCount: data.productCount,
        subcategories: Object.entries(data.subcats)
          .sort(([a], [b]) => a.localeCompare(b, 'ar'))
          .map(([subName, count]) => ({ name: subName, productCount: count })),
      }));

    setCategories(result);
    setLoading(false);
  }

  useEffect(() => { fetchCategories(); }, []);

  const toggleExpand = (cat: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  // ── Rename category ───────────────────────────────────────────────────────
  const renameCategory = async (oldName: string, newName: string) => {
    if (!newName.trim() || newName.trim() === oldName) { setEditingCat(null); return; }
    setSaving(true);
    const { error } = await supabase
      .from('products')
      .update({ category: newName.trim() })
      .eq('category', oldName);
    setSaving(false);
    if (error) { alert('خطأ: ' + error.message); return; }
    setEditingCat(null);
    fetchCategories();
  };

  // ── Rename subcategory ────────────────────────────────────────────────────
  const renameSubcategory = async (cat: string, oldSub: string, newSub: string) => {
    if (!newSub.trim() || newSub.trim() === oldSub) { setEditingSubcat(null); return; }
    setSaving(true);
    const { error } = await supabase
      .from('products')
      .update({ subcategory: newSub.trim() })
      .eq('category', cat)
      .eq('subcategory', oldSub);
    setSaving(false);
    if (error) { alert('خطأ: ' + error.message); return; }
    setEditingSubcat(null);
    fetchCategories();
  };

  // ── Delete category (sets category to null on all products) ───────────────
  const deleteCategory = async (catName: string, count: number) => {
    if (!confirm(`هل أنت متأكد من حذف فئة "${catName}"؟ سيؤثر على ${count} منتج.`)) return;
    setSaving(true);
    const { error } = await supabase
      .from('products')
      .update({ category: null, subcategory: null })
      .eq('category', catName);
    setSaving(false);
    if (error) { alert('خطأ: ' + error.message); return; }
    fetchCategories();
  };

  // ── Delete subcategory ────────────────────────────────────────────────────
  const deleteSubcategory = async (cat: string, sub: string, count: number) => {
    if (!confirm(`هل أنت متأكد من حذف قسم "${sub}"؟ سيؤثر على ${count} منتج.`)) return;
    setSaving(true);
    const { error } = await supabase
      .from('products')
      .update({ subcategory: null })
      .eq('category', cat)
      .eq('subcategory', sub);
    setSaving(false);
    if (error) { alert('خطأ: ' + error.message); return; }
    fetchCategories();
  };

  // ── Add new subcategory (just marks it as ready — actual assignment happens via products) ──
  // We can't "add" a category without products, but we can rename existing ones.
  // So "add" here means: update products that have no subcategory under this cat, 
  // which doesn't make sense. Instead, we'll show a note.
  // For subcategories: same — we can only manage existing ones from products.

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
      <Loader2 className="animate-spin" size={32} color="#16a34a" />
    </div>
  );

  return (
    <div style={{ direction: 'rtl', fontFamily: "'Cairo', sans-serif", color: '#1e293b' }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
        .cat-row { transition: background 0.12s; }
        .cat-row:hover { background: #f8fafc; }
        .sub-row { transition: background 0.12s; }
        .sub-row:hover { background: #f0fdf4; }
        .icon-btn {
          background: none; border: none; cursor: pointer;
          padding: 4px; border-radius: 6px; display: flex;
          align-items: center; transition: background 0.12s;
        }
        .icon-btn:hover { background: #f1f5f9; }
        .icon-btn.danger:hover { background: #fee2e2; }
        .edit-input {
          padding: 5px 10px;
          border: 1.5px solid #16a34a;
          border-radius: 7px;
          font-size: 0.85rem;
          font-family: 'Cairo', sans-serif;
          outline: none;
          min-width: 180px;
          color: #1e293b;
        }
        .save-btn {
          background: none; border: none; cursor: pointer;
          padding: 4px; border-radius: 6px;
          display: flex; align-items: center;
        }
        .save-btn:hover { background: #dcfce7; }
        .cancel-btn {
          background: none; border: none; cursor: pointer;
          padding: 4px; border-radius: 6px;
          display: flex; align-items: center;
        }
        .cancel-btn:hover { background: #fee2e2; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: '900', color: '#0f172a', margin: 0 }}>إدارة الفئات والأقسام</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '4px', fontWeight: '600' }}>
          الفئات والأقسام مستخرجة من بيانات المنتجات — التعديل هنا يؤثر على جميع المنتجات المرتبطة
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <span style={{ fontSize: '0.65rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>الفئات الرئيسية</span>
          <span style={{ fontSize: '1.6rem', fontWeight: '900', color: '#16a34a', lineHeight: 1 }}>{categories.length}</span>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <span style={{ fontSize: '0.65rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>الأقسام الفرعية</span>
          <span style={{ fontSize: '1.6rem', fontWeight: '900', color: '#0ea5e9', lineHeight: 1 }}>
            {categories.reduce((sum, c) => sum + c.subcategories.length, 0)}
          </span>
        </div>
      </div>

      {/* Categories list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {categories.map((cat) => {
          const isExpanded = expandedCats.has(cat.name);
          const isEditingThis = editingCat === cat.name;

          return (
            <div key={cat.name} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>

              {/* ── Category row ── */}
              <div className="cat-row" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', borderBottom: isExpanded && cat.subcategories.length > 0 ? '1px solid #f1f5f9' : 'none' }}>

                {/* Expand toggle */}
                <button
                  onClick={() => toggleExpand(cat.name)}
                  className="icon-btn"
                  style={{ color: '#64748b' }}
                  disabled={cat.subcategories.length === 0}
                >
                  {cat.subcategories.length > 0
                    ? (isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />)
                    : <span style={{ width: '16px' }} />
                  }
                </button>

                {/* Category name / edit input */}
                {isEditingThis ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                    <input
                      className="edit-input"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') renameCategory(cat.name, editValue);
                        if (e.key === 'Escape') setEditingCat(null);
                      }}
                      autoFocus
                    />
                    <button className="save-btn" onClick={() => renameCategory(cat.name, editValue)} disabled={saving}>
                      <Check size={15} color="#16a34a" />
                    </button>
                    <button className="cancel-btn" onClick={() => setEditingCat(null)}>
                      <X size={15} color="#ef4444" />
                    </button>
                  </div>
                ) : (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: '800', fontSize: '0.95rem', color: '#0f172a' }}>{cat.name}</span>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1px 8px', fontWeight: '600' }}>
                      {cat.productCount} منتج
                    </span>
                    {cat.subcategories.length > 0 && (
                      <span style={{ fontSize: '0.7rem', color: '#0ea5e9', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px', padding: '1px 8px', fontWeight: '600' }}>
                        {cat.subcategories.length} قسم فرعي
                      </span>
                    )}
                  </div>
                )}

                {/* Actions */}
                {!isEditingThis && (
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <button className="icon-btn" title="تعديل" onClick={() => { setEditingCat(cat.name); setEditValue(cat.name); setEditingSubcat(null); }}>
                      <Pencil size={14} color="#64748b" />
                    </button>
                    <button className="icon-btn danger" title="حذف" onClick={() => deleteCategory(cat.name, cat.productCount)}>
                      <Trash2 size={14} color="#ef4444" />
                    </button>
                  </div>
                )}
              </div>

              {/* ── Subcategories ── */}
              {isExpanded && cat.subcategories.length > 0 && (
                <div style={{ backgroundColor: '#fafafa' }}>
                  {cat.subcategories.map((sub) => {
                    const isEditingSub = editingSubcat?.cat === cat.name && editingSubcat?.sub === sub.name;
                    return (
                      <div key={sub.name} className="sub-row" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px 10px 16px', borderBottom: '1px solid #f1f5f9' }}>

                        {/* Indent indicator */}
                        <span style={{ width: '16px', flexShrink: 0 }} />
                        <span style={{ width: '2px', height: '20px', background: '#e2e8f0', borderRadius: '2px', flexShrink: 0 }} />

                        {isEditingSub ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                            <input
                              className="edit-input"
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') renameSubcategory(cat.name, sub.name, editValue);
                                if (e.key === 'Escape') setEditingSubcat(null);
                              }}
                              autoFocus
                            />
                            <button className="save-btn" onClick={() => renameSubcategory(cat.name, sub.name, editValue)} disabled={saving}>
                              <Check size={15} color="#16a34a" />
                            </button>
                            <button className="cancel-btn" onClick={() => setEditingSubcat(null)}>
                              <X size={15} color="#ef4444" />
                            </button>
                          </div>
                        ) : (
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155' }}>{sub.name}</span>
                            <span style={{ fontSize: '0.68rem', color: '#94a3b8', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1px 7px', fontWeight: '600' }}>
                              {sub.productCount} منتج
                            </span>
                          </div>
                        )}

                        {!isEditingSub && (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button className="icon-btn" title="تعديل" onClick={() => { setEditingSubcat({ cat: cat.name, sub: sub.name }); setEditValue(sub.name); setEditingCat(null); }}>
                              <Pencil size={13} color="#64748b" />
                            </button>
                            <button className="icon-btn danger" title="حذف" onClick={() => deleteSubcategory(cat.name, sub.name, sub.productCount)}>
                              <Trash2 size={13} color="#ef4444" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Note */}
      <div style={{ marginTop: '24px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '12px 16px', fontSize: '0.78rem', color: '#92400e', fontWeight: '600' }}>
        ℹ️ لإضافة فئة أو قسم جديد، أضف منتجاً وحدد الفئة/القسم الجديد من صفحة إضافة منتج — ستظهر هنا تلقائياً.
      </div>
    </div>
  );
}