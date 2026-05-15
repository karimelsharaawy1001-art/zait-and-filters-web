import { MetadataRoute } from 'next';
import { supabase } from '@/app/lib/supabase';

const baseUrl = 'https://zaitandfilters.com';
const URLS_PER_SITEMAP = 50000;

// ─── Static pages ─────────────────────────────────────────────────────────────
// Add or remove pages here as your site grows
const STATIC_PAGES: MetadataRoute.Sitemap = [
  { url: baseUrl,                          lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
  { url: `${baseUrl}/store`,               lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
  { url: `${baseUrl}/about`,               lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  { url: `${baseUrl}/contact`,             lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  { url: `${baseUrl}/terms`,               lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  { url: `${baseUrl}/privacy`,             lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
];

// ─── Arabic category names (must match what's stored in DB) ──────────────────
// These are your top-level categories from page.tsx — each gets its own URL
const CATEGORIES = [
  'فلاتر',
  'زيوت موتور',
  'زيوت فتيس و دبرياج و باور',
  'الفرامل',
  'عفشة',
  'سيور و بلي',
  'دورة تبريد و تكييف',
  'دورة البنزين',
  'بوجيهات و سلوك بوجيهات و موبينة',
  'حساسات و قطع كهربائية',
  'جوانات و أويل سيل',
  'مستلزمات عمرة موتور',
  'قطع الموتور و ملحقاته',
  'دبرياج و قطع فتيس',
  'إطارات',
  'مساحات',
];

export async function generateSitemaps() {
  const { count } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  const total = count || 0;
  // +1 for the "static + categories" sitemap which always gets id=0
  const productPages = Math.ceil(total / URLS_PER_SITEMAP);

  // id=0  → static pages + category pages
  // id=1+ → product pages (shifted by 1)
  return Array.from({ length: productPages + 1 }, (_, i) => ({ id: i }));
}

export default async function sitemap({
  id,
}: {
  id: number;
}): Promise<MetadataRoute.Sitemap> {

  // ── Sitemap 0: static pages + all category pages ──────────────────────────
  if (id === 0) {
    const categoryEntries: MetadataRoute.Sitemap = CATEGORIES.map(cat => ({
      url: `${baseUrl}/categories/${encodeURIComponent(cat)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    }));

    return [...STATIC_PAGES, ...categoryEntries];
  }

  // ── Sitemap 1+: product pages ──────────────────────────────────────────────
  // id=1 maps to page=0, id=2 maps to page=1, etc.
  const page  = id - 1;
  const start = page * URLS_PER_SITEMAP;
  const end   = start + URLS_PER_SITEMAP - 1;

  const { data: products } = await supabase
    .from('products')
    .select('slug, id, updated_at, category, car_make, car_model')
    .eq('is_active', true)
    .order('id', { ascending: true })
    .range(start, end);

  return (products || []).map((p) => {
    // High-traffic categories from your SEO work get higher priority
    const highTraffic = [
      'زيوت موتور',
      'فلاتر',
      'الفرامل',
      'عفشة',
      'سيور و بلي',
      'دورة البنزين',
      'بوجيهات و سلوك بوجيهات و موبينة',
    ];
    const priority = highTraffic.includes(p.category) ? 0.85 : 0.7;

    return {
      url: `${baseUrl}/products/${p.slug || p.id}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority,
    };
  });
}