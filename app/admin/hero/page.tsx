'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import { Save, Trash2, Plus, Loader2, Layout as LayoutIcon } from 'lucide-react';


export default function AdminHero() {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [slides, setSlides] = useState<any[]>([]);
  const [status, setStatus] = useState({ id: null as number | null, msg: '' });
  const [addingSlide, setAddingSlide] = useState(false);
  const [dbColumns, setDbColumns] = useState<string[]>([]);


  useEffect(() => {
    fetchSlides();
  }, []);


  async function fetchSlides() {
    setLoading(true);
    const { data, error } = await supabase
      .from('hero_settings')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching slides:', error);
    }

    if (data) {
      setSlides(data);
      // Learn which columns actually exist from the first row
      if (data.length > 0) {
        setDbColumns(Object.keys(data[0]));
      }
    }
    setLoading(false);
  }


  const handleAddSlide = async () => {
    setAddingSlide(true);

    // Only send the core fields that are guaranteed to exist
    // We'll detect extra columns from existing rows
    const coreSlide: Record<string, any> = {
      title: 'عنوان السلايد الجديد',
      subtitle: 'وصف السلايد الجديد هنا',
      bg_image_url: '',
      button_text: 'تصفح المتجر',
      button_link: '/store',
    };

    // Only add trust_text if it exists in the DB (detected from existing rows)
    if (dbColumns.includes('trust_text')) {
      coreSlide.trust_text = 'ضمان جودة 100%';
    }

    console.log('Inserting slide:', coreSlide);

    const { data, error } = await supabase
      .from('hero_settings')
      .insert([coreSlide])
      .select();

    console.log('Insert result:', { data, error });

    if (error) {
      alert(`❌ خطأ في إضافة السلايد:\n${error.message}\n\nCode: ${error.code}`);
      setAddingSlide(false);
      return;
    }

    if (data && data.length > 0) {
      setSlides(prev => [...prev, data[0]]);
      // Update known columns
      setDbColumns(Object.keys(data[0]));
      showStatus(data[0].id, '✅ تمت الإضافة! قم بتعديل البيانات الآن');
    } else {
      alert('❌ لم يتم إرجاع بيانات بعد الإضافة. تحقق من صلاحيات RLS في Supabase.');
    }

    setAddingSlide(false);
  };


  const handleSaveSlide = async (id: number) => {
    setSavingId(id);
    const slideToSave = slides.find(s => s.id === id);

    // Remove any keys that aren't real DB columns (if we know them)
    let payload = { ...slideToSave };
    delete payload.id; // don't update the primary key

    const { error } = await supabase
      .from('hero_settings')
      .update(payload)
      .eq('id', id);

    if (error) {
      console.error('Save error:', error);
      showStatus(id, `❌ خطأ: ${error.message}`);
    } else {
      showStatus(id, '✅ تم الحفظ بنجاح!');
    }

    setSavingId(null);
  };


  const handleDeleteSlide = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا السلايد؟')) return;
    const { error } = await supabase.from('hero_settings').delete().eq('id', id);
    if (error) {
      alert(`❌ خطأ في الحذف: ${error.message}`);
    } else {
      setSlides(slides.filter(s => s.id !== id));
    }
  };


  const updateSlideState = (id: number, field: string, value: string) => {
    setSlides(slides.map(s => s.id === id ? { ...s, [field]: value } : s));
  };


  const showStatus = (id: number, msg: string) => {
    setStatus({ id, msg });
    setTimeout(() => setStatus({ id: null, msg: '' }), 3000);
  };


  if (loading) return (
    <div style={{ color: '#1a1a1a', padding: 'clamp(40px, 10vw, 100px)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
      <Loader2 size={30} color="#2ecc71" className="animate-spin" />
      جاري تحميل السلايدات...
    </div>
  );


  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', color: '#1a1a1a', padding: 'clamp(12px, 3vw, 20px)', paddingBottom: '50px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px', borderBottom: '1px solid #e5e7eb', paddingBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <LayoutIcon size={32} color="#2ecc71" />
          <h1 style={{ fontSize: '1.8rem', fontWeight: '900' }}>إدارة سلايدر الواجهة</h1>
        </div>
        <button
          onClick={handleAddSlide}
          disabled={addingSlide}
          style={{
            ...addBtnStyle,
            opacity: addingSlide ? 0.7 : 1,
            cursor: addingSlide ? 'not-allowed' : 'pointer'
          }}
        >
          {addingSlide
            ? <><Loader2 size={18} className="animate-spin" /> جاري الإضافة...</>
            : <><Plus size={20} /> إضافة سلايد جديد</>
          }
        </button>
      </div>

      <div style={{ display: 'grid', gap: '40px' }}>
        {slides.map((slide, index) => (
          <div key={slide.id} style={slideCardStyle}>
            <div style={cardHeaderStyle}>
              <span style={badgeStyle}>سلايد #{index + 1} — ID: {slide.id}</span>
              <button onClick={() => handleDeleteSlide(slide.id)} style={deleteBtnStyle}>
                <Trash2 size={18} /> حذف
              </button>
            </div>

            <div style={formGridStyle}>
              <div style={inputGroup}>
                <label style={labelStyle}>العنوان</label>
                <input
                  type="text"
                  value={slide.title || ''}
                  onChange={e => updateSlideState(slide.id, 'title', e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={inputGroup}>
                <label style={labelStyle}>النص الوصفي</label>
                <textarea
                  rows={2}
                  value={slide.subtitle || ''}
                  onChange={e => updateSlideState(slide.id, 'subtitle', e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                <div style={inputGroup}>
                  <label style={labelStyle}>نص الزر</label>
                  <input
                    type="text"
                    value={slide.button_text || ''}
                    onChange={e => updateSlideState(slide.id, 'button_text', e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div style={inputGroup}>
                  <label style={labelStyle}>رابط الزر</label>
                  <input
                    type="text"
                    value={slide.button_link || ''}
                    onChange={e => updateSlideState(slide.id, 'button_link', e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={inputGroup}>
                <label style={labelStyle}>رابط صورة الخلفية</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={slide.bg_image_url || ''}
                    onChange={e => updateSlideState(slide.id, 'bg_image_url', e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                    placeholder="https://..."
                  />
                  {slide.bg_image_url && (
                    <img
                      src={slide.bg_image_url}
                      alt="preview"
                      style={{ width: '60px', height: '50px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #e5e7eb', flexShrink: 0 }}
                      onError={e => (e.currentTarget.style.display = 'none')}
                    />
                  )}
                </div>
              </div>

              {/* Only show trust_text field if column exists in DB */}
              {(dbColumns.includes('trust_text') || slide.trust_text !== undefined) && (
                <div style={inputGroup}>
                  <label style={labelStyle}>نص الثقة</label>
                  <input
                    type="text"
                    value={slide.trust_text || ''}
                    onChange={e => updateSlideState(slide.id, 'trust_text', e.target.value)}
                    style={inputStyle}
                  />
                </div>
              )}
            </div>

            <button
              onClick={() => handleSaveSlide(slide.id)}
              disabled={savingId === slide.id}
              style={{
                ...saveBtnStyle,
                backgroundColor: status.id === slide.id && status.msg.includes('❌') ? '#22c55e' : '#2ecc71',
                opacity: savingId === slide.id ? 0.8 : 1,
              }}
            >
              {savingId === slide.id
                ? <><Loader2 size={18} className="animate-spin" /> جاري الحفظ...</>
                : <><Save size={20} /> {status.id === slide.id ? status.msg : 'حفظ تغييرات هذا السلايد'}</>
              }
            </button>
          </div>
        ))}
      </div>

      {slides.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280', border: '2px dashed #e5e7eb', borderRadius: '20px' }}>
          <LayoutIcon size={50} color="#e5e7eb" style={{ marginBottom: '15px' }} />
          <p style={{ marginBottom: '20px' }}>لا توجد سلايدات حالياً</p>
          <button onClick={handleAddSlide} disabled={addingSlide} style={addBtnStyle}>
            <Plus size={20} /> إضافة أول سلايد
          </button>
        </div>
      )}
    </div>
  );
}


const slideCardStyle = {
  backgroundColor: '#ffffff',
  padding: 'clamp(16px, 4vw, 30px)',
  borderRadius: '25px',
  border: '1px solid #e5e7eb',
  position: 'relative' as const
};

const cardHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' };
const badgeStyle = { backgroundColor: '#e5e7eb', color: '#2ecc71', padding: '5px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold' };
const formGridStyle = { display: 'grid', gap: '20px', marginBottom: '20px' };
const inputGroup = { display: 'flex', flexDirection: 'column' as const, gap: '8px' };
const labelStyle = { fontSize: '0.85rem', color: '#666', fontWeight: 'bold' };
const inputStyle: any = { width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #d1d5db', backgroundColor: '#ffffff', color: '#1a1a1a', outline: 'none', fontFamily: 'inherit', fontSize: '0.9rem' };

const addBtnStyle: any = {
  display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#2ecc71', color: '#1a1a1a',
  border: 'none', padding: '12px 20px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer',
  fontSize: '0.95rem', fontFamily: 'inherit'
};

const saveBtnStyle: any = {
  width: '100%', padding: '15px', color: '#1a1a1a', border: 'none', borderRadius: '12px',
  fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center',
  alignItems: 'center', gap: '10px', transition: '0.3s', fontFamily: 'inherit', fontSize: '1rem'
};

const deleteBtnStyle: any = {
  display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: 'transparent',
  color: '#22c55e', border: '1px solid #200', padding: '5px 10px', borderRadius: '8px',
  cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'inherit'
};