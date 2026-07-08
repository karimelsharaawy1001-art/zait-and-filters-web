'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/app/lib/supabase';
import { Image as ImageIcon, Save, Eye, EyeOff, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { optimizeImageUrl } from '@/lib/images';
import { uploadFile } from '@/lib/storage';

export default function AdminPromoPopup() {
  const [popup, setPopup] = useState<any>({
    desktop_image_url: '',
    mobile_image_url: '',
    promo_code: '',
    is_active: false,
  });
  const [popupId, setPopupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingDesktop, setUploadingDesktop] = useState(false);
  const [uploadingMobile, setUploadingMobile] = useState(false);
  const [copied, setCopied] = useState(false);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPopup();
  }, []);

  async function fetchPopup() {
    try {
      const { data } = await supabase
        .from('promo_popups')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setPopup({
          desktop_image_url: data.desktop_image_url || '',
          mobile_image_url: data.mobile_image_url || '',
          promo_code: data.promo_code || '',
          is_active: data.is_active ?? false,
        });
        setPopupId(data.id);
      }
    } catch (err: any) {
      toast.error('فشل تحميل الإعدادات: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function uploadPromoImage(file: File, target: 'desktop' | 'mobile') {
    const setter = target === 'desktop' ? setUploadingDesktop : setUploadingMobile;

    try {
      setter(true);
      const url = await uploadFile(file, 'promo-images');
      setPopup((prev: any) => ({ ...prev, [`${target}_image_url`]: url }));
      toast.success(`تم رفع الصورة ${target === 'desktop' ? 'للأفقي' : 'للرأسي'} ✅`);
    } catch (err: any) {
      toast.error('فشل رفع الصورة: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setter(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>, target: 'desktop' | 'mobile') {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن لا يتجاوز 10MB');
      return;
    }
    uploadPromoImage(file, target);
  }

  async function savePopup() {
    if (!popup.desktop_image_url.trim()) {
      toast.error('يرجى إضافة الصورة الأفقية أولاً');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        desktop_image_url: popup.desktop_image_url.trim(),
        mobile_image_url: popup.mobile_image_url.trim(),
        promo_code: popup.promo_code.trim(),
        is_active: popup.is_active,
        updated_at: new Date().toISOString(),
      };

      if (popupId) {
        const { error } = await supabase
          .from('promo_popups')
          .update(payload)
          .eq('id', popupId);
        if (error) throw error;
        toast.success('تم حفظ الإعدادات ✅');
      } else {
        const { data, error } = await supabase
          .from('promo_popups')
          .insert([{ ...payload, created_at: new Date().toISOString() }])
          .select()
          .single();
        if (error) throw error;
        if (data) setPopupId(data.id);
        toast.success('تم إنشاء الإعلان المنبثق ✅');
      }
    } catch (err: any) {
      toast.error('فشل الحفظ: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  const pageStyle: React.CSSProperties = {
    direction: 'rtl',
    padding: '20px',
    maxWidth: '820px',
    margin: '0 auto',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.82rem',
    fontWeight: '700',
    color: '#374151',
    marginBottom: '6px',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    border: '1.5px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '0.85rem',
    outline: 'none',
    background: '#fff',
    color: '#1a1a1a',
    boxSizing: 'border-box',
  };

  const uploadBoxStyle: React.CSSProperties = {
    border: '2px dashed #d1d5db',
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s',
    background: '#f9fafb',
    minHeight: '140px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  };

  const previewStyle: React.CSSProperties = {
    maxWidth: '100%',
    maxHeight: '200px',
    borderRadius: '10px',
    objectFit: 'contain',
    background: '#f1f5f9',
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#64748b', fontSize: '0.9rem' }}>
        جاري التحميل...
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: '900', color: '#1a1a1a', margin: 0 }}>🎯 الإعلان المنبثق</h1>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0' }}>
            يظهر عند فتح الموقع للزوار مرة واحدة فقط
          </p>
        </div>
        <button
          onClick={savePopup}
          disabled={saving}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 24px',
            background: saving ? '#94a3b8' : 'linear-gradient(135deg, #22c55e, #16a34a)',
            color: '#fff', border: 'none', borderRadius: '10px',
            fontWeight: '800', fontSize: '0.88rem', cursor: saving ? 'not-allowed' : 'pointer',
            boxShadow: saving ? 'none' : '0 4px 12px rgba(34,197,94,0.3)',
          }}
        >
          <Save size={18} />
          {saving ? 'جاري الحفظ...' : 'حفظ'}
        </button>
      </div>

      {/* ── Desktop Image ── */}
      <div style={{ marginBottom: '24px' }}>
        <div style={labelStyle}>الصورة الأفقية (للديسكتوب)</div>
        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '8px' }}>
          المقاس الأمثل: 1200×600 بكسل (نسبة 2:1) — لا يقل عن 800×400
        </div>
        <input
          ref={desktopInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => handleFileSelect(e, 'desktop')}
        />
        {popup.desktop_image_url ? (
          <div style={{ position: 'relative' }}>
            <img src={optimizeImageUrl(popup.desktop_image_url)} alt="Desktop" style={previewStyle} />
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button
                onClick={() => desktopInputRef.current?.click()}
                disabled={uploadingDesktop}
                style={{
                  padding: '6px 16px', background: '#f1f5f9', border: '1px solid #e2e8f0',
                  borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '700',
                  color: '#374151', display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <ImageIcon size={14} />
                {uploadingDesktop ? 'جاري الرفع...' : 'تغيير الصورة'}
              </button>
              <button
                onClick={() => setPopup((prev: any) => ({ ...prev, desktop_image_url: '' }))}
                style={{
                  padding: '6px 16px', background: '#fef2f2', border: '1px solid #fecaca',
                  borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '700',
                  color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                حذف
              </button>
            </div>
          </div>
        ) : (
          <div
            style={uploadBoxStyle}
            onClick={() => desktopInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.borderColor = '#22c55e'; }}
            onDragLeave={(e) => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = '#d1d5db'; }}
            onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) { const dt = new DataTransfer(); dt.items.add(file); if (desktopInputRef.current) desktopInputRef.current.files = dt.files; handleFileSelect({ target: { files: dt.files } } as any, 'desktop'); } }}
          >
            <ImageIcon size={32} color="#94a3b8" />
            <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#64748b' }}>
              {uploadingDesktop ? 'جاري الرفع...' : 'انقر أو اسحب الصورة الأفقية هنا'}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>PNG, JPG, WEBP — حد أقصى 10MB</div>
          </div>
        )}
      </div>

      {/* ── Mobile Image ── */}
      <div style={{ marginBottom: '24px' }}>
        <div style={labelStyle}>الصورة الرأسية (للموبايل)</div>
        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '8px' }}>
          المقاس الأمثل: 600×800 بكسل (نسبة 3:4) — لا يقل عن 400×533
        </div>
        <input
          ref={mobileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => handleFileSelect(e, 'mobile')}
        />
        {popup.mobile_image_url ? (
          <div style={{ position: 'relative' }}>
            <img src={optimizeImageUrl(popup.mobile_image_url)} alt="Mobile" style={previewStyle} />
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button
                onClick={() => mobileInputRef.current?.click()}
                disabled={uploadingMobile}
                style={{
                  padding: '6px 16px', background: '#f1f5f9', border: '1px solid #e2e8f0',
                  borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '700',
                  color: '#374151', display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <ImageIcon size={14} />
                {uploadingMobile ? 'جاري الرفع...' : 'تغيير الصورة'}
              </button>
              <button
                onClick={() => setPopup((prev: any) => ({ ...prev, mobile_image_url: '' }))}
                style={{
                  padding: '6px 16px', background: '#fef2f2', border: '1px solid #fecaca',
                  borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '700',
                  color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                حذف
              </button>
            </div>
          </div>
        ) : (
          <div
            style={uploadBoxStyle}
            onClick={() => mobileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.borderColor = '#22c55e'; }}
            onDragLeave={(e) => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = '#d1d5db'; }}
            onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) { const dt = new DataTransfer(); dt.items.add(file); if (mobileInputRef.current) mobileInputRef.current.files = dt.files; handleFileSelect({ target: { files: dt.files } } as any, 'mobile'); } }}
          >
            <ImageIcon size={32} color="#94a3b8" />
            <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#64748b' }}>
              {uploadingMobile ? 'جاري الرفع...' : 'انقر أو اسحب الصورة الرأسية هنا'}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>PNG, JPG, WEBP — حد أقصى 10MB</div>
          </div>
        )}
      </div>

      {/* ── Promo Code ── */}
      <div style={{ marginBottom: '24px' }}>
        <div style={labelStyle}>كود الخصم (اختياري)</div>
        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '8px' }}>
          سيظهر في أسفل الصورة مع زر نسخ ليتمكن الزائر من نسخه
        </div>
        <input
          type="text"
          value={popup.promo_code}
          onChange={(e) => setPopup((prev: any) => ({ ...prev, promo_code: e.target.value }))}
          placeholder="مثال: POPUP10"
          style={inputStyle}
        />
      </div>

      {/* ── Active Toggle ── */}
      <div style={{ marginBottom: '28px' }}>
        <label
          style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '14px 18px', background: '#f8fafc', borderRadius: '12px',
            cursor: 'pointer', border: '1px solid #e2e8f0',
          }}
        >
          <div
            onClick={() => setPopup((prev: any) => ({ ...prev, is_active: !prev.is_active }))}
            style={{
              width: '44px', height: '24px', borderRadius: '12px',
              background: popup.is_active ? '#22c55e' : '#cbd5e1',
              position: 'relative', transition: 'background 0.2s',
              flexShrink: 0, cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: '20px', height: '20px', borderRadius: '50%',
                background: '#fff', position: 'absolute', top: '2px',
                transition: 'right 0.2s',
                right: popup.is_active ? '22px' : '2px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1a1a1a' }}>
              {popup.is_active ? 'الإعلان المنبثق نشط 🟢' : 'الإعلان المنبثق متوقف 🔴'}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
              {popup.is_active ? 'سيظهر للزوار عند فتح الموقع' : 'غير مرئي للزوار'}
            </div>
          </div>
        </label>
      </div>

      {/* ── Preview ── */}
      {popup.desktop_image_url && (
        <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#374151', marginBottom: '12px' }}>
            👁️ معاينة
          </div>
          <div
            style={{
              background: 'rgba(0,0,0,0.8)', borderRadius: '16px', padding: '20px',
              position: 'relative', maxWidth: '500px',
            }}
          >
            <div style={{ textAlign: 'left' }}>
              <span style={{ color: '#fff', fontSize: '1.2rem', cursor: 'pointer', opacity: 0.6 }}>✕</span>
            </div>
            <img
              src={optimizeImageUrl(popup.desktop_image_url)}
              alt="Preview"
              style={{ width: '100%', borderRadius: '8px', display: 'block' }}
            />
            {popup.promo_code && (
              <div
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  marginTop: '12px',
                }}
              >
                <span style={{ color: '#fff', fontSize: '0.78rem', fontWeight: '700' }}>كود الخصم:</span>
                <span
                  onClick={() => { navigator.clipboard.writeText(popup.promo_code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  style={{
                    background: 'rgba(255,255,255,0.15)', padding: '6px 14px', borderRadius: '8px',
                    color: '#22c55e', fontWeight: '900', fontSize: '0.85rem', cursor: 'pointer',
                    direction: 'ltr', display: 'inline-flex', alignItems: 'center', gap: '6px',
                  }}
                >
                  {popup.promo_code}
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
