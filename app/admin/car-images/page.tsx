'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import { Trash2, Save, ImageOff, Car } from 'lucide-react';
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

  const [selectedMake, setSelectedMake] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      // 1. Get all unique make+model pairs from BOTH tables
      const [{ data: compatData }, { data: productData }] = await Promise.all([
        supabase
          .from('product_car_compatibility')
          .select('car_make, car_model')
          .not('car_make', 'is', null)
          .neq('car_make', ''),
        supabase
          .from('products')
          .select('car_make, car_model')
          .not('car_make', 'is', null)
          .neq('car_make', ''),
      ]);

      const pairSet = new Set<string>();
      const allPairs: { make: string; model: string }[] = [];

      for (const row of [...(compatData || []), ...(productData || [])]) {
        const make = row.car_make?.trim();
        const model = row.car_model?.trim();
        if (!make || !model) continue;
        const key = `${make.toUpperCase()}|||${model.toUpperCase()}`;
        if (!pairSet.has(key)) {
          pairSet.add(key);
          allPairs.push({ make, model });
        }
      }

      allPairs.sort((a, b) =>
        a.make.localeCompare(b.make) || a.model.localeCompare(b.model)
      );

      // 2. Get all car images (multiple per make+model now)
      const { data: imagesData } = await supabase
        .from('car_images')
        .select('*')
        .order('car_make', { ascending: true });

      // Group images by make|||model key
      const imageMap: Record<string, CarEntry[]> = {};
      for (const img of imagesData || []) {
        const key = `${img.car_make?.trim().toUpperCase()}|||${img.car_model?.trim().toUpperCase()}`;
        if (!imageMap[key]) imageMap[key] = [];
        imageMap[key].push({
          id: img.id,
          make: img.car_make,
          model: img.car_model,
          image_url: img.image_url,
          year_from: img.year_from ?? null,
          year_to: img.year_to ?? null,
        });
      }

      // 3. Build final list — base entries from products, enriched with images
      const result: CarEntry[] = [];

      for (const { make, model } of allPairs) {
        const key = `${make.toUpperCase()}|||${model.toUpperCase()}`;
        const images = imageMap[key];
        if (images && images.length > 0) {
          // Push all image variants for this car
          images.forEach((img) => result.push(img));
        } else {
          // No image at all — push placeholder
          result.push({ make, model, image_url: null });
        }
      }

      setAllCars(result);

      // 4. Makes for the form dropdown
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
      supabase
        .from('product_car_compatibility')
        .select('car_model')
        .ilike('car_make', make.trim())
        .not('car_model', 'is', null)
        .neq('car_model', ''),
      supabase
        .from('products')
        .select('car_model')
        .ilike('car_make', make.trim())
        .not('car_model', 'is', null)
        .neq('car_model', ''),
    ]);

    const allModels = new Set([
      ...(compatModels || []).map((r: any) => r.car_model?.trim()).filter(Boolean),
      ...(productModels || []).map((r: any) => r.car_model?.trim()).filter(Boolean),
    ]);
    setModels(Array.from(allModels).sort() as string[]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMake || !selectedModel || !imageUrl) {
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
      car_make: selectedMake.trim(),
      car_model: selectedModel.trim(),
      image_url: imageUrl.trim(),
      year_from: yFrom,
      year_to: yTo,
    };

    if (editingId) {
      // Update existing record
      const { error } = await supabase
        .from('car_images')
        .update(payload)
        .eq('id', editingId);
      if (error) toast.error('حدث خطأ: ' + error.message);
      else { toast.success('تم التحديث بنجاح ✅'); fetchData(); resetForm(); }
    } else {
      // Insert new record
      const { error } = await supabase.from('car_images').insert(payload);
      if (error) toast.error('حدث خطأ: ' + error.message);
      else { toast.success('تمت الإضافة بنجاح ✅'); fetchData(); resetForm(); }
    }

    setUploading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('هل أنت متأكد من الحذف؟')) return;
    const { error } = await supabase.from('car_images').delete().eq('id', id);
    if (error) toast.error('حدث خطأ');
    else { toast.success('تم الحذف'); fetchData(); }
  }

  function resetForm() {
    setSelectedMake('');
    setSelectedModel('');
    setYearFrom('');
    setYearTo('');
    setImageUrl('');
    setModels([]);
    setEditingId(null);
  }

  function prefillForm(car: CarEntry) {
    setEditingId(car.id || null);
    handleMakeChange(car.make).then(() => setSelectedModel(car.model));
    setYearFrom(car.year_from ? String(car.year_from) : '');
    setYearTo(car.year_to ? String(car.year_to) : '');
    setImageUrl(car.image_url || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Group allCars by make+model for display
  const grouped: Record<string, CarEntry[]> = {};
  for (const car of allCars) {
    const key = `${car.make}|||${car.model}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(car);
  }

  const withImage = Object.entries(grouped).filter(([, entries]) =>
    entries.some((e) => e.image_url)
  );
  const withoutImage = Object.entries(grouped).filter(([, entries]) =>
    entries.every((e) => !e.image_url)
  );

  return (
    <div style={{ direction: 'rtl', padding: '100px 20px 40px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '40px' }}>
        إدارة صور السيارات
      </h1>

      {/* ── Form ── */}
      <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '20px', marginBottom: '40px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '25px' }}>
          {editingId ? '✏️ تعديل صورة' : '➕ إضافة صورة جديدة'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '20px' }}>

            {/* Make */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '0.9rem' }}>الماركة</label>
              <select
                value={selectedMake}
                onChange={(e) => handleMakeChange(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e5e5e5', fontSize: '1rem' }}
                required
              >
                <option value="">اختر الماركة</option>
                {makes.map((make) => (
                  <option key={make} value={make}>{make}</option>
                ))}
              </select>
            </div>

            {/* Model */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '0.9rem' }}>الموديل</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={!selectedMake}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e5e5e5', fontSize: '1rem', opacity: !selectedMake ? 0.5 : 1, cursor: !selectedMake ? 'not-allowed' : 'pointer' }}
                required
              >
                <option value="">اختر الموديل</option>
                {models.map((model) => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>

            {/* Year From */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '0.9rem' }}>
                سنة البداية <span style={{ color: '#888', fontWeight: '500' }}>(اختياري)</span>
              </label>
              <input
                type="number"
                value={yearFrom}
                onChange={(e) => setYearFrom(e.target.value)}
                placeholder="مثال: 2015"
                min="1990"
                max="2030"
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e5e5e5', fontSize: '1rem' }}
              />
            </div>

            {/* Year To */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '0.9rem' }}>
                سنة النهاية <span style={{ color: '#888', fontWeight: '500' }}>(اختياري)</span>
              </label>
              <input
                type="number"
                value={yearTo}
                onChange={(e) => setYearTo(e.target.value)}
                placeholder="مثال: 2020"
                min="1990"
                max="2030"
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e5e5e5', fontSize: '1rem' }}
              />
            </div>

            {/* Image URL */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '0.9rem' }}>رابط الصورة</label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e5e5e5', fontSize: '1rem' }}
                required
              />
            </div>
          </div>

          {/* Preview */}
          {imageUrl && (
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontWeight: '700', fontSize: '0.85rem', marginBottom: '8px', color: '#555' }}>معاينة:</p>
              <img
                src={imageUrl}
                alt="preview"
                style={{ height: '120px', objectFit: 'contain', borderRadius: '10px', border: '1px solid #e5e5e5', padding: '8px', backgroundColor: '#f9f9f9' }}
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="submit"
              disabled={uploading}
              style={{ padding: '14px 36px', backgroundColor: '#22c55e', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '1rem', cursor: uploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
            >
              <Save size={20} />
              {uploading ? 'جاري الحفظ...' : editingId ? 'تحديث' : 'حفظ'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                style={{ padding: '14px 24px', backgroundColor: '#f5f5f5', color: '#555', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '1rem', cursor: 'pointer' }}
              >
                إلغاء التعديل
              </button>
            )}
          </div>
        </form>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#888', fontSize: '1.1rem' }}>جاري التحميل...</p>
      ) : (
        <>
          {/* ── Without Image ── */}
          {withoutImage.length > 0 && (
            <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '20px', marginBottom: '30px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '20px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                      <button
                        onClick={() => prefillForm(car)}
                        style={{ width: '100%', padding: '9px', backgroundColor: '#22c55e', color: '#fff', border: 'none', borderRadius: '9px', cursor: 'pointer', fontWeight: '800', fontSize: '0.85rem' }}
                      >
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
                    {/* Make + Model header */}
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0f0f0', backgroundColor: '#fff' }}>
                      <p style={{ fontWeight: '900', fontSize: '1rem', margin: 0 }}>
                        {entries[0].make} — {entries[0].model}
                      </p>
                    </div>

                    {/* All image variants for this car */}
                    {entries.filter((e) => e.image_url).map((entry) => (
                      <div key={entry.id} style={{ padding: '14px 16px', borderBottom: '1px solid #f0f0f0', backgroundColor: '#fff', marginBottom: '2px' }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <img
                            src={entry.image_url!}
                            alt={`${entry.make} ${entry.model}`}
                            style={{ width: '80px', height: '60px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #e5e5e5', backgroundColor: '#f9f9f9', flexShrink: 0 }}
                          />
                          <div style={{ flex: 1 }}>
                            {entry.year_from && entry.year_to ? (
                              <span style={{ display: 'inline-block', backgroundColor: '#dcfce7', color: '#166534', padding: '3px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '800', marginBottom: '8px' }}>
                                {entry.year_from} — {entry.year_to}
                              </span>
                            ) : (
                              <span style={{ display: 'inline-block', backgroundColor: '#f0f9ff', color: '#0369a1', padding: '3px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '800', marginBottom: '8px' }}>
                                كل السنوات
                              </span>
                            )}
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={() => prefillForm(entry)}
                                style={{ flex: 1, padding: '7px', backgroundColor: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '0.82rem' }}
                              >
                                تعديل
                              </button>
                              <button
                                onClick={() => handleDelete(entry.id!)}
                                style={{ flex: 1, padding: '7px', backgroundColor: '#fee', color: '#dc2626', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '0.82rem' }}
                              >
                                <Trash2 size={13} /> حذف
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Add another year variant */}
                    <div style={{ padding: '10px 16px' }}>
                      <button
                        onClick={() => { handleMakeChange(entries[0].make).then(() => setSelectedModel(entries[0].model)); setEditingId(null); setImageUrl(''); setYearFrom(''); setYearTo(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
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
    </div>
  );
}
