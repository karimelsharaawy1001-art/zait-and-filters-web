'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import { Trash2, Save, ImageOff, Car, Plus, PenLine } from 'lucide-react';
import toast from 'react-hot-toast';

interface CarEntry {
  id?: string;
  make: string;
  model: string;
  image_url: string | null;
  year_from?: number | null;
  year_to?: number | null;
}

export default function CarImagesAdmin() {
  const [allCars, setAllCars] = useState<CarEntry[]>([]);
  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [selectedMake, setSelectedMake] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  // ── New: manual entry mode ──
  const [manualMode, setManualMode] = useState(false);
  const [manualMake, setManualMake] = useState('');
  const [manualModel, setManualModel] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [{ data: compatData }, { data: productData }] = await Promise.all([
        supabase.from('product_car_compatibility').select('car_make, car_model').not('car_make', 'is', null).neq('car_make', ''),
        supabase.from('products').select('car_make, car_model').not('car_make', 'is', null).neq('car_make', ''),
      ]);

      const pairSet = new Set<string>();
      const allPairs: { make: string; model: string }[] = [];

      for (const row of [...(compatData || []), ...(productData || [])]) {
        const make = row.car_make?.trim();
        const model = row.car_model?.trim();
        if (!make || !model) continue;
        const key = `${make.toUpperCase()}|||${model.toUpperCase()}`;
        if (!pairSet.has(key)) { pairSet.add(key); allPairs.push({ make, model }); }
      }

      allPairs.sort((a, b) => a.make.localeCompare(b.make) || a.model.localeCompare(b.model));

      const { data: imagesData } = await supabase.from('car_images').select('*').order('car_make', { ascending: true });

      const imageMap: Record<string, CarEntry[]> = {};
      for (const img of imagesData || []) {
        const key = `${img.car_make?.trim().toUpperCase()}|||${img.car_model?.trim().toUpperCase()}`;
        if (!imageMap[key]) imageMap[key] = [];
        imageMap[key].push({ id: img.id, make: img.car_make, model: img.car_model, image_url: img.image_url, year_from: img.year_from ?? null, year_to: img.year_to ?? null });
      }

      const result: CarEntry[] = [];
      for (const { make, model } of allPairs) {
        const key = `${make.toUpperCase()}|||${model.toUpperCase()}`;
        const images = imageMap[key];
        if (images && images.length > 0) images.forEach((img) => result.push(img));
        else result.push({ make, model, image_url: null });
      }

      // Also include any car_images entries whose make/model aren't in products
      for (const img of imagesData || []) {
        const key = `${img.car_make?.trim().toUpperCase()}|||${img.car_model?.trim().toUpperCase()}`;
        const alreadyIn = result.some(r => r.id === img.id);
        if (!alreadyIn) {
          result.push({ id: img.id, make: img.car_make, model: img.car_model, image_url: img.image_url, year_from: img.year_from ?? null, year_to: img.year_to ?? null });
        }
      }

      setAllCars(result);
      const uniqueMakes = Array.from(new Set(allPairs.map((p) => p.make))).sort();
      setMakes(uniqueMakes as string[]);
    } catch (err) {
      console.error(err);
      toast.error('خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }

  async function handleMakeChange(make: string) {
    setSelectedMake(make);
    setSelectedModel('');
    setModels([]);
    if (!make) return;
    const [{ data: compatModels }, { data: productModels }] = await Promise.all([
      supabase.from('product_car_compatibility').select('car_model').ilike('car_make', make.trim()).not('car_model', 'is', null).neq('car_model', ''),
      supabase.from('products').select('car_model').ilike('car_make', make.trim()).not('car_model', 'is', null).neq('car_model', ''),
    ]);
    const allModels = new Set([
      ...(compatModels || []).map((r: any) => r.car_model?.trim()).filter(Boolean),
      ...(productModels || []).map((r: any) => r.car_model?.trim()).filter(Boolean),
    ]);
    setModels(Array.from(allModels).sort() as string[]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Resolve make/model from either manual or dropdown
    const finalMake = manualMode ? manualMake.trim() : selectedMake;
    const finalModel = manualMode ? manualModel.trim() : selectedModel;

    if (!finalMake || !finalModel || !imageUrl) {
      toast.error('يرجى ملء جميع الحقول');
      return;
    }

    const yFrom = yearFrom ? parseInt(yearFrom) : null;
    const yTo = yearTo ? parseInt(yearTo) : null;

    if ((yFrom && !yTo) || (!yFrom && yTo)) {
      toast.error('يرجى إدخال سنة البداية والنهاية معاً، أو تركهما فارغين');
      return;
    }

    setUploading(true);

    const payload = {
      car_make: finalMake,
      car_model: finalModel,
      image_url: imageUrl.trim(),
      year_from: yFrom,
      year_to: yTo,
    };

    if (editingId) {
      const { error } = await supabase.from('car_images').update(payload).eq('id', editingId);
      if (error) { toast.error('حدث خطأ: ' + error.message); }
      else {
        toast.success('تم التحديث بنجاح ✅');
        fetch('/api/revalidate-car', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ make: finalMake }) });
        fetchData(); resetForm();
      }
    } else {
      const { error } = await supabase.from('car_images').insert(payload);
      if (error) { toast.error('حدث خطأ: ' + error.message); }
      else {
        toast.success(`تمت إضافة ${finalMake} ${finalModel} بنجاح ✅`);
        fetch('/api/revalidate-car', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ make: finalMake }) });
        fetchData(); resetForm();
      }
    }

    setUploading(false);
  }

  async function handleDelete(id: string) {
    const entry = allCars.find(c => c.id === id);
    const { error } = await supabase.from('car_images').delete().eq('id', id);
    if (error) { toast.error('حدث خطأ'); }
    else {
      toast.success('تم الحذف');
      if (entry?.make) fetch('/api/revalidate-car', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ make: entry.make }) });
      setDeleteConfirm(null); fetchData();
    }
  }

  function resetForm() {
    setSelectedMake('');
    setSelectedModel('');
    setYearFrom('');
    setYearTo('');
    setImageUrl('');
    setModels([]);
    setEditingId(null);
    setManualMode(false);
    setManualMake('');
    setManualModel('');
  }

  function prefillForm(car: CarEntry) {
    setEditingId(car.id || null);
    setManualMode(false);
    handleMakeChange(car.make).then(() => setSelectedModel(car.model));
    setYearFrom(car.year_from ? String(car.year_from) : '');
    setYearTo(car.year_to ? String(car.year_to) : '');
    setImageUrl(car.image_url || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const grouped: Record<string, CarEntry[]> = {};
  for (const car of allCars) {
    const key = `${car.make}|||${car.model}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(car);
  }

  const withImage = Object.entries(grouped).filter(([, entries]) => entries.some((e) => e.image_url));
  const withoutImage = Object.entries(grouped).filter(([, entries]) => entries.every((e) => !e.image_url));

  return (
    <div style={{ direction: 'rtl', padding: 'clamp(14px, 4vw, 30px)', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: 'clamp(1.3rem, 5vw, 2.5rem)', fontWeight: '900', marginBottom: '24px' }}>إدارة صور السيارات</h1>

      {/* ── Form ── */}
      <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '20px', marginBottom: '40px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '20px' }}>
          {editingId ? '✏️ تعديل صورة' : '➕ إضافة صورة جديدة'}
        </h2>

        {/* ── Toggle between dropdown and manual entry ── */}
        {!editingId && (
          <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
            <button
              type="button"
              onClick={() => { setManualMode(false); setManualMake(''); setManualModel(''); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '10px 20px', borderRadius: '12px', cursor: 'pointer',
                fontWeight: '800', fontSize: '0.88rem', border: 'none',
                background: !manualMode ? '#22c55e' : '#f0f0f0',
                color: !manualMode ? '#fff' : '#555',
                transition: 'all 0.2s',
              }}
            >
              <Car size={16} /> من السيارات الموجودة
            </button>
            <button
              type="button"
              onClick={() => { setManualMode(true); setSelectedMake(''); setSelectedModel(''); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '10px 20px', borderRadius: '12px', cursor: 'pointer',
                fontWeight: '800', fontSize: '0.88rem', border: 'none',
                background: manualMode ? '#22c55e' : '#f0f0f0',
                color: manualMode ? '#fff' : '#555',
                transition: 'all 0.2s',
              }}
            >
              <PenLine size={16} /> إضافة ماركة/موديل جديد
            </button>
          </div>
        )}

        {/* ── New car banner ── */}
        {manualMode && (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', fontSize: '0.85rem', color: '#15803d', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={16} />
            ستُضاف الصورة للسيارة الجديدة — يمكنك إضافة منتجات لها لاحقاً من صفحة إضافة منتج
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '20px' }}>

            {manualMode ? (
              /* ── Manual make + model inputs ── */
              <>
                <div>
                  <label style={labelStyle}>الماركة (جديدة)</label>
                  <input
                    type="text"
                    value={manualMake}
                    onChange={(e) => setManualMake(e.target.value)}
                    placeholder="مثال: BMW"
                    required
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>الموديل (جديد)</label>
                  <input
                    type="text"
                    value={manualModel}
                    onChange={(e) => setManualModel(e.target.value)}
                    placeholder="مثال: X5"
                    required
                    style={inputStyle}
                  />
                </div>
              </>
            ) : (
              /* ── Existing dropdowns ── */
              <>
                <div>
                  <label style={labelStyle}>الماركة</label>
                  <select
                    value={selectedMake}
                    onChange={(e) => handleMakeChange(e.target.value)}
                    style={selectStyle}
                    required={!manualMode}
                  >
                    <option value="">اختر الماركة</option>
                    {makes.map((make) => <option key={make} value={make}>{make}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>الموديل</label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    disabled={!selectedMake}
                    style={{ ...selectStyle, opacity: !selectedMake ? 0.5 : 1, cursor: !selectedMake ? 'not-allowed' : 'pointer' }}
                    required={!manualMode}
                  >
                    <option value="">اختر الموديل</option>
                    {models.map((model) => <option key={model} value={model}>{model}</option>)}
                  </select>
                </div>
              </>
            )}

            {/* Year From */}
            <div>
              <label style={labelStyle}>سنة البداية <span style={{ color: '#9ca3af', fontWeight: '500' }}>(اختياري)</span></label>
              <input type="number" value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} placeholder="مثال: 2015" min="1990" max="2030" style={inputStyle} />
            </div>

            {/* Year To */}
            <div>
              <label style={labelStyle}>سنة النهاية <span style={{ color: '#9ca3af', fontWeight: '500' }}>(اختياري)</span></label>
              <input type="number" value={yearTo} onChange={(e) => setYearTo(e.target.value)} placeholder="مثال: 2020" min="1990" max="2030" style={inputStyle} />
            </div>

            {/* Image URL */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>رابط الصورة</label>
              <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://example.com/image.jpg" style={inputStyle} required />
            </div>
          </div>

          {/* Preview */}
          {imageUrl && (
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontWeight: '700', fontSize: '0.85rem', marginBottom: '8px', color: '#555' }}>معاينة:</p>
              <img src={imageUrl} alt="preview" style={{ height: '120px', objectFit: 'contain', borderRadius: '10px', border: '1px solid #e5e5e5', padding: '8px', backgroundColor: '#f9f9f9' }} onError={(e) => (e.currentTarget.style.display = 'none')} />
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="submit"
              disabled={uploading}
              style={{ padding: '14px 36px', backgroundColor: '#22c55e', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '1rem', cursor: uploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
            >
              <Save size={20} />
              {uploading ? 'جاري الحفظ...' : editingId ? 'تحديث' : manualMode ? 'إضافة سيارة جديدة وحفظ الصورة' : 'حفظ'}
            </button>
            {(editingId || manualMode) && (
              <button type="button" onClick={resetForm} style={{ padding: '14px 24px', backgroundColor: '#ffffff', color: '#555', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '1rem', cursor: 'pointer' }}>
                إلغاء
              </button>
            )}
          </div>
        </form>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '1.1rem' }}>جاري التحميل...</p>
      ) : (
        <>
          {/* ── Without Image ── */}
          {withoutImage.length > 0 && (
            <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '20px', marginBottom: '30px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '20px', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ImageOff size={22} /> سيارات بدون صورة ({withoutImage.length})
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '15px' }}>
                {withoutImage.map(([key, entries]) => {
                  const car = entries[0];
                  return (
                    <div key={key} style={{ backgroundColor: '#fff5f5', border: '2px dashed #fca5a5', borderRadius: '14px', padding: '20px', textAlign: 'center' }}>
                      <ImageOff size={36} color="#fca5a5" style={{ margin: '0 auto 10px' }} />
                      <p style={{ fontWeight: '900', fontSize: '1rem', color: '#1a1a1a', marginBottom: '4px' }}>{car.make}</p>
                      <p style={{ fontWeight: '700', fontSize: '0.85rem', color: '#666', marginBottom: '14px' }}>{car.model}</p>
                      <button onClick={() => prefillForm(car)} style={{ width: '100%', padding: '9px', backgroundColor: '#22c55e', color: '#fff', border: 'none', borderRadius: '9px', cursor: 'pointer', fontWeight: '800', fontSize: '0.85rem' }}>
                        + إضافة صورة
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── With Image ── */}
          {withImage.length > 0 && (
            <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '20px', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Car size={22} /> سيارات بصورة ({withImage.length})
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {withImage.map(([key, entries]) => (
                  <div key={key} style={{ border: '1px solid #e5e5e5', borderRadius: '16px', overflow: 'hidden', backgroundColor: '#f9f9f9' }}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0f0f0', backgroundColor: '#fff' }}>
                      <p style={{ fontWeight: '900', fontSize: '1rem', margin: 0 }}>{entries[0].make} — {entries[0].model}</p>
                    </div>
                    {entries.filter((e) => e.image_url).map((entry) => (
                      <div key={entry.id} style={{ padding: '14px 16px', borderBottom: '1px solid #f0f0f0', backgroundColor: '#fff', marginBottom: '2px' }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <img src={entry.image_url!} alt={`${entry.make} ${entry.model}`} style={{ width: '80px', height: '60px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #e5e5e5', backgroundColor: '#f9f9f9', flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            {entry.year_from && entry.year_to ? (
                              <span style={{ display: 'inline-block', backgroundColor: '#dcfce7', color: '#166534', padding: '3px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '800', marginBottom: '8px' }}>{entry.year_from} — {entry.year_to}</span>
                            ) : (
                              <span style={{ display: 'inline-block', backgroundColor: '#f0f9ff', color: '#0369a1', padding: '3px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '800', marginBottom: '8px' }}>كل السنوات</span>
                            )}
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button onClick={() => prefillForm(entry)} style={{ flex: 1, padding: '7px', backgroundColor: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '0.82rem' }}>تعديل</button>
                              <button onClick={() => setDeleteConfirm(entry.id!)} style={{ flex: 1, padding: '7px', backgroundColor: '#fee', color: '#16a34a', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '0.82rem' }}>
                                <Trash2 size={13} /> حذف
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div style={{ padding: '10px 16px' }}>
                      <button
                        onClick={() => { handleMakeChange(entries[0].make).then(() => setSelectedModel(entries[0].model)); setEditingId(null); setImageUrl(''); setYearFrom(''); setYearTo(''); setManualMode(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        style={{ width: '100%', padding: '8px', backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px dashed #86efac', borderRadius: '9px', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem' }}
                      >
                        + إضافة سنة مختلفة
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '40px 36px', maxWidth: '400px', width: '90%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>🗑️</div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: '900', marginBottom: '10px', color: '#1a1a1a' }}>تأكيد الحذف</h3>
            <p style={{ color: '#666', fontSize: '0.95rem', marginBottom: '10px', lineHeight: 1.6 }}>هل أنت متأكد من حذف هذه الصورة؟</p>
            <p style={{ color: '#16a34a', fontWeight: '700', fontSize: '0.9rem', marginBottom: '28px' }}>لا يمكن التراجع عن هذا الإجراء</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={() => handleDelete(deleteConfirm)} style={{ padding: '12px 32px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trash2 size={16} /> نعم، احذف
              </button>
              <button onClick={() => setDeleteConfirm(null)} style={{ padding: '12px 32px', backgroundColor: '#ffffff', color: '#555', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '1rem', cursor: 'pointer' }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle: any = { display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '0.9rem' };
const inputStyle: any = { width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e5e5e5', fontSize: '1rem', boxSizing: 'border-box' };
const selectStyle: any = { width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e5e5e5', fontSize: '1rem' };