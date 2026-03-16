'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AddProduct() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // ── Dynamic options from Supabase ─────────────────────────────────────────
  const [carMakes, setCarMakes] = useState<string[]>([]);
  const [carModels, setCarModels] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [formData, setFormData] = useState({
    name: '', brand: '', category: '', subcategory: '',
    car_make: '', car_model: '',
    year_from: '', year_to: '',
    regular_price: '', sale_price: '', image_url: '',
    country_of_origin: '', warranty: ''
  });

  // ── Load car makes and categories on mount ────────────────────────────────
  useEffect(() => {
    async function loadOptions() {
      setLoadingOptions(true);
      try {
        const { data } = await supabase
          .from('products')
          .select('car_make, category');

        if (data) {
          const makes = Array.from(
            new Set(data.map((p: any) => p.car_make?.trim()).filter(Boolean))
          ).sort() as string[];

          const cats = Array.from(
            new Set(data.map((p: any) => p.category?.trim()).filter(Boolean))
          ).sort() as string[];

          setCarMakes(makes);
          setCategories(cats);
        }
      } catch (err) {
        console.error('Error loading options:', err);
      } finally {
        setLoadingOptions(false);
      }
    }
    loadOptions();
  }, []);

  // ── Load car models when make changes ─────────────────────────────────────
  useEffect(() => {
    setCarModels([]);
    setFormData(prev => ({ ...prev, car_model: '' }));

    if (!formData.car_make) return;

    async function loadModels() {
      const { data } = await supabase
        .from('products')
        .select('car_model')
        .ilike('car_make', formData.car_make);

      if (data) {
        const models = Array.from(
          new Set(data.map((p: any) => p.car_model?.trim()).filter(Boolean))
        ).sort() as string[];
        setCarModels(models);
      }
    }
    loadModels();
  }, [formData.car_make]);

  // ── Load subcategories when category changes ──────────────────────────────
  useEffect(() => {
    setSubcategories([]);
    setFormData(prev => ({ ...prev, subcategory: '' }));

    if (!formData.category) return;

    async function loadSubcategories() {
      const { data } = await supabase
        .from('products')
        .select('subcategory')
        .ilike('category', formData.category);

      if (data) {
        const subs = Array.from(
          new Set(data.map((p: any) => p.subcategory?.trim()).filter(Boolean))
        ).sort() as string[];
        setSubcategories(subs);
      }
    }
    loadSubcategories();
  }, [formData.category]);

  // ── Cloudinary upload ─────────────────────────────────────────────────────
  const uploadToCloudinary = async (file: File) => {
    try {
      setUploading(true);
      const data = new FormData();
      data.append('file', file);
      data.append('upload_preset', 'zaitandfiltersnew');
      const res = await fetch('https://api.cloudinary.com/v1_1/dxtncdxfh/image/upload', { method: 'POST', body: data });
      const fileData = await res.json();
      if (fileData.secure_url) {
        setFormData(prev => ({ ...prev, image_url: fileData.secure_url }));
      }
    } catch (err) {
      alert('خطأ في الرفع');
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: any) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: any) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadToCloudinary(e.dataTransfer.files[0]);
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const modelYearRange = formData.year_from && formData.year_to
      ? `${formData.year_from}-${formData.year_to}`
      : (formData.year_from || formData.year_to || 'عام');

    const { error } = await supabase.from('products').insert([{
      ...formData,
      car_model_year: modelYearRange,
      regular_price: parseFloat(formData.regular_price),
      sale_price: formData.sale_price ? parseFloat(formData.sale_price) : null
    }]);

    if (error) alert(error.message);
    else {
      alert('تمت إضافة المنتج بنجاح لـ زيت أند فلترز!');
      router.push('/admin/dashboard');
    }
    setLoading(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <main style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '40px', direction: 'rtl', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#2ecc71', marginBottom: '30px', fontWeight: '900', fontStyle: 'italic' }}>
        إضافة صنف جديد - ZAIT &amp; FILTERS
      </h1>

      {loadingOptions && (
        <p style={{ color: '#888', marginBottom: '16px', fontSize: '0.9rem' }}>
          جاري تحميل بيانات المنتجات...
        </p>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', backgroundColor: '#0a0a0a', padding: '30px', borderRadius: '15px', border: '1px solid #222', maxWidth: '1000px', margin: '0 auto' }}>

        {/* Drag & Drop Image */}
        <div
          onDragEnter={handleDrag} onDragLeave={handleDrag}
          onDragOver={handleDrag} onDrop={handleDrop}
          style={{
            gridColumn: 'span 2',
            border: `2px dashed ${dragActive ? '#2ecc71' : '#333'}`,
            padding: '40px', textAlign: 'center', borderRadius: '15px',
            backgroundColor: dragActive ? '#0f2d1a' : '#050505',
          }}
        >
          {formData.image_url ? (
            <div>
              <img src={formData.image_url} alt="Preview" style={{ height: '150px', borderRadius: '10px' }} />
              <p style={{ color: '#2ecc71', marginTop: '10px' }}>✅ الصورة جاهزة</p>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, image_url: '' })}
                style={{ color: '#ff4d4d', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                تغيير الصورة
              </button>
            </div>
          ) : (
            <div>
              <p>{uploading ? 'جاري الرفع لـ Cloudinary...' : 'اسحب صورة المنتج هنا أو'}</p>
              <input
                type="file" accept="image/*"
                onChange={(e) => e.target.files && uploadToCloudinary(e.target.files[0])}
                style={{ marginTop: '10px' }}
              />
            </div>
          )}
        </div>

        {/* Name */}
        <div style={{ gridColumn: 'span 2' }}>
          <label style={labelStyle}>اسم القطعة *</label>
          <input
            required type="text" placeholder="مثال: طقم تيل فرامل"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            style={inputStyle}
          />
        </div>

        {/* Brand */}
        <div>
          <label style={labelStyle}>الماركة (Brand) *</label>
          <input
            required type="text" placeholder="مثال: Mobil 1"
            value={formData.brand}
            onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
            style={inputStyle}
          />
        </div>

        {/* Country of origin */}
        <div>
          <label style={labelStyle}>بلد المنشأ</label>
          <input
            type="text" placeholder="ألماني، صيني.."
            value={formData.country_of_origin}
            onChange={(e) => setFormData({ ...formData, country_of_origin: e.target.value })}
            style={inputStyle}
          />
        </div>

        {/* Category */}
        <div>
          <label style={labelStyle}>الفئة (Category) *</label>
          <select
            required
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            style={inputStyle}
          >
            <option value="">
              {loadingOptions ? 'جاري التحميل...' : `اختر الفئة (${categories.length} فئة)`}
            </option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Subcategory */}
        <div>
          <label style={labelStyle}>
            القسم الفرعي (Subcategory)
            {formData.category && subcategories.length === 0 && (
              <span style={{ color: '#888', fontWeight: '400', marginRight: '8px', fontSize: '0.8rem' }}>
                (لا يوجد أقسام فرعية لهذه الفئة)
              </span>
            )}
          </label>
          <select
            value={formData.subcategory}
            onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
            style={{ ...inputStyle, opacity: !formData.category || subcategories.length === 0 ? 0.5 : 1 }}
            disabled={!formData.category || subcategories.length === 0}
          >
            <option value="">
              {!formData.category
                ? 'اختر الفئة أولاً'
                : subcategories.length === 0
                ? 'لا يوجد أقسام فرعية'
                : `اختر القسم (${subcategories.length} قسم)`}
            </option>
            {subcategories.map(sub => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>
        </div>

        {/* Car make */}
        <div>
          <label style={labelStyle}>ماركة السيارة *</label>
          <select
            required
            value={formData.car_make}
            onChange={(e) => setFormData({ ...formData, car_make: e.target.value, car_model: '' })}
            style={inputStyle}
          >
            <option value="">
              {loadingOptions ? 'جاري التحميل...' : `اختر الماركة (${carMakes.length} ماركة)`}
            </option>
            {carMakes.map(make => (
              <option key={make} value={make}>{make}</option>
            ))}
          </select>
        </div>

        {/* Car model */}
        <div>
          <label style={labelStyle}>
            الموديل *
            {formData.car_make && carModels.length === 0 && (
              <span style={{ color: '#888', fontWeight: '400', marginRight: '8px', fontSize: '0.8rem' }}>
                (جاري التحميل...)
              </span>
            )}
          </label>
          <select
            required
            value={formData.car_model}
            onChange={(e) => setFormData({ ...formData, car_model: e.target.value })}
            style={{ ...inputStyle, opacity: !formData.car_make ? 0.5 : 1 }}
            disabled={!formData.car_make}
          >
            <option value="">
              {!formData.car_make
                ? 'اختر الماركة أولاً'
                : `اختر الموديل (${carModels.length} موديل)`}
            </option>
            {carModels.map(model => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
        </div>

        {/* Year from */}
        <div>
          <label style={labelStyle}>من سنة (مثل: 2015)</label>
          <input
            type="number" placeholder="YYYY"
            value={formData.year_from}
            onChange={(e) => setFormData({ ...formData, year_from: e.target.value })}
            style={inputStyle}
          />
        </div>

        {/* Year to */}
        <div>
          <label style={labelStyle}>إلى سنة (مثل: 2024)</label>
          <input
            type="number" placeholder="YYYY"
            value={formData.year_to}
            onChange={(e) => setFormData({ ...formData, year_to: e.target.value })}
            style={inputStyle}
          />
        </div>

        {/* Regular price */}
        <div>
          <label style={labelStyle}>السعر الأساسي * (ج.م)</label>
          <input
            required type="number"
            value={formData.regular_price}
            onChange={(e) => setFormData({ ...formData, regular_price: e.target.value })}
            style={inputStyle}
          />
        </div>

        {/* Sale price */}
        <div>
          <label style={labelStyle}>سعر الخصم (ج.م)</label>
          <input
            type="number"
            value={formData.sale_price}
            onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
            style={inputStyle}
          />
        </div>

        {/* Warranty */}
        <div style={{ gridColumn: 'span 2' }}>
          <label style={labelStyle}>الضمان</label>
          <input
            type="text" placeholder="مثال: سنة، 6 أشهر"
            value={formData.warranty}
            onChange={(e) => setFormData({ ...formData, warranty: e.target.value })}
            style={inputStyle}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || uploading}
          style={{
            gridColumn: 'span 2', padding: '18px',
            backgroundColor: loading || uploading ? '#1a6b3a' : '#2ecc71',
            color: '#000', fontWeight: '900', borderRadius: '10px',
            cursor: loading || uploading ? 'not-allowed' : 'pointer',
            marginTop: '20px', fontSize: '1.2rem', border: 'none',
            transition: 'background-color 0.2s',
          }}
        >
          {loading ? 'جاري الحفظ...' : uploading ? 'جاري رفع الصورة...' : 'حفظ القطعة في المتجر'}
        </button>
      </form>
    </main>
  );
}

const labelStyle = { display: 'block', marginBottom: '8px', color: '#888', fontWeight: 'bold' } as const;
const inputStyle = { width: '100%', padding: '12px', backgroundColor: '#111', border: '1px solid #333', color: '#fff', borderRadius: '8px', outline: 'none' } as const;