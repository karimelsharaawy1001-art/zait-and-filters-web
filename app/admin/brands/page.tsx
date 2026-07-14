'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import { Trash2, Upload, Image as ImageIcon, Save, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';


export default function AdminBrands() {
  const [brands, setBrands] = useState<any[]>([]);       // car_brands
  const [partBrands, setPartBrands] = useState<any[]>([]); // part_brands (parts-manufacturer logos in the homepage ribbon)
  const [logoUrlInput, setLogoUrlInput] = useState<{ [key: string]: string }>({});
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    syncAndFetchBrands();
  }, []);


  async function syncAndFetchBrands() {
    setLoading(true);
    try {
      const { data: productsData } = await supabase.from('products').select('car_make');
      const uniqueMakes = Array.from(new Set(productsData?.map(p => p.car_make).filter(Boolean)));

      if (uniqueMakes.length > 0) {
        const insertData = uniqueMakes.map(make => ({ name: make }));
        await supabase.from('car_brands').upsert(insertData, { onConflict: 'name' });
      }

      const { data: brandsData } = await supabase.from('car_brands').select('*').order('name');
      if (brandsData) setBrands(brandsData);

      const { data: partData } = await supabase.from('part_brands').select('*').order('name');
      if (partData) setPartBrands(partData);

    } catch (error) {
      console.error("Sync error:", error);
      toast.error("فشل مزامنة الماركات");
    } finally {
      setLoading(false);
    }
  }


  async function saveLogoLink(table: string, setter: any, brandId: number, brandName: string) {
    const url = logoUrlInput[`${table}:${brandId}`]?.trim();
    if (!url || !url.startsWith('http')) {
      toast.error('يرجى إدخال رابط صحيح يبدأ بـ http');
      return;
    }
    try {
      const { error } = await supabase.from(table).update({ logo_url: url }).eq('id', brandId);
      if (error) throw error;
      toast.success(`تم حفظ لوجو ${brandName} بنجاح`);
      setter((prev: any[]) => prev.map(b => b.id === brandId ? { ...b, logo_url: url } : b));
      setLogoUrlInput(prev => ({ ...prev, [`${table}:${brandId}`]: '' }));
    } catch (error: any) {
      toast.error('فشل الحفظ: ' + error.message);
    }
  }


  async function handleLogoUpload(table: string, setter: any, e: any, brandName: string, brandId: number) {
    try {
      setUploading(true);
      const file = e.target.files[0];
      const fileName = `${brandName}-${Date.now()}.${file.name.split('.').pop()}`;
      const filePath = `logos/${fileName}`;

      let { error: uploadError } = await supabase.storage.from('brand-assets').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('brand-assets').getPublicUrl(filePath);

      await supabase.from(table).update({ logo_url: publicUrl }).eq('id', brandId);
      setter((prev: any[]) => prev.map(b => b.id === brandId ? { ...b, logo_url: publicUrl } : b));
      toast.success('تم الرفع والحفظ بنجاح');
    } catch (error) {
      toast.error('خطأ في الرفع');
    } finally {
      setUploading(false);
    }
  }

  function renderBrandGrid(list: any[], table: string, setter: any) {
    return (
      <div style={grid}>
        {list.map(brand => (
          <div key={brand.id} style={brandCard}>
            <div style={logoWrapper}>
              {brand.logo_url ? (
                <img src={brand.logo_url} alt="" style={logoImg} key={brand.logo_url} />
              ) : (
                <ImageIcon size={40} color="#333" />
              )}
            </div>
            <h3 style={brandName}>{brand.name}</h3>

            <div style={actionsColumn}>
              <div style={linkInputWrapper}>
                <input
                  type="text" placeholder="ضع رابط اللوجو هنا..." style={miniInput}
                  value={logoUrlInput[`${table}:${brand.id}`] || ''}
                  onChange={(e) => setLogoUrlInput({ ...logoUrlInput, [`${table}:${brand.id}`]: e.target.value })}
                />
                <button onClick={() => saveLogoLink(table, setter, brand.id, brand.name)} style={saveBtn} title="حفظ الرابط">
                  <Save size={14} />
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                <label style={uploadBtn}>
                  <Upload size={14} /> {uploading ? '...' : 'رفع ملف'}
                  <input type="file" hidden onChange={(e) => handleLogoUpload(table, setter, e, brand.name, brand.id)} />
                </label>
                <button onClick={async () => {
                  if (confirm('هل تريد حذف هذه الماركة من القائمة؟ (لن يتم حذف المنتجات)')) {
                    await supabase.from(table).delete().eq('id', brand.id);
                    setter((prev: any[]) => prev.filter(b => b.id !== brand.id));
                  }
                }} style={delBtn}><Trash2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }


  return (
    <div style={container}>
      <div style={header}>
        <h1 style={title}>إدارة الماركات النشطة</h1>
        <button onClick={syncAndFetchBrands} style={syncBtn} title="مزامنة مع المنتجات">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> تحديث القائمة
        </button>
      </div>

      <h2 style={sectionTitle}>🚗 ماركات السيارات</h2>
      {renderBrandGrid(brands, 'car_brands', setBrands)}

      <h2 style={{ ...sectionTitle, marginTop: '40px' }}>🛠️ ماركات قطع الغيار (شريط الماركات المتحرك)</h2>
      <p style={{ color: '#888', fontSize: '0.85rem', margin: '0 0 16px' }}>
        هذه هي اللوجوهات التي تظهر في الشريط المتحرك بالصفحة الرئيسية. استبدل أي صورة بها خطأ من هنا.
      </p>
      {partBrands.length === 0
        ? <div style={{ color: '#888', fontSize: '0.85rem' }}>لا توجد ماركات قطع غيار.</div>
        : renderBrandGrid(partBrands, 'part_brands', setPartBrands)}
    </div>
  );
}


// Styles (Dark Mode)
const container: any = { padding: 'clamp(14px, 4vw, 40px)', direction: 'rtl', maxWidth: '1200px', margin: '0 auto' };
const header: any = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '10px' };
const title: any = { fontWeight: '900', color: '#fff', margin: 0 };
const sectionTitle: any = { fontWeight: '900', color: '#f5f5f5', fontSize: '1.25rem', margin: '0 0 16px' };
const syncBtn: any = { background: '#111', color: '#2ecc71', border: '1px solid #222', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold' };
const grid: any = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' };
const brandCard: any = { background: '#0a0a0a', padding: '20px', borderRadius: '20px', border: '1px solid #1a1a1a', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' };
const logoWrapper: any = { width: '80px', height: '80px', background: '#111', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px', overflow: 'hidden', border: '1px solid #222' };
const logoImg: any = { width: '100%', height: '100%', objectFit: 'contain', padding: '10px' };
const brandName: any = { fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '15px', color: '#fff' };
const actionsColumn: any = { display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' };
const linkInputWrapper: any = { display: 'flex', gap: '5px', width: '100%' };
const miniInput: any = { flex: 1, padding: '8px', fontSize: '0.75rem', borderRadius: '8px', border: '1px solid #333', background: '#000', color: '#fff', outline: 'none' };
const saveBtn: any = { background: '#27ae60', color: '#fff', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' };
const uploadBtn: any = { flex: 1, background: '#111', color: '#888', padding: '8px', borderRadius: '8px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', border: '1px solid #222' };
const delBtn: any = { background: '#1a0a0a', color: '#e74c3c', border: '1px solid #331111', padding: '8px', borderRadius: '8px', cursor: 'pointer' };
