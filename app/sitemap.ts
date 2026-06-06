import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';



export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const baseUrl = 'https://zaitandfilters.com';

const STATIC_PAGES: MetadataRoute.Sitemap = [
  { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
  { url: `${baseUrl}/store`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
  { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
  { url: `${baseUrl}/maintenance-bundle`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
  { url: `${baseUrl}/about`, lastModified: new Date('2025-01-01'), changeFrequency: 'monthly', priority: 0.6 },
  { url: `${baseUrl}/contact`, lastModified: new Date('2025-01-01'), changeFrequency: 'monthly', priority: 0.6 },
  { url: `${baseUrl}/shipping`, lastModified: new Date('2025-01-01'), changeFrequency: 'monthly', priority: 0.4 },
  { url: `${baseUrl}/terms`, lastModified: new Date('2025-01-01'), changeFrequency: 'monthly', priority: 0.3 },
  { url: `${baseUrl}/privacy`, lastModified: new Date('2025-01-01'), changeFrequency: 'monthly', priority: 0.3 },
];

const CAR_MAKES = [
  'hyundai', 'kia', 'toyota', 'chevrolet', 'nissan', 'mitsubishi',
  'renault', 'peugeot', 'volkswagen', 'skoda', 'opel', 'mg',
  'honda', 'suzuki', 'mazda', 'seat', 'bmw', 'mercedes', 'ford', 'jeep',
];

const CATEGORIES = [
  'فلاتر', 'زيوت موتور', 'زيوت فتيس و دبرياج و باور', 'الفرامل', 'عفشة',
  'سيور و بلي', 'دورة تبريد و تكييف', 'دورة البنزين',
  'بوجيهات و سلوك بوجيهات و موبينة', 'حساسات و قطع كهربائية',
  'جوانات و أويل سيل', 'مستلزمات عمرة موتور', 'قطع الموتور و ملحقاته',
  'دبرياج و قطع فتيس', 'إطارات', 'مساحات',
];

// Category pages don't change structurally — use a stable date to avoid
// triggering unnecessary re-crawls on every sitemap regeneration
const CATEGORY_LAST_MODIFIED = new Date('2025-06-01');

const highTraffic = [
  'زيوت موتور', 'فلاتر', 'الفرامل', 'عفشة',
  'سيور و بلي', 'دورة البنزين', 'بوجيهات و سلوك بوجيهات و موبينة',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // ── Blog posts ──────────────────────────────────────────────────────────────
  const { data: blogPosts } = await supabase
    .from('blog_posts')
    .select('slug, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(200);

  const blogEntries: MetadataRoute.Sitemap = (blogPosts || []).map(post => ({
    url: `${baseUrl}/blog/${encodeURIComponent(post.slug)}`,
    lastModified: post.updated_at ? new Date(post.updated_at) : new Date(post.created_at),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  const allProducts: {
    slug: string;
    id: string;
    created_at: string;
    updated_at: string | null;
    category: string;
    image_url: string | null;
  }[] = [];

  const batchSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select('slug, id, created_at, updated_at, category, image_url')
      .eq('is_active', true)
      .order('id', { ascending: true })
      .range(from, from + batchSize - 1);

    console.log(`Sitemap batch from=${from} got=${data?.length} error=${error?.message}`);
    if (error || !data || data.length === 0) break;
    allProducts.push(...data);
    if (data.length < batchSize) break;
    from += batchSize;
  }

  console.log(`Sitemap total products fetched: ${allProducts.length}`);

  const categoryEntries: MetadataRoute.Sitemap = CATEGORIES.map((cat) => ({
    url: `${baseUrl}/categories/${encodeURIComponent(cat)}`,
    lastModified: CATEGORY_LAST_MODIFIED,
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }));

  const carMakeEntries: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/cars`, lastModified: CATEGORY_LAST_MODIFIED, changeFrequency: 'weekly' as const, priority: 0.9 },
    ...CAR_MAKES.map((make) => ({
      url: `${baseUrl}/cars/${make}`,
      lastModified: CATEGORY_LAST_MODIFIED,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    })),
  ];

  const productEntries: MetadataRoute.Sitemap = allProducts.map((p) => ({
url: `${baseUrl}/products/${encodeURIComponent(p.slug ?? p.id)}`,
lastModified: p.updated_at ? new Date(p.updated_at) : new Date(p.created_at),
changeFrequency: 'weekly' as const,
priority: highTraffic.includes(p.category) ? 0.85 : 0.7,
  }));

  return [...STATIC_PAGES, ...categoryEntries, ...carMakeEntries, ...blogEntries, ...productEntries];
}