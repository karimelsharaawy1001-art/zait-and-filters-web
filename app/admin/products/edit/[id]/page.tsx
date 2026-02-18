'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';
import { Save, ArrowRight, Loader2, Image as ImageIcon, Car, Tag, Globe, Upload } from 'lucide-react';



export default function EditProduct() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [options, setOptions] = useState({
    makes: [] as string[],
    models: [] as string[],
    categories: [] as string[],
    subcategories: [] as string[]
  });

  const [formData, setFormData] = useState({
    name: '', brand: '', category: '', subcategory: '',
    car_make: '', car_model: '', car_model_year: '',
    regular_price: '', sale_price: '', image_url: '',
    is_active: true, country_of_origin: ''
  });



  useEffect(() => {
    if (id) {
      fetchProduct();
      fetchFilterOptions();
    }
  }, [id]);



  async function fetchFilterOptions() {
    const { data } = await supabase.from('products').select('car_make, car_model, category, subcategory');
    if (data) {
      const getUnique = (field: string) => Array.from(new Set(data.map((i: any) => i[field]).filter(Boolean))).sort() as string[];
      setOptions({
        makes: getUnique('car_make'),
        models: getUnique('car_model'),
        categories: getUnique('category'),
        subcategories: getUnique('subcategory')
      });
    }
  }



  async function fetchProduct() {
    setLoading(true);
    const { data } = await supabase.from('products').select('*').eq('id', id).single();
    if (data) {
      setFormData({
        ...data,
        regular_price: data.regular_price?.toString() || '',
        sale_price: data.sale_price?.toString() || '',
      });
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

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      setFormData({ ...formData, image_url: publicUrl });
    } catch (error: any) {
      alert('خطأ في الرفع: ' + error.message);
    } finally {
      setUploading(false);
    }
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('products').update({
      ...formData,
      regular_price: parseFloat(formData.regular_price),
      sale_price: formData.sale_price ? parseFloat(formData.sale_price) : null,
    }).eq('id', id);

    if (!error) {
      alert('✅ تم حفظ البيانات');
      router.push('/admin/products');
    }
    setSaving(false);
  };



  if (loading) return <div style={fullPageCenter}><Loader2 className="animate-spin" size={40} color="#2ecc71" /></div>;



  return (
    <div style={{ direction: 'rtl', color: '#fff', fontFamily: 'sans-serif', padding: '40px 20px', backgroundColor: '#050505', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '40px' }}>
          <button onClick={() => router.back()} style={backBtnStyle}><ArrowRight size={20} /></button>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '900', color: '#2ecc71' }}>تعديل بيانات الصنف</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={gridContainer}>
            
            {/* معلومات المنتج والبراند */}
            <section style={formSection}>
              <h3 style={sectionTitle}><Tag size={18} /> التصنيف والبراند</h3>
              <div style={inputGroup}>
                <label style={labelStyle}>اسم المنتج</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} style={inputStyle} required />
              </div>
              <div style={inputGroup}>
                <label style={labelStyle}>الماركة المصنعة (Brand)</label>
                <input type="text" value={formData.brand} onChange={(e) => setFormData({...formData, brand: e.target.value})} style={inputStyle} placeholder="أدخل الماركة..." />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={inputGroup}>
                  <label style={labelStyle}>القسم الرئيسي</label>
                  <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} style={inputStyle}>
                    <option value="">اختر القسم</option>
                    {options.categories.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div style={inputGroup}>
                  <label style={labelStyle}>القسم الفرعي</label>
                  <select value={formData.subcategory} onChange={(e) => setFormData({...formData, subcategory: e.target.value})} style={inputStyle}>
                    <option value="">اختر الفرعي</option>
                    {options.subcategories.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>
            </section>

            {/* السيارة والسنة */}
            <section style={formSection}>
              <h3 style={sectionTitle}><Car size={18} /> توافق السيارة</h3>
              <div style={inputGroup}>
                <label style={labelStyle}>ماركة السيارة</label>
                <select value={formData.car_make} onChange={(e) => setFormData({...formData, car_make: e.target.value})} style={inputStyle}>
                  <option value="">اختر الماركة</option>
                  {options.makes.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div style={inputGroup}>
                <label style={labelStyle}>الموديل</label>
                <select value={formData.car_model} onChange={(e) => setFormData({...formData, car_model: e.target.value})} style={inputStyle}>
                  <option value="">اختر الموديل</option>
                  {options.models.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div style={inputGroup}>
                <label style={labelStyle}>سنة الموديل</label>
                <input type="text" value={formData.car_model_year} onChange={(e) => setFormData({...formData, car_model_year: e.target.value})} style={inputStyle} placeholder="مثال: 2010-2015" />
              </div>
            </section>

            {/* التسعير والمنشأ */}
            <section style={formSection}>
              <h3 style={sectionTitle}><Globe size={18} /> التسعير والمنشأ</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={inputGroup}>
                  <label style={labelStyle}>السعر الأساسي</label>
                  <input type="number" value={formData.regular_price} onChange={(e) => setFormData({...formData, regular_price: e.target.value})} style={inputStyle} />
                </div>
                <div style={inputGroup}>
                  <label style={labelStyle}>سعر الخصم</label>
                  <input type="number" value={formData.sale_price} onChange={(e) => setFormData({...formData, sale_price: e.target.value})} style={inputStyle} />
                </div>
              </div>
              <div style={inputGroup}>
                <label style={labelStyle}>بلد المنشأ</label>
                <input type="text" value={formData.country_of_origin} onChange={(e) => setFormData({...formData, country_of_origin: e.target.value})} style={inputStyle} />
              </div>
            </section>

            {/* الصورة */}
            <section style={formSection}>
              <h3 style={sectionTitle}><ImageIcon size={18} /> صورة المنتج</h3>
              <div style={uploadContainer}>
                {formData.image_url && <img src={formData.image_url} style={previewImage} alt="Preview" />}
                <label style={uploadLabel}>
                  {uploading ? <Loader2 className="animate-spin" /> : <Upload size={20} />}
                  {uploading ? 'جاري الرفع...' : 'رفع صورة من الجهاز'}
                  <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                </label>
                <input type="text" value={formData.image_url} placeholder="أو ضع رابط خارجي مباشر" onChange={(e) => setFormData({...formData, image_url: e.target.value})} style={{ ...inputStyle, marginTop: '10px' }} />
              </div>
            </section>

          </div>

          <button type="submit" disabled={saving} style={saveBtnStyle}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            {saving ? 'جاري الحفظ...' : 'حفظ التعديلات النهائية'}
          </button>
        </form>
      </div>
    </div>
  );
}



// الستايلات
const gridContainer = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '25px', marginBottom: '40px' };
const formSection = { backgroundColor: '#0a0a0a', padding: '25px', borderRadius: '16px', border: '1px solid #1a1a1a' };
const sectionTitle = { fontSize: '1rem', fontWeight: 'bold', marginBottom: '20px', color: '#2ecc71', display: 'flex', alignItems: 'center', gap: '10px' };
const inputGroup = { marginBottom: '18px' };
const labelStyle = { display: 'block', fontSize: '0.8rem', color: '#666', marginBottom: '8px' };
const inputStyle = { width: '100%', padding: '12px 15px', backgroundColor: '#000', border: '1px solid #222', borderRadius: '10px', color: '#fff', outline: 'none' };
const uploadContainer = { display: 'flex', flexDirection: 'column' as 'column', alignItems: 'center', gap: '10px', padding: '15px', border: '2px dashed #222', borderRadius: '12px' };
const uploadLabel = { cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', color: '#2ecc71', fontWeight: 'bold', fontSize: '0.9rem' };
const previewImage = { width: '100px', height: '100px', objectFit: 'cover' as 'cover', borderRadius: '8px', border: '1px solid #333' };
const saveBtnStyle = { width: '100%', padding: '18px', backgroundColor: '#2ecc71', color: '#000', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' };
const backBtnStyle = { backgroundColor: '#111', border: '1px solid #222', borderRadius: '10px', padding: '10px', color: '#fff', cursor: 'pointer' };
const fullPageCenter = { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#050505' };
