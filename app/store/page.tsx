import { Metadata } from 'next';
import { supabase } from '@/app/lib/supabase';
import StoreClient from './StoreClient';

type SearchParams = {
  make?: string;
  model?: string;
  year?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  q?: string;
};

// ── Arabic translations ──────────────────────────────────────────────────────
const CAR_MAKE_AR: Record<string, string> = {
  TOYOTA: 'تويوتا', HYUNDAI: 'هيونداي', KIA: 'كيا', NISSAN: 'نيسان',
  CHEVROLET: 'شيفروليه', MITSUBISHI: 'ميتسوبيشي', VOLKSWAGEN: 'فولكس فاجن',
  SKODA: 'سكودا', PEUGEOT: 'بيجو', RENAULT: 'رينو', OPEL: 'اوبل',
  MG: 'إم جي', MAZDA: 'مازدا', SEAT: 'سيات', HONDA: 'هوندا',
  SUZUKI: 'سوزوكي', BMW: 'بي إم دبليو', MERCEDES: 'مرسيدس',
  FORD: 'فورد', JEEP: 'جيب', UNIVERSAL: '',
};

const CAR_MODEL_AR: Record<string, string> = {
  AVEO: 'افيو', CAPTIVA: 'كابتيفا', CRUZE: 'كروز', LANOS: 'لانوس', OPTRA: 'اوبترا',
  ACCENT: 'اكسنت', ELANTRA: 'النترا', 'GRAND I10': 'جراند i10', I10: 'i10',
  MATRIX: 'ماتريكس', TUCSON: 'توسان', VERNA: 'فيرنا',
  CARENS: 'كارينز', 'CERATO LD': 'سيراتو LD', 'CERATO TD': 'سيراتو TD',
  'CERATO K3': 'سيراتو K3', 'GRAND CERATO': 'جراند سيراتو',
  PICANTO: 'بيكانتو', RIO: 'ريو', SOUL: 'سول', SPORTAGE: 'سبورتاج',
  '3': 'MG3', '5': 'MG5', '6': 'MG6', HS: 'HS', RX5: 'RX5', ZS: 'ZS',
  ECLIPSE: 'اكليبس', 'LANCER PUMA': 'لانسر بوما', 'LANCER SHARK': 'لانسر شارك',
  QASHQAI: 'قاشقاي', SENTRA: 'سنترا', 'SUNNY N16': 'صني N16', 'SUNNY N17': 'صني N17', TIIDA: 'تيدا',
  ASTRA: 'استرا', INSIGNIA: 'انسيجنيا',
  '2008': '2008', '3008': '3008', '508': '508', '308': '308', '5008': '5008',
  CAPTUR: 'كابتشر', CLIO: 'كليو', DUSTER: 'داستر', FLUENCE: 'فلوانس',
  KADJAR: 'كادجار', LOGAN: 'لوجان', MEGANE: 'ميجان', SANDERO: 'سانديرو', STEPWAY: 'ستيبواي',
  IBIZA: 'ابيزا', LEON: 'ليون', TOLEDO: 'توليدو',
  'OCTAVIA A4': 'اوكتافيا A4', 'OCTAVIA A5': 'اوكتافيا A5',
  'OCTAVIA A7': 'اوكتافيا A7', 'OCTAVIA A8': 'اوكتافيا A8',
  COROLLA: 'كورولا', YARIS: 'يارس',
  PASSAT: 'باسات', GOLF: 'جولف', JETTA: 'جيتا',
};

// Reverse maps (Arabic → English) so store links that use Arabic make/model
// slugs (e.g. make=نيسان&model=صني-n17) resolve to the English keys the DB uses.
const MAKE_EN_BY_AR: Record<string, string> = {};
for (const [en, ar] of Object.entries(CAR_MAKE_AR)) if (ar) MAKE_EN_BY_AR[ar.trim().toUpperCase()] = en;
const MODEL_EN_BY_AR: Record<string, string> = {};
for (const [en, ar] of Object.entries(CAR_MODEL_AR)) if (ar) MODEL_EN_BY_AR[ar.trim().toUpperCase()] = en;

