'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import Link from 'next/link';
import { Eye, Edit3, DollarSign, Trash2, Check, X, FileDown, FileUp, ClipboardList, CheckSquare, Square, Minus } from 'lucide-react';


const ITEMS_PER_PAGE = 20;


export default function AdminProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const [availableMakes, setAvailableMakes] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableSubcategories, setAvailableSubcategories] = useState<string[]>([]);

  const [searchName, setSearchName] = useState('');
  const [filterMake, setFilterMake] = useState('');
  const [filterModel, setFilterModel] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSubcategory, setFilterSubcategory] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ regular_price: '', sale_price: '' });

  // ── MULTI-SELECT STATE ──
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);


  useEffect(() => {
    fetchUniqueValues('car_make', setAvailableMakes);
    fetchUniqueValues('category', setAvailableCategories);
  }, []);

  useEffect(() => {
    if (filterMake) {
      fetchUniqueValues('car_model', setAvailableModels, 'car_make', filterMake);
    } else {
      setAvailableModels([]);
      setFilterModel('');
    }
  }, [filterMake]);

  useEffect(() => {
    if (filterCategory) {
      fetchUniqueValues('subcategory', setAvailableSubcategories, 'category', filterCategory);
    } else {
      setAvailableSubcategories([]);
      setFilterSubcategory('');
    }
  }, [filterCategory]);

  useEffect(() => {
    fetchProducts();
  }, [currentPage, filterMake, filterModel, filterCategory, filterSubcategory, filterYear, sortBy, sortOrder]);

  // Clear selection when page changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [currentPage, filterMake, filterModel, filterCategory, filterSubcategory, filterYear]);


  async function fetchUniqueValues(column: string, setter: Function, filterCol?: string, filterVal?: string) {
    let query = supabase.from('products').select(column);
    if (filterCol && filterVal) query = query.eq(filterCol, filterVal);
    const { data } = await query;
    if (data) {
      const uniqueValues = Array.from(new Set(data.map((i: any) => i[column]).filter(Boolean)));
      setter(uniqueValues.sort());
    }
  }

  const buildFilteredQuery = () => {
    let query = supabase.from('products').select('*', { count: 'exact' });
    if (searchName) query = query.ilike('name', `%${searchName}%`);
    if (filterMake) query = query.eq('car_make', filterMake);
    if (filterModel) query = query.eq('car_model', filterModel);
    if (filterCategory) query = query.eq('category', filterCategory);
    if (filterSubcategory) query = query.eq('subcategory', filterSubcategory);
    if (filterYear) query = query.ilike('car_model_year', `%${filterYear}%`);
    return query;
  };

  async function fetchProducts() {
    setLoading(true);
    let query = buildFilteredQuery();
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    query = query.range(from, to);

    const { data, count } = await query;
    if (data) setProducts(data);
    if (count) setTotalCount(count);
    setLoading(false);
  }

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from('products').update({ is_active: !currentStatus }).eq('id', id);
    if (!error) {
      setProducts(products.map(p => p.id === id ? { ...p, is_active: !currentStatus } : p));
    }
  };

  const handleUpdatePrice = async (id: string) => {
    const { error } = await supabase.from('products').update({
      regular_price: parseFloat(editData.regular_price),
      sale_price: editData.sale_price ? parseFloat(editData.sale_price) : null
    }).eq('id', id);
    if (!error) {
      setProducts(products.map(p => p.id === id ? { ...p, ...editData } : p));
      setEditingId(null);
    }
  };

  const deleteProduct = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المنتج نهائياً؟')) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (!error) fetchProducts();
    }
  };

  // ── MULTI-SELECT HANDLERS ──
  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isAllSelected = products.length > 0 && products.every(p => selectedIds.has(p.id));
  const isPartialSelected = products.some(p => selectedIds.has(p.id)) && !isAllSelected;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      // Deselect all on current page
      setSelectedIds(prev => {
        const next = new Set(prev);
        products.forEach(p => next.delete(p.id));
        return next;
      });
    } else {
      // Select all on current page
      setSelectedIds(prev => {
        const next = new Set(prev);
        products.forEach(p => next.add(p.id));
        return next;
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`هل أنت متأكد من حذف ${selectedIds.size} منتج نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`)) return;

    setBulkDeleting(true);
    const idsArray = Array.from(selectedIds);

    const { error } = await supabase
      .from('products')
      .delete()
      .in('id', idsArray);

    setBulkDeleting(false);

    if (error) {
      alert('❌ حدث خطأ أثناء الحذف: ' + error.message);
    } else {
      alert(`✅ تم حذف ${idsArray.length} منتج بنجاح`);
      setSelectedIds(new Set());
      fetchProducts();
    }
  };

  // ── EXPORT ──
  const exportToCSV = async () => {
    setLoading(true);
    const { data } = await buildFilteredQuery();

    if (!data || data.length === 0) {
      alert('لا توجد منتجات مطابقة للفلاتر الحالية لتصديرها');
      setLoading(false);
      return;
    }

    const headers = 'ID,الاسم,الماركة,القسم الرئيسي,القسم الفرعي,ماركة السيارة,الموديل,السنة,السعر الأساسي,سعر الخصم,الضمان,الحالة,المنشأ,رابط الصورة\n';
    const rows = data.map(p =>
      `"${p.id}","${p.name}","${p.brand}","${p.category || ''}","${p.subcategory || ''}","${p.car_make}","${p.car_model}","${p.car_model_year}",${p.regular_price},${p.sale_price || ''},"${p.warranty || ''}",${p.is_active ? 1 : 0},"${p.country_of_origin || ''}","${p.image_url || ''}"`
    ).join('\n');

    const csvContent = '\uFEFF' + headers + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `مخزن_مصدر_${new Date().toLocaleDateString('ar-EG')}.csv`;
    link.click();
    setLoading(false);
  };

  const downloadTemplate = () => {
    const headers = 'ID,name,brand,category,subcategory,car_make,car_model,car_model_year,regular_price,sale_price,warranty,is_active,country_of_origin,image_url\n';
    const example = ',تيل فرامل صني,Hi-Q,فرامل,تيل,نيسان,صني,2015-2024,1200,1100,6,1,كوري,https://res.cloudinary.com/example.jpg';
    const csvContent = '\uFEFF' + headers + example;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'قالب_المنتجات.csv';
    link.click();
  };

  const handleImport = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event: any) => {
      const text = event.target.result;
      const lines = text.split('\n').slice(1);
      const products: any[] = [];

      for (const line of lines) {
        if (!line.trim()) continue;

        const cols: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            cols.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        cols.push(current.trim());

        if (cols.length < 6 || !cols[1]) continue;

        let warrantyVal = cols[10];
        if (warrantyVal && !isNaN(Number(warrantyVal))) warrantyVal = `${warrantyVal} شهور`;

        products.push({
          id: cols[0],
          name: cols[1], brand: cols[2], category: cols[3], subcategory: cols[4],
          car_make: cols[5], car_model: cols[6], car_model_year: cols[7],
          regular_price: parseFloat(cols[8]),
          sale_price: cols[9] ? parseFloat(cols[9]) : null,
          warranty: warrantyVal,
          is_active: cols[11] === '1' || cols[11]?.toLowerCase() === 'true',
          country_of_origin: cols[12],
          image_url: cols[13]
        });
      }

      if (products.length === 0) {
        alert('❌ لم يتم العثور على منتجات صالحة في الملف');
        return;
      }

      setLoading(true);
      const res = await fetch('/api/admin/import-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products })
      });

      const rawText = await res.text();

      try {
        const result = JSON.parse(rawText);
        setLoading(false);
        if (result.error) {
          alert('❌ خطأ: ' + result.error);
        } else {
          alert(`✅ اكتملت العملية:\n- تحديث ${result.updateCount} منتج\n- إضافة ${result.insertCount} جديد`);
          fetchProducts();
        }
      } catch {
        setLoading(false);
        alert('❌ خطأ في الاستجابة: ' + rawText);
      }
    };

    reader.readAsText(file);
  };


  return (
    <div style={{ direction: 'rtl', color: '#fff', fontFamily: 'sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h1 style={{ color: '#2ecc71', fontWeight: '900' }}>إدارة المخزن ({totalCount})</h1>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={downloadTemplate} style={secondaryBtnStyle}><ClipboardList size={16} /> القالب</button>
          <label style={secondaryBtnStyle}><FileUp size={16} /> استيراد <input type="file" accept=".csv" onChange={handleImport} style={{ display: 'none' }} /></label>
          <button onClick={exportToCSV} disabled={loading} style={{ ...secondaryBtnStyle, backgroundColor: '#2ecc71', color: '#000' }}>
            <FileDown size={16} /> {loading ? 'جاري التحميل...' : 'تصدير الفلتر الحالي'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '25px', backgroundColor: '#0a0a0a', padding: '20px', borderRadius: '12px' }}>
        <div>
          <label style={labelStyle}>بحث بالاسم</label>
          <input type="text" placeholder="ابحث..." value={searchName} onChange={(e) => setSearchName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchProducts()} style={filterInputStyle} />
        </div>
        <div>
          <label style={labelStyle}>القسم الرئيسي</label>
          <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }} style={filterInputStyle}>
            <option value="">الكل</option>
            {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>القسم الفرعي</label>
          <select value={filterSubcategory} onChange={(e) => { setFilterSubcategory(e.target.value); setCurrentPage(1); }} style={filterInputStyle} disabled={!filterCategory}>
            <option value="">الكل</option>
            {availableSubcategories.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>الماركة</label>
          <select value={filterMake} onChange={(e) => { setFilterMake(e.target.value); setCurrentPage(1); }} style={filterInputStyle}>
            <option value="">الكل</option>
            {availableMakes.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>الموديل</label>
          <select value={filterModel} onChange={(e) => { setFilterModel(e.target.value); setCurrentPage(1); }} style={filterInputStyle} disabled={!filterMake}>
            <option value="">الكل</option>
            {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>السنة</label>
          <input type="text" placeholder="2020" value={filterYear} onChange={(e) => setFilterYear(e.target.value)} style={filterInputStyle} />
        </div>
      </div>

      {/* ── BULK ACTION BAR — appears only when something is selected ── */}
      {selectedIds.size > 0 && (
        <div style={bulkBarStyle}>
          <span style={{ color: '#fff', fontWeight: '700', fontSize: '0.95rem' }}>
            تم تحديد <span style={{ color: '#ff4d4d', fontSize: '1.1rem' }}>{selectedIds.size}</span> منتج
          </span>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => setSelectedIds(new Set())}
              style={{ ...secondaryBtnStyle, color: '#aaa' }}
            >
              <X size={15} /> إلغاء التحديد
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              style={{ ...secondaryBtnStyle, backgroundColor: '#ff4d4d', color: '#fff', border: 'none' }}
            >
              <Trash2 size={15} />
              {bulkDeleting ? 'جاري الحذف...' : `حذف ${selectedIds.size} منتج`}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ backgroundColor: '#0a0a0a', borderRadius: '15px', border: '1px solid #111', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
          <thead>
            <tr style={{ backgroundColor: '#111', color: '#2ecc71' }}>
              {/* Select-all checkbox */}
              <th style={{ ...thStyle, width: '40px', textAlign: 'center' }}>
                <button
                  onClick={toggleSelectAll}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}
                  title={isAllSelected ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                >
                  {isAllSelected
                    ? <CheckSquare size={20} color="#ff4d4d" />
                    : isPartialSelected
                      ? <Minus size={20} color="#f1c40f" style={{ border: '2px solid #f1c40f', borderRadius: '4px' }} />
                      : <Square size={20} color="#444" />
                  }
                </button>
              </th>
              <th style={thStyle}>الحالة</th>
              <th style={thStyle}>اسم القطعة</th>
              <th style={thStyle}>السيارة</th>
              <th style={thStyle}>الموديل</th>
              <th style={thStyle}>السنة</th>
              <th style={thStyle}>السعر</th>
              <th style={thStyle}>إدارة</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>جاري التحميل...</td></tr>
            ) : products.map((product) => {
              const isSelected = selectedIds.has(product.id);
              return (
                <tr
                  key={product.id}
                  style={{
                    borderBottom: '1px solid #111',
                    backgroundColor: isSelected ? 'rgba(255, 77, 77, 0.08)' : 'transparent',
                    transition: 'background-color 0.15s ease'
                  }}
                >
                  {/* Row checkbox */}
                  <td style={{ ...tdStyle, textAlign: 'center', width: '40px' }}>
                    <button
                      onClick={() => toggleSelectOne(product.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}
                    >
                      {isSelected
                        ? <CheckSquare size={18} color="#ff4d4d" />
                        : <Square size={18} color="#444" />
                      }
                    </button>
                  </td>
                  <td style={tdStyle}>
                    <button onClick={() => toggleStatus(product.id, product.is_active)} style={{ padding: '6px 14px', borderRadius: '25px', fontSize: '0.75rem', fontWeight: 'bold', border: 'none', cursor: 'pointer', backgroundColor: product.is_active ? '#2ecc7133' : '#333', color: product.is_active ? '#2ecc71' : '#888' }}>
                      {product.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td style={tdStyle}>{product.name}</td>
                  <td style={tdStyle}>{product.car_make}</td>
                  <td style={tdStyle}>{product.car_model}</td>
                  <td style={tdStyle}>{product.car_model_year}</td>
                  <td style={tdStyle}>
                    {editingId === product.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <input type="number" placeholder="الأساسي" value={editData.regular_price} onChange={(e) => setEditData({ ...editData, regular_price: e.target.value })} style={miniInputStyle} autoFocus />
                        <input type="number" placeholder="الخصم" value={editData.sale_price} onChange={(e) => setEditData({ ...editData, sale_price: e.target.value })} style={{ ...miniInputStyle, borderColor: '#2ecc71' }} />
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button onClick={() => handleUpdatePrice(product.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Check size={16} color="#2ecc71" /></button>
                          <button onClick={() => setEditingId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} color="#ff4d4d" /></button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ lineHeight: '1.2' }}>
                        <div style={{ fontSize: product.sale_price ? '0.8rem' : '1rem', color: product.sale_price ? '#888' : '#fff', textDecoration: product.sale_price ? 'line-through' : 'none' }}>{product.regular_price} ج.م</div>
                        {product.sale_price && <div style={{ color: '#2ecc71', fontWeight: 'bold' }}>{product.sale_price} ج.م</div>}
                      </div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                      <Link href={`/products/${product.id}`} target="_blank" title="عرض"><Eye size={18} color="#2ecc71" /></Link>
                      <Link href={`/admin/products/edit/${product.id}`} title="تعديل"><Edit3 size={18} color="#f1c40f" /></Link>
                      <button onClick={() => { setEditingId(product.id); setEditData({ regular_price: product.regular_price.toString(), sale_price: product.sale_price ? product.sale_price.toString() : '' }); }} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }} title="السعر"><DollarSign size={18} color="#3b82f6" /></button>
                      <button onClick={() => deleteProduct(product.id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }} title="حذف"><Trash2 size={18} color="#ff4d4d" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginTop: '30px', paddingBottom: '30px' }}>
        <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={pageBtnStyle}>السابق</button>
        <span style={{ color: '#666' }}>صفحة {currentPage}</span>
        <button disabled={currentPage * ITEMS_PER_PAGE >= totalCount} onClick={() => setCurrentPage(p => p + 1)} style={pageBtnStyle}>التالي</button>
      </div>
    </div>
  );
}


const labelStyle = { display: 'block', fontSize: '0.8rem', color: '#555', marginBottom: '8px' };
const filterInputStyle = { width: '100%', padding: '12px', backgroundColor: '#000', border: '1px solid #222', color: '#fff', borderRadius: '10px', outline: 'none', fontSize: '0.85rem' };
const secondaryBtnStyle: any = { padding: '8px 15px', backgroundColor: '#111', color: '#888', border: '1px solid #222', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' };
const thStyle: any = { padding: '18px 15px', fontSize: '0.9rem' };
const tdStyle: any = { padding: '15px', color: '#bbb', fontSize: '0.85rem' };
const miniInputStyle: any = { width: '80px', padding: '8px', backgroundColor: '#000', color: '#fff', border: '1px solid #333', borderRadius: '6px', fontSize: '0.8rem', outline: 'none' };
const pageBtnStyle: any = { padding: '10px 25px', backgroundColor: '#111', color: '#fff', border: '1px solid #222', borderRadius: '10px', cursor: 'pointer' };
const bulkBarStyle: any = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: '#1a0a0a',
  border: '1px solid #ff4d4d44',
  borderRadius: '12px',
  padding: '14px 20px',
  marginBottom: '16px',
  gap: '12px',
  flexWrap: 'wrap',
};