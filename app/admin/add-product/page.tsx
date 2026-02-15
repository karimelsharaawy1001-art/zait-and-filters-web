'use client';
import { useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useRouter } from 'next/navigation';

const CAR_DATA: { [key: string]: string[] } = {
  'نيسان': ['صني', 'قشقاي', 'سنترا', 'جوك', 'تيدا', 'إكس تريل'],
  'تويوتا': ['كورولا', 'ياريس', 'سي اتش آر', 'فورتشنر', 'لاند كروزر'],
  'هيونداي': ['إلنترا', 'أكسنت', 'توسان', 'بايون', 'كريتا', 'I10', 'I20'],
  'كيا': ['سيراتو', 'سبورتج', 'بيكانتو', 'ريو', 'إكسيد'],
  'ميتسوبيشي': ['لانسر', 'إكليبس', 'أتراج', 'إكسباندر'],
  'مرسيدس': ['C-Class', 'E-Class', 'S-Class', 'GLC'],
  'بي إم دبليو': ['X1', 'X3', 'X5', '3 Series', '5 Series'],
  'رينو': ['لوجان', 'داستر', 'كادجار', 'ميجان'],
  'شيري': ['أريزو', 'تيجو 3', 'تيجو 7', 'تيجو 8'],
  'MG': ['MG5', 'MG6', 'ZS', 'RX5', 'HS']
};

export default function AddProduct() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '', brand: '', category: '', subcategory: '',
    car_make: '', car_model: '', 
    year_from: '', year_to: '',
    regular_price: '', sale_price: '', image_url: '',
    country_of_origin: '', warranty: ''
  });

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
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: any) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadToCloudinary(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // دمج السنين: لو كتب "2015" و "2020" تطلع "2015-2020"
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

  return (
    <main style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '40px', direction: 'rtl', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#2ecc71', marginBottom: '30px', fontWeight: '900', fontStyle: 'italic' }}>إضافة صنف جديد - ZAIT & FILTERS</h1>
      
      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', backgroundColor: '#0a0a0a', padding: '30px', borderRadius: '15px', border: '1px solid #222', maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* منطقة الـ Drag & Drop */}
        <div onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
          style={{ 
            gridColumn: 'span 2', border: `2px dashed ${dragActive ? '#2ecc71' : '#333'}`, 
            padding: '40px', textAlign: 'center', borderRadius: '15px', backgroundColor: dragActive ? '#0f2d1a' : '#050505'
          }}>
          {formData.image_url ? (
            <div>
              <img src={formData.image_url} alt="Preview" style={{ height: '150px', borderRadius: '10px' }} />
              <p style={{ color: '#2ecc71', marginTop: '10px' }}>✅ الصورة جاهزة</p>
              <button type="button" onClick={() => setFormData({...formData, image_url: ''})} style={{color: '#ff4d4d', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline'}}>تغيير الصورة</button>
            </div>
          ) : (
            <div>
              <p>{uploading ? 'جاري الرفع لـ Cloudinary...' : 'اسحب صورة المنتج هنا أو'}</p>
              <input type="file" accept="image/*" onChange={(e) => e.target.files && uploadToCloudinary(e.target.files[0])} style={{ marginTop: '10px' }} />
            </div>
          )}
        </div>

        <div style={{ gridColumn: 'span 2' }}>
          <label style={labelStyle}>اسم القطعة *</label>
          <input required type="text" placeholder="مثال: طقم تيل فرامل" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>الماركة (Brand) *</label>
          <input required type="text" placeholder="مثال: Mobil 1" value={formData.brand} onChange={(e) => setFormData({...formData, brand: e.target.value})} style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>بلد المنشأ</label>
          <input type="text" placeholder="ألماني، صيني.." value={formData.country_of_origin} onChange={(e) => setFormData({...formData, country_of_origin: e.target.value})} style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>ماركة السيارة *</label>
          <select required value={formData.car_make} onChange={(e) => setFormData({...formData, car_make: e.target.value, car_model: ''})} style={inputStyle}>
            <option value="">اختر الماركة</option>
            {Object.keys(CAR_DATA).map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div>
          <label style={labelStyle}>الموديل *</label>
          <select required value={formData.car_model} onChange={(e) => setFormData({...formData, car_model: e.target.value})} style={inputStyle} disabled={!formData.car_make}>
            <option value="">اختر الموديل</option>
            {formData.car_make && CAR_DATA[formData.car_make].map(mod => <option key={mod} value={mod}>{mod}</option>)}
          </select>
        </div>

        {/* إدخال السنين يدويًّا */}
        <div>
          <label style={labelStyle}>من سنة (مثل: 2015)</label>
          <input type="number" placeholder="YYYY" value={formData.year_from} onChange={(e) => setFormData({...formData, year_from: e.target.value})} style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>إلى سنة (مثل: 2024)</label>
          <input type="number" placeholder="YYYY" value={formData.year_to} onChange={(e) => setFormData({...formData, year_to: e.target.value})} style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>السعر الأساسي *</label>
          <input required type="number" value={formData.regular_price} onChange={(e) => setFormData({...formData, regular_price: e.target.value})} style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>سعر الخصم</label>
          <input type="number" value={formData.sale_price} onChange={(e) => setFormData({...formData, sale_price: e.target.value})} style={inputStyle} />
        </div>

        <button type="submit" disabled={loading || uploading} style={{ gridColumn: 'span 2', padding: '18px', backgroundColor: '#2ecc71', color: '#000', fontWeight: '900', borderRadius: '10px', cursor: 'pointer', marginTop: '20px', fontSize: '1.2rem', border: 'none' }}>
          {loading ? 'جاري الحفظ...' : 'حفظ القطعة في المتجر'}
        </button>
      </form>
    </main>
  );
}

const labelStyle = { display: 'block', marginBottom: '8px', color: '#888', fontWeight: 'bold' };
const inputStyle = { width: '100%', padding: '12px', backgroundColor: '#111', border: '1px solid #333', color: '#fff', borderRadius: '8px', outline: 'none' };