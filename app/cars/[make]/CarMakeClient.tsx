'use client';
import Link from 'next/link';
import { ShoppingBag, ChevronLeft, Star, Package, Truck, Shield } from 'lucide-react';
import type { CAR_MAKES } from './page';

type CarInfo = typeof CAR_MAKES[string];

interface Props {
  makeKey: string;
  info: CarInfo;
  productCount: number;
  categories: { name: string; img: string; count: number }[];
  featuredProducts: any[];
}

const CATEGORY_ICONS: Record<string, string> = {
  'فلاتر': '🔵', 'زيوت موتور': '🛢️', 'الفرامل': '🔴', 'عفشة': '⚙️',
  'سيور و بلي': '🔗', 'دورة تبريد و تكييف': '❄️', 'دورة البنزين': '⛽',
  'بوجيهات و سلوك بوجيهات و موبينة': '⚡', 'حساسات و قطع كهربائية': '📡',
  'جوانات و أويل سيل': '🔩', 'مستلزمات عمرة موتور': '🔧',
  'قطع الموتور و ملحقاته': '🏎️', 'دبرياج و قطع فتيس': '🔄',
  'إطارات': '🚗', 'مساحات': '🪟',
};

export default function CarMakeClient({ makeKey, info, productCount, categories, featuredProducts }: Props) {
  return (
    <div dir="rtl" style={{ fontFamily: 'inherit', background: '#f8fafc', minHeight: '100vh' }}>

      {/* ── Breadcrumb ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #f1f5f9', padding: '12px 20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#64748b' }}>
          <Link href="/" style={{ color: '#64748b', textDecoration: 'none' }}>الرئيسية</Link>
          <ChevronLeft size={14} />
          <Link href="/cars" style={{ color: '#64748b', textDecoration: 'none' }}>قطع غيار حسب السيارة</Link>
          <ChevronLeft size={14} />
          <span style={{ color: '#0f172a', fontWeight: '700' }}>قطع غيار {info.arName}</span>
        </div>
      </div>

      {/* ── Hero ── */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)', padding: '48px 20px 40px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(34,197,94,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(59,130,246,0.06) 0%, transparent 50%)' }} />
        <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '20px', padding: '6px 16px', marginBottom: '16px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
            <span style={{ color: '#86efac', fontSize: '0.82rem', fontWeight: '700' }}>{productCount.toLocaleString('ar-EG')} منتج متوفر</span>
          </div>
          <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', fontWeight: '900', color: '#fff', margin: '0 0 12px', lineHeight: 1.2 }}>
            قطع غيار {info.arName} الأصلية
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1rem', maxWidth: '600px', margin: '0 auto 28px', lineHeight: 1.7 }}>
            تسوق قطع غيار {info.arName} الأصلية بأفضل الأسعار في مصر. شحن سريع لباب البيت مع ضمان الجودة.
          </p>
          {/* Popular models chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginBottom: '32px' }}>
            {info.popularModels.map((model) => (
              <Link
                key={model}
                href={`/store?make=${makeKey}&model=${encodeURIComponent(model)}`}
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '20px', padding: '6px 14px', color: '#e2e8f0', fontSize: '0.82rem', fontWeight: '600', textDecoration: 'none', transition: 'background 0.2s' }}
              >
                {model}
              </Link>
            ))}
          </div>
          <Link
            href={`/store?make=${makeKey}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#22c55e', color: '#fff', padding: '14px 32px', borderRadius: '14px', fontWeight: '900', fontSize: '1rem', textDecoration: 'none', boxShadow: '0 4px 20px rgba(34,197,94,0.35)' }}
          >
            <ShoppingBag size={20} />
            تصفح جميع قطع {info.arName}
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 20px' }}>

        {/* ── Trust badges ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '40px' }}>
          {[
            { icon: <Shield size={20} color="#22c55e" />, text: 'قطع أصلية 100%' },
            { icon: <Truck size={20} color="#22c55e" />, text: 'شحن لباب البيت' },
            { icon: <Star size={20} color="#22c55e" />, text: 'ضمان استبدال' },
          ].map(({ icon, text }) => (
            <div key={text} style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '700', fontSize: '0.85rem', color: '#0f172a' }}>
              {icon} {text}
            </div>
          ))}
        </div>

        {/* ── Categories ── */}
        {categories.length > 0 && (
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '900', color: '#0f172a', margin: '0 0 20px' }}>
              تسوق حسب القسم — قطع غيار {info.arName}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
              {categories.map((cat) => (
                <Link
                  key={cat.name}
                  href={`/store?make=${makeKey}&category=${encodeURIComponent(cat.name)}`}
                  style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: '16px', padding: '18px 14px', textDecoration: 'none', textAlign: 'center', transition: 'box-shadow 0.2s', display: 'block' }}
                >
                  <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>{CATEGORY_ICONS[cat.name] || '⚙️'}</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.3 }}>{cat.name}</div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px', fontWeight: '600' }}>{cat.count} منتج</div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Featured products ── */}
        {featuredProducts.length > 0 && (
          <section style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: '900', color: '#0f172a', margin: 0 }}>
                أحدث قطع غيار {info.arName}
              </h2>
              <Link href={`/store?make=${makeKey}`} style={{ fontSize: '0.85rem', fontWeight: '700', color: '#22c55e', textDecoration: 'none' }}>
                عرض الكل
              </Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' }}>
              {featuredProducts.map((p) => {
                const price = p.sale_price && Number(p.sale_price) > 0 ? p.sale_price : p.regular_price;
                const hasSale = p.sale_price && Number(p.sale_price) > 0;
                return (
                  <Link
                    key={p.id}
                    href={`/products/${p.slug || p.id}`}
                    style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: '16px', textDecoration: 'none', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
                  >
                    <div style={{ height: '140px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                      {hasSale && (
                        <div style={{ position: 'absolute', top: '8px', right: '8px', background: '#ef4444', color: '#fff', fontSize: '0.65rem', fontWeight: '900', padding: '2px 8px', borderRadius: '6px' }}>
                          خصم
                        </div>
                      )}
                      {p.image_url
                        ? <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '8px' }} loading="lazy" />
                        : <Package size={40} color="#cbd5e1" />
                      }
                    </div>
                    <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' as const }}>{p.brand}</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.3, flex: 1 }}>{p.name}</div>
                      <div style={{ fontSize: '1rem', fontWeight: '900', color: '#0f172a', marginTop: '6px' }}>
                        {price} <span style={{ fontSize: '0.72rem' }}>ج.م</span>
                        {hasSale && <span style={{ fontSize: '0.72rem', color: '#aaa', textDecoration: 'line-through', marginRight: '6px' }}>{p.regular_price}</span>}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ── SEO text block ── */}
        <section style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: '20px', padding: '28px', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#0f172a', margin: '0 0 14px' }}>
            قطع غيار {info.arName} الأصلية في مصر — زيت أند فلترز
          </h2>
          <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.8, margin: 0 }}>
            {info.description}
            {' '}
            نوفر جميع قطع غيار {info.arName} من أشهر الماركات العالمية كـ BOSCH و MANN و JAPANPARTS و MO OSMAN وغيرها.
            {' '}
            يمكنك الدفع بالتقسيط عبر فاليو، سهولة، لاكي، كليفر، أمان، تقسيط البنك الأهلي وحالا.
            {' '}
            نشحن لجميع محافظات مصر: القاهرة، الجيزة، الإسكندرية، المنصورة، طنطا، أسيوط، والمحافظات الأخرى.
          </p>
        </section>

        {/* ── Other makes ── */}
        <section>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#0f172a', margin: '0 0 16px' }}>
            قطع غيار سيارات أخرى
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {['HYUNDAI', 'KIA', 'TOYOTA', 'CHEVROLET', 'NISSAN', 'MITSUBISHI', 'RENAULT', 'PEUGEOT', 'VOLKSWAGEN']
              .filter(m => m !== makeKey)
              .map(m => {
                const ar = { HYUNDAI: 'هيونداي', KIA: 'كيا', TOYOTA: 'تويوتا', CHEVROLET: 'شيفروليه', NISSAN: 'نيسان', MITSUBISHI: 'ميتسوبيشي', RENAULT: 'رينو', PEUGEOT: 'بيجو', VOLKSWAGEN: 'فولكس فاجن' }[m] || m;
                return (
                  <Link key={m} href={`/cars/${m.toLowerCase()}`}
                    style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 16px', fontSize: '0.82rem', fontWeight: '700', color: '#334155', textDecoration: 'none' }}>
                    قطع غيار {ar}
                  </Link>
                );
              })}
          </div>
        </section>

      </div>
    </div>
  );
}
