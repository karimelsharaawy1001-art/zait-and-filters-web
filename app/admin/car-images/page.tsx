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
}

export default function CarImagesAdmin() {
  const [carImages, setCarImages] = useState<any[]>([]);
  const [allCars, setAllCars] = useState<CarEntry[]>([]);
  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);

  const [selectedMake, setSelectedMake] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

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

      // 2. Get existing car images
      const { data: imagesData } = await supabase
        .from('car_images')
        .select('*')
        .order('car_make', { ascending: true });

      const imageMap: Record<string, { id: string; image_url: string }> = {};
      for (const img of imagesData || []) {
        const key = `${img.car_make?.trim().toUpperCase()}|||${img.car_model?.trim().toUpperCase()}`;
        imageMap[key] = { id: img.id, image_url: img.image_url };
      }

      // 3. Build full list — every car that has products, with or without image
      const result: CarEntry[] = allPairs.map(({ make, model }) => {
        const key = `${make.toUpperCase()}|||${model.toUpperCase()}`;
        const existing = imageMap[key];
        return {
          id: existing?.id,
          make,
          model,
          image_url: existing?.image_url ?? null,
        };
      });

      setAllCars(result);
      setCarImages(imagesData || []);

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

  // When make changes → load ONLY its models
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

    setUploading(true);

    const { data: existing } = await supabase
      .from('car_images')
      .select('id')
      .ilike('car_make', selectedMake)
      .ilike('car_model', selectedModel)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('car_images')
        .update({ image_url: imageUrl })
        .eq('id', existing.id);
      if (error) toast.error('حدث خطأ');
      else { toast.success('تم التحديث بنجاح ✅'); fetchData(); resetForm(); }
    } else {
      const { error } = await supabase.from('car_images').insert({
        car_make: selectedMake,
        car_model: selectedModel,
        image_url: imageUrl,
      });
      if (error) toast.error('حدث خطأ');
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
    setImageUrl('');
    setModels([]);
  }

  function prefillForm(car: CarEntry) {
    handleMakeChange(car.make).then(() => setSelectedModel(car.model));
    setImageUrl(car.image_url || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const withImage = allCars.filter((c) => c.image_url);
  const withoutImage = allCars.filter((c) => !c.image_url);

  return (
    <div style={{ direction: 'rtl', padding: '100px 20px 40px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '40px' }}>
        إدارة صور السيارات
      </h1>

      {/* ── Add / Update Form ── */}
      <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '20px', marginBottom: '40px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '25px' }}>
          إضافة / تعديل صورة
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '20px' }}>

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

            {/* Model — only populated after make is chosen */}
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

            {/* Image URL */}
            <div>
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
              <p style={{ fontWeight: '700', fontSize: '0.85rem', marginBottom: '8px', color: '#555' }}>معاينة الصورة:</p>
              <img
                src={imageUrl}
                alt="preview"
                style={{ height: '120px', objectFit: 'contain', borderRadius: '10px', border: '1px solid #e5e5e5', padding: '8px', backgroundColor: '#f9f9f9' }}
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={uploading}
            style={{ padding: '15px 40px', backgroundColor: '#22c55e', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '1.1rem', cursor: uploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <Save size={20} />
            {uploading ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </form>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#888', fontSize: '1.1rem' }}>جاري التحميل...</p>
      ) : (
        <>
          {/* ── Cars WITHOUT image — shown first ── */}
          {withoutImage.length > 0 && (
            <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '20px', marginBottom: '30px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '20px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ImageOff size={22} />
                سيارات بدون صورة ({withoutImage.length})
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
                {withoutImage.map((car) => (
                  <div
                    key={`${car.make}-${car.model}`}
                    style={{ backgroundColor: '#fff5f5', border: '2px dashed #fca5a5', borderRadius: '14px', padding: '20px', textAlign: 'center' }}
                  >
                    <ImageOff size={40} color="#fca5a5" style={{ margin: '0 auto 12px' }} />
                    <p style={{ fontWeight: '900', fontSize: '1rem', color: '#1a1a1a', marginBottom: '4px' }}>{car.make}</p>
                    <p style={{ fontWeight: '700', fontSize: '0.85rem', color: '#666', marginBottom: '14px' }}>{car.model}</p>
                    <button
                      onClick={() => prefillForm(car)}
                      style={{ width: '100%', padding: '9px', backgroundColor: '#22c55e', color: '#fff', border: 'none', borderRadius: '9px', cursor: 'pointer', fontWeight: '800', fontSize: '0.85rem' }}
                    >
                      + إضافة صورة
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Cars WITH image ── */}
          {withImage.length > 0 && (
            <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '20px', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Car size={22} />
                سيارات بصورة ({withImage.length})
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {withImage.map((car) => (
                  <div
                    key={`${car.make}-${car.model}`}
                    style={{ border: '1px solid #e5e5e5', borderRadius: '15px', overflow: 'hidden', backgroundColor: '#f9f9f9' }}
                  >
                    <div style={{ height: '180px', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }}>
                      <img
                        src={car.image_url!}
                        alt={`${car.make} ${car.model}`}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </div>
                    <div style={{ padding: '15px' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '12px' }}>
                        {car.make} — {car.model}
                      </h3>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={() => prefillForm(car)}
                          style={{ flex: 1, padding: '10px', backgroundColor: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '9px', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem' }}
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => handleDelete(car.id!)}
                          style={{ flex: 1, padding: '10px', backgroundColor: '#fee', color: '#dc2626', border: 'none', borderRadius: '9px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.9rem' }}
                        >
                          <Trash2 size={15} />
                          حذف
                        </button>
                      </div>
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