function toEnglishMake(raw: string): string {
  const up = raw.trim().toUpperCase();
  if (CAR_MAKE_AR[up] !== undefined) return up;                 // already an English key
  const unslug = raw.trim().replace(/-/g, ' ').toUpperCase();   // "صني-n17" → "صني N17"
  return MAKE_EN_BY_AR[up] || MAKE_EN_BY_AR[unslug] || up;
}
function toEnglishModel(raw: string): string {
  const up = raw.trim().toUpperCase();
  if (CAR_MODEL_AR[up] !== undefined) return up;
  const unslug = raw.trim().replace(/-/g, ' ').toUpperCase();
  if (CAR_MODEL_AR[unslug] !== undefined) return unslug;
  return MODEL_EN_BY_AR[up] || MODEL_EN_BY_AR[unslug] || unslug;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const make     = sp.make  ? toEnglishMake(sp.make)   : '';
  const model    = sp.model ? toEnglishModel(sp.model) : '';
  const category = sp.category || '';
  const brand    = sp.brand    || '';
  const query    = sp.q        || '';

  const makeAr  = CAR_MAKE_AR[make]  || make;
  const modelAr = CAR_MODEL_AR[model] || model;

  let title       = 'قطع غيار سيارات أصلية | زيت أند فلترز';
  let description = 'اشتري قطع غيار سيارات أصلية — زيوت موتور، فلاتر، تيل فرامل، مساعدين، بوجيهات، عفشة وأكثر لجميع موديلات السيارات. شحن سريع لباب البيت في جميع المحافظات مع ضمان الجودة.';
  let keywords: string[] = [
    'قطع غيار سيارات مصر', 'قطع غيار اصلية مصر', 'متجر قطع غيار اونلاين',
    'زيوت موتور مصر', 'فلاتر سيارات', 'تيل فرامل مصر', 'مساعدين سيارات',
    'بوجيهات سيارات مصر', 'عفشة سيارات', 'سيور سيارات',
    'احسن قطع غيار مصر', 'افضل قطع غيار مصر', 'بأقل سعر قطع غيار',
    'شحن قطع غيار لباب البيت', 'قطع غيار بضمان مصر',
    'قطع غيار اوبترا', 'قطع غيار كروز', 'قطع غيار النترا', 'قطع غيار لانسر',
    'قطع غيار كورولا', 'قطع غيار سيراتو', 'قطع غيار صني', 'قطع غيار سبورتاج',
    'زيت أند فلترز', 'auto parts egypt', 'car parts egypt online',
  ];
  let ogImage = 'https://zaitandfilters.com/og-image.jpg';

  if (make) {
    const carPhrase = modelAr ? `${makeAr} ${modelAr}` : makeAr;
    const carPhraseEn = model ? `${make} ${model}` : make;

    title = `قطع غيار ${carPhrase} الأصلية | زيت أند فلترز`;
    description = `اشتري قطع غيار ${carPhrase} الأصلية. ` +
      `فلتر زيت، زيت موتور، تيل فرامل، مساعدين، بوجيهات، سيور، بلية عجل وجميع قطع ${carPhrase}. ` +
      `قطع اصلية مضمونة بأقل سعر مع شحن سريع لباب البيت في جميع المحافظات.`;
    keywords = [
      `قطع غيار ${makeAr}`, `قطع غيار ${carPhrase}`, `${makeAr} قطع غيار`,
      `قطع غيار ${carPhraseEn}`, `احسن قطع غيار ${makeAr}`, `افضل قطع غيار ${carPhrase}`,
      `سعر قطع غيار ${carPhrase}`, `قطع غيار ${makeAr} مصر`, `قطع غيار ${carPhrase} مصر`,
      `فلتر زيت ${makeAr}`, `فلتر زيت ${carPhrase}`, `فلتر هواء ${makeAr}`,
      `فلتر تكييف ${makeAr}`, `فلتر بنزين ${makeAr}`,
      `زيت موتور ${makeAr}`, `زيت موتور ${carPhrase}`, `احسن زيت موتور ${makeAr}`,
      `تيل فرامل ${makeAr}`, `تيل فرامل ${carPhrase}`, `طنابير ${makeAr}`,
      `مساعدين ${makeAr}`, `مساعدين ${carPhrase}`, `بلية عجل ${makeAr}`,
      `بوجيهات ${makeAr}`, `بوجيهات ${carPhrase}`,
      `سيور ${makeAr}`, `سير توقيت ${makeAr}`,
      `${make} spare parts egypt`, `${carPhraseEn} spare parts`,
      'قطع غيار اصلية مصر', 'زيت أند فلترز', 'متجر قطع غيار اونلاين مصر',
    ];
  } else if (category) {
    title = `${category} أصلية | زيت أند فلترز`;
    description = `تسوق أفضل منتجات ${category} الأصلية بأسعار تنافسية في مصر. ` +
      `جميع ماركات ${category} متوفرة مع شحن لباب البيت في جميع المحافظات وضمان الجودة.`;
    keywords = [
      category,
      `${category} أصلية`,
      `${category} مصر`,
      `أفضل ${category}`,
      `احسن ${category}`,
      `سعر ${category}`,
      `${category}`,
      `شراء ${category} اونلاين`,
      'قطع غيار أصلية مصر',
      'زيت أند فلترز',
    ];
  } else if (brand) {
    title = `منتجات ${brand} الأصلية | زيت أند فلترز`;
    description = `تسوق جميع منتجات ${brand} الأصلية بأفضل الأسعار في مصر. ` +
      `فلاتر، زيوت، قطع غيار ${brand} الأصلية متوفرة مع شحن لباب البيت وضمان الجودة.`;
    keywords = [
      brand,
      `${brand} مصر`,
      `${brand} أصلي`,
      `قطع غيار ${brand}`,
      `فلتر ${brand}`,
      `زيت ${brand}`,
      `سعر ${brand}`,
      `احسن ${brand}`,
      `افضل ${brand} مصر`,
      'قطع غيار أصلية مصر',
      'زيت أند فلترز',
    ];
  } else if (query) {
    title = `نتائج البحث عن: ${query} | زيت أند فلترز`;
    description = `نتائج البحث عن "${query}" في متجر زيت أند فلترز لقطع غيار السيارات الأصلية. ` +
      `أفضل الأسعار وشحن لباب البيت في جميع المحافظات.`;
    keywords = [
      query,
      `${query} مصر`,
      `${query} سعر`,
      `${query} أصلي`,
      'قطع غيار أصلية مصر',
      'زيت أند فلترز',
    ];
  }

  try {
    if (make) {
      if (model) {
        const { data: carImg } = await supabase
          .from('car_images').select('image_url')
          .ilike('car_make', make.trim()).ilike('car_model', model.trim())
          .limit(1).single();
        if (carImg?.image_url) ogImage = carImg.image_url;
      }
      if (ogImage === 'https://zaitandfilters.com/og-image.jpg') {
        const { data: carImg } = await supabase
          .from('car_images').select('image_url')
          .ilike('car_make', make.trim()).limit(1).single();
        if (carImg?.image_url) ogImage = carImg.image_url;
      }
      if (ogImage === 'https://zaitandfilters.com/og-image.jpg') {
        const { data: product } = await supabase
          .from('products').select('image_url')
          .ilike('car_make', make.trim()).not('image_url', 'is', null)
          .limit(1).single();
        if (product?.image_url) ogImage = product.image_url;
      }
    } else if (category) {
      const { data: catImg } = await supabase
        .from('category_images').select('image_url')
        .ilike('name', category.trim()).single();
      if (catImg?.image_url) {
        ogImage = catImg.image_url;
      } else {
        const { data: product } = await supabase
          .from('products').select('image_url')
          .ilike('category', category.trim()).not('image_url', 'is', null)
          .limit(1).single();
        if (product?.image_url) ogImage = product.image_url;
      }
    } else if (brand) {
      const { data: product } = await supabase
        .from('products').select('image_url')
        .ilike('brand', brand.trim()).not('image_url', 'is', null)
        .limit(1).single();
      if (product?.image_url) ogImage = product.image_url;
    } else if (query) {
      const { data: product } = await supabase
        .from('products').select('image_url')
        .ilike('name', `%${query.trim()}%`).not('image_url', 'is', null)
        .limit(1).single();
      if (product?.image_url) ogImage = product.image_url;
    }
  } catch {
    // keep default
  }

  const makeSlug = make ? (CAR_MAKE_AR[make] || make.toLowerCase()) : '';
  const modelSlug = model ? (CAR_MODEL_AR[model] || model.toLowerCase().replace(/\s+/g, '-')) : '';

  const canonicalUrl = `https://zaitandfilters.com/store${
    makeSlug ? `?make=${encodeURIComponent(makeSlug)}${modelSlug ? `&model=${encodeURIComponent(modelSlug)}` : ''}` :
    category ? `?category=${encodeURIComponent(category)}` :
    brand    ? `?brand=${encodeURIComponent(brand)}`       :
    query    ? `?q=${encodeURIComponent(query)}`           : ''
  }`;

  return {
    title,
    description,
    keywords,
    authors: [{ name: 'Zait & Filters' }],
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'زيت أند فلترز - Zait & Filters',
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
      locale: 'ar_EG',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
    alternates: { canonical: canonicalUrl },
  };
}

export default function StorePage() {
  return <StoreClient />;
}