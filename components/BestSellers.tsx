'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import { Loader2, ShoppingCart, Flame, Car } from 'lucide-react';
import { motion } from 'framer-motion';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

export default function BestSellers() {
  const [bestSellers, setBestSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getRealBestSellers() {
      try {
        // 1. جلب كل الطلبات المسجلة (ناخد آخر 100 طلب كمثال للتحليل)
        const { data: orders, error: orderError } = await supabase
          .from('orders')
          .select('items')
          .order('created_at', { ascending: false })
          .limit(100);

        if (orderError) throw orderError;

        // 2. تحليل البيانات لحساب الأكثر تكراراً
        const productCounts: Record<string, number> = {};
        orders?.forEach((order: any) => {
          const items = order.items || [];
          items.forEach((item: any) => {
            productCounts[item.id] = (productCounts[item.id] || 0) + (item.quantity || 1);
          });
        });

        // 3. ترتيب المنتجات حسب عدد المبيعات وأخذ أفضل 10
        const sortedIds = Object.entries(productCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([id]) => id);

        if (sortedIds.length > 0) {
          // 4. جلب بيانات المنتجات دي من جدول الـ products
          const { data: products, error: prodError } = await supabase
            .from('products')
            .select('*')
            .in('id', sortedIds);

          if (prodError) throw prodError;
          
          // إعادة ترتيب المنتجات لتطابق ترتيب "الأكثر مبيعاً"
          const orderedProducts = sortedIds.map(id => products.find(p => p.id === id)).filter(Boolean);
          setBestSellers(orderedProducts);
        }
      } catch (err) {
        console.error('Error fetching best sellers:', err);
      } finally {
        setLoading(false);
      }
    }

    getRealBestSellers();
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
      <Loader2 className="animate-spin" size={30} color="#22c55e" />
    </div>
  );

  if (bestSellers.length === 0) return null;

  return (
    <section style={sectionWrapper}>
      <div style={headerRow}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={fireIconBox}><Flame size={20} fill="#ff4d4d" color="#ff4d4d" /></div>
          <h2 style={sectionTitle}>الأكثر مبيعاً الآن</h2>
        </div>
        <p style={subTitle}>القطع الأكثر طلباً من قبل عملائنا بناءً على إحصائيات حقيقية</p>
      </div>

      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
        spaceBetween={20}
        slidesPerView={1.2}
        navigation
        pagination={{ clickable: true }}
        autoplay={{ delay: 4000 }}
        breakpoints={{
          640: { slidesPerView: 2.2 },
          1024: { slidesPerView: 4 },
        }}
        style={{ padding: '10px 5px 40px' }}
      >
        {bestSellers.map((p) => (
          <SwiperSlide key={p.id}>
            <motion.div whileHover={{ y: -5 }} style={productCard}>
              <div className="zf-bs-image-area" style={{ position: 'relative' }}>
                <div style={bestLabel}>الأكثر طلباً</div>
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} width="153" height="153" loading="lazy" decoding="async" style={imgStyle} />
                ) : (
                  <Car size={40} color="#eee" />
                )}
              </div>
              <div style={contentArea}>
                <span style={brandText}>{p.brand}</span>
                <h3 style={prodName}>{p.name}</h3>
                <div style={priceRow}>
                   <span style={priceText}>{p.sale_price || p.regular_price} <small>ج.م</small></span>
                   <button style={cartBtn}><ShoppingCart size={16} /></button>
                </div>
              </div>
            </motion.div>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}

// --- التنسيقات (نفس روح الكاروسيل بتاع العروض) ---
const sectionWrapper: any = { padding: '40px 20px', maxWidth: '1200px', margin: '0 auto', direction: 'rtl' };
const headerRow: any = { marginBottom: '25px', textAlign: 'right' };
const sectionTitle: any = { fontSize: '1.6rem', fontWeight: '900', color: '#1a1a1a', margin: 0 };
const subTitle: any = { color: '#777', fontSize: '0.9rem', marginTop: '5px' };
const fireIconBox: any = { background: '#fff1f1', padding: '8px', borderRadius: '12px' };

const productCard: any = { background: '#fff', borderRadius: '20px', border: '1px solid #f0f0f0', overflow: 'hidden', height: '100%', boxShadow: '0 5px 15px rgba(0,0,0,0.02)' };
const imgStyle: any = { maxWidth: '85%', maxHeight: '85%', objectFit: 'contain' };
const bestLabel: any = { position: 'absolute', top: '12px', right: '12px', background: '#ff4d4d', color: '#fff', padding: '4px 10px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 'bold', zIndex: 5 };

const contentArea: any = { padding: '15px', textAlign: 'right' };
const brandText: any = { color: '#22c55e', fontSize: '0.75rem', fontWeight: 'bold' };
const prodName: any = { fontSize: '0.95rem', fontWeight: '800', margin: '8px 0', height: '40px', overflow: 'hidden', color: '#333' };
const priceRow: any = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' };
const priceText: any = { fontSize: '1.1rem', fontWeight: '900', color: '#1a1a1a' };
const cartBtn: any = { background: '#1a1a1a', color: '#fff', border: 'none', padding: '8px', borderRadius: '10px', cursor: 'pointer' };