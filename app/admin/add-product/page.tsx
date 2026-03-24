'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Car } from 'lucide-react';

interface CarEntry {
  car_make: string;
  car_model: string;
  year_from: string;
  year_to: string;
  models: string[];
}

export default function AddProduct() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const [carMakes, setCarMakes] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // ── New category / subcategory inline creation ────────────────────────────
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [showNewSubcategory, setShowNewSubcategory] = useState(false);
  const [newSubcategoryInput, setNewSubcategoryInput] = useState('');

  const [cars, setCars] = useState<CarEntry[]>([
    { car_make: '', car_model: '', year_from: '', year_to: '', models: [] }
  ]);

  const [formData, setFormData] = useState({
    name: '', brand: '', category: '', subcategory: '',
    regular_price: '', sale_price: '', image_url: '',
    country_of_origin: '', warranty: '', video_url: ''
  });

  useEffect(() => {
    async function loadOptions() {
      setLoadingOptions(true);
      try {
        const { data } = await supabase.from('products').select('car_make, category');
        if (data) {
          setCarMakes(Array.from(new Set(data.map((p: any) => p.car_make?.trim()).filter(Boolean))).sort() as string[]);
          setCategories(Array.from(new Set(data.map((p: any) => p.category?.trim()).filter(Boolean))).sort() as string[]);
        }
      } finally {
        setLoadingOptions(false);
      }
    }
    loadOptions();
  }, []);

  useEffect(() => {
    setSubcategories([]);
    setFormData(prev => ({ ...prev, subcategory: '' }));
    setShowNewSubcategory(false);
    setNewSubcategoryInput('');
    if (!formData.category) return;
    async function loadSubs() {
      const { data } = await supabase.from('products').select('subcategory').ilike('category', formData.category);
      if (data) setSubcategories(Array.from(new Set(data.map((p: any) => p.subcategory?.trim()).filter(Boolean))).sort() as string[]);
    }
    loadSubs();
  }, [formData.category]);

  async function loadModelsForCar(index: number, make: string) {
    if (!make) {
      setCars(prev => prev.map((c, i) => i === index ? { ...c, car_model: '', models: [] } : c));
      return;
    }
    const { data } = await supabase.from('products').select('car_model').ilike('car_make', make);
    const models = data ? Array.from(new Set(data.map((p: any) => p.car_model?.trim()).filter(Boolean))).sort() as string[] : [];
    setCars(prev => prev.map((c, i) => i === index ? { ...c, car_make: make, car_model: '', models } : c));
  }

  function addCar() {
    setCars(prev => [...prev, { car_make: '', car_model: '', year_from: '', year_to: '', models: [] }]);
  }
  function removeCar(index: number) {
    if (cars.length === 1) return;
    setCars(prev => prev.filter((_, i) => i !== index));
  }
  function updateCar(index: number, field: keyof CarEntry, value: string) {
    setCars(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
  }

  // ── Confirm new category ──────────────────────────────────────────────────
  function confirmNewCategory() {
    const val = newCategoryInput.trim();
    if (!val) return;
    if (!categories.includes(val)) setCategories(prev => [...prev, val].sort());
    setFormData(prev => ({ ...prev, category: val }));
    setNewCategoryInput('');
    setShowNewCategory(false);
  }

  // ── Confirm new subcategory ───────────────────────────────────────────────
  function confirmNewSubcategory() {
    const val = newSubcategoryInput.trim();
    if (!val) return;
    if (!subcategories.includes(val)) setSubcategories(prev => [...prev, val].sort());
    setFormData(prev => ({ ...prev, subcategory: val }));
    setNewSubcategoryInput('');
    setShowNewSubcategory(false);
  }

  const uploadToCloudinary = async (file: File) => {
    try {
      setUploading(true);
      const data = new FormData();
      data.append('file', file);
      data.append('upload_preset', 'zaitandfiltersnew');
      const res = await fetch('https://api.cloudinary.com/v1_1/dxtncdxfh/image/upload', { method: 'POST', body: data });
      const fileData = await res.json();
      if (fileData.secure_url) setFormData(prev => ({ ...prev, image_url: fileData.secure_url }));
    } catch { alert('خطأ في الرفع'); }
    finally { setUploading(false); }
  };

  const handleDrag = (e: any) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: any) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) uploadToCloudinary(e.dataTransfer.files[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validCars = cars.filter(c => c.car_make && c.car_model);
    if (validCars.length === 0) {
      alert('أضف سيارة واحدة على الأقل مع تحديد الماركة والموديل');
      return;
    }
    setLoading(true);
    try {
      const inserts = validCars.map(car => {
        const yearRange = car.year_from && car.year_to
          ? `${car.year_from}-${car.year_to}`
          : car.year_from || car.year_to || 'عام';
        return {
          name: formData.name,
          brand: formData.brand,
          category: formData.category,
          subcategory: formData.subcategory,
          regular_price: parseFloat(formData.regular_price),
          sale_price: formData.sale_price ? parseFloat(formData.sale_price) : null,
          image_url: formData.image_url,
          country_of_origin: formData.country_of_origin,
          warranty: formData.warranty,
          video_url: formData.video_url || null,
          car_make: car.car_make,
          car_model: car.car_model,
          car_model_year: yearRange,
        };
      });
      const { error } = await supabase.from('products').insert(inserts);
      if (error) throw error;
      alert(`تمت إضافة المنتج بنجاح لـ ${validCars.length} سيارة! ✅`);
      router.push('/admin/dashboard');
    } catch (err: any) {
      alert('خطأ: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '40px', direction: 'rtl', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#2ecc71', marginBottom: '30px', fontWeight: '900', fontStyle: 'italic' }}>
        إضافة صنف جديد - ZAIT &amp; FILTERS
      </h1>

      {loadingOptions && (
        <p style={{ color: '#888', marginBottom: '16px', fontSize: '0.9rem' }}>⏳ جاري تحميل بيانات المنتجات...</p>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', backgroundColor: '#0a0a0a', padding: '30px', borderRadius: '15px', border: '1px solid #222', maxWidth: '1000px', margin: '0 auto' }}>

        {/* ── Image Upload ── */}
        <div
          onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
          style={{ gridColumn: 'span 2', border: `2px dashed ${dragActive ? '#2ecc71' : '#333'}`, padding: '40px', textAlign: 'center', borderRadius: '15px', backgroundColor: dragActive ? '#0f2d1a' : '#050505' }}
        >
          {formData.image_url ? (
            <div>
              <img src={formData.image_url} alt="Preview" style={{ height: '150px', borderRadius: '10px' }} />
              <p style={{ color: '#2ecc71', marginTop: '10px' }}>✅ الصورة جاهزة</p>
              <button type="button" onClick={() => setFormData({ ...formData, image_url: '' })} style={{ color: '#ff4d4d', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>تغيير الصورة</button>
            </div>
          ) : (
            <div>
              <p>{uploading ? 'جاري الرفع لـ Cloudinary...' : 'اسحب صورة المنتج هنا أو'}</p>
              <input type="file" accept="image/*" onChange={(e) => e.target.files && uploadToCloudinary(e.target.files[0])} style={{ marginTop: '10px' }} />
            </div>
          )}
        </div>

        {/* ── Product Name ── */}
        <div style={{ gridColumn: 'span 2' }}>
          <label style={labelStyle}>اسم القطعة *</label>
          <input required type="text" placeholder="مثال: طقم تيل فرامل" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={inputStyle} />
        </div>

        {/* ── Brand ── */}
        <div>
          <label style={labelStyle}>الماركة (Brand) *</label>
          <input required type="text" placeholder="مثال: Mobil 1" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} style={inputStyle} />
        </div>

        {/* ── Country ── */}
        <div>
          <label style={labelStyle}>بلد المنشأ</label>
          <input type="text" placeholder="ألماني، صيني.." value={formData.country_of_origin} onChange={(e) => setFormData({ ...formData, country_of_origin: e.target.value })} style={inputStyle} />
        </div>

        {/* ── Category ── */}
        <div>
          <label style={labelStyle}>الفئة (Category) *</label>
          {!showNewCategory ? (
            <>
              <select required value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} style={inputStyle}>
                <option value="">{loadingOptions ? 'جاري التحميل...' : `اختر الفئة (${categories.length} فئة)`}</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <button
                type="button"
                onClick={() => setShowNewCategory(true)}
                style={addNewBtnStyle}
              >
                + إضافة فئة جديدة
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                autoFocus
                type="text"
                placeholder="اكتب اسم الفئة الجديدة..."
                value={newCategoryInput}
                onChange={(e) => setNewCategoryInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmNewCategory(); } if (e.key === 'Escape') { setShowNewCategory(false); setNewCategoryInput(''); } }}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button type="button" onClick={confirmNewCategory} style={confirmBtnStyle}>✓</button>
              <button type="button" onClick={() => { setShowNewCategory(false); setNewCategoryInput(''); }} style={cancelBtnStyle}>✕</button>
            </div>
          )}
          {formData.category && !showNewCategory && (
            <div style={selectedBadge}>{formData.category}</div>
          )}
        </div>

        {/* ── Subcategory ── */}
        <div>
          <label style={labelStyle}>القسم الفرعي</label>
          {!showNewSubcategory ? (
            <>
              <select
                value={formData.subcategory}
                onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                style={{ ...inputStyle, opacity: !formData.category ? 0.5 : 1 }}
                disabled={!formData.category}
              >
                <option value="">{!formData.category ? 'اختر الفئة أولاً' : subcategories.length === 0 ? 'لا يوجد أقسام فرعية' : `اختر القسم (${subcategories.length})`}</option>
                {subcategories.map(sub => <option key={sub} value={sub}>{sub}</option>)}
              </select>
              {formData.category && (
                <button
                  type="button"
                  onClick={() => setShowNewSubcategory(true)}
                  style={addNewBtnStyle}
                >
                  + إضافة قسم فرعي جديد
                </button>
              )}
            </>
          ) : (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                autoFocus
                type="text"
                placeholder="اكتب اسم القسم الفرعي الجديد..."
                value={newSubcategoryInput}
                onChange={(e) => setNewSubcategoryInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmNewSubcategory(); } if (e.key === 'Escape') { setShowNewSubcategory(false); setNewSubcategoryInput(''); } }}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button type="button" onClick={confirmNewSubcategory} style={confirmBtnStyle}>✓</button>
              <button type="button" onClick={() => { setShowNewSubcategory(false); setNewSubcategoryInput(''); }} style={cancelBtnStyle}>✕</button>
            </div>
          )}
          {formData.subcategory && !showNewSubcategory && (
            <div style={selectedBadge}>{formData.subcategory}</div>
          )}
        </div>

        {/* ── Prices ── */}
        <div>
          <label style={labelStyle}>السعر الأساسي * (ج.م)</label>
          <input required type="number" value={formData.regular_price} onChange={(e) => setFormData({ ...formData, regular_price: e.target.value })} style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>سعر الخصم (ج.م)</label>
          <input type="number" value={formData.sale_price} onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })} style={inputStyle} />
        </div>

        {/* ── Warranty ── */}
        <div style={{ gridColumn: 'span 2' }}>
          <label style={labelStyle}>الضمان</label>
          <input type="text" placeholder="مثال: سنة، 6 أشهر" value={formData.warranty} onChange={(e) => setFormData({ ...formData, warranty: e.target.value })} style={inputStyle} />
        </div>

        {/* ── YouTube Video URL ── */}
        <div style={{ gridColumn: 'span 2' }}>
          <label style={labelStyle}>رابط فيديو يوتيوب (اختياري)</label>
          <input
            type="url"
            placeholder="مثال: https://www.youtube.com/watch?v=..."
            value={formData.video_url}
            onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
            style={inputStyle}
            dir="ltr"
          />
          {formData.video_url && (() => {
            const match = formData.video_url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/|v\/))([A-Za-z0-9_-]{11})/);
            return match ? (
              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px', background: '#0f2d1a', border: '1px solid #2ecc71', borderRadius: '10px', padding: '10px 14px' }}>
                <img src={`https://img.youtube.com/vi/${match[1]}/default.jpg`} alt="thumbnail" style={{ width: '80px', height: '60px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} />
                <div>
                  <div style={{ color: '#2ecc71', fontWeight: '800', fontSize: '0.85rem' }}>✅ تم التعرف على الفيديو</div>
                  <div style={{ color: '#888', fontSize: '0.75rem', marginTop: '2px', direction: 'ltr' }}>ID: {match[1]}</div>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: '8px', color: '#ff4d4d', fontSize: '0.8rem', fontWeight: '700' }}>⚠️ الرابط غير صحيح — تأكد أنه رابط يوتيوب صحيح</div>
            );
          })()}
        </div>

        {/* ── Cars ── */}
        <div style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <label style={{ ...labelStyle, fontSize: '1.1rem', color: '#2ecc71', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Car size={18} color="#2ecc71" /> السيارات المتوافقة *
            </label>
            <button type="button" onClick={addCar} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0f2d1a', color: '#2ecc71', border: '1px solid #2ecc71', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}>
              <Plus size={15} /> إضافة سيارة
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {cars.map((car, index) => (
              <div key={index} style={{ backgroundColor: '#111', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '16px', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ color: '#2ecc71', fontWeight: '700', fontSize: '0.85rem' }}>🚗 سيارة {index + 1}</span>
                  {cars.length > 1 && (
                    <button type="button" onClick={() => removeCar(index)} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#2d0f0f', color: '#ff4d4d', border: '1px solid #ff4d4d', borderRadius: '8px', padding: '5px 10px', cursor: 'pointer', fontSize: '0.8rem' }}>
                      <Trash2 size={13} /> حذف
                    </button>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>ماركة السيارة *</label>
                    <select value={car.car_make} onChange={(e) => loadModelsForCar(index, e.target.value)} style={inputStyle}>
                      <option value="">{loadingOptions ? 'جاري التحميل...' : `اختر (${carMakes.length})`}</option>
                      {carMakes.map(make => <option key={make} value={make}>{make}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>الموديل *</label>
                    <select value={car.car_model} onChange={(e) => updateCar(index, 'car_model', e.target.value)} style={{ ...inputStyle, opacity: !car.car_make ? 0.5 : 1 }} disabled={!car.car_make}>
                      <option value="">{!car.car_make ? 'اختر الماركة أولاً' : `اختر (${car.models.length})`}</option>
                      {car.models.map(model => <option key={model} value={model}>{model}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>من سنة</label>
                    <input type="number" placeholder="2015" value={car.year_from} onChange={(e) => updateCar(index, 'year_from', e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>إلى سنة</label>
                    <input type="number" placeholder="2024" value={car.year_to} onChange={(e) => updateCar(index, 'year_to', e.target.value)} style={inputStyle} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {cars.length > 1 && (
            <p style={{ color: '#888', fontSize: '0.8rem', marginTop: '8px' }}>
              سيتم إنشاء <strong style={{ color: '#2ecc71' }}>{cars.filter(c => c.car_make && c.car_model).length}</strong> منتج في الداتابيز (منتج لكل سيارة)
            </p>
          )}
        </div>

        {/* ── Submit ── */}
        <button
          type="submit"
          disabled={loading || uploading}
          style={{ gridColumn: 'span 2', padding: '18px', backgroundColor: loading || uploading ? '#1a6b3a' : '#2ecc71', color: '#000', fontWeight: '900', borderRadius: '10px', cursor: loading || uploading ? 'not-allowed' : 'pointer', marginTop: '20px', fontSize: '1.2rem', border: 'none' }}
        >
          {loading ? 'جاري الحفظ...' : uploading ? 'جاري رفع الصورة...' : cars.filter(c => c.car_make && c.car_model).length > 1 ? `حفظ القطعة لـ ${cars.filter(c => c.car_make && c.car_model).length} سيارات` : 'حفظ القطعة في المتجر'}
        </button>
      </form>
    </main>
  );
}

const labelStyle = { display: 'block', marginBottom: '8px', color: '#888', fontWeight: 'bold' } as const;
const inputStyle = { width: '100%', padding: '12px', backgroundColor: '#0a0a0a', border: '1px solid #333', color: '#fff', borderRadius: '8px', outline: 'none' } as const;
const addNewBtnStyle: any = { marginTop: '8px', background: 'none', border: 'none', color: '#2ecc71', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700', padding: '0', textDecoration: 'underline', display: 'block' };
const confirmBtnStyle: any = { background: '#2ecc71', color: '#000', border: 'none', borderRadius: '8px', padding: '10px 14px', cursor: 'pointer', fontWeight: '900', fontSize: '1rem', flexShrink: 0 };
const cancelBtnStyle: any = { background: '#2d0f0f', color: '#ff4d4d', border: '1px solid #ff4d4d', borderRadius: '8px', padding: '10px 14px', cursor: 'pointer', fontWeight: '900', fontSize: '1rem', flexShrink: 0 };
const selectedBadge: any = { marginTop: '6px', display: 'inline-block', background: '#0f2d1a', border: '1px solid #2ecc71', color: '#2ecc71', borderRadius: '6px', padding: '3px 10px', fontSize: '0.78rem', fontWeight: '700' };