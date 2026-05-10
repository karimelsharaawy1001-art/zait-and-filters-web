'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';
import { Save, ArrowRight, Loader2, Image as ImageIcon, Car, Tag, Globe, Upload, Plus, X } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// 🔧 CLOUDINARY CONFIG — fill these in with your own values
// ─────────────────────────────────────────────────────────────────────────────
const CLOUDINARY_CLOUD_NAME = 'dht6kx2jx';       // e.g. 'dxyz123abc'
const CLOUDINARY_UPLOAD_PRESET = 'zaitandfilters_preset'; // must be UNSIGNED preset
// ─────────────────────────────────────────────────────────────────────────────

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
  const searchParams = useSearchParams();

  const returnUrl = searchParams.get('returnUrl') || '/admin/products';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const dropZoneRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [options, setOptions] = useState({
    makes: [] as string[],
    categories: [] as string[],
    subcategories: [] as string[]
  });

  const [modelsByMake, setModelsByMake] = useState<Record<string, string[]>>({});

  const [formData, setFormData] = useState({
    name: '', brand: '', category: '', subcategory: '',
    regular_price: '', sale_price: '', image_url: '',
    is_active: true, country_of_origin: '', video_url: ''
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
        video_url: data.video_url || '',
      });

      if (compat && compat.length > 0) {
        setCarRows(compat.map((c: any) => ({
          id: c.id,
          car_make: c.car_make || '',
          car_model: c.car_model || '',
          car_model_year: c.car_model_year || '',
        })));
      } else if (data.car_make) {
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

  // ── Cloudinary Upload ──────────────────────────────────────────────────────
  const uploadToCloudinary = useCallback(async (file: File) => {
    setUploadError(null);

    // Basic validation
    if (!file.type.startsWith('image/')) {
      setUploadError('الملف المختار ليس صورة. يرجى اختيار صورة صحيحة.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('حجم الصورة كبير جداً. الحد الأقصى 10 ميغابايت.');
      return;
    }

    if (!CLOUDINARY_CLOUD_NAME || CLOUDINARY_CLOUD_NAME === 'YOUR_CLOUD_NAME') {
      setUploadError('لم يتم ضبط إعدادات Cloudinary. يرجى إضافة CLOUD_NAME و UPLOAD_PRESET في الكود.');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formDataUpload.append('folder', 'products'); // optional: organise in a folder

      // Use XMLHttpRequest so we can track progress
      const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

      const result = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              if (data.secure_url) {
                resolve(data.secure_url);
              } else if (data.error) {
                reject(new Error(data.error.message || 'فشل الرفع'));
              } else {
                reject(new Error('استجابة غير متوقعة من Cloudinary'));
              }
            } catch {
              reject(new Error('فشل تحليل استجابة Cloudinary'));
            }
          } else {
            // Try to parse error from Cloudinary
            try {
              const errData = JSON.parse(xhr.responseText);
              reject(new Error(errData.error?.message || `HTTP ${xhr.status}`));
            } catch {
              reject(new Error(`فشل الرفع — HTTP ${xhr.status}`));
            }
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('خطأ في الشبكة — تحقق من اتصالك بالإنترنت'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('تم إلغاء الرفع'));
        });

        xhr.open('POST', url);
        xhr.send(formDataUpload);
      });

      setFormData(prev => ({ ...prev, image_url: result }));
      setUploadProgress(100);
    } catch (error: any) {
      console.error('Cloudinary upload error:', error);
      setUploadError('خطأ في الرفع: ' + (error.message || 'حدث خطأ غير معروف'));
    } finally {
      setUploading(false);
    }
  }, []);

  // ── File input handler ─────────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadToCloudinary(file);
    // Reset so same file can be re-selected
    e.target.value = '';
  };

  // ── Drag-and-drop handlers ─────────────────────────────────────────────────
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set false if leaving the drop zone itself (not a child)
    if (e.currentTarget === dropZoneRef.current && !dropZoneRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(f => f.type.startsWith('image/'));
    if (imageFile) {
      uploadToCloudinary(imageFile);
    } else if (files.length > 0) {
      setUploadError('الملف المُسقَط ليس صورة. يرجى سحب ملف صورة فقط.');
    }
  };

  // ── Car rows ───────────────────────────────────────────────────────────────
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

  // ── YouTube ID helper ──────────────────────────────────────────────────────
  function getYouTubeId(url: string): string | null {
    if (!url) return null;
    const match = url.match(
      /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/|v\/))([A-Za-z0-9_-]{11})/
    );
    return match ? match[1] : null;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);

    try {
      const firstCar = carRows[0];

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
          video_url: formData.video_url || null,
          car_make: firstCar?.car_make || null,
          car_model: firstCar?.car_model || null,
          car_model_year: firstCar?.car_model_year || null,
        })
        .eq('id', id);

      if (updateError) throw new Error('خطأ في تحديث المنتج: ' + updateError.message);

      const { error: delError } = await supabase
        .from('product_car_compatibility')
        .delete()
        .eq('product_id', id);

      if (delError) throw new Error('خطأ في حذف التوافقات القديمة: ' + delError.message);

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
      router.push(returnUrl);

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

  const youtubeId = getYouTubeId(formData.video_url);

  return (
    <div style={{ direction: 'rtl', color: '#fff', fontFamily: 'sans-serif', padding: '40px 20px', backgroundColor: '#050505', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '40px' }}>
          <button onClick={() => router.push(returnUrl)} style={backBtnStyle}>
            <ArrowRight size={20} />
          </button>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '900', color: '#2ecc71' }}>تعديل بيانات الصنف</h1>
        </div>

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

              {/* Upload Error */}
              {uploadError && (
                <div style={{ background: '#2a0a0a', border: '1px solid #ff4d4d', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', color: '#ff4d4d', fontSize: '0.82rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ❌ {uploadError}
                  <button type="button" onClick={() => setUploadError(null)} style={{ marginRight: 'auto', background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: '0 4px' }}>×</button>
                </div>
              )}

              {/* Drag & Drop Zone */}
              <div
                ref={dropZoneRef}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => !uploading && fileInputRef.current?.click()}
                style={{
                  ...dropZoneStyle,
                  border: isDragging
                    ? '2px dashed #2ecc71'
                    : '2px dashed #333',
                  backgroundColor: isDragging ? 'rgba(46,204,113,0.05)' : '#000',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Preview */}
                {formData.image_url && !uploading && (
                  <div style={{ position: 'relative', marginBottom: '12px' }}>
                    <img
                      src={formData.image_url}
                      style={previewImage}
                      alt="Preview"
                    />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setFormData(prev => ({ ...prev, image_url: '' })); }}
                      style={{ position: 'absolute', top: '-8px', left: '-8px', background: '#ff4d4d', border: 'none', borderRadius: '50%', width: '22px', height: '22px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', lineHeight: 1 }}
                    >
                      ×
                    </button>
                  </div>
                )}

                {/* Upload progress */}
                {uploading && (
                  <div style={{ width: '100%', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.8rem', color: '#2ecc71' }}>
                      <span>جاري الرفع إلى Cloudinary...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div style={{ background: '#111', borderRadius: '99px', height: '6px', overflow: 'hidden' }}>
                      <div style={{ background: '#2ecc71', height: '100%', width: `${uploadProgress}%`, borderRadius: '99px', transition: 'width 0.2s ease' }} />
                    </div>
                  </div>
                )}

                {!uploading && (
                  <>
                    <div style={{ color: isDragging ? '#2ecc71' : '#555', marginBottom: '8px' }}>
                      <Upload size={28} />
                    </div>
                    <div style={{ fontWeight: '700', fontSize: '0.9rem', color: isDragging ? '#2ecc71' : '#aaa', marginBottom: '4px' }}>
                      {isDragging ? 'أفلت الصورة هنا ✨' : 'اسحب وأفلت صورة هنا'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#444' }}>
                      أو اضغط لاختيار ملف • JPG, PNG, WEBP, GIF حتى 10MB
                    </div>
                  </>
                )}

                {uploading && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2ecc71', fontWeight: '700', fontSize: '0.85rem' }}>
                    <Loader2 size={18} className="animate-spin" />
                    يتم الرفع...
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </div>

              {/* OR: external URL */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '12px 0' }}>
                <div style={{ flex: 1, height: '1px', background: '#1a1a1a' }} />
                <span style={{ color: '#333', fontSize: '0.75rem', fontWeight: '700' }}>أو</span>
                <div style={{ flex: 1, height: '1px', background: '#1a1a1a' }} />
              </div>

              <input
                type="text"
                value={formData.image_url}
                placeholder="أدخل رابط صورة خارجية مباشر"
                onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                style={{ ...inputStyle, direction: 'ltr' }}
              />

              {formData.image_url && !uploading && (
                <div style={{ marginTop: '10px', fontSize: '0.75rem', color: '#444', wordBreak: 'break-all', direction: 'ltr' }}>
                  🔗 {formData.image_url.length > 60 ? formData.image_url.slice(0, 60) + '...' : formData.image_url}
                </div>
              )}
            </section>

            {/* ── فيديو يوتيوب ── */}
            <section style={formSection}>
              <h3 style={sectionTitle}>🎬 فيديو يوتيوب</h3>
              <div style={inputGroup}>
                <label style={labelStyle}>رابط الفيديو (اختياري)</label>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={formData.video_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, video_url: e.target.value }))}
                  style={{ ...inputStyle, direction: 'ltr' }}
                />
              </div>

              {formData.video_url && (
                youtubeId ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#0a1a0a', border: '1px solid #2ecc71', borderRadius: '10px', padding: '12px' }}>
                    <img
                      src={`https://img.youtube.com/vi/${youtubeId}/default.jpg`}
                      alt="thumbnail"
                      style={{ width: '90px', height: '68px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                    />
                    <div>
                      <div style={{ color: '#2ecc71', fontWeight: '800', fontSize: '0.85rem', marginBottom: '4px' }}>✅ تم التعرف على الفيديو</div>
                      <div style={{ color: '#555', fontSize: '0.72rem', direction: 'ltr' }}>ID: {youtubeId}</div>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, video_url: '' }))}
                        style={{ marginTop: '6px', background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700', padding: 0 }}
                      >
                        ✕ حذف الفيديو
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: '#ff4d4d', fontSize: '0.8rem', fontWeight: '700', marginTop: '6px' }}>
                    ⚠️ الرابط غير صحيح — تأكد أنه رابط يوتيوب صحيح
                  </div>
                )
              )}

              {!formData.video_url && (
                <div style={{ color: '#333', fontSize: '0.78rem', marginTop: '8px' }}>
                  يقبل روابط: youtube.com/watch · youtu.be · youtube.com/shorts
                </div>
              )}
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
                    <select value={row.car_make} onChange={(e) => updateCarRow(index, 'car_make', e.target.value)} style={inputStyle}>
                      <option value="">اختر الماركة</option>
                      {options.makes.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select value={row.car_model} onChange={(e) => updateCarRow(index, 'car_model', e.target.value)} disabled={!row.car_make} style={{ ...inputStyle, opacity: !row.car_make ? 0.4 : 1, cursor: !row.car_make ? 'not-allowed' : 'pointer' }}>
                      <option value="">{!row.car_make ? 'اختر الماركة أولاً' : 'اختر الموديل'}</option>
                      {modelOptions.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <input type="text" placeholder="مثال: 2010-2020" value={row.car_model_year} onChange={(e) => updateCarRow(index, 'car_model_year', e.target.value)} style={inputStyle} />
                    <button type="button" onClick={() => removeCarRow(index)} style={{ background: '#1a0a0a', border: '1px solid #333', borderRadius: '8px', color: '#ff4d4d', cursor: 'pointer', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

            <button type="button" onClick={addCarRow} style={{ marginTop: '12px', padding: '10px 20px', background: '#0a1a0a', border: '1px dashed #2ecc71', borderRadius: '10px', color: '#2ecc71', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={16} /> إضافة سيارة أخرى
            </button>
          </section>

          <button type="submit" disabled={saving || uploading} style={{ ...saveBtnStyle, opacity: uploading ? 0.7 : 1, cursor: uploading ? 'not-allowed' : 'pointer' }}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            {saving ? 'جاري الحفظ...' : uploading ? 'انتظر حتى اكتمال الرفع...' : 'حفظ التعديلات النهائية'}
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
const inputStyle: any = { width: '100%', padding: '10px 12px', backgroundColor: '#000', border: '1px solid #222', borderRadius: '10px', color: '#fff', outline: 'none', fontSize: '0.85rem', boxSizing: 'border-box' };
const dropZoneStyle: any = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '28px 20px', borderRadius: '14px', minHeight: '160px', textAlign: 'center', userSelect: 'none' };
const previewImage: any = { width: '110px', height: '110px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #2ecc71', display: 'block' };
const saveBtnStyle: any = { width: '100%', padding: '18px', backgroundColor: '#2ecc71', color: '#000', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', fontSize: '1rem' };
const backBtnStyle: any = { backgroundColor: '#111', border: '1px solid #222', borderRadius: '10px', padding: '10px', color: '#fff', cursor: 'pointer' };
const fullPageCenter: any = { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#050505' };