import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// ============================================================
// [FIX 1] رفع maxDuration — الـ sitemap ممكن يستغرق وقت أطول
// لو عندك آلاف المنتجات. 60 ثانية ممكن تكون قليلة على Vercel.
// ============================================================
export const maxDuration = 300;

const baseUrl = 'https://zaitandfilters.com';

const STATIC_PAGES: MetadataRoute.Sitemap = [
  { url: baseUrl,                         lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
  { url: `${baseUrl}/store`,              lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
  { url: `${baseUrl}/about`,              lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  { url: `${baseUrl}/contact`,            lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  { url: `${baseUrl}/terms`,              lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  { url: `${baseUrl}/privacy`,            lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
];

const CATEGORIES = [
  'فلاتر', 'زيوت موتور', 'زيوت فتيس و دبرياج و باور', 'الفرامل', 'عفشة',
  'سيور و بلي', 'دورة تبريد و تكييف', 'دورة البنزين',
  'بوجيهات و سلوك بوجيهات و موبينة', 'حساسات و قطع كهربائية',
  'جوانات و أويل سيل', 'مستلزمات عمرة موتور', 'قطع الموتور و ملحقاته',
  'دبرياج و قطع فتيس', 'إطارات', 'مساحات',
];

// الفئات اللي فيها أعلى حجم بحث — بتاخد priority أعلى
const HIGH_TRAFFIC_CATEGORIES = new Set([
  'زيوت موتور',
  'فلاتر',
  'الفرامل',
  'عفشة',
  'سيور و بلي',
  'دورة البنزين',
  'بوجيهات و سلوك بوجيهات و موبينة',
  'إطارات', // [ADDED] إطارات حركة بحث عالية
  'حساسات و قطع كهربائية', // [ADDED]
]);

// ============================================================
// [FIX 2] الـ Supabase client يقرأ من environment variables
// مش hardcoded في الكود — الـ anon key ده ظاهر في الكود وده
// بيعرّضه للاستغلال. حطّ المتغيرات في .env.local وفي Vercel.
//
// .env.local:
//   NEXT_PUBLIC_SUPABASE_URL=https://dcaecjzsmitzuagjlyll.supabase.co
//   SUPABASE_ANON_KEY=eyJhbG...
// ============================================================
const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey  = process.env.SUPABASE_ANON_KEY!;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  // ============================================================
  // [FIX 3] جلب updated_at بدل created_at
  // جوجل بيستخدم lastModified عشان يعرف يعيد الزحف على الصفحة
  // لما المنتج يتعدل سعره أو بياناته. created_at بيفضل ثابت
  // وبالتالي جوجل مش بيزحف عليه تاني.
  // ============================================================
  const allProducts: {
    slug: string;
    id: string;
    updated_at: string;
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

    console.log(`Sitemap batch from=${from} got=${data?.length} error=${error?.message}`);

    if (error || !data || data.length === 0) break;
    allProducts.push(...data);
    if (data.length < batchSize) break;
    from += batchSize;
  }

  console.log(`Sitemap total products fetched: ${allProducts.length}`);

  // ============================================================
  // [FIX 4] صفحات الفئات — priority مختلفة للفئات العالية
  // ============================================================
  const categoryEntries: MetadataRoute.Sitemap = CATEGORIES.map((cat) => ({
    url: `${baseUrl}/categories/${encodeURIComponent(cat)}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,   // [CHANGED] weekly → daily لأن المنتجات بتتضاف يومياً
    priority: HIGH_TRAFFIC_CATEGORIES.has(cat) ? 0.95 : 0.8,
  }));

  // ============================================================
  // [FIX 5] إضافة images في الـ sitemap
  // جوجل بيستخدم Image Sitemap عشان يظهر صور منتجاتك في
  // Google Images — مصدر زيارات إضافي مهم جداً لمتجر قطع غيار.
  // ============================================================
  const productEntries: MetadataRoute.Sitemap = allProducts.map((p) => {
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

    // أضف الصورة لو موجودة
    if (p.image_url) {
      (entry as any).images = [
        {
          url: p.image_url,
          title: p.name,
        },
      ];
    }

    return entry;
  });

  // ============================================================
  // [FIX 6] لو عندك أكتر من 50,000 URL، جوجل بيرفض الـ sitemap
  // في الحالة دي لازم تقسمه لـ sitemap index.
  // الكود ده بيعمل console.warn لو اقتربت من الحد.
  // ============================================================
  const allEntries = [...STATIC_PAGES, ...categoryEntries, ...productEntries];

  if (allEntries.length > 45000) {
    console.warn(
      `[Sitemap] URL count ${allEntries.length} is approaching Google's 50,000 limit. ` +
      `Consider splitting into multiple sitemaps using a sitemap index.`
    );
  }

  return allEntries;
}