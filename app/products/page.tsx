'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { optimizeImageUrl } from '@/lib/images';

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getProducts() {
      try {
        const { data, error: supabaseError } = await supabase
          .from('products')
          .select('*');

        if (supabaseError) throw supabaseError;
        setProducts(data || []);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'حدث خطأ غير متوقع');
      } finally {
        setLoading(false);
      }
    }
    getProducts();
  }, []);

  if (loading) return (
    <div style={{ backgroundColor: '#000', color: '#fff', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif' }}>
      <h2>جاري فحص المحرك وتحميل المنتجات...</h2>
    </div>
  );

  if (error) return (
    <div style={{ backgroundColor: '#000', color: '#ff4d4d', padding: '50px', height: '100vh', direction: 'rtl', fontFamily: 'sans-serif' }}>
      <h1>عفواً، فشل الاتصال بقاعدة البيانات</h1>
      <p style={{ color: '#ccc' }}>السبب: {error}</p>
      <ul style={{ color: '#888', marginTop: '20px' }}>
        <li>تأكد من إغلاق أي AdBlocker أو VPN.</li>
        <li>تأكد أن اسم الجدول في سوبابيز هو "products".</li>
      </ul>
    </div>
  );

  return (
    <main style={{ backgroundColor: '#0f0f0f', color: '#fff', minHeight: '100vh', padding: '40px', direction: 'rtl', fontFamily: 'sans-serif' }}>
      <header style={{ borderBottom: '1px solid #333', marginBottom: '30px', paddingBottom: '10px' }}>
        <h1 style={{ color: '#3b82f6', fontSize: '2rem' }}>متجر زيت اند فلترز (Zait & Filters)</h1>
        <p style={{ color: '#666' }}>أهلاً بك في الجيل الجديد من متجرك الإلكتروني</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '25px' }}>
        {products.length > 0 ? (
          products.map((item) => {
            // محاولة جلب رابط الصورة من أكثر من احتمال لاسم العمود
            const currentImageUrl = item.image_url || item._image_url || item.Image_URL;

            return (
              <div key={item.id} style={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '15px', padding: '20px', transition: '0.3s', display: 'flex', flexDirection: 'column' }}>
                
                {/* عرض صورة المنتج مع معالجة الأخطاء */}
                <div style={{ backgroundColor: '#fff', height: '200px', borderRadius: '10px', marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {currentImageUrl ? (
                    <img 
                      src={optimizeImageUrl(currentImageUrl.trim())} 
                      alt={item.name} 
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      onError={(e) => {
                        // في حالة الرابط معطل، يظهر مربع بديل
                        e.currentTarget.src = 'https://via.placeholder.com/300x300?text=جاري+توفير+الصورة';
                      }}
                    />
                  ) : (
                    <div style={{ color: '#888', textAlign: 'center' }}>
                      <p style={{ fontSize: '0.8rem' }}>صورة المنتج</p>
                    </div>
                  )}
                </div>

                {/* الماركة والتصنيف */}
                <div style={{ marginBottom: '5px' }}>
                  <span style={{ fontSize: '0.75rem', backgroundColor: '#3b82f6', color: '#fff', padding: '2px 8px', borderRadius: '4px', marginLeft: '5px' }}>
                    {item.brand || 'عام'}
                  </span>
                  {item.subcategory && (
                    <span style={{ fontSize: '0.75rem', backgroundColor: '#333', color: '#bbb', padding: '2px 8px', borderRadius: '4px' }}>
                      {item.subcategory}
                    </span>
                  )}
                </div>

                <h2 style={{ fontSize: '1.25rem', marginBottom: '10px', color: '#fff' }}>{item.name}</h2>

                {/* الوصف التلقائي الذكي */}
                <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '15px', lineHeight: '1.5', flexGrow: 1 }}>
                  {item.name} ماركة {item.brand || 'أصلي'} صناعة {item.country_of_origin || 'ممتازة'}.
                  <br />
                  <span style={{ color: '#666' }}>
                    متوافق مع {item.car_make || 'جميع السيارات'} {item.car_model} {item.car_model_year}
                  </span>
                </p>

                {/* منطقة السعر والزرار */}
                <div style={{ borderTop: '1px solid #222', paddingTop: '15px', marginTop: 'auto' }}>
                  <div style={{ marginBottom: '10px' }}>
                    {item.sale_price ? (
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                        <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#10b981' }}>{item.sale_price} ج.م</span>
                        <span style={{ fontSize: '0.9rem', color: '#ef4444', textDecoration: 'line-through' }}>{item.regular_price} ج.م</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#10b981' }}>{item.regular_price || item.price} ج.م</span>
                    )}
                  </div>
                  
                  <button style={{ width: '100%', backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                    أضف للسلة
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <p>لا توجد منتجات متاحة حالياً. تأكد من رفع ملف الـ CSV بنجاح.</p>
        )}
      </div>
    </main>
  );
}