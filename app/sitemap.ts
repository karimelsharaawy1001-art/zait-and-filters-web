import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const baseUrl = 'https://zaitandfilters.com';
const URLS_PER_SITEMAP = 50000;

const supabase = createClient(
  'https://dcaecjzsmitzuagjlyll.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjYWVjanpzbWl0enVhZ2pseWxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4OTg2MzUsImV4cCI6MjA4NjQ3NDYzNX0.UhXXRtxAaUcqSAD2wZQZGYMi0y-vBgXFRQCuxMBKMmk'
);

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

export async function generateSitemaps() {
  const { count } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);
  const total = count ?? 0;
  const productPages = Math.ceil(total / URLS_PER_SITEMAP);
  return Array.from({ length: productPages + 1 }, (_, i) => ({ id: i }));
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  if (id === 0) {
    const categoryEntries: MetadataRoute.Sitemap = CATEGORIES.map((cat) => ({
      url: `${baseUrl}/categories/${encodeURIComponent(cat)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    }));
    return [...STATIC_PAGES, ...categoryEntries];
  }

  const page = id - 1;
  const start = page * URLS_PER_SITEMAP;
  const end = start + URLS_PER_SITEMAP - 1;

  const { data: products } = await supabase
    .from('products')
    .select('slug, id, updated_at, category')
    .eq('is_active', true)
    .order('id', { ascending: true })
    .range(start, end);

  const highTraffic = ['زيوت موتور','فلاتر','الفرامل','عفشة','سيور و بلي','دورة البنزين','بوجيهات و سلوك بوجيهات و موبينة'];

  return (products ?? []).map((p) => ({
    url: `${baseUrl}/products/${p.slug ?? p.id}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: highTraffic.includes(p.category) ? 0.85 : 0.7,
  }));
}
