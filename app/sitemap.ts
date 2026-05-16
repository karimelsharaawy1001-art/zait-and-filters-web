import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const baseUrl = 'https://zaitandfilters.com';

// ============================================================
// Supabase credentials — fallback to hardcoded if env not set
// ============================================================
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://dcaecjzsmitzuagjlyll.supabase.co';

const supabaseKey =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjYWVjanpzbWl0enVhZ2pseWxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4OTg2MzUsImV4cCI6MjA4NjQ3NDYzNX0.UhXXRtxAaUcqSAD2wZQZGYMi0y-vBgXFRQCuxMBKMmk';

const STATIC_PAGES: MetadataRoute.Sitemap = [
  { url: baseUrl,              lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
  { url: `${baseUrl}/store`,   lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
  { url: `${baseUrl}/about`,   lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  { url: `${baseUrl}/terms`,   lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
];

const CATEGORIES = [
  'فلاتر', 'زيوت موتور', 'زيوت فتيس و دبرياج و باور', 'الفرامل', 'عفشة',
  'سيور و بلي', 'دورة تبريد و تكييف', 'دورة البنزين',
  'بوجيهات و سلوك بوجيهات و موبينة', 'حساسات و قطع كهربائية',
  'جوانات و أويل سيل', 'مستلزمات عمرة موتور', 'قطع الموتور و ملحقاته',
  'دبرياج و قطع فتيس', 'إطارات', 'مساحات',
];

const HIGH_TRAFFIC_CATEGORIES = new Set([
  'زيوت موتور', 'فلاتر', 'الفرامل', 'عفشة',
  'سيور و بلي', 'دورة البنزين',
  'بوجيهات و سلوك بوجيهات و موبينة',
  'إطارات', 'حساسات و قطع كهربائية',
]);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let productEntries: MetadataRoute.Sitemap = [];

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const allProducts: {
      slug: string;
      id: string;
      updated_at: string | null;
      created_at: string;
      category: string;
      image_url: string | null;
      name: string;
    }[] = [];

    const batchSize = 1000;
    let from = 0;

    while (true) {
      const { data, error } = await supabase
        .from('products')
        .select('slug, id, updated_at, created_at, category, image_url, name')
        .eq('is_active', true)
        .order('id', { ascending: true })
        .range(from, from + batchSize - 1);

      console.log(`Sitemap batch from=${from} got=${data?.length ?? 0} error=${error?.message ?? 'none'}`);

      if (error) {
        console.error('Supabase error:', error.message);
        break;
      }
      if (!data || data.length === 0) break;

      allProducts.push(...data);
      if (data.length < batchSize) break;
      from += batchSize;
    }

    console.log(`Sitemap total products: ${allProducts.length}`);

    productEntries = allProducts.map((p) => {
      const lastMod = p.updated_at
        ? new Date(p.updated_at)
        : p.created_at
          ? new Date(p.created_at)
          : new Date();

      const entry: MetadataRoute.Sitemap[number] = {
        url: `${baseUrl}/products/${p.slug ?? p.id}`,
        lastModified: lastMod,
        changeFrequency: 'weekly' as const,
        priority: HIGH_TRAFFIC_CATEGORIES.has(p.category) ? 0.85 : 0.7,
      };

      if (p.image_url) {
        (entry as any).images = [{ url: p.image_url, title: p.name }];
      }

      return entry;
    });

  } catch (err) {
    console.error('Sitemap generation failed:', err);
  }

  const categoryEntries: MetadataRoute.Sitemap = CATEGORIES.map((cat) => ({
    url: `${baseUrl}/categories/${encodeURIComponent(cat)}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: HIGH_TRAFFIC_CATEGORIES.has(cat) ? 0.95 : 0.8,
  }));

  const allEntries = [...STATIC_PAGES, ...categoryEntries, ...productEntries];

  if (allEntries.length > 45000) {
    console.warn(`[Sitemap] ${allEntries.length} URLs — approaching 50k limit, consider splitting.`);
  }

  return allEntries;
}