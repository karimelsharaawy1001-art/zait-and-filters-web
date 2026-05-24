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

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const make     = (sp.make     || '').toUpperCase();
  const model    = (sp.model    || '').toUpperCase();
  const category = sp.category || '';
  const brand    = sp.brand    || '';
  const query    = sp.q        || '';

  const makeAr  = CAR_MAKE_AR[make]  || make;
  const modelAr = CAR_MODEL_AR[model] || model;

  let title       = 'زيت أند فلترز | قطع غيار السيارات الأصلية';
  let description = 'تسوق أفضل قطع غيار السيارات الأصلية في مصر بأفضل الأسعار. فلاتر، زيوت، عفشة، فرامل، بوجيهات وأكثر. شحن لباب البيت في جميع المحافظات.';
  let keywords: string[] = [
    'قطع غيار سيارات', 'قطع غيار أصلية', 'قطع غيار مصر',
    'زيت موتور', 'فلاتر سيارات', 'عفشة', 'فرامل',
    'زيت أند فلترز', 'متجر قطع غيار اونلاين',
    'شحن قطع غيار لباب البيت',
  ];
  let ogImage = 'https://zaitandfilters.com/og-image.jpg';

  if (make) {
    const carPhrase = modelAr ? `${makeAr} ${modelAr}` : makeAr;
    const carPhraseEn = model ? `${make} ${model}` : make;

    title = `قطع غيار ${carPhrase} الأصلية | زيت أند فلترز`;
    description = `تسوق قطع غيار ${carPhrase} الأصلية بأفضل الأسعار في مصر. ` +
      `فلاتر زيت، زيت موتور، عفشة، فرامل، بوجيهات، سيور وجميع قطع ${carPhrase}. ` +
      `شحن سريع لجميع المحافظات مع ضمان الجودة من زيت أند فلترز.`;
    keywords = [
      `قطع غيار ${makeAr}`,
      `قطع غيار ${carPhrase}`,
      `${makeAr} قطع غيار`,
      `قطع غيار ${carPhraseEn}`,
      `فلتر زيت ${makeAr}`,
      `فلتر زيت ${carPhrase}`,
      `زيت موتور ${makeAr}`,
      `زيت موتور ${carPhrase}`,
      `عفشة ${makeAr}`,
      `عفشة ${carPhrase}`,
      `فرامل ${makeAr}`,
      `فرامل ${carPhrase}`,
      `بوجيهات ${makeAr}`,
      `بوجيهات ${carPhrase}`,
      `مساعدين ${makeAr}`,
      `مساعدين ${carPhrase}`,
      `سيور ${makeAr}`,
      `بلية عجل ${makeAr}`,
      `فلتر هواء ${makeAr}`,
      `فلتر تكييف ${makeAr}`,
      `احسن قطع غيار ${makeAr}`,
      `افضل قطع غيار ${carPhrase}`,
      `سعر قطع غيار ${carPhrase}`,
      `قطع غيار ${makeAr} مصر`,
      `قطع غيار ${carPhrase} مصر`,
      `${make} spare parts egypt`,
      `${carPhraseEn} spare parts`,
      'قطع غيار أصلية مصر',
      'زيت أند فلترز',
      'قطع غيار سيارات مصر',
      'متجر قطع غيار اونلاين مصر',
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
      `${category} بأفضل سعر`,
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