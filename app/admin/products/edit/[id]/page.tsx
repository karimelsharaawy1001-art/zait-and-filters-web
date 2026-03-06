'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';
import { Save, ArrowRight, Loader2, Image as ImageIcon, Car, Tag, Globe, Upload, Plus, X } from 'lucide-react';

interface CarRow {
  id?: string;
  car_make: string;
  car_model: string;
  car_model_year: string;
  isNew?: boolean;
}

export default function EditProduct() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [options, setOptions] = useState({
    makes: [] as string[],
    categories: [] as string[],
    subcategories: [] as string[]
  });

  const [modelsByMake, setModelsByMake] = useState<Record<string, string[]>>({});

  const [formData, setFormData] = useState({
    name: '', brand: '', category: '', subcategory: '',
    regular_price: '', sale_price: '', image_url: '',
    is_active: true, country_of_origin: ''
  });

  const [carRows, setCarRows] = useState<CarRow[]>([]);

  useEffect(() => {
    if (id) {
      fetchProduct();
      fetchFilterOptions();
    }
  }, [id]);

  async function fetchFilterOptions() {
    const { data } = await supabase.from('products').select('car_make, car_model, category, subcategory');
    if (data) {
      const getUnique = (field: string) =>
        Array.from(new Set(data.map((i: any) => i[field]).filter(Boolean))).sort() as string[];

      const map: Record<string, Set<string>> = {};
      data.forEach((item: any) => {
        if (item.car_make && item.car_model) {
          if (!map[item.car_make]) map[item.car_make] = new Set();
          map[item.car_make].add(item.car_model);
        }
      });
      const sortedMap: Record<string, string[]> = {};
      Object.entries(map).forEach(([make, models]) => {
        sortedMap[make] = Array.from(models).sort();
      });
      setModelsByMake(sortedMap);

      setOptions({
        makes: getUnique('car_make'),
        categories: getUnique('category'),
        subcategories: getUnique('subcategory')
      });
    }
  }

  async function fetchProduct() {
    setLoading(true);
    const [{ data }, { data: compat, error: compatError }] = await Promise.all([
      supabase.from('products').select('*').eq('id', id).single(),
      supabase.from('product_car_compatibility').select('*').eq('product_id', id).order('created_at'),
    ]);

    if (compatError) {
      console.error('Compat fetch error:', compatError.message);
    }

    if (data) {
      setFormData({
        name: data.name || '',
        brand: data.brand || '',
        category: data.category || '',
        subcategory: data.subcategory || '',
        regular_price: data.regular_price?.toString() || '',
        sale_price: data.sale_price?.toString() || '',
        image_url: data.image_url || '',
        is_active: data.is_active ?? true,
        country_of_origin: data.country_of_origin || '',
      });

      if (compat && compat.length > 0) {
        setCarRows(compat.map((c: any) => ({
          id: c.id,
          car_make: c.car_make || '',
          car_model: c.car_model || '',
          car_model_year: c.car_model_year || '',
        })));
      } else if (data.car_make) {
        // Seed from legacy product columns so existing data isn't lost
        setCarRows([{
          car_make: data.car_make || '',
          car_model: data.car_model || '',
          car_model_year: data.car_model_year || '',
          isNew: true,
        }]);
      }
    }

    setLoading(false);
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = e.target.files?.[0];
      if (!file) return;
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `products/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('product-images').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(filePath);
      setFormData(prev => ({ ...prev, image_url: publicUrl }));
    } catch (error: any) {
      alert('خطأ في الرفع: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const addCarRow = () => {
    setCarRows(prev => [...prev, { car_make: '', car_model: '', car_model_year: '', isNew: true }]);
  };

  const updateCarRow = (index: number, field: keyof CarRow, value: string) => {
    setCarRows(prev => prev.map((row, i) => {
      if (i !== index) return row;
      if (field === 'car_make') return { ...row, car_make: value, car_model: '' };
      return { ...row, [field]: value };
    }));
  };

  const removeCarRow = (index: number) => {
    setCarRows(prev => prev.filter((_, i) => i !== index));
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);

    try {
      const firstCar = carRows[0];

      // 1. Update main product row
      const { error: updateError } = await supabase
        .from('products')
        .update({
          name: formData.name,
          brand: formData.brand,
          category: formData.category,
          subcategory: formData.subcategory,
          regular_price: formData.regular_price ? parseFloat(formData.regular_price) : null,
          sale_price: formData.sale_price ? parseFloat(formData.sale_price) : null,
          image_url: formData.image_url,
          is_active: formData.is_active,
          country_of_origin: formData.country_of_origin,
          car_make: firstCar?.car_make || null,
          car_model: firstCar?.car_model || null,
          car_model_year: firstCar?.car_model_year || null,
        })
        .eq('id', id);

      if (updateError) throw new Error('خطأ في تحديث المنتج: ' + updateError.message);

      // 2. Delete all existing compat rows then re-insert fresh
      //    (delete+insert is simpler and more reliable than upsert)
      const { error: delError } = await supabase
        .from('product_car_compatibility')
        .delete()
        .eq('product_id', id);

      if (delError) throw new Error('خطأ في حذف التوافقات القديمة: ' + delError.message);

      // 3. Bulk insert valid rows
      const validRows = carRows.filter(r => r.car_make?.trim());
      if (validRows.length > 0) {
        const { error: insertError } = await supabase
          .from('product_car_compatibility')
          .insert(
            validRows.map(r => ({
              product_id: id,
              car_make: r.car_make.trim(),
              car_model: r.car_model.trim(),
              car_model_year: r.car_model_year.trim(),
            }))
          );

        if (insertError) throw new Error('خطأ في حفظ توافق السيارات: ' + insertError.message);
      }

      alert('✅ تم حفظ البيانات بنجاح');
      router.push('/admin/products');

    } catch (err: any) {
      console.error('Save error:', err);
      setSaveError(err.message);
      alert('❌ ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div style={fullPageCenter}>
      <Loader2 className="animate-spin" size={40} color="#2ecc71" />
    </div>
  );

  return (
    <div style={{ direction: 'rtl', color: '#fff', fontFamily: 'sans-serif', padding: '40px 20px', backgroundColor: '#050505', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '40px' }}>
          <button onClick={() => router.back()} style={backBtnStyle}><ArrowRight size={20} /></button>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '900', color: '#2ecc71' }}>تعديل بيانات الصنف</h1>
        </div>

        {/* Error banner */}
        {saveError && (
          <div style={{ background: '#2a0a0a', border: '1px solid #ff4d4d', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', color: '#ff4d4d', fontSize: '0.9rem', fontWeight: '700' }}>
            ❌ {saveError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={gridContainer}>

            {/* ── التصنيف والبراند ── */}
            <section style={formSection}>
              <h3 style={sectionTitle}><Tag size={18} /> التصنيف والبراند</h3>
              <div style={inputGroup}>
                <label style={labelStyle}>اسم المنتج</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} style={inputStyle} required />
              </div>
              <div style={inputGroup}>
                <label style={labelStyle}>الماركة المصنعة (Brand)</label>
                <input type="text" value={formData.brand} onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={inputGroup}>
                  <label style={labelStyle}>القسم الرئيسي</label>
                  <select value={formData.category} onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))} style={inputStyle}>
                    <option value="">اختر القسم</option>
                    {options.categories.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div style={inputGroup}>
                  <label style={labelStyle}>القسم الفرعي</label>
                  <select value={formData.subcategory} onChange={(e) => setFormData(prev => ({ ...prev, subcategory: e.target.value }))} style={inputStyle}>
                    <option value="">اختر الفرعي</option>
                    {options.subcategories.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>
            </section>

            {/* ── التسعير والمنشأ ── */}
            <section style={formSection}>
              <h3 style={sectionTitle}><Globe size={18} /> التسعير والمنشأ</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={inputGroup}>
                  <label style={labelStyle}>السعر الأساسي</label>
                  <input type="number" value={formData.regular_price} onChange={(e) => setFormData(prev => ({ ...prev, regular_price: e.target.value }))} style={inputStyle} />
                </div>
                <div style={inputGroup}>
                  <label style={labelStyle}>سعر الخصم</label>
                  <input type="number" value={formData.sale_price} onChange={(e) => setFormData(prev => ({ ...prev, sale_price: e.target.value }))} style={inputStyle} />
                </div>
              </div>
              <div style={inputGroup}>
                <label style={labelStyle}>بلد المنشأ</label>
                <input type="text" value={formData.country_of_origin} onChange={(e) => setFormData(prev => ({ ...prev, country_of_origin: e.target.value }))} style={inputStyle} />
              </div>
              <div style={inputGroup}>
                <label style={labelStyle}>الحالة</label>
                <select value={formData.is_active ? '1' : '0'} onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.value === '1' }))} style={inputStyle}>
                  <option value="1">نشط</option>
                  <option value="0">غير نشط</option>
                </select>
              </div>
            </section>

            {/* ── الصورة ── */}
            <section style={formSection}>
              <h3 style={sectionTitle}><ImageIcon size={18} /> صورة المنتج</h3>
              <div style={uploadContainer}>
                {formData.image_url && <img src={formData.image_url} style={previewImage} alt="Preview" />}
                <label style={uploadLabel}>
                  {uploading ? <Loader2 className="animate-spin" /> : <Upload size={20} />}
                  {uploading ? 'جاري الرفع...' : 'رفع صورة من الجهاز'}
                  <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                </label>
                <input type="text" value={formData.image_url} placeholder="أو ضع رابط خارجي" onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))} style={{ ...inputStyle, marginTop: '10px' }} />
              </div>
            </section>

          </div>

          {/* ── توافق السيارات ── */}
          <section style={{ ...formSection, marginBottom: '30px' }}>
            <h3 style={sectionTitle}><Car size={18} /> توافق السيارات</h3>
            <p style={{ fontSize: '0.78rem', color: '#555', marginBottom: '16px', fontWeight: '600' }}>
              يمكنك إضافة أكثر من سيارة لنفس المنتج. السيارة الأولى ستُستخدم كقيمة رئيسية.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 36px', gap: '8px', marginBottom: '6px', padding: '0 4px' }}>
              {['ماركة السيارة', 'الموديل', 'السنة', ''].map((h, i) => (
                <div key={i} style={{ fontSize: '0.72rem', fontWeight: '700', color: '#555' }}>{h}</div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {carRows.map((row, index) => {
                const availableModels = row.car_make ? (modelsByMake[row.car_make] || []) : [];
                const modelOptions = availableModels.includes(row.car_model) || !row.car_model
                  ? availableModels
                  : [row.car_model, ...availableModels];

                return (
                  <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 36px', gap: '8px', alignItems: 'center' }}>
                    <select
                      value={row.car_make}
                      onChange={(e) => updateCarRow(index, 'car_make', e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">اختر الماركة</option>
                      {options.makes.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>

                    <select
                      value={row.car_model}
                      onChange={(e) => updateCarRow(index, 'car_model', e.target.value)}
                      disabled={!row.car_make}
                      style={{ ...inputStyle, opacity: !row.car_make ? 0.4 : 1, cursor: !row.car_make ? 'not-allowed' : 'pointer' }}
                    >
                      <option value="">{!row.car_make ? 'اختر الماركة أولاً' : 'اختر الموديل'}</option>
                      {modelOptions.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>

                    <input
                      type="text"
                      placeholder="مثال: 2010-2020"
                      value={row.car_model_year}
                      onChange={(e) => updateCarRow(index, 'car_model_year', e.target.value)}
                      style={inputStyle}
                    />

                    <button
                      type="button"
                      onClick={() => removeCarRow(index)}
                      style={{ background: '#1a0a0a', border: '1px solid #333', borderRadius: '8px', color: '#ff4d4d', cursor: 'pointer', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
            </div>

            {carRows.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: '#444', fontSize: '0.85rem', border: '1px dashed #222', borderRadius: '10px', marginBottom: '8px' }}>
                لا توجد سيارات مضافة — اضغط الزر أدناه لإضافة أولى
              </div>
            )}

            <button
              type="button"
              onClick={addCarRow}
              style={{ marginTop: '12px', padding: '10px 20px', background: '#0a1a0a', border: '1px dashed #2ecc71', borderRadius: '10px', color: '#2ecc71', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Plus size={16} /> إضافة سيارة أخرى
            </button>
          </section>

          <button type="submit" disabled={saving} style={saveBtnStyle}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            {saving ? 'جاري الحفظ...' : 'حفظ التعديلات النهائية'}
          </button>
        </form>
      </div>
    </div>
  );
}

const gridContainer = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '25px', marginBottom: '25px' };
const formSection: any = { backgroundColor: '#0a0a0a', padding: '25px', borderRadius: '16px', border: '1px solid #1a1a1a' };
const sectionTitle: any = { fontSize: '1rem', fontWeight: 'bold', marginBottom: '20px', color: '#2ecc71', display: 'flex', alignItems: 'center', gap: '10px' };
const inputGroup = { marginBottom: '18px' };
const labelStyle: any = { display: 'block', fontSize: '0.8rem', color: '#666', marginBottom: '8px' };
const inputStyle: any = { width: '100%', padding: '10px 12px', backgroundColor: '#000', border: '1px solid #222', borderRadius: '10px', color: '#fff', outline: 'none', fontSize: '0.85rem' };
const uploadContainer: any = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '15px', border: '2px dashed #222', borderRadius: '12px' };
const uploadLabel: any = { cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', color: '#2ecc71', fontWeight: 'bold', fontSize: '0.9rem' };
const previewImage: any = { width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #333' };
const saveBtnStyle: any = { width: '100%', padding: '18px', backgroundColor: '#2ecc71', color: '#000', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', fontSize: '1rem' };
const backBtnStyle: any = { backgroundColor: '#111', border: '1px solid #222', borderRadius: '10px', padding: '10px', color: '#fff', cursor: 'pointer' };
const fullPageCenter: any = { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#050505' };