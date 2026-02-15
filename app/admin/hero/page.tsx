'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import { Save, Trash2, Plus, Loader2, Image as ImageIcon, Layout as LayoutIcon, CheckCircle } from 'lucide-react';

export default function AdminHero() {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [slides, setSlides] = useState<any[]>([]);
  const [status, setStatus] = useState({ id: null as number | null, msg: '' });

  useEffect(() => {
    fetchSlides();
  }, []);

  async function fetchSlides() {
    setLoading(true);
    const { data } = await supabase.from('hero_settings').select('*').order('id', { ascending: true });
    if (data) setSlides(data);
    setLoading(false);
  }

  // إضافة سلايد جديد فارغ
  const handleAddSlide = async () => {
    const newSlide = {
      title: 'عنوان السلايد الجديد',
      subtitle: 'وصف السلايد الجديد هنا',
      bg_image_url: '',
      button_text: 'تصفح المتجر',
      button_link: '/store',
      trust_text: 'ضمان جودة 100%'
    };

    const { data, error } = await supabase.from('hero_settings').insert([newSlide]).select();
    if (data) {
      setSlides([...slides, data[0]]);
      showStatus(data[0].id, 'تمت الإضافة! قم بتعديل البيانات الآن');
    }
  };

  // حفظ تعديلات سلايد معين
  const handleSaveSlide = async (id: number) => {
    setSavingId(id);
    const slideToSave = slides.find(s => s.id === id);
    const { error } = await supabase.from('hero_settings').update(slideToSave).eq('id', id);
    
    setSavingId(null);
    showStatus(id, error ? 'خطأ في الحفظ' : 'تم الحفظ بنجاح! ✅');
  };

  // حذف سلايد
  const handleDeleteSlide = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا السلايد؟')) return;
    const { error } = await supabase.from('hero_settings').delete().eq('id', id);
    if (!error) setSlides(slides.filter(s => s.id !== id));
  };

  const updateSlideState = (id: number, field: string, value: string) => {
    setSlides(slides.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const showStatus = (id: number, msg: string) => {
    setStatus({ id, msg });
    setTimeout(() => setStatus({ id: null, msg: '' }), 3000);
  };

  if (loading) return <div style={{ color: '#fff', padding: '100px', textAlign: 'center' }}>جاري تحميل السلايدات...</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', color: '#fff', paddingBottom: '50px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px', borderBottom: '1px solid #111', paddingBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <LayoutIcon size={32} color="#2ecc71" />
          <h1 style={{ fontSize: '1.8rem', fontWeight: '900' }}>إدارة سلايدر الواجهة (Hero Slides)</h1>
        </div>
        <button onClick={handleAddSlide} style={addBtnStyle}>
          <Plus size={20} /> إضافة سلايد جديد
        </button>
      </div>

      <div style={{ display: 'grid', gap: '40px' }}>
        {slides.map((slide, index) => (
          <div key={slide.id} style={slideCardStyle}>
            <div style={cardHeaderStyle}>
              <span style={badgeStyle}>سلايد #{index + 1}</span>
              <button onClick={() => handleDeleteSlide(slide.id)} style={deleteBtnStyle}>
                <Trash2 size={18} /> حذف
              </button>
            </div>

            <div style={formGridStyle}>
              <div style={inputGroup}>
                <label style={labelStyle}>العنوان (استخدم &lt;br/&gt; للسطر الجديد)</label>
                <input 
                  type="text" 
                  value={slide.title} 
                  onChange={e => updateSlideState(slide.id, 'title', e.target.value)} 
                  style={inputStyle}
                />
              </div>

              <div style={inputGroup}>
                <label style={labelStyle}>النص الوصفي</label>
                <textarea 
                  rows={2} 
                  value={slide.subtitle} 
                  onChange={e => updateSlideState(slide.id, 'subtitle', e.target.value)} 
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={inputGroup}>
                  <label style={labelStyle}>نص الزر</label>
                  <input type="text" value={slide.button_text} onChange={e => updateSlideState(slide.id, 'button_text', e.target.value)} style={inputStyle} />
                </div>
                <div style={inputGroup}>
                  <label style={labelStyle}>رابط الزر</label>
                  <input type="text" value={slide.button_link} onChange={e => updateSlideState(slide.id, 'button_link', e.target.value)} style={inputStyle} />
                </div>
              </div>

              <div style={inputGroup}>
                <label style={labelStyle}>رابط صورة الخلفية</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input 
                    type="text" 
                    value={slide.bg_image_url} 
                    onChange={e => updateSlideState(slide.id, 'bg_image_url', e.target.value)} 
                    style={inputStyle}
                  />
                  {slide.bg_image_url && (
                    <img src={slide.bg_image_url} alt="preview" style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #222' }} />
                  )}
                </div>
              </div>

              <div style={inputGroup}>
                <label style={labelStyle}>نص الثقة</label>
                <input type="text" value={slide.trust_text} onChange={e => updateSlideState(slide.id, 'trust_text', e.target.value)} style={inputStyle} />
              </div>
            </div>

            <button 
              onClick={() => handleSaveSlide(slide.id)} 
              disabled={savingId === slide.id} 
              style={{ ...saveBtnStyle, backgroundColor: status.id === slide.id && !status.msg.includes('خطأ') ? '#1db954' : '#2ecc71' }}
            >
              {savingId === slide.id ? <Loader2 className="animate-spin" /> : <Save size={20} />}
              {status.id === slide.id ? status.msg : 'حفظ تغييرات هذا السلايد'}
            </button>
          </div>
        ))}
      </div>

      {slides.length === 0 && (
        <div style={{ textAlign: 'center', padding: '50px', color: '#444', border: '2px dashed #111', borderRadius: '20px' }}>
          لا توجد سلايدات حالياً، اضغط على "إضافة سلايد جديد" للبدء.
        </div>
      )}
    </div>
  );
}

// التنسيقات (Dark Theme Professional)
const slideCardStyle = { 
  backgroundColor: '#050505', 
  padding: '30px', 
  borderRadius: '25px', 
  border: '1px solid #111',
  position: 'relative' as const
};

const cardHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' };
const badgeStyle = { backgroundColor: '#111', color: '#2ecc71', padding: '5px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold' };
const formGridStyle = { display: 'grid', gap: '20px', marginBottom: '20px' };
const inputGroup = { display: 'flex', flexDirection: 'column' as const, gap: '8px' };
const labelStyle = { fontSize: '0.85rem', color: '#666', fontWeight: 'bold' };
const inputStyle = { width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #1a1a1a', backgroundColor: '#0a0a0a', color: '#fff', outline: 'none' };

const addBtnStyle = { 
  display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#2ecc71', color: '#000', 
  border: 'none', padding: '12px 20px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' 
};

const saveBtnStyle = { 
  width: '100%', padding: '15px', color: '#000', border: 'none', borderRadius: '12px', 
  fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', transition: '0.3s' 
};

const deleteBtnStyle = { 
  display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: 'transparent', 
  color: '#ff4d4d', border: '1px solid #200', padding: '5px 10px', borderRadius: '8px', 
  cursor: 'pointer', fontSize: '0.8rem' 
};