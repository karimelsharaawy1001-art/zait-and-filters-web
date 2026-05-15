import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const baseUrl = 'https://zaitandfilters.com';

const STATIC_PAGES: MetadataRoute.Sitemap = [
  { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
  { url: `${baseUrl}/store`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
  { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
];

const CATEGORIES = [
  'فلاتر','زيوت موتور','زيوت فتيس و دبرياج و باور','الفرامل','عفشة',
  'سيور و بلي','دورة تبريد و تكييف','دورة البنزين',
  'بوجيهات و سلوك بوجيهات و موبينة','حساسات و قطع كهربائية',
  'جوانات و أويل سيل','مستلزمات عمرة موتور','قطع الموتور و ملحقاته',
  'دبرياج و قطع فتيس','إطارات','مساحات',
];

const highTraffic = ['زيوت موتور','فلاتر','الفرامل','عفشة','سيور و بلي','دورة البنزين','بوجيهات و سلوك بوجيهات و موبينة'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient(
    'https://dcaecjzsmitzuagjlyll.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjYWVjanpzbWl0enVhZ2pseWxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4OTg2MzUsImV4cCI6MjA4NjQ3NDYzNX0.UhXXRtxAaUcqSAD2wZQZGYMi0y-vBgXFRQCuxMBKMmk'
  );

  const allProducts: { slug: string; id: string; created_at: string; category: string }[] = [];
  const batchSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select('slug, id, created_at, category')
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
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }));

  const productEntries: MetadataRoute.Sitemap = allProducts.map((p) => ({
    url: `${baseUrl}/products/${p.slug ?? p.id}`,
    lastModified: p.created_at ? new Date(p.created_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: highTraffic.includes(p.category) ? 0.85 : 0.7,
  }));

  return [...STATIC_PAGES, ...categoryEntries, ...productEntries];
}
