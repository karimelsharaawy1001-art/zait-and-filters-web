'use client';
import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Package, Tag, Building2, Car, Calendar, Layers, ChevronDown } from 'lucide-react';

interface StatItem {
  entity_name?: string;
  entity_slug?: string;
  category_name?: string;
  brand_name?: string;
  car_make_name?: string;
  car_model_name?: string;
  car_year_name?: string;
  view_count: number;
}

interface AnalyticsData {
  products: StatItem[];
  categories: StatItem[];
  brands: StatItem[];
  carMakes: StatItem[];
  carModels: StatItem[];
  carYears: StatItem[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics?days=${days}`)
      .then(res => res.json())
      .then(res => {
        if (res.error) {
          console.error(res.error);
          setData(null);
        } else {
          setData(res);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [days]);

  const dateRanges = [
    { label: 'آخر 7 أيام', value: 7 },
    { label: 'آخر 30 يوم', value: 30 },
    { label: 'آخر 90 يوم', value: 90 },
    { label: 'آخر سنة', value: 365 },
  ];

  return (
    <div style={{ fontFamily: "'Cairo', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart3 size={22} color="#16a34a" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#1e293b' }}>تحليلات الزوار</h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>أكثر الصفحات والمنتجات مشاهدة</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {dateRanges.map(r => (
            <button
              key={r.value}
              onClick={() => setDays(r.value)}
              style={{
                padding: '4px 14px', borderRadius: 16, border: '1px solid #e2e8f0',
                background: days === r.value ? '#dcfce7' : '#fff',
                color: days === r.value ? '#15803d' : '#64748b',
                fontWeight: days === r.value ? 700 : 600, fontSize: 12,
                cursor: 'pointer', fontFamily: "'Cairo', sans-serif",
                transition: 'all 0.12s',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
          <div style={{ fontSize: 14 }}>جاري التحميل...</div>
        </div>
      )}

      {!loading && !data && (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
          <BarChart3 size={48} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>لا توجد بيانات</div>
          <div style={{ fontSize: 13 }}>لم يتم تسجيل أي مشاهدات بعد</div>
        </div>
      )}

      {!loading && data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Most viewed products */}
          <section>
            <SectionHeader icon={<Package size={18} color="#15803d" />} title="أكثر المنتجات مشاهدة" />
            {data.products.length === 0 ? (
              <EmptySection />
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {data.products.map((item, i) => (
                  <BarRow
                    key={item.entity_slug || i}
                    rank={i + 1}
                    name={item.entity_name || ''}
                    count={item.view_count}
                    maxCount={data.products[0]?.view_count || 1}
                    slug={item.entity_slug}
                    link={`/products/${item.entity_slug}`}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Most viewed categories */}
          <section>
            <SectionHeader icon={<Layers size={18} color="#15803d" />} title="أكثر التصنيفات مشاهدة" />
            {data.categories.length === 0 ? (
              <EmptySection />
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {data.categories.map((item, i) => (
                  <BarRow
                    key={item.category_name || i}
                    rank={i + 1}
                    name={item.category_name || ''}
                    count={item.view_count}
                    maxCount={data.categories[0]?.view_count || 1}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Most viewed brands */}
          <section>
            <SectionHeader icon={<Building2 size={18} color="#15803d" />} title="أكثر الماركات مشاهدة" />
            {data.brands.length === 0 ? (
              <EmptySection />
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {data.brands.map((item, i) => (
                  <BarRow
                    key={item.brand_name || i}
                    rank={i + 1}
                    name={item.brand_name || ''}
                    count={item.view_count}
                    maxCount={data.brands[0]?.view_count || 1}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Car makes + models + years in a grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            <section>
              <SectionHeader icon={<Car size={18} color="#15803d" />} title="أكثر موديلات السيارة تصفحاً" subtitle="الماركة" />
              {data.carMakes.length === 0 ? <EmptySection /> : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {data.carMakes.map((item, i) => (
                    <BarRow
                      key={item.car_make_name || i}
                      rank={i + 1}
                      name={item.car_make_name || ''}
                      count={item.view_count}
                      maxCount={data.carMakes[0]?.view_count || 1}
                    />
                  ))}
                </div>
              )}
            </section>

            <section>
              <SectionHeader icon={<Car size={18} color="#15803d" />} title="أكثر موديلات السيارة تصفحاً" subtitle="الموديل" />
              {data.carModels.length === 0 ? <EmptySection /> : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {data.carModels.map((item, i) => (
                    <BarRow
                      key={item.car_model_name || i}
                      rank={i + 1}
                      name={item.car_model_name || ''}
                      count={item.view_count}
                      maxCount={data.carModels[0]?.view_count || 1}
                    />
                  ))}
                </div>
              )}
            </section>

            <section>
              <SectionHeader icon={<Calendar size={18} color="#15803d" />} title="أكثر سنوات السيارة تصفحاً" />
              {data.carYears.length === 0 ? <EmptySection /> : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {data.carYears.map((item, i) => (
                    <BarRow
                      key={item.car_year_name || i}
                      rank={i + 1}
                      name={item.car_year_name || ''}
                      count={item.view_count}
                      maxCount={data.carYears[0]?.view_count || 1}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      {icon}
      <div>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#1e293b' }}>{title}</h2>
        {subtitle && <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>{subtitle}</p>}
      </div>
    </div>
  );
}

function EmptySection() {
  return (
    <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: 12, background: '#f8fafc', borderRadius: 10 }}>
      لا توجد بيانات كافية
    </div>
  );
}

function BarRow({ rank, name, count, maxCount, slug, link }: { rank: number; name: string; count: number; maxCount: number; slug?: string; link?: string }) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;

  const content = (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 12px', borderRadius: 10,
      background: '#f8fafc', transition: 'background 0.12s',
      cursor: link ? 'pointer' : 'default',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Progress bar bg */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: `${pct}%`, background: '#dcfce7',
        borderRadius: 10, transition: 'width 0.3s ease',
      }} />
      {/* Rank */}
      <div style={{
        width: 24, height: 24, borderRadius: 6,
        background: rank <= 3 ? '#15803d' : '#e2e8f0',
        color: rank <= 3 ? '#fff' : '#94a3b8',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 800, flexShrink: 0, position: 'relative',
      }}>
        {rank}
      </div>
      {/* Name */}
      <div style={{
        flex: 1, minWidth: 0, position: 'relative',
        fontSize: 13, fontWeight: 600, color: '#1e293b',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {name}
      </div>
      {/* View count */}
      <div style={{
        position: 'relative', fontSize: 13, fontWeight: 800, color: '#15803d',
        flexShrink: 0, direction: 'ltr',
      }}>
        {count}
      </div>
    </div>
  );

  if (link) {
    return (
      <a href={link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
        {content}
      </a>
    );
  }

  return content;
}
