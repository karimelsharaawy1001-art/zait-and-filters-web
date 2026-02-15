'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, LayoutGrid, Loader2 } from 'lucide-react';

export default function SubCategoriesPage() {
  const { name } = useParams();
  const categoryName = decodeURIComponent(name as string);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSubCategories() {
      try {
        setLoading(true);
        
        // 1. جلب المنتجات التي تتبع هذه الفئة لاستخراج الفئات الفرعية subcategory
        const { data: productsData } = await supabase
          .from('products')
          .select('subcategory, image_url')
          .eq('category', categoryName)
          .neq('subcategory', null);

        // 2. جلب الصور المخصصة من جدول الإعدادات
        const { data: customImages } = await supabase
          .from('category_images')
          .select('name, image_url');

        if (productsData) {
          const uniqueMap = new Map();

          productsData.forEach(p => {
            if (p.subcategory) {
              const cleanName = p.subcategory.trim();
              
              if (!uniqueMap.has(cleanName)) {
                const customImg = customImages?.find(img => img.name.trim() === cleanName);
                
                uniqueMap.set(cleanName, {
                  name: cleanName,
                  image: customImg?.image_url || p.image_url || "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=500"
                });
              }
            }
          });

          const sortedList = Array.from(uniqueMap.values()).sort((a, b) => 
            a.name.localeCompare(b.name, 'ar')
          );
          
          setSubCategories(sortedList);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchSubCategories();
  }, [categoryName]);

  return (
    <div style={{ direction: 'rtl', padding: '40px 20px', maxWidth: '1200px', margin: '0 auto', minHeight: '80vh', backgroundColor: '#fdfdfd' }}>
      
      {/* Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '30px', color: '#666', fontSize: '0.9rem' }}>
        <Link href="/" style={{ color: '#22c55e', textDecoration: 'none', fontWeight: 'bold' }}>الرئيسية</Link>
        <ChevronRight size={16} />
        <span style={{ fontWeight: '800' }}>{categoryName}</span>
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '10px' }}>{categoryName}</h1>
        <div style={{ width: '60px', height: '5px', background: '#22c55e', borderRadius: '5px' }}></div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
          <Loader2 size={40} className="animate-spin" color="#22c55e" />
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', 
          gap: '15px' 
        }}>
          {subCategories.map((sub, index) => (
            <Link href={`/store?cat=${categoryName}&sub=${encodeURIComponent(sub.name)}`} key={index} style={{ textDecoration: 'none' }}>
              <div className="sub-cat-card" style={{
                position: 'relative',
                height: '140px', 
                borderRadius: '20px',
                overflow: 'hidden',
                backgroundColor: '#000', // جعل الخلفية سوداء تماماً لدعم التعتيم
                transition: '0.3s ease',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
              }}>
                <img 
                  src={sub.image} 
                  alt={sub.name} 
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover', 
                    opacity: 0.4, // تقليل الشفافية لزيادة التعتيم
                    filter: 'brightness(0.5)' // تقليل السطوع للنصف
                  }}
                />
                <div style={{
                  position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  // زيادة قوة التدرج الأسود (Dark Overlay)
                  background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 100%)',
                  padding: '10px'
                }}>
                  <span style={{ 
                    color: '#fff', 
                    fontSize: '1.6rem', 
                    fontWeight: '900', 
                    textAlign: 'center', 
                    textShadow: '3px 3px 15px rgba(0,0,0,1)', // تقوية الظل خلف النص
                    lineHeight: '1.1'
                  }}>
                    {sub.name}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!loading && subCategories.length === 0 && (
        <div style={{ textAlign: 'center', padding: '100px 20px', background: '#fff', borderRadius: '20px', border: '1px solid #eee' }}>
          <LayoutGrid size={60} color="#eee" style={{ marginBottom: '20px' }} />
          <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '10px' }}>لا توجد فئات فرعية</h3>
          <p style={{ color: '#888', marginBottom: '20px' }}>يمكنك تصفح جميع المنتجات في قسم {categoryName} مباشرة</p>
          <Link href={`/store?cat=${categoryName}`} style={{ backgroundColor: '#22c55e', color: '#fff', padding: '12px 30px', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold' }}>عرض المنتجات</Link>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .sub-cat-card:hover { transform: translateY(-5px); boxShadow: 0 8px 20px rgba(0,0,0,0.15); }
        .sub-cat-card:hover img { opacity: 0.6; transform: scale(1.05); }
        img { transition: 0.6s ease; }
        @media (max-width: 768px) {
          .sub-cat-card { height: 120px !important; border-radius: 15px !important; }
          .sub-cat-card span { font-size: 1.3rem !important; }
        }
      `}} />
    </div>
  );
}