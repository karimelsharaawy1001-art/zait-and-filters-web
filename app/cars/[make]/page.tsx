import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import CarMakeClient from './CarMakeClient';

const BASE_URL = 'https://zaitandfilters.com';

// ── Car make metadata map ────────────────────────────────────────────────────
export const CAR_MAKES: Record<string, {
  arName: string;
  arAlt: string[];       // alternate Arabic spellings users type
  description: string;
  keywords: string[];
  popularModels: string[];
}> = {
  HYUNDAI: {
    arName: 'هيونداي',
    arAlt: ['هيونداى', 'هونداي', 'هيونداي'],
    description: 'قطع غيار هيونداي الأصلية في مصر — النترا، اكسنت، توسان، جراند i10، سوناتا. فلاتر، زيوت، فرامل، عفشة وجميع القطع بأفضل الأسعار. شحن سريع لباب البيت في جميع محافظات مصر.',
    keywords: [
      'قطع غيار هيونداي', 'قطع غيار هيونداي مصر', 'قطع غيار هيونداي النترا',
      'قطع غيار هيونداي اكسنت', 'قطع غيار هيونداي توسان', 'قطع غيار هيونداي جراند i10',
      'قطع غيار هيونداي سوناتا', 'قطع غيار هيونداي فيرنا', 'قطع غيار هيونداي ماتريكس',
      'hyundai spare parts egypt', 'hyundai parts cairo', 'قطع هيونداى مصر',
      'زيت موتور هيونداي', 'فلاتر هيونداي', 'فرامل هيونداي', 'مساعدين هيونداي',
      'احسن قطع غيار هيونداي', 'افضل قطع غيار هيونداي', 'سعر قطع غيار هيونداي',
    ],
    popularModels: ['النترا', 'اكسنت', 'توسان', 'جراند i10', 'سوناتا', 'فيرنا'],
  },
  KIA: {
    arName: 'كيا',
    arAlt: ['كيا'],
    description: 'قطع غيار كيا الأصلية في مصر — سيراتو، سبورتاج، بيكانتو، ريو، كارينز. جميع القطع أصلية بأفضل الأسعار في مصر. شحن سريع لباب البيت.',
    keywords: [
      'قطع غيار كيا', 'قطع غيار كيا مصر', 'قطع غيار كيا سيراتو',
      'قطع غيار كيا سبورتاج', 'قطع غيار كيا بيكانتو', 'قطع غيار كيا ريو',
      'قطع غيار كيا كارينز', 'kia spare parts egypt', 'kia parts cairo',
      'زيت موتور كيا', 'فلاتر كيا', 'فرامل كيا', 'مساعدين كيا', 'عفشة كيا',
      'احسن قطع غيار كيا', 'افضل قطع غيار كيا', 'سعر قطع غيار كيا',
    ],
    popularModels: ['سيراتو', 'سبورتاج', 'بيكانتو', 'ريو', 'كارينز', 'سول'],
  },
  TOYOTA: {
    arName: 'تويوتا',
    arAlt: ['تيوتا', 'تويتا'],
    description: 'قطع غيار تويوتا الأصلية في مصر — كورولا، يارس، كامري، راف فور. جميع القطع أصلية بأسعار مناسبة. شحن لباب البيت في جميع محافظات مصر.',
    keywords: [
      'قطع غيار تويوتا', 'قطع غيار تويوتا مصر', 'قطع غيار تويوتا كورولا',
      'قطع غيار تويوتا يارس', 'قطع غيار تويوتا كامري', 'قطع غيار تويوتا راف فور',
      'toyota spare parts egypt', 'toyota parts cairo', 'تويوتا قطع غيار',
      'زيت موتور تويوتا', 'فلاتر تويوتا', 'فرامل تويوتا', 'مساعدين تويوتا',
      'احسن قطع غيار تويوتا', 'سعر قطع غيار تويوتا', 'تويوتا اصلي مصر',
    ],
    popularModels: ['كورولا', 'يارس', 'كامري', 'راف فور', 'برادو', 'هايلكس'],
  },
  CHEVROLET: {
    arName: 'شيفروليه',
    arAlt: ['شيفروله', 'شيفروليه', 'تشيفروليه'],
    description: 'قطع غيار شيفروليه الأصلية في مصر — اوبترا، كروز، كابتيفا، لانوس، افيو. أفضل الأسعار في مصر مع شحن سريع لباب البيت.',
    keywords: [
      'قطع غيار شيفروليه', 'قطع غيار شيفروليه مصر', 'قطع غيار اوبترا',
      'قطع غيار كروز', 'قطع غيار كابتيفا', 'قطع غيار لانوس', 'قطع غيار افيو',
      'chevrolet spare parts egypt', 'optra parts egypt', 'cruze parts egypt',
      'زيت موتور اوبترا', 'فلاتر اوبترا', 'فرامل اوبترا', 'مساعدين اوبترا',
      'زيت موتور كروز', 'فلاتر كروز', 'مساعدين كروز', 'عفشة اوبترا',
      'احسن قطع غيار شيفروليه', 'سعر قطع غيار اوبترا', 'قطع غيار شيفروليه رخيصة',
    ],
    popularModels: ['اوبترا', 'كروز', 'كابتيفا', 'افيو', 'لانوس'],
  },
  NISSAN: {
    arName: 'نيسان',
    arAlt: ['نيسان'],
    description: 'قطع غيار نيسان الأصلية في مصر — صني، سنترا، قاشقاي، تيدا، اكس تريل. قطع أصلية بأفضل الأسعار مع شحن سريع.',
    keywords: [
      'قطع غيار نيسان', 'قطع غيار نيسان مصر', 'قطع غيار نيسان صني',
      'قطع غيار نيسان سنترا', 'قطع غيار نيسان قاشقاي', 'قطع غيار نيسان تيدا',
      'nissan spare parts egypt', 'nissan sunny parts egypt', 'نيسان قطع غيار',
      'زيت موتور نيسان', 'فلاتر نيسان', 'مساعدين نيسان', 'فرامل نيسان',
      'احسن قطع غيار نيسان', 'سعر قطع غيار نيسان',
    ],
    popularModels: ['صني', 'سنترا', 'قاشقاي', 'تيدا', 'اكس تريل'],
  },
  MITSUBISHI: {
    arName: 'ميتسوبيشي',
    arAlt: ['ميتسوبيشى', 'متسوبيشي'],
    description: 'قطع غيار ميتسوبيشي الأصلية في مصر — لانسر، باجيرو، اكليبس. جميع القطع أصلية بأفضل الأسعار في مصر مع شحن لباب البيت.',
    keywords: [
      'قطع غيار ميتسوبيشي', 'قطع غيار ميتسوبيشي مصر', 'قطع غيار لانسر',
      'قطع غيار باجيرو', 'قطع غيار اكليبس', 'mitsubishi spare parts egypt',
      'lancer parts egypt', 'زيت موتور لانسر', 'فلاتر لانسر', 'فرامل لانسر',
      'احسن قطع غيار ميتسوبيشي', 'سعر قطع غيار لانسر',
    ],
    popularModels: ['لانسر', 'باجيرو', 'اكليبس', 'جالانت'],
  },
  RENAULT: {
    arName: 'رينو',
    arAlt: ['رينو', 'رينوه'],
    description: 'قطع غيار رينو الأصلية في مصر — لوجان، ميجان، داستر، سانديرو، كليو، كادجار. أفضل الأسعار في مصر مع شحن سريع لباب البيت.',
    keywords: [
      'قطع غيار رينو', 'قطع غيار رينو مصر', 'قطع غيار رينو لوجان',
      'قطع غيار رينو ميجان', 'قطع غيار رينو داستر', 'قطع غيار رينو سانديرو',
      'renault spare parts egypt', 'logan parts egypt', 'megane parts egypt',
      'زيت موتور رينو', 'فلاتر رينو', 'مساعدين رينو',
      'احسن قطع غيار رينو', 'سعر قطع غيار رينو',
    ],
    popularModels: ['لوجان', 'ميجان', 'داستر', 'سانديرو', 'كليو', 'كادجار'],
  },
  PEUGEOT: {
    arName: 'بيجو',
    arAlt: ['بيجيو', 'بيجو', 'بيجوه'],
    description: 'قطع غيار بيجو الأصلية في مصر — 301، 206، 207، 2008، 3008، 308. قطع أصلية بأسعار مناسبة مع شحن لباب البيت.',
    keywords: [
      'قطع غيار بيجو', 'قطع غيار بيجو مصر', 'قطع غيار بيجو 301',
      'قطع غيار بيجو 206', 'قطع غيار بيجو 2008', 'قطع غيار بيجو 3008',
      'peugeot spare parts egypt', 'بيجو قطع غيار', 'زيت موتور بيجو',
      'فلاتر بيجو', 'فرامل بيجو', 'احسن قطع غيار بيجو',
    ],
    popularModels: ['301', '206', '2008', '3008', '308', '508'],
  },
  VOLKSWAGEN: {
    arName: 'فولكس فاجن',
    arAlt: ['فولكس', 'فولكسفاجن', 'فولكس فاجن'],
    description: 'قطع غيار فولكس فاجن الأصلية في مصر — جولف، باسات، بولو، تيجوان، جيتا. قطع أصلية بأفضل الأسعار مع شحن لباب البيت.',
    keywords: [
      'قطع غيار فولكس فاجن', 'قطع غيار فولكس', 'قطع غيار فولكس فاجن مصر',
      'قطع غيار جولف', 'قطع غيار باسات', 'قطع غيار بولو', 'قطع غيار تيجوان',
      'volkswagen spare parts egypt', 'vw parts egypt', 'golf parts egypt',
      'فلاتر فولكس', 'زيت موتور فولكس', 'احسن قطع غيار فولكس',
    ],
    popularModels: ['جولف', 'باسات', 'بولو', 'تيجوان', 'جيتا'],
  },
  SKODA: {
    arName: 'سكودا',
    arAlt: ['سكودا', 'شكودا'],
    description: 'قطع غيار سكودا الأصلية في مصر — اوكتافيا، فابيا، سوبرب، رابيد. أفضل الأسعار في مصر مع شحن سريع لباب البيت.',
    keywords: [
      'قطع غيار سكودا', 'قطع غيار سكودا مصر', 'قطع غيار سكودا اوكتافيا',
      'قطع غيار اوكتافيا', 'skoda spare parts egypt', 'octavia parts egypt',
      'فلاتر سكودا', 'زيت موتور سكودا', 'احسن قطع غيار سكودا',
    ],
    popularModels: ['اوكتافيا', 'فابيا', 'سوبرب', 'رابيد'],
  },
  OPEL: {
    arName: 'أوبل',
    arAlt: ['اوبل', 'أوبل'],
    description: 'قطع غيار أوبل الأصلية في مصر — أسترا، فيكترا، انسيجنيا. قطع أصلية بأفضل الأسعار مع شحن سريع لباب البيت.',
    keywords: [
      'قطع غيار اوبل', 'قطع غيار أوبل مصر', 'قطع غيار اوبل استرا',
      'opel spare parts egypt', 'astra parts egypt', 'فلاتر اوبل', 'زيت موتور اوبل',
    ],
    popularModels: ['أسترا', 'فيكترا', 'انسيجنيا', 'كورسا'],
  },
  MG: {
    arName: 'إم جي',
    arAlt: ['ام جي', 'إم جي', 'MG'],
    description: 'قطع غيار إم جي الأصلية في مصر — MG5، MG6، ZS، HS، RX5. قطع أصلية بأفضل الأسعار مع شحن لباب البيت.',
    keywords: [
      'قطع غيار ام جي', 'قطع غيار MG مصر', 'قطع غيار MG5', 'قطع غيار MG6',
      'قطع غيار ZS', 'قطع غيار HS', 'MG spare parts egypt', 'mg5 parts egypt',
      'فلاتر ام جي', 'زيت موتور ام جي', 'احسن قطع غيار ام جي',
    ],
    popularModels: ['MG5', 'MG6', 'ZS', 'HS', 'RX5'],
  },
  HONDA: {
    arName: 'هوندا',
    arAlt: ['هوندا'],
    description: 'قطع غيار هوندا الأصلية في مصر — سيتي، سيفيك، اكورد، CR-V. قطع أصلية بأفضل الأسعار مع شحن لباب البيت.',
    keywords: [
      'قطع غيار هوندا', 'قطع غيار هوندا مصر', 'قطع غيار هوندا سيتي',
      'قطع غيار هوندا سيفيك', 'honda spare parts egypt', 'city parts egypt',
      'فلاتر هوندا', 'زيت موتور هوندا', 'احسن قطع غيار هوندا',
    ],
    popularModels: ['سيتي', 'سيفيك', 'اكورد', 'CR-V'],
  },
  SUZUKI: {
    arName: 'سوزوكي',
    arAlt: ['سوزكي', 'سوزوكى'],
    description: 'قطع غيار سوزوكي الأصلية في مصر — سويفت، فيتارا، سيلريو، بالينو. قطع أصلية بأسعار مناسبة مع شحن لباب البيت.',
    keywords: [
      'قطع غيار سوزوكي', 'قطع غيار سوزوكي مصر', 'قطع غيار سوزوكي سويفت',
      'suzuki spare parts egypt', 'swift parts egypt', 'فلاتر سوزوكي', 'زيت موتور سوزوكي',
    ],
    popularModels: ['سويفت', 'فيتارا', 'سيلريو', 'بالينو'],
  },
  MAZDA: {
    arName: 'مازدا',
    arAlt: ['مازدا'],
    description: 'قطع غيار مازدا الأصلية في مصر — مازدا 3، مازدا 6، CX-5. قطع أصلية بأفضل الأسعار مع شحن سريع لباب البيت.',
    keywords: [
      'قطع غيار مازدا', 'قطع غيار مازدا مصر', 'قطع غيار مازدا 3', 'قطع غيار مازدا 6',
      'mazda spare parts egypt', 'mazda3 parts egypt', 'فلاتر مازدا', 'زيت موتور مازدا',
    ],
    popularModels: ['مازدا 3', 'مازدا 6', 'CX-5', 'CX-3'],
  },
  SEAT: {
    arName: 'سيات',
    arAlt: ['سيات', 'سييت'],
    description: 'قطع غيار سيات الأصلية في مصر — ابيزا، ليون، توليدو. قطع أصلية بأفضل الأسعار مع شحن لباب البيت.',
    keywords: [
      'قطع غيار سيات', 'قطع غيار سيات مصر', 'seat spare parts egypt',
      'فلاتر سيات', 'زيت موتور سيات',
    ],
    popularModels: ['ابيزا', 'ليون', 'توليدو'],
  },
  BMW: {
    arName: 'بي إم دبليو',
    arAlt: ['BMW', 'بي ام دبليو', 'بي إم دبليو'],
    description: 'قطع غيار BMW الأصلية في مصر — الفئة الثالثة، الفئة الخامسة، X5. قطع أصلية بأفضل الأسعار مع شحن لباب البيت.',
    keywords: [
      'قطع غيار BMW', 'قطع غيار بي ام دبليو', 'قطع غيار BMW مصر',
      'bmw spare parts egypt', 'فلاتر BMW', 'زيت موتور BMW',
    ],
    popularModels: ['الفئة الثالثة', 'الفئة الخامسة', 'X5', 'X3'],
  },
  MERCEDES: {
    arName: 'مرسيدس',
    arAlt: ['مرسيدس', 'مرسيدس بنز'],
    description: 'قطع غيار مرسيدس الأصلية في مصر — C Class، E Class، GLE. قطع أصلية بأفضل الأسعار مع شحن لباب البيت.',
    keywords: [
      'قطع غيار مرسيدس', 'قطع غيار مرسيدس مصر', 'mercedes spare parts egypt',
      'فلاتر مرسيدس', 'زيت موتور مرسيدس',
    ],
    popularModels: ['C Class', 'E Class', 'GLE', 'GLC'],
  },
  FORD: {
    arName: 'فورد',
    arAlt: ['فورد'],
    description: 'قطع غيار فورد الأصلية في مصر — فيستا، فيوجن، اكسبلورر. قطع أصلية بأفضل الأسعار مع شحن لباب البيت.',
    keywords: [
      'قطع غيار فورد', 'قطع غيار فورد مصر', 'ford spare parts egypt',
      'فلاتر فورد', 'زيت موتور فورد',
    ],
    popularModels: ['فيستا', 'فيوجن', 'اكسبلورر', 'رينجر'],
  },
  JEEP: {
    arName: 'جيب',
    arAlt: ['جيب'],
    description: 'قطع غيار جيب الأصلية في مصر — رانجلر، جراند شيروكي، كومباس. قطع أصلية بأفضل الأسعار مع شحن لباب البيت.',
    keywords: [
      'قطع غيار جيب', 'قطع غيار جيب مصر', 'jeep spare parts egypt',
      'فلاتر جيب', 'زيت موتور جيب',
    ],
    popularModels: ['رانجلر', 'جراند شيروكي', 'كومباس'],
  },
};

