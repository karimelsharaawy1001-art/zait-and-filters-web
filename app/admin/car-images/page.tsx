'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import { Upload, Trash2, Save, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';


export default function CarImagesAdmin() {
  const [carImages, setCarImages] = useState<any[]>([]);
  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);

  const [selectedMake, setSelectedMake] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);


  useEffect(() => {
    fetchCarImages();
    fetchMakesAndModels();
  }, []);


  async function fetchCarImages() {
    const { data } = await supabase
      .from('car_images')
      .select('*')
      .order('created_at', { ascending: false });
    setCarImages(data || []);
  }


  async function fetchMakesAndModels() {
    const { data } = await supabase.from('products').select('car_make, car_model');
    if (data) {
      const uniqueMakes = Array.from(new Set(data.map((p) => p.car_make).filter(Boolean)));
      const uniqueModels = Array.from(new Set(data.map((p) => p.car_model).filter(Boolean)));
      setMakes(uniqueMakes as string[]);
      setModels(uniqueModels as string[]);
    }
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
      .single();

    if (existing) {
      const { error } = await supabase
        .from('car_images')
        .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
        .eq('id', existing.id);

      if (error) {
        toast.error('حدث خطأ');
      } else {
        toast.success('تم التحديث بنجاح');
        fetchCarImages();
        resetForm();
      }
    } else {
      const { error } = await supabase.from('car_images').insert({
        car_make: selectedMake,
        car_model: selectedModel,
        image_url: imageUrl,
      });

      if (error) {
        toast.error('حدث خطأ');
      } else {
        toast.success('تمت الإضافة بنجاح');
        fetchCarImages();
        resetForm();
      }
    }

    setUploading(false);
  }


  async function handleDelete(id: string) {
    if (confirm('هل أنت متأكد من الحذف؟')) {
      const { error } = await supabase.from('car_images').delete().eq('id', id);
      if (error) {
        toast.error('حدث خطأ');
      } else {
        toast.success('تم الحذف');
        fetchCarImages();
      }
    }
  }


  function resetForm() {
    setSelectedMake('');
    setSelectedModel('');
    setImageUrl('');
  }


  return (
    <div style={{ direction: 'rtl', padding: '100px 20px 40px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '40px' }}>
        إدارة صور السيارات
      </h1>

      {/* Add Form */}
      <div
        style={{
          backgroundColor: '#fff',
          padding: '30px',
          borderRadius: '20px',
          marginBottom: '40px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        }}
      >
        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '25px' }}>
          إضافة صورة جديدة
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '0.9rem' }}>
                الماركة
              </label>
              <select
                value={selectedMake}
                onChange={(e) => setSelectedMake(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e5e5e5', fontSize: '1rem' }}
                required
              >
                <option value="">اختر الماركة</option>
                {makes.map((make) => (
                  <option key={make} value={make}>{make}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '0.9rem' }}>
                الموديل
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e5e5e5', fontSize: '1rem' }}
                required
              >
                <option value="">اختر الموديل</option>
                {models.map((model) => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '0.9rem' }}>
                رابط الصورة
              </label>
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

          <button
            type="submit"
            disabled={uploading}
            style={{
              padding: '15px 40px',
              backgroundColor: '#22c55e',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              fontWeight: '800',
              fontSize: '1.1rem',
              cursor: uploading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <Save size={20} />
            {uploading ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </form>
      </div>

      {/* Images List */}
      <div
        style={{
          backgroundColor: '#fff',
          padding: '30px',
          borderRadius: '20px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        }}
      >
        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '25px' }}>
          الصور المضافة ({carImages.length})
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {carImages.map((car) => (
            <div
              key={car.id}
              style={{ border: '1px solid #e5e5e5', borderRadius: '15px', overflow: 'hidden', backgroundColor: '#f9f9f9' }}
            >
              <div
                style={{ height: '200px', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <img
                  src={car.image_url}
                  alt={`${car.car_make} ${car.car_model}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              <div style={{ padding: '15px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '5px' }}>
                  {car.car_make} {car.car_model}
                </h3>

                <button
                  onClick={() => handleDelete(car.id)}
                  style={{
                    width: '100%',
                    marginTop: '10px',
                    padding: '10px',
                    backgroundColor: '#fee',
                    color: '#dc2626',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <Trash2 size={16} />
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
