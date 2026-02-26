'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import { Image as ImageIcon, Save, Eye, EyeOff, Link as LinkIcon, Type, AlignLeft, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminHomeBanner() {
  const [banner, setBanner] = useState<any>({
    image_url: '',
    title: '',
    subtitle: '',
    link_url: '',
    is_active: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bannerId, setBannerId] = useState<string | null>(null);

  useEffect(() => {
    fetchBanner();
  }, []);

  async function fetchBanner() {
    try {
      const { data } = await supabase
        .from('home_banners')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setBanner({
          image_url: data.image_url || '',
          title: data.title || '',
          subtitle: data.subtitle || '',
          link_url: data.link_url || '',
          is_active: data.is_active ?? true,
        });
        setBannerId(data.id);
      }
    } catch (err: any) {
      toast.error('فشل تحميل البانر: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveBanner() {
    if (!banner.image_url.trim()) {
      toast.error('يرجى إدخال رابط الصورة أولاً');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        image_url: banner.image_url.trim(),
        title: banner.title.trim(),
        subtitle: banner.subtitle.trim(),
        link_url: banner.link_url.trim(),
        is_active: banner.is_active,
        updated_at: new Date().toISOString(),
      };

      if (bannerId) {
        // Update existing
        const { error } = await supabase
          .from('home_banners')
          .update(payload)
          .eq('id', bannerId);
        if (error) throw error;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('home_banners')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        if (data) setBannerId(data.id);
      }

      toast.success('تم حفظ البانر ✅');
    } catch (err: any) {
      toast.error('فشل الحفظ: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteBanner() {
    if (!bannerId) return;
    if (!window.confirm('هل أنت متأكد من حذف البانر؟')) return;

    try {
      const { error } = await supabase
        .from('home_banners')
        .delete()
        .eq('id', bannerId);
      if (error) throw error;

      setBanner({ image_url: '', title: '', subtitle: '', link_url: '', is_active: true });
      setBannerId(null);
      toast.success('تم حذف البانر ✅');
    } catch (err: any) {
      toast.error('فشل الحذف: ' + err.message);
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px', color: '#15803d', fontWeight: '900', fontSize: '1.3rem', direction: 'rtl' }}>
        جاري تحميل البانر...
      </div>
    );
  }

  return (
    <div style={{ padding: '30px', direction: 'rtl', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '900', margin: 0, color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '12px' }}>
          🖼️ بانر الصفحة الرئيسية
        </h1>
        <p style={{ color: '#666', marginTop: '6px', fontSize: '0.95rem' }}>
          يظهر أسفل كاروسيل الماركات مباشرةً — اضبط الصورة والنص من هنا
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

        {/* ── Form ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Image URL */}
          <div style={cardStyle}>
            <label style={labelStyle}>
              <ImageIcon size={16} color="#22c55e" /> رابط الصورة
            </label>
            <input
              value={banner.image_url}
              onChange={e => setBanner((b: any) => ({ ...b, image_url: e.target.value }))}
              placeholder="https://example.com/banner.jpg"
              style={inputStyle}
              dir="ltr"
            />
            <p style={hintStyle}>يُفضَّل صورة عرضية بنسبة 8:1 أو نحو ذلك. مثال: 1200×150 بكسل.</p>
          </div>

          {/* Title */}
          <div style={cardStyle}>
            <label style={labelStyle}>
              <Type size={16} color="#22c55e" /> العنوان الرئيسي
            </label>
            <input
              value={banner.title}
              onChange={e => setBanner((b: any) => ({ ...b, title: e.target.value }))}
              placeholder="مثال: عروض نهاية الموسم 🔥"
              style={inputStyle}
            />
          </div>

          {/* Subtitle */}
          <div style={cardStyle}>
            <label style={labelStyle}>
              <AlignLeft size={16} color="#22c55e" /> النص الثانوي
            </label>
            <input
              value={banner.subtitle}
              onChange={e => setBanner((b: any) => ({ ...b, subtitle: e.target.value }))}
              placeholder="مثال: خصومات تصل إلى 50% على كل القطع"
              style={inputStyle}
            />
          </div>

          {/* Link */}
          <div style={cardStyle}>
            <label style={labelStyle}>
              <LinkIcon size={16} color="#22c55e" /> رابط الضغط (اختياري)
            </label>
            <input
              value={banner.link_url}
              onChange={e => setBanner((b: any) => ({ ...b, link_url: e.target.value }))}
              placeholder="/store أو https://..."
              style={inputStyle}
              dir="ltr"
            />
            <p style={hintStyle}>إذا تُرك فارغاً، لن يكون البانر قابلاً للضغط.</p>
          </div>

          {/* Active toggle */}
          <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: '800', color: '#1a1a1a', marginBottom: '2px' }}>حالة البانر</div>
              <div style={{ fontSize: '0.8rem', color: '#888' }}>{banner.is_active ? 'يظهر على الصفحة الرئيسية' : 'مخفي — لن يظهر للزوار'}</div>
            </div>
            <button
              onClick={() => setBanner((b: any) => ({ ...b, is_active: !b.is_active }))}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 18px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                fontWeight: '800', fontSize: '0.9rem',
                background: banner.is_active ? '#f0fdf4' : '#fef2f2',
                color: banner.is_active ? '#15803d' : '#dc2626',
              }}
            >
              {banner.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
              {banner.is_active ? 'مرئي' : 'مخفي'}
            </button>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={saveBanner}
              disabled={saving}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '14px', background: saving ? '#ccc' : 'linear-gradient(135deg, #22c55e, #16a34a)',
                color: '#fff', border: 'none', borderRadius: '14px', fontWeight: '900',
                fontSize: '1rem', cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: saving ? 'none' : '0 4px 15px rgba(34,197,94,0.35)',
              }}
            >
              <Save size={18} /> {saving ? 'جاري الحفظ...' : 'حفظ البانر'}
            </button>

            {bannerId && (
              <button
                onClick={deleteBanner}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  padding: '14px 18px', background: '#fff5f5', color: '#dc2626',
                  border: '1.5px solid #fecaca', borderRadius: '14px', fontWeight: '800',
                  fontSize: '0.9rem', cursor: 'pointer',
                }}
              >
                <Trash2 size={16} /> حذف
              </button>
            )}
          </div>
        </div>

        {/* ── Live Preview ── */}
        <div>
          <div style={{ ...cardStyle, padding: '20px' }}>
            <div style={{ fontWeight: '900', color: '#1a1a1a', marginBottom: '14px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Eye size={16} color="#22c55e" /> معاينة مباشرة
            </div>

            {/* Desktop preview */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '0.75rem', color: '#aaa', fontWeight: '700', marginBottom: '6px' }}>ديسكتوب</div>
              <div style={{
                position: 'relative', width: '100%', height: '100px',
                borderRadius: '14px', overflow: 'hidden',
                background: banner.image_url ? 'transparent' : '#1a1a2e',
                border: '1px solid #f0f0f0',
              }}>
                {banner.image_url && (
                  <img
                    src={banner.image_url}
                    alt="preview"
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => { (e.target as any).style.display = 'none'; }}
                  />
                )}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to left, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)' }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 20px', direction: 'rtl' }}>
                  <div style={{ textAlign: 'right' }}>
                    {banner.title && (
                      <div style={{ color: '#fff', fontWeight: '900', fontSize: '1rem', textShadow: '0 2px 8px rgba(0,0,0,0.5)', marginBottom: '3px' }}>
                        {banner.title}
                      </div>
                    )}
                    {banner.subtitle && (
                      <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.75rem', fontWeight: '600', textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}>
                        {banner.subtitle}
                      </div>
                    )}
                    {!banner.title && !banner.subtitle && (
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>لا يوجد نص</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile preview */}
            <div>
              <div style={{ fontSize: '0.75rem', color: '#aaa', fontWeight: '700', marginBottom: '6px' }}>موبايل</div>
              <div style={{
                position: 'relative', width: '220px', height: '70px',
                borderRadius: '10px', overflow: 'hidden', margin: '0 auto',
                background: banner.image_url ? 'transparent' : '#1a1a2e',
                border: '1px solid #f0f0f0',
              }}>
                {banner.image_url && (
                  <img
                    src={banner.image_url}
                    alt="preview mobile"
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => { (e.target as any).style.display = 'none'; }}
                  />
                )}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 100%)' }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 10px 8px', direction: 'rtl' }}>
                  <div style={{ textAlign: 'center' }}>
                    {banner.title && (
                      <div style={{ color: '#fff', fontWeight: '900', fontSize: '0.72rem', textShadow: '0 1px 4px rgba(0,0,0,0.5)', lineHeight: 1.3 }}>
                        {banner.title}
                      </div>
                    )}
                    {banner.subtitle && (
                      <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.6rem', fontWeight: '600' }}>
                        {banner.subtitle}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {!banner.is_active && (
              <div style={{ marginTop: '14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px 14px', color: '#dc2626', fontSize: '0.82rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <EyeOff size={14} /> البانر مخفي حالياً ولن يظهر للزوار
              </div>
            )}
          </div>

          {/* SQL hint */}
          <div style={{ marginTop: '16px', background: '#f8f9fa', borderRadius: '14px', padding: '16px', border: '1px solid #eee' }}>
            <div style={{ fontWeight: '800', color: '#444', fontSize: '0.82rem', marginBottom: '8px' }}>📋 إنشاء الجدول في Supabase</div>
            <pre style={{ fontSize: '0.72rem', color: '#555', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap', direction: 'ltr', textAlign: 'left', fontFamily: 'monospace' }}>{`create table home_banners (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  title text,
  subtitle text,
  link_url text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);`}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Styles ──
const cardStyle: any = {
  background: '#fff',
  borderRadius: '16px',
  padding: '18px 20px',
  border: '1px solid #f0f0f0',
  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
};

const labelStyle: any = {
  display: 'flex',
  alignItems: 'center',
  gap: '7px',
  fontWeight: '800',
  fontSize: '0.88rem',
  color: '#333',
  marginBottom: '10px',
};

const inputStyle: any = {
  width: '100%',
  padding: '11px 14px',
  border: '1.5px solid #e5e5e5',
  borderRadius: '11px',
  fontSize: '0.92rem',
  color: '#1a1a1a',
  outline: 'none',
  background: '#fafafa',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
};

const hintStyle: any = {
  fontSize: '0.75rem',
  color: '#aaa',
  marginTop: '6px',
  marginBottom: 0,
};