// Supabase server client (anon key is fine — products are public)
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function generateStaticParams() {
  return Object.keys(CAR_MAKES).map((make) => ({ make: make.toLowerCase() }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ make: string }> }
): Promise<Metadata> {
  const { make } = await params;
  const makeKey = make.toUpperCase();
  const info = CAR_MAKES[makeKey];
  if (!info) return { title: 'قطع غيار سيارات | زيت أند فلترز' };

  const title = `قطع غيار ${info.arName} الأصلية في مصر | زيت أند فلترز`;
  const canonicalUrl = `${BASE_URL}/cars/${make.toLowerCase()}`;

  return {
    title,
    description: info.description,
    keywords: [
      ...info.keywords,
      ...info.arAlt.map(alt => `قطع غيار ${alt}`),
      ...info.arAlt.map(alt => `${alt} قطع غيار مصر`),
      'قطع غيار بالتقسيط', 'فاليو قطع غيار', 'سهولة قطع غيار', 'حالا قطع غيار',
      'زيت أند فلترز', 'قطع غيار اصلية مصر', 'شحن قطع غيار لباب البيت',
    ],
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description: info.description,
      url: canonicalUrl,
      siteName: 'زيت أند فلترز - Zait & Filters',
      locale: 'ar_EG',
      type: 'website',
    },
    robots: { index: true, follow: true },
  };
}

export default async function CarMakePage({ params }: { params: Promise<{ make: string }> }) {
  const { make } = await params;
  const makeKey = make.toUpperCase();
  const info = CAR_MAKES[makeKey];
  if (!info) notFound();

  const supabase = getSupabase();

  // Fetch product count, product model counts, car images, and featured products in parallel
  const [{ count }, { data: modelData }, { data: carImages }, { data: featuredProducts }] = await Promise.all([
    supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('car_make', makeKey)
      .eq('is_active', true),
    supabase
      .from('products')
      .select('car_model')
      .eq('car_make', makeKey)
      .eq('is_active', true)
      .not('car_model', 'is', null)
      .limit(1000),
    supabase
      .from('car_images')
      .select('car_model, image_url')
      .ilike('car_make', makeKey),
    supabase
      .from('products')
      .select('id, slug, name, brand, category, subcategory, regular_price, sale_price, image_url')
      .eq('car_make', makeKey)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  // Count products per model
  const modelCountMap = new Map<string, number>();
  (modelData || []).forEach((p: any) => {
    const model = (p.car_model || '').trim().toUpperCase();
    if (!model) return;
    modelCountMap.set(model, (modelCountMap.get(model) || 0) + 1);
  });

  // Build car image lookup (model → car photo URL)
  const carImageMap = new Map<string, string>();
  (carImages || []).forEach((ci: any) => {
    const model = (ci.car_model || '').trim().toUpperCase();
    if (model && ci.image_url && !carImageMap.has(model)) {
      carImageMap.set(model, ci.image_url);
    }
  });

  // Merge: every model that has products
  const knownOrder = info.popularModels.map(m => m.toUpperCase());
  const allModels = Array.from(modelCountMap.entries())
    .map(([modelKey, count]) => ({
      name: modelKey,                              // stored as-is (may be uppercase)
      img: carImageMap.get(modelKey) || '',
      count,
    }))
    .sort((a, b) => {
      const ai = knownOrder.indexOf(a.name);
      const bi = knownOrder.indexOf(b.name);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return b.count - a.count;
    });

  // Fall back to static popularModels if DB has no car_model data
  const models = allModels.length > 0
    ? allModels
    : info.popularModels.map(name => ({ name: name.toUpperCase(), img: '', count: 0 }));

  // JSON-LD structured data
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `قطع غيار ${info.arName} في مصر`,
    description: info.description,
    url: `${BASE_URL}/cars/${make.toLowerCase()}`,
    publisher: {
      '@type': 'Organization',
      name: 'Zait and Filters',
      url: BASE_URL,
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'قطع غيار حسب السيارة', item: `${BASE_URL}/cars` },
        { '@type': 'ListItem', position: 3, name: `قطع غيار ${info.arName}`, item: `${BASE_URL}/cars/${make.toLowerCase()}` },
      ],
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <CarMakeClient
        makeKey={makeKey}
        info={info}
        productCount={count ?? 0}
        models={models}
        featuredProducts={featuredProducts ?? []}
      />
    </>
  );
}
