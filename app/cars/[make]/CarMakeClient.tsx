'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ShoppingBag, ChevronLeft, Star, Package, Truck, Shield } from 'lucide-react';
import { optimizeImageUrl } from '@/lib/images';
import type { CAR_MAKES } from './page';

type CarInfo = typeof CAR_MAKES[string];

interface ModelEntry {
  name: string;
  img: string;
  images: { url: string; label: string }[];
  count: number;
}

interface Props {
  makeKey: string;
  info: CarInfo;
  productCount: number;
  models: ModelEntry[];
  featuredProducts: any[];
}

function ModelCard({ model, makeKey, cardBg }: { model: ModelEntry; makeKey: string; cardBg: string }) {
  const imgs = model.images.length > 0 ? model.images : (model.img ? [{ url: model.img, label: '' }] : []);
  const [active, setActive] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);

  useEffect(() => {
    if (imgs.length <= 1) return;
    const id = setInterval(() => {
      setActive(cur => {
        setPrev(cur);
        return (cur + 1) % imgs.length;
      });
    }, 3000);
    return () => clearInterval(id);
  }, [imgs.length]);

  // Clear prev after fade completes
  useEffect(() => {
    if (prev === null) return;
    const t = setTimeout(() => setPrev(null), 700);
    return () => clearTimeout(t);
  }, [prev]);

  return (
    <Link
      href={`/store?make=${makeKey}&model=${encodeURIComponent(model.name)}`}
      className="model-card"
      style={{ background: cardBg }}
    >
      {imgs.length === 0
        ? <div className="model-card-fallback"><Package size={36} color="rgba(255,255,255,0.2)" /></div>
        : imgs.map((img, i) => (
            <img
              key={img.url}
              src={optimizeImageUrl(img.url)}
              alt={model.name}
              className="model-card-img"
              loading="lazy"
              style={{
                opacity: i === active ? 1 : i === prev ? 0 : 0,
                transition: i === active ? 'opacity 0.7s ease' : i === prev ? 'opacity 0.7s ease' : 'none',
                zIndex: i === active ? 2 : i === prev ? 1 : 0,
              }}
            />
          ))
      }
      <div className="model-card-bottom">
        <div className="model-name">{model.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
          {model.count > 0 && <div className="model-count">{model.count} منتج</div>}
          {imgs.length > 1 && (
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              {imgs.map((_, i) => (
                <span key={i} style={{
                  width: i === active ? '14px' : '5px',
                  height: '5px',
                  borderRadius: '3px',
                  background: i === active ? '#22c55e' : 'rgba(255,255,255,0.35)',
                  transition: 'width 0.4s ease, background 0.4s ease',
                  display: 'inline-block',
                }} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

const MAKE_GRADIENTS: Record<string, string> = {
  HYUNDAI:    'linear-gradient(145deg,#002c5f,#0a4a8a)',
  KIA:        'linear-gradient(145deg,#05141f,#0d2a40)',
  TOYOTA:     'linear-gradient(145deg,#bb0000,#7a0000)',
  CHEVROLET:  'linear-gradient(145deg,#1a1a1a,#3a3a3a)',
  NISSAN:     'linear-gradient(145deg,#c3002f,#6e001a)',
  MITSUBISHI: 'linear-gradient(145deg,#cc0000,#880000)',
  RENAULT:    'linear-gradient(145deg,#efdf00,#b8a800)',
  PEUGEOT:    'linear-gradient(145deg,#0b2d78,#06194a)',
  VOLKSWAGEN: 'linear-gradient(145deg,#001e50,#00102e)',
  SKODA:      'linear-gradient(145deg,#4ba82e,#2c6819)',
  MG:         'linear-gradient(145deg,#ae0000,#6b0000)',
  OPEL:       'linear-gradient(145deg,#e8b800,#b08c00)',
  HONDA:      'linear-gradient(145deg,#cc0000,#880000)',
  SUZUKI:     'linear-gradient(145deg,#1a3a6a,#0d2040)',
  MAZDA:      'linear-gradient(145deg,#910000,#5a0000)',
  SEAT:       'linear-gradient(145deg,#222,#444)',
  BMW:        'linear-gradient(145deg,#1c69d4,#0d3f8f)',
  MERCEDES:   'linear-gradient(145deg,#333,#555)',
  FORD:       'linear-gradient(145deg,#003178,#001e50)',
  JEEP:       'linear-gradient(145deg,#2d5016,#1a2e0a)',
};

export default function CarMakeClient({ makeKey, info, productCount, models, featuredProducts }: Props) {
  const cardBg = MAKE_GRADIENTS[makeKey] || 'linear-gradient(145deg,#1a1a2e,#0d1117)';
  return (
    <div dir="rtl" style={{ fontFamily: 'inherit', background: '#f8fafc', minHeight: '100vh' }}>

      <style>{`
        .model-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }
        @media (max-width: 900px) {
          .model-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 580px) {
          .model-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
        }
        .model-card {
          border-radius: 16px;
          text-decoration: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          aspect-ratio: 4/3;
          transition: transform 0.22s cubic-bezier(.34,1.28,.64,1), box-shadow 0.22s ease;
          box-shadow: 0 4px 16px rgba(0,0,0,0.25);
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }
        .model-card:hover {
          transform: translateY(-6px) scale(1.035);
          box-shadow: 0 18px 42px rgba(0,0,0,0.32);
        }
        .model-card-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 80%;
          top: 50%;
          transform: translateY(-58%);
          object-fit: contain;
          object-position: center;
          filter: drop-shadow(0 6px 18px rgba(0,0,0,0.55));
          transition: opacity 0.7s ease, transform 0.35s ease;
        }
        .model-card:hover .model-card-img {
          transform: translateY(-62%) scale(1.05);
        }
        .model-card-fallback {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1;
        }
        .model-card-bottom {
          position: relative;
          z-index: 2;
          width: 100%;
          padding: 10px 10px 14px;
          background: linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0) 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }
        .model-name {
          font-size: 0.95rem;
          font-weight: 900;
          color: #fff;
          text-align: center;
          text-shadow: 0 1px 6px rgba(0,0,0,0.6);
          line-height: 1.2;
        }
        .model-count {
          font-size: 0.68rem;
          font-weight: 700;
          color: rgba(255,255,255,0.6);
          transition: color 0.18s;
        }
        .model-card:hover .model-count {
          color: #86efac;
        }
        @media (max-width: 768px) {
          .model-card { border-radius: 12px; }
          .model-name { font-size: 0.82rem; }
          .model-count { display: none; }
        }
      `}</style>

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

        {/* ── Car models grid ── */}
        {models.length > 0 && (
          <section style={{ marginBottom: '48px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '900', color: '#0f172a', margin: '0 0 4px' }}>
                  تسوق حسب موديل {info.arName}
                </h2>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, fontWeight: '600' }}>
                  اختر موديل سيارتك وتصفح جميع القطع المتوافقة
                </p>
              </div>
              <Link href={`/store?make=${makeKey}`} style={{ fontSize: '0.85rem', fontWeight: '800', color: '#22c55e', textDecoration: 'none', whiteSpace: 'nowrap' as const }}>
                عرض جميع القطع ←
              </Link>
            </div>
            <div className="model-grid">
              {models.map((model) => (
                <ModelCard key={model.name} model={model} makeKey={makeKey} cardBg={cardBg} />
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
                        ? <img src={optimizeImageUrl(p.image_url)} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '8px' }} loading="lazy" />
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
            نوفر جميع قطع غيار {info.arName} من أشهر الماركات العالمية كـ BOSCH و MANN و JAPANPARTS وغيرها.
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
            {(['HYUNDAI', 'KIA', 'TOYOTA', 'CHEVROLET', 'NISSAN', 'MITSUBISHI', 'RENAULT', 'PEUGEOT', 'VOLKSWAGEN'] as const)
              .filter(m => m !== makeKey)
              .map(m => {
                const AR: Record<string, string> = {
                  HYUNDAI: 'هيونداي', KIA: 'كيا', TOYOTA: 'تويوتا', CHEVROLET: 'شيفروليه',
                  NISSAN: 'نيسان', MITSUBISHI: 'ميتسوبيشي', RENAULT: 'رينو',
                  PEUGEOT: 'بيجو', VOLKSWAGEN: 'فولكس فاجن',
                };
                return (
                  <Link key={m} href={`/cars/${m.toLowerCase()}`}
                    style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 16px', fontSize: '0.82rem', fontWeight: '700', color: '#334155', textDecoration: 'none' }}>
                    قطع غيار {AR[m] || m}
                  </Link>
                );
              })}
          </div>
        </section>

      </div>
    </div>
  );
}
