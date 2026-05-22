import { cache, Suspense } from 'react';
import { supabase } from '@/app/lib/supabase';
import ProductDetailsClient from './ProductDetailsClient';
import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

// ============================================================
// FIX 1: cache() deduplicates the Supabase query so
// generateMetadata and ProductPage share one DB hit per request.
// ============================================================
const getProduct = cache(async (slug: string) => {
  // always decode — Next.js may pass encoded or decoded depending on how link was built
  const decodedSlug = decodeURIComponent(slug);
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decodedSlug);
  
  if (isUUID) {
    const { data } = await supabase.from('products').select('*').eq('id', decodedSlug).single();
    return data;
  }

  // try direct slug lookup first
  const { data } = await supabase.from('products').select('*').eq('slug', decodedSlug).single();
  if (data) return data;

  // check redirects table for old slugs
  const { data: slugRedirect } = await supabase
    .from('slug_redirects')
    .select('new_slug')
    .eq('old_slug', slug)
    .single();

  if (slugRedirect) {
    // return a special object that triggers a redirect
    return { _redirect: slugRedirect.new_slug };
  }

  return null;
});

// ============================================================
// Arabic translations for car makes
// ============================================================
const CAR_MAKE_AR: Record<string, string> = {
  TOYOTA: 'تويوتا',
  HYUNDAI: 'هيونداي',
  KIA: 'كيا',
  NISSAN: 'نيسان',
  CHEVROLET: 'شيفروليه',
  MITSUBISHI: 'ميتسوبيشي',
  VOLKSWAGEN: 'فولكس فاجن',
  SKODA: 'سكودا',
  PEUGEOT: 'بيجو',
  RENAULT: 'رينو',
  OPEL: 'أوبل',
  MG: 'إم جي',
  MAZDA: 'مازدا',
  SEAT: 'سيات',
  HONDA: 'هوندا',
  SUZUKI: 'سوزوكي',
  BMW: 'بي إم دبليو',
  MERCEDES: 'مرسيدس',
  FORD: 'فورد',
  JEEP: 'جيب',
  UNIVERSAL: '',
};

const CAR_MODEL_AR: Record<string, string> = {
  // Chevrolet
  'AVEO': 'افيو',
  'CAPTIVA': 'كابتيفا',
  'CRUZE': 'كروز',
  'LANOS': 'لانوس',
  'OPTRA': 'أوبترا',

  // Hyundai
  'ACCENT': 'اكسنت',
  'ACCENT HCI': 'اكسنت HCI',
  'ELANTRA': 'النترا',
  'GRAND I10': 'جراند i10',
  'I10': 'i10',
  'MATRIX': 'ماتريكس',
  'TUCSON': 'توسان',
  'VERNA': 'فيرنا',

  // Kia
  'CARENS': 'كارينز',
  'CERATO LD': 'سيراتو LD',
  'CERATO TD': 'سيراتو TD',
  'CERATO K3': 'سيراتو K3',
  'GRAND CERATO': 'جراند سيراتو',
  'PICANTO': 'بيكانتو',
  'RIO': 'ريو',
  'SOUL': 'سول',
  'SPORTAGE': 'سبورتاج',

  // MG
  '3': 'MG3',
  '5': 'MG5',
  '6': 'MG6',
  'HS': 'HS',
  'RX5': 'RX5',
  'ZS': 'ZS',

  // Mitsubishi
  'ECLIPSE': 'اكليبس',
  'LANCER PUMA': 'لانسر بوما',
  'LANCER SHARK': 'لانسر شارك',

  // Nissan
  'QASHQAI': 'قاشقاي',
  'SENTRA': 'سنترا',
  'SUNNY N16': 'صني N16',
  'SUNNY N17': 'صني N17',
  'TIIDA': 'تيدا',

  // Opel
  'ASTRA': 'أسترا',
  'INSIGNIA': 'انسيجنيا',

  // Peugeot
  '2008': '2008',
  '3008': '3008',
  '508': '508',
  '308': '308',
  '5008': '5008',

  // Renault
  'CAPTUR': 'كابتشر',
  'CLIO': 'كليو',
  'DUSTER': 'داستر',
  'FLUENCE': 'فلوانس',
  'KADJAR': 'كادجار',
  'LOGAN': 'لوجان',
  'MEGANE': 'ميجان',
  'SANDERO': 'سانديرو',
  'STEPWAY': 'ستيبواي',

  // Seat
  'IBIZA': 'ابيزا',
  'LEON': 'ليون',
  'TOLEDO': 'توليدو',

  // Skoda
  'OCTAVIA A4': 'اوكتافيا A4',
  'OCTAVIA A5': 'اوكتافيا A5',
  'OCTAVIA A7': 'اوكتافيا A7',
  'OCTAVIA A8': 'اوكتافيا A8',

  // Toyota
  'COROLLA': 'كورولا',
  'YARIS': 'يارس',

  // Volkswagen
  'PASSAT': 'باسات',
  'GOLF': 'جولف',
  'JETTA': 'جيتا',

  // Universal
  'UNIVERSAL': '',
};

// Popular car models — used for engine oil keywords/FAQs
const POPULAR_OIL_MODELS = [
  'اوبترا', 'كروز', 'كابتيفا', 'اوبل', 'افيو',
  'كورولا', 'كامري', 'يارس', 'راف فور',
  'لانسر', 'باجيرو', 'اكليبس',
  'النترا', 'توسان', 'سوناتا', 'اكسنت',
  'سيراتو', 'سبورتاج', 'سورينتو', 'بيكانتو',
  'سنترا', 'قاشقاي', 'اكس تريل',
  'جولف', 'باسات', 'بولو',
];

// Popular car models — used for all high-traffic part keywords/FAQs
const POPULAR_MODELS = [
  'اوبترا', 'كروز', 'كابتيفا', 'افيو',
  'كورولا', 'كامري', 'يارس', 'راف فور',
  'لانسر', 'باجيرو', 'اكليبس',
  'النترا', 'توسان', 'سوناتا', 'اكسنت',
  'سيراتو', 'سبورتاج', 'سورينتو', 'بيكانتو',
  'سنترا', 'قاشقاي', 'اكس تريل',
  'جولف', 'باسات', 'بولو',
  'بيجو 301', 'بيجو 206', 'بيجو 307',
  'مازدا 3', 'مازدا 6',
  'اوكتافيا', 'فابيا',
  'لانوس', 'أفيو',
];

const POPULAR_TIRE_SIZES = [
  '185/65R15', '195/65R15', '205/55R16', '215/60R16',
  '225/60R17', '235/55R17', '205/60R15', '175/65R14',
  '195/60R15', '215/65R16',
];

// ============================================================
// Sensor subcategory label helpers
// ============================================================
const SENSOR_LABELS: { match: string[]; ar: string; arAlt?: string }[] = [
  { match: ['شكمان', 'اوكسجين', 'oxygen', 'o2', 'lambda'], ar: 'حساس شكمان (أوكسجين)', arAlt: 'حساس الشكمان' },
  { match: ['حرارة', 'temperature', 'coolant', 'ect'], ar: 'حساس حرارة المياه', arAlt: 'حساس الثرموستات الكهربائي' },
  { match: ['هواء', 'maf', 'map', 'mass air'], ar: 'حساس كتلة الهواء', arAlt: 'حساس MAF' },
  { match: ['دعسة', 'throttle', 'tps'], ar: 'حساس الدعسة', arAlt: 'حساس وضع الخانق TPS' },
  { match: ['كامة', 'camshaft', 'cam'], ar: 'حساس الكامة', arAlt: 'حساس وضع عامود الكامة' },
  { match: ['كرنك', 'crankshaft', 'crank', 'ckp'], ar: 'حساس الكرنك', arAlt: 'حساس موضع عامود المرفق' },
  { match: ['ضغط زيت', 'oil pressure'], ar: 'حساس ضغط الزيت', arAlt: 'سويتش ضغط الزيت' },
  { match: ['سرعة', 'speed', 'abs', 'wheel'], ar: 'حساس السرعة', arAlt: 'حساس ABS' },
  { match: ['بنزين', 'fuel', 'level'], ar: 'حساس مستوى البنزين', arAlt: 'فلوتر البنزين' },
  { match: ['خبط', 'knock'], ar: 'حساس الخبط', arAlt: 'Knock Sensor' },
];

function getSensorLabel(product: any): { ar: string; arAlt: string } {
  const haystack = [product.name, product.subcategory, product.sku]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  for (const entry of SENSOR_LABELS) {
    if (entry.match.some((kw) => haystack.includes(kw))) {
      return { ar: entry.ar, arAlt: entry.arAlt || entry.ar };
    }
  }
  return { ar: `حساس ${product.subcategory || ''}`.trim(), arAlt: 'حساس كهربائي' };
}

function buildDescription(product: any): string {
  const brand = product.brand || '';
  const carAr = CAR_MAKE_AR[product.car_make] || product.car_make || '';
  const modelRaw = product.car_model && product.car_model !== 'UNIVERSAL' ? product.car_model : '';
const model = modelRaw ? (CAR_MODEL_AR[modelRaw.toUpperCase()] ?? modelRaw) : '';
  const year = product.car_model_year || '';
  const price = product.sale_price || product.regular_price || '';
  const partNumber = product.sku ? `رقم القطعة: ${product.sku}.` : '';
  const carPhrase = [carAr, model, year].filter(Boolean).join(' ');
  const fitPhrase = carPhrase ? `متوافقة مع سيارة ${carPhrase}` : 'متوافقة مع عدة موديلات';
  const pricePhrase = price ? `السعر: ${price} ج.م.` : '';
  const cat = product.category || '';
  const sub = product.subcategory || '';
  const isUniversal = !product.car_make || product.car_make === 'UNIVERSAL';

  if (cat === 'فلاتر') {
    if (sub === 'فلتر زيت' || sub === 'فلتر الزيت')
      return `فلتر زيت ${brand} ${fitPhrase}. ${pricePhrase} اشتري فلتر زيت أصلي ماركة ${brand} بأفضل سعر في مصر من زيت أند فلترز مع شحن سريع لباب البيت. فلتر الزيت يحمي الموتور من الشوائب ويطيل عمره. مناسب لسيارات أوبترا، كروز، كورولا، لانسر، النترا وجميع السيارات المتوافقة. ${partNumber}`;
    if (sub === 'فلتر هواء')
      return `فلتر هواء ${brand} ${fitPhrase}. ${pricePhrase} فلتر هواء أصلي ماركة ${brand} يحمي موتور سيارتك من الأتربة والشوائب ويحسن أداء الاحتراق. تغيير فلتر الهواء بانتظام يوفر الوقود ويحمي الموتور. متوفر الآن في زيت أند فلترز بأفضل سعر في مصر مع شحن لباب البيت. ${partNumber}`;
    if (sub === 'فلتر تكييف' || sub === 'فلتر كابينة')
      return `فلتر تكييف ${brand} ${fitPhrase}. ${pricePhrase} فلتر كابينة أصلي ماركة ${brand} لتنقية هواء التكييف داخل السيارة من الأتربة والروائح والجراثيم. يُنصح بتغييره كل 15,000 كيلومتر. اطلبه الآن من زيت أند فلترز بشحن لباب البيت. ${partNumber}`;
    if (sub === 'فلتر بنزين' || sub === 'فتر بنزين')
      return `فلتر بنزين ${brand} ${fitPhrase}. ${pricePhrase} فلتر وقود أصلي ماركة ${brand} يحمي طلمبة البنزين والإنجكتورات من الشوائب ويضمن أداء الموتور. متوفر في زيت أند فلترز بأفضل سعر في مصر مع شحن لباب البيت. ${partNumber}`;
    return `${sub} ${brand} ${fitPhrase}. ${pricePhrase} قطعة أصلية من ماركة ${brand} متوفرة في زيت أند فلترز بأفضل سعر في مصر. ${partNumber}`;
  }

  if (cat === 'زيوت موتور')
    return `زيت موتور ${brand} مواصفة ${sub} - ${product.name}. ${pricePhrase} زيت موتور ${sub} ماركة ${brand} أصلي تخليقي كامل. يحمي الموتور في درجات الحرارة العالية ويطيل عمره ويقلل الاحتكاك. مناسب لسيارات أوبترا، كروز، كورولا، لانسر، النترا، كامري، سبورتاج، قاشقاي، وجميع أنواع السيارات التي تستخدم مواصفة ${sub}. احسن زيت موتور بأفضل سعر في مصر من زيت أند فلترز مع شحن لباب البيت في جميع المحافظات.`;

  if (cat === 'زيوت فتيس و دبرياج و باور')
    return `زيت ${sub} ماركة ${brand} - ${product.name}. ${pricePhrase} زيت ${sub} أصلي ماركة ${brand} لحماية الفتيس والدبرياج وتقليل الاحتكاك وضمان أداء ناعم. مناسب لسيارات أوبترا، كروز، كورولا، لانسر، النترا وجميع السيارات التي تستخدم مواصفة ${sub}. اشتري زيت ${brand} ${sub} بأفضل سعر في مصر من زيت أند فلترز مع شحن لباب البيت في جميع المحافظات.`;

  if (cat === 'الفرامل') {
    if (sub === 'تيل فرامل')
      return `تيل فرامل ${brand} ${fitPhrase}. ${pricePhrase} تيل فرامل أصلي ماركة ${brand} لضمان الأمان والتوقف الآمن. يحمي أسطوانات الفرامل ويضمن أداء منظومة الفرامل الكاملة. احسن تيل فرامل بأفضل سعر في مصر من زيت أند فلترز مع شحن لباب البيت. ${partNumber}`;
    if (sub === 'طنابير')
      return `طنبور فرامل ${brand} ${fitPhrase}. ${pricePhrase} طنابير فرامل أصلية ماركة ${brand} بأفضل جودة وسعر في مصر. توفر توقف آمن وعمر طويل. متوفر في زيت أند فلترز مع شحن لباب البيت. ${partNumber}`;
    if (sub === 'ماستر فرامل')
      return `ماستر فرامل ${brand} ${fitPhrase}. ${pricePhrase} ماستر فرامل أصلي ماركة ${brand} يضمن ضغط الفرامل الصحيح وأمان التوقف. اطلبه الآن من زيت أند فلترز بأفضل سعر في مصر. ${partNumber}`;
    if (sub === 'تيل امامي' || sub === 'تيل خلفي')
      return `${sub === 'تيل امامي' ? 'تيل فرامل أمامي' : 'تيل فرامل خلفي'} ${brand} ${fitPhrase}. ${pricePhrase} تيل فرامل أصلي ماركة ${brand} يضمن أداء الفرامل وأمان القيادة. متوفر في زيت أند فلترز بأفضل سعر في مصر مع شحن لباب البيت. ${partNumber}`;
    return `${sub} ${brand} ${fitPhrase}. ${pricePhrase} قطعة فرامل أصلية ماركة ${brand} متوفرة في زيت أند فلترز. ${partNumber}`;
  }

  if (cat === 'عفشة') {
    if (sub === 'مساعدين و صدادات')
      return `مساعد ${brand} ${fitPhrase}. ${pricePhrase} مساعدين أصليين ماركة ${brand} لتحسين ثبات السيارة وراحة الركوب وحماية الإطارات من التآكل السريع. احسن مساعدين بأفضل سعر في مصر من زيت أند فلترز مع شحن لباب البيت. ${partNumber}`;
    if (sub === 'بلية عجل')
      return `بلية عجل ${brand} ${fitPhrase}. ${pricePhrase} بلية عجل أصلية ماركة ${brand} لضمان أمان القيادة وتقليل الاهتزاز والصوت. اطلبها من زيت أند فلترز بأفضل سعر في مصر. ${partNumber}`;
    if (sub === 'مقصات كاملة') return `مقص كامل ${brand} ${fitPhrase}. ${pricePhrase} مقصات عفشة أصلية ماركة ${brand} متوفرة في زيت أند فلترز بأفضل سعر. ${partNumber}`;
    if (sub === 'جلب و بيض مقصات') return `جلب و بيض مقصات ${brand} ${fitPhrase}. ${pricePhrase} قطع عفشة أصلية ماركة ${brand}. متوفر في زيت أند فلترز. ${partNumber}`;
    if (sub === 'بارات') return `بار عفشة ${brand} ${fitPhrase}. ${pricePhrase} بارات عفشة أصلية ماركة ${brand} متوفرة في زيت أند فلترز بأفضل سعر في مصر. ${partNumber}`;
    if (sub === 'بطاحات و بلي بطاحات') return `بطاحة و بلي بطاحة ${brand} ${fitPhrase}. ${pricePhrase} قطعة أصلية ماركة ${brand} من زيت أند فلترز. ${partNumber}`;
    if (sub === 'قواعد و شدادات') return `قاعدة و شداد موتور ${brand} ${fitPhrase}. ${pricePhrase} قواعد وشدادات أصلية ماركة ${brand} متوفرة في زيت أند فلترز. ${partNumber}`;
    if (sub === 'كبالن و كاوتش كوبلن') return `كبالن و كاوتش كوبلن ${brand} ${fitPhrase}. ${pricePhrase} قطع عفشة أصلية ماركة ${brand} من زيت أند فلترز بأفضل سعر في مصر. ${partNumber}`;
    if (sub === 'تيش ميزان و مسامير ميزان') return `تيش ميزان ${brand} ${fitPhrase}. ${pricePhrase} تيش ميزان ومسامير ميزان أصلية ماركة ${brand} من زيت أند فلترز. ${partNumber}`;
    return `${sub} ${brand} ${fitPhrase}. ${pricePhrase} قطعة عفشة أصلية ماركة ${brand} متوفرة في زيت أند فلترز بأفضل سعر في مصر. ${partNumber}`;
  }

  if (cat === 'سيور و بلي') {
    if (sub === 'سيور') return `سير ${brand} ${fitPhrase}. ${pricePhrase} سيور أصلية ماركة ${brand} لأفضل أداء للموتور. احسن سيور بأفضل سعر في مصر من زيت أند فلترز مع شحن لباب البيت. ${partNumber}`;
    if (sub === 'سير مجموعة') return `سير مجموعة ${brand} ${fitPhrase}. ${pricePhrase} سير مجموعة أصلي ماركة ${brand} يحرك جميع مكونات الموتور بكفاءة عالية. متوفر في زيت أند فلترز بأفضل سعر في مصر مع شحن لباب البيت. ${partNumber}`;
    if (sub === 'سير دينامو') return `سير دينامو ${brand} ${fitPhrase}. ${pricePhrase} سير دينامو أصلي ماركة ${brand} لضمان شحن البطارية وتشغيل الدينامو بكفاءة. متوفر في زيت أند فلترز بأفضل سعر في مصر. ${partNumber}`;
    if (sub === 'سير كاتينة' || sub === 'طقم كاتينة كامل') return `سير كاتينة ${brand} ${fitPhrase}. ${pricePhrase} سير كاتينة وطقم كاتينة كامل أصلي ماركة ${brand} يشمل جميع القطع اللازمة. اطلبه من زيت أند فلترز بأفضل سعر في مصر. ${partNumber}`;
    if (sub === 'بلي و شدادات') return `بلي وشداد سير ${brand} ${fitPhrase}. ${pricePhrase} بلي وشدادات أصلية ماركة ${brand} متوفرة في زيت أند فلترز. ${partNumber}`;
    return `${sub} ${brand} ${fitPhrase}. ${pricePhrase} قطعة أصلية ماركة ${brand} من زيت أند فلترز. ${partNumber}`;
  }

  if (cat === 'دورة تبريد و تكييف') {
    if (sub === 'طلمبات مياه') return `طلمبة مياه ${brand} ${fitPhrase}. ${pricePhrase} طلمبة مياه أصلية ماركة ${brand} لضمان تبريد الموتور بكفاءة ومنع الاحتراق. متوفرة في زيت أند فلترز بأفضل سعر في مصر. ${partNumber}`;
    if (sub === 'ردياتير') return `ردياتير ${brand} ${fitPhrase}. ${pricePhrase} ردياتير أصلي ماركة ${brand} لتبريد الموتور وحمايته من الاحتراق. اطلبه من زيت أند فلترز بأفضل سعر مع شحن لباب البيت. ${partNumber}`;
    if (sub === 'كوعة و ثرموستات') return `ثرموستات و كوعة ${brand} ${fitPhrase}. ${pricePhrase} ثرموستات أصلي ماركة ${brand} لتنظيم درجة حرارة الموتور ومنع الارتفاع المفاجئ. متوفر في زيت أند فلترز. ${partNumber}`;
    if (sub === 'سربنتينة تكييف') return `سربنتينة تكييف ${brand} ${fitPhrase}. ${pricePhrase} سربنتينة تكييف أصلية ماركة ${brand} متوفرة في زيت أند فلترز بأفضل سعر في مصر. ${partNumber}`;
    if (sub === 'خراطيم و مواسير تبريد') return `خرطوم تبريد ${brand} ${fitPhrase}. ${pricePhrase} خراطيم ومواسير تبريد أصلية ماركة ${brand}. اطلبها من زيت أند فلترز. ${partNumber}`;
    if (sub === 'زيت تبريد' || sub === 'تيل تبريد' || sub === 'كولانت')
      return `كولانت ${brand} ${fitPhrase}. ${pricePhrase} زيت تبريد (كولانت) أصلي ماركة ${brand} يحمي دورة تبريد الموتور من الصدأ والتجمد ويمنع احتراق الموتور. متوفر في زيت أند فلترز بأفضل سعر في مصر. ${partNumber}`;
    return `${sub} ${brand} ${fitPhrase}. ${pricePhrase} قطعة تبريد أصلية ماركة ${brand} من زيت أند فلترز بأفضل سعر. ${partNumber}`;
  }

  if (cat === 'دورة البنزين')
    return `طلمبة بنزين ${brand} ${fitPhrase}. ${pricePhrase} طلمبة بنزين أصلية ماركة ${brand} لضمان تدفق الوقود بشكل سليم وحماية الإنجكتورات والموتور. احسن طلمبة بنزين بأفضل سعر في مصر من زيت أند فلترز مع شحن لباب البيت في جميع المحافظات. ${partNumber}`;

  if (cat === 'بوجيهات و سلوك بوجيهات و موبينة') {
    if (sub === 'بوجيهات')
      return `بوجيه ${brand} ${fitPhrase}. ${pricePhrase} بوجيهات أصلية ماركة ${brand} لتحسين أداء الموتور وتوفير الوقود وتقليل الانبعاثات وتجنب مشكلة اهتزاز الموتور. احسن بوجيهات بأفضل سعر في مصر من زيت أند فلترز مع شحن لباب البيت. ${partNumber}`;
    if (sub === 'موبينة')
      return `موبينة ${brand} ${fitPhrase}. ${pricePhrase} موبينة أصلية ماركة ${brand} لتوليد شرارة احتراق قوية وثابتة وتحسين أداء الإشعال. متوفرة في زيت أند فلترز. ${partNumber}`;
    return `${sub} ${brand} ${fitPhrase}. ${pricePhrase} قطعة إشعال أصلية ماركة ${brand} من زيت أند فلترز. ${partNumber}`;
  }

  if (cat === 'حساسات و قطع كهربائية') {
    if (sub === 'حساسات') {
      const { ar: sensorAr, arAlt } = getSensorLabel(product);
      const carLine = carPhrase ? `مصمم خصيصاً لسيارة ${carPhrase}` : 'متوافق مع عدة موديلات';
      return (
        `${sensorAr} ماركة ${brand} ${carLine}. ${pricePhrase} ` +
        `${sensorAr} أصلي (${arAlt}) ماركة ${brand} يضمن دقة قراءة بيانات السيارة وسلامة أداء الموتور. ` +
        `يُعالج عطل لمبة Check Engine الناتج عن خلل ${sensorAr}، ويُحسّن كفاءة استهلاك الوقود. ` +
        `منشأ كوري الصنع مع ضمان استبدال. ` +
        `احصل عليه الآن من زيت أند فلترز بأفضل سعر في مصر مع شحن لباب البيت في جميع المحافظات. ${partNumber}`
      );
    }
    return `${sub} ${brand} ${fitPhrase}. ${pricePhrase} قطعة كهربائية أصلية ماركة ${brand} متوفرة في زيت أند فلترز. ${partNumber}`;
  }

  if (cat === 'جوانات و أويل سيل')
    return `جوان وأويل سيل ${brand} ${fitPhrase}. ${pricePhrase} جوانات وأويل سيل أصلية ماركة ${brand} لمنع تسرب الزيت وضمان إحكام غلق الموتور. متوفرة في زيت أند فلترز بأفضل سعر في مصر. ${partNumber}`;

  if (cat === 'مستلزمات عمرة موتور') {
    if (sub === 'طقم بستم') return `طقم بستم ${brand} ${fitPhrase}. ${pricePhrase} طقم بستم أصلي ماركة ${brand} لعمرة الموتور الكاملة. يشمل جميع القطع اللازمة للعمرة بأفضل مواصفات. متوفر في زيت أند فلترز بأفضل سعر في مصر. ${partNumber}`;
    if (sub === 'عامود كامة') return `عامود كامة ${brand} ${fitPhrase}. ${pricePhrase} عامود كامة أصلي ماركة ${brand}. اطلبه من زيت أند فلترز بأفضل سعر في مصر. ${partNumber}`;
    return `${sub} ${brand} ${fitPhrase}. ${pricePhrase} قطعة موتور أصلية ماركة ${brand} من زيت أند فلترز. ${partNumber}`;
  }

  if (cat === 'قطع الموتور و ملحقاته')
    return `${sub || 'قطعة موتور'} ${brand} ${fitPhrase}. ${pricePhrase} قطعة موتور أصلية ماركة ${brand} متوفرة في زيت أند فلترز بأفضل سعر في مصر. ${partNumber}`;

  if (cat === 'دبرياج و قطع فتيس')
    return `${sub || 'قطعة دبرياج'} ${brand} ${fitPhrase}. ${pricePhrase} قطعة دبرياج أصلية ماركة ${brand} من زيت أند فلترز بأفضل سعر في مصر. ${partNumber}`;

  if (cat === 'إطارات') {
    const size = sub || '';
    return (
      `إطار ${brand} ${size} ${fitPhrase}. ${pricePhrase} ` +
      `إطارات ${brand} أصلية بأفضل سعر في مصر. ` +
      `مناسبة لسيارات أوبترا، كروز، كورولا، لانسر، النترا، سبورتاج، قاشقاي وغيرها. ` +
      `إطار ${brand} ${size} يوفر ثباتاً عالياً وتحكماً ممتازاً في جميع الظروف الجوية. ` +
      `متوفر في زيت أند فلترز مع شحن لباب البيت في جميع المحافظات بأفضل سعر إطارات في مصر.`
    );
  }

  if (cat === 'مساحات')
    return `مساحة زجاج ${brand} ${fitPhrase}. ${pricePhrase} مساحات زجاج أصلية ماركة ${brand} بأفضل سعر في مصر من زيت أند فلترز. ${partNumber}`;

  if (isUniversal)
    return `${product.name} ماركة ${brand} - ${cat}. ${pricePhrase} ${product.name} أصلي ماركة ${brand} مناسب لجميع أنواع السيارات. متوفر الآن في زيت أند فلترز بأفضل سعر في مصر مع شحن لباب البيت في جميع المحافظات.`;

  return `${product.name} ماركة ${brand} ${fitPhrase}. ${pricePhrase} قطعة غيار أصلية متوفرة في زيت أند فلترز بأفضل سعر في مصر مع شحن لباب البيت. ${partNumber}`;
}

function buildTitle(product: any): string {
  const brand = product.brand || '';
  const isUniversal = !product.car_make || product.car_make === 'UNIVERSAL';
  const carAr = isUniversal ? '' : (CAR_MAKE_AR[product.car_make] || product.car_make || '');
  const modelRaw = product.car_model && product.car_model !== 'UNIVERSAL' ? product.car_model : '';
  const modelAr = modelRaw ? (CAR_MODEL_AR[modelRaw.toUpperCase()] ?? modelRaw) : '';
  const years = expandYearRange(product.car_model_year || '');
  const yearStr = years.join(' ');
  const origin = product.country_of_origin || '';
  const originSuffix = origin ? ` - ${origin}` : '';
  const siteName = ' | زيت أند فلترز';

  return [product.name, carAr, modelAr, yearStr, brand, originSuffix]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim() + siteName;
}

// ============================================================
// Shopping-optimized title for openGraph/twitter AND GMC feed
// ============================================================
function buildShoppingTitle(product: any): string {
  const brand = product.brand || '';
  const isUniversal = !product.car_make || product.car_make === 'UNIVERSAL';
  const carAr = isUniversal ? '' : (CAR_MAKE_AR[product.car_make] || product.car_make || '');
  const modelRaw = product.car_model && product.car_model !== 'UNIVERSAL' ? product.car_model : '';
  const modelAr = modelRaw ? (CAR_MODEL_AR[modelRaw.toUpperCase()] ?? modelRaw) : '';
  const years = expandYearRange(product.car_model_year || '');
  const yearStr = years.join(' ');
  const origin = product.country_of_origin || '';

  return [product.name, carAr, modelAr, yearStr, brand, origin]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 150);
}

function expandYearRange(yearStr: string): string[] {
  if (!yearStr) return [];
  const match = yearStr.match(/(\d{4})\s*[-–]\s*(\d{4})/);
  if (match) {
    const start = parseInt(match[1]);
    const end = parseInt(match[2]);
    const years: string[] = [];
    for (let y = start; y <= end; y++) years.push(String(y));
    return years;
  }
  return [yearStr.trim()].filter(Boolean);
}

function buildKeywords(product: any): string[] {
  const brand = product.brand || '';
  const isUniversal = !product.car_make || product.car_make === 'UNIVERSAL';
  const carAr = isUniversal ? '' : (CAR_MAKE_AR[product.car_make] || '');
  const model = product.car_model && product.car_model !== 'UNIVERSAL' ? product.car_model : '';
  const carEn = isUniversal ? '' : (product.car_make || '');
  const sub = product.subcategory || '';
  const years = expandYearRange(product.car_model_year || '');
  const yearKeywords = years.flatMap(yr => [
    `${product.name} ${brand} ${carAr} ${model} ${yr}`.trim(),
    `${product.subcategory || product.name} ${brand} ${carAr} ${yr}`.trim(),
    `${product.subcategory || product.name} ${carAr} ${model} ${yr}`.trim(),
  ]);

  const universalKeywords = isUniversal ? [
    `${product.name} سعر`,
    `${brand} ${sub}`,
    `زيت ${brand} مصر`,
    `افضل ${product.category}`,
    `${sub} مصر`,
  ] : [];

  const oilKeywords = product.category === 'زيوت موتور' ? [
    `زيت موتور ${sub}`, `زيت موتور ${brand}`, `زيت ${brand} ${sub}`,
    `زيت موتور ${sub} سعر`, `سعر زيت ${brand} ${sub}`, `زيت ${brand} ${sub} مصر`,
    `زيت موتور تخليقي ${sub}`, `افضل زيت موتور`, `احسن زيت موتور`,
    `افضل زيت موتور مصر`, `احسن زيت موتور مصر`, `افضل زيت موتور ${sub}`,
    `احسن زيت موتور ${sub}`, `افضل زيت موتور ${brand}`, `احسن زيت موتور ${brand}`,
    `${sub} synthetic مصر`, `زيت موتور فول سينثتيك ${sub}`,
    `engine oil ${sub} egypt`, `${brand} oil egypt`, `زيت موتور كيلو`, `سعر زيت الموتور مصر`,
    ...Object.values(CAR_MAKE_AR).filter(Boolean).flatMap(carName => [
      `زيت موتور ${carName}`, `افضل زيت موتور ${carName}`, `احسن زيت موتور ${carName}`,
    ]),
    ...POPULAR_OIL_MODELS.flatMap(modelName => [
      `زيت موتور ${modelName}`, `احسن زيت موتور ${modelName}`, `افضل زيت موتور ${modelName}`,
    ]),
  ] : [];

  const gearOilKeywords = product.category === 'زيوت فتيس و دبرياج و باور' ? [
    `زيت فتيس ${brand}`, `زيت دبرياج ${brand}`, `زيت باور ستيرينج ${brand}`,
    `زيت ${sub} ${brand}`, `زيت فتيس مصر`, `زيت دبرياج مصر`,
    `سعر زيت فتيس ${brand}`, `افضل زيت فتيس مصر`, `احسن زيت فتيس مصر`, `gear oil ${brand}`,
    ...POPULAR_MODELS.flatMap(m => [`زيت فتيس ${m}`, `زيت دبرياج ${m}`, `احسن زيت فتيس ${m}`]),
  ] : [];

  const sparkKeywords = (product.category === 'بوجيهات و سلوك بوجيهات و موبينة' && sub === 'بوجيهات') ? [
    `بوجيهات ${brand}`, `بوجيهات ${brand} ${carAr} ${model}`.trim(),
    `بوجيهات ${carAr} ${model}`.trim(), `سعر بوجيهات ${brand}`,
    `بوجيهات مصر`, `افضل بوجيهات`, `احسن بوجيهات`,
    `spark plugs ${brand}`, `بوجيهات ارجيتيم`, `بوجيهات إيريديوم`, `بوجيهات بلاتينيوم`,
    carAr ? `بوجيهات ${carAr}` : '', carAr ? `احسن بوجيهات ${carAr}` : '',
    model ? `بوجيهات ${model}` : '', model ? `احسن بوجيهات ${model}` : '',
    ...POPULAR_MODELS.flatMap(m => [`بوجيهات ${m}`, `احسن بوجيهات ${m}`]),
  ] : [];

  const brakeFluidKeywords = (product.category === 'الفرامل' && ['تيل فرامل', 'تيل امامي', 'تيل خلفي'].includes(sub)) ? [
    `تيل فرامل ${brand}`, `تيل فرامل امامي ${brand}`, `تيل فرامل خلفي ${brand}`,
    `تيل فرامل ${carAr} ${model}`.trim(), `سعر تيل فرامل ${brand}`,
    `تيل فرامل مصر`, `افضل تيل فرامل`, `احسن تيل فرامل`,
    `brake pad ${brand}`, `تربيتة فرامل ${brand}`, `تربيتة فرامل مصر`, `افضل تربيتة فرامل`,
    ...Object.values(CAR_MAKE_AR).filter(Boolean).map(c => `تيل فرامل ${c}`),
    ...POPULAR_MODELS.flatMap(m => [
      `تيل فرامل ${m}`, `تيل فرامل امامي ${m}`, `تيل فرامل خلفي ${m}`, `احسن تيل فرامل ${m}`,
    ]),
  ] : [];

  const drumKeywords = (product.category === 'الفرامل' && sub === 'طنابير') ? [
    `طنابير فرامل ${brand}`, `طنبور فرامل ${brand}`, `طنابير ${carAr} ${model}`.trim(),
    `سعر طنابير فرامل ${brand}`, `طنابير فرامل مصر`, `افضل طنابير فرامل`, `brake drum ${brand}`,
    ...Object.values(CAR_MAKE_AR).filter(Boolean).map(c => `طنابير فرامل ${c}`),
    ...POPULAR_MODELS.flatMap(m => [`طنابير ${m}`, `طنابير فرامل ${m}`, `احسن طنابير ${m}`]),
  ] : [];

  const shockKeywords = (product.category === 'عفشة' && sub === 'مساعدين و صدادات') ? [
    `مساعدين ${brand}`, `مساعدين ${brand} ${carAr} ${model}`.trim(),
    `مساعدين ${carAr} ${model}`.trim(), `سعر مساعدين ${brand}`,
    `مساعدين مصر`, `افضل مساعدين`, `احسن مساعدين`,
    `shock absorber ${brand}`, `امورتيزور ${brand}`,
    `مساعدين امامي ${brand}`, `مساعدين خلفي ${brand}`,
    ...Object.values(CAR_MAKE_AR).filter(Boolean).map(c => `مساعدين ${c}`),
    ...POPULAR_MODELS.flatMap(m => [`مساعدين ${m}`, `احسن مساعدين ${m}`, `افضل مساعدين ${m}`]),
  ] : [];

  const beltKeywords = product.category === 'سيور و بلي' ? (() => {
    const base = [
      `سير ${brand}`, `سير مجموعة ${brand}`, `سير دينامو ${brand}`, `سير كاتينة ${brand}`,
      `سير ${carAr} ${model}`.trim(), `سعر سير ${brand}`, `سيور مصر`, `افضل سيور`, `احسن سيور`,
      `timing belt ${brand}`, `v-belt ${brand}`, `serpentine belt ${brand}`,
    ];
    const perMake = Object.values(CAR_MAKE_AR).filter(Boolean).flatMap(c => [
      `سير مجموعة ${c}`, `سير دينامو ${c}`, `سير كاتينة ${c}`,
    ]);
    const perModel = POPULAR_MODELS.flatMap(m => [
      `سير ${m}`, `سير مجموعة ${m}`, `سير دينامو ${m}`, `سير كاتينة ${m}`, `احسن سير ${m}`,
    ]);
    return [...base, ...perMake, ...perModel];
  })() : [];

  const fuelPumpKeywords = product.category === 'دورة البنزين' ? [
    `طلمبة بنزين ${brand}`, `طلمبة بنزين ${brand} ${carAr} ${model}`.trim(),
    `طلمبة بنزين ${carAr} ${model}`.trim(), `سعر طلمبة بنزين ${brand}`,
    `طلمبة بنزين مصر`, `افضل طلمبة بنزين`, `احسن طلمبة بنزين`,
    `fuel pump ${brand}`, `طلمبة وقود ${brand}`,
    ...Object.values(CAR_MAKE_AR).filter(Boolean).map(c => `طلمبة بنزين ${c}`),
    ...POPULAR_MODELS.flatMap(m => [`طلمبة بنزين ${m}`, `احسن طلمبة بنزين ${m}`, `افضل طلمبة بنزين ${m}`]),
  ] : [];

  const sensorKeywords = (product.category === 'حساسات و قطع كهربائية' && sub === 'حساسات') ? (() => {
    const { ar: sensorAr, arAlt } = getSensorLabel(product);
    const carLine = [carAr, model].filter(Boolean).join(' ');
    return [
      sensorAr, arAlt, `${sensorAr} ${brand}`, `${sensorAr} ${carLine}`.trim(),
      `${sensorAr} ${brand} ${carLine}`.trim(), `سعر ${sensorAr} ${brand}`,
      `${sensorAr} مصر`, `افضل ${sensorAr}`, `احسن ${sensorAr}`,
      carAr ? `${sensorAr} ${carAr}` : '', model ? `${sensorAr} ${model}` : '',
      model ? `احسن ${sensorAr} ${model}` : '',
      `check engine ${carLine}`.trim(), `لمبة check engine ${carLine}`.trim(),
      ...POPULAR_MODELS.flatMap(m => [`${sensorAr} ${m}`, `احسن ${sensorAr} ${m}`]),
      `oxygen sensor ${carEn} ${model}`.trim(), `o2 sensor ${carEn}`.trim(), `sensor ${carEn} ${model}`.trim(),
    ];
  })() : [];

  const tireKeywords = product.category === 'إطارات' ? [
    `إطار ${brand}`, `كاوتش ${brand}`, `إطارات ${brand} مصر`, `كاوتشات ${brand} مصر`,
    `سعر إطار ${brand}`, `سعر كاوتش ${brand}`, `افضل إطارات مصر`, `احسن إطارات مصر`,
    `افضل كاوتشات مصر`, `احسن كاوتشات مصر`, `إطار ${brand} ${sub}`, `كاوتش ${brand} ${sub}`,
    `${brand} tires egypt`, `${brand} tyres egypt`, `سعر الكاوتش في مصر`,
    `إطارات سيارات مصر`, `كاوتشات سيارات مصر`,
    ...POPULAR_TIRE_SIZES.flatMap(size => [
      `إطار ${size}`, `كاوتش ${size}`, `سعر إطار ${size}`, `${brand} ${size}`,
    ]),
    ...POPULAR_MODELS.flatMap(m => [
      `إطارات ${m}`, `كاوتشات ${m}`, `سعر كاوتش ${m}`, `افضل إطارات ${m}`, `احسن كاوتش ${m}`,
    ]),
    ...Object.values(CAR_MAKE_AR).filter(Boolean).flatMap(c => [`إطارات ${c}`, `كاوتشات ${c}`]),
  ] : [];

  const cabinFilterKeywords = (product.category === 'فلاتر' && (sub === 'فلتر تكييف' || sub === 'فلتر كابينة')) ? [
    `فلتر تكييف ${brand}`, `فلتر كابينة ${brand}`, `cabin filter ${brand}`,
    `فلتر تكييف مصر`, `افضل فلتر تكييف`, `احسن فلتر تكييف`,
    carAr ? `فلتر تكييف ${carAr}` : '', model ? `فلتر تكييف ${model}` : '',
    ...POPULAR_MODELS.flatMap(m => [`فلتر تكييف ${m}`, `فلتر كابينة ${m}`]),
  ] : [];

  const oilFilterKeywords = (product.category === 'فلاتر' && (sub === 'فلتر زيت' || sub === 'فلتر الزيت')) ? [
    `فلتر زيت ${brand}`, `فلتر زيت ${carAr} ${model}`.trim(),
    `سعر فلتر زيت ${brand}`, `فلتر زيت مصر`, `افضل فلتر زيت`, `احسن فلتر زيت`,
    `oil filter ${brand}`, `فلتر زيت اصلي`,
    ...Object.values(CAR_MAKE_AR).filter(Boolean).map(c => `فلتر زيت ${c}`),
    ...POPULAR_MODELS.flatMap(m => [`فلتر زيت ${m}`, `احسن فلتر زيت ${m}`]),
  ] : [];

  const airFilterKeywords = (product.category === 'فلاتر' && sub === 'فلتر هواء') ? [
    `فلتر هواء ${brand}`, `فلتر هواء ${carAr} ${model}`.trim(),
    `سعر فلتر هواء ${brand}`, `فلتر هواء مصر`, `افضل فلتر هواء`, `احسن فلتر هواء`,
    `air filter ${brand}`,
    ...Object.values(CAR_MAKE_AR).filter(Boolean).map(c => `فلتر هواء ${c}`),
    ...POPULAR_MODELS.flatMap(m => [`فلتر هواء ${m}`, `احسن فلتر هواء ${m}`]),
  ] : [];

  const fuelFilterKeywords = (product.category === 'فلاتر' && (sub === 'فلتر بنزين' || sub === 'فتر بنزين')) ? [
    `فلتر بنزين ${brand}`, `فلتر وقود ${brand}`, `فلتر بنزين مصر`,
    `سعر فلتر بنزين ${brand}`, `افضل فلتر بنزين`, `احسن فلتر بنزين`,
    `fuel filter ${brand}`,
    ...Object.values(CAR_MAKE_AR).filter(Boolean).map(c => `فلتر بنزين ${c}`),
    ...POPULAR_MODELS.flatMap(m => [`فلتر بنزين ${m}`, `احسن فلتر بنزين ${m}`]),
  ] : [];

  const wheelBearingKeywords = (product.category === 'عفشة' && sub === 'بلية عجل') ? [
    `بلية عجل ${brand}`, `بلية عجل ${carAr} ${model}`.trim(),
    `سعر بلية عجل ${brand}`, `بلية عجل مصر`, `افضل بلية عجل`, `احسن بلية عجل`,
    `wheel bearing ${brand}`, `بلية عجل امامي ${brand}`, `بلية عجل خلفي ${brand}`,
    ...Object.values(CAR_MAKE_AR).filter(Boolean).map(c => `بلية عجل ${c}`),
    ...POPULAR_MODELS.flatMap(m => [`بلية عجل ${m}`, `احسن بلية عجل ${m}`, `بلية عجل امامي ${m}`, `بلية عجل خلفي ${m}`]),
  ] : [];

  const controlArmKeywords = (product.category === 'عفشة' && (sub === 'مقصات كاملة' || sub === 'جلب و بيض مقصات')) ? [
    `مقص عفشة ${brand}`, `مقصات ${carAr} ${model}`.trim(),
    `سعر مقصات ${brand}`, `مقصات مصر`, `افضل مقصات`, `احسن مقصات`,
    `control arm ${brand}`, `بيض مقصات ${brand}`, `جلب مقصات ${brand}`,
    ...Object.values(CAR_MAKE_AR).filter(Boolean).map(c => `مقصات ${c}`),
    ...POPULAR_MODELS.flatMap(m => [`مقصات ${m}`, `احسن مقصات ${m}`, `بيض مقصات ${m}`]),
  ] : [];

  const stabilizerKeywords = (product.category === 'عفشة' && sub === 'بارات') ? [
    `بارات عفشة ${brand}`, `بار عفشة ${carAr} ${model}`.trim(),
    `سعر بارات ${brand}`, `بارات مصر`, `افضل بارات`, `احسن بارات`,
    `sway bar link ${brand}`, `stabilizer link ${brand}`,
    ...Object.values(CAR_MAKE_AR).filter(Boolean).map(c => `بارات ${c}`),
    ...POPULAR_MODELS.flatMap(m => [`بارات ${m}`, `احسن بارات ${m}`]),
  ] : [];

  const engineMountKeywords = (product.category === 'عفشة' && sub === 'قواعد و شدادات') ? [
    `قاعدة موتور ${brand}`, `شداد موتور ${brand}`, `قاعدة موتور ${carAr} ${model}`.trim(),
    `سعر قاعدة موتور ${brand}`, `قواعد موتور مصر`, `احسن قاعدة موتور`,
    `engine mount ${brand}`, `motor mount ${brand}`,
    ...Object.values(CAR_MAKE_AR).filter(Boolean).map(c => `قاعدة موتور ${c}`),
    ...POPULAR_MODELS.flatMap(m => [`قاعدة موتور ${m}`, `شداد موتور ${m}`]),
  ] : [];

  const cvKeywords = (product.category === 'عفشة' && sub === 'كبالن و كاوتش كوبلن') ? [
    `كبالن ${brand}`, `كوبلن ${brand}`, `كوبلن ${carAr} ${model}`.trim(),
    `سعر كبالن ${brand}`, `كبالن مصر`, `احسن كبالن`,
    `cv axle ${brand}`, `drive shaft ${brand}`, `كاوتش كوبلن ${brand}`,
    ...Object.values(CAR_MAKE_AR).filter(Boolean).map(c => `كبالن ${c}`),
    ...POPULAR_MODELS.flatMap(m => [`كبالن ${m}`, `كوبلن ${m}`, `احسن كبالن ${m}`]),
  ] : [];

  const bushingKeywords = (product.category === 'عفشة' && sub === 'بطاحات و بلي بطاحات') ? [
    `بطاحة ${brand}`, `بلي بطاحة ${brand}`, `بطاحة ${carAr} ${model}`.trim(),
    `سعر بطاحات ${brand}`, `بطاحات مصر`, `احسن بطاحات`,
    `control arm bushing ${brand}`,
    ...Object.values(CAR_MAKE_AR).filter(Boolean).map(c => `بطاحة ${c}`),
    ...POPULAR_MODELS.flatMap(m => [`بطاحة ${m}`, `بطاحات ${m}`, `احسن بطاحات ${m}`]),
  ] : [];

  const tieRodKeywords = (product.category === 'عفشة' && sub === 'تيش ميزان و مسامير ميزان') ? [
    `تيش ميزان ${brand}`, `مسمار ميزان ${brand}`, `تيش ميزان ${carAr} ${model}`.trim(),
    `سعر تيش ميزان ${brand}`, `تيش ميزان مصر`, `احسن تيش ميزان`,
    `tie rod ${brand}`, `tie rod end ${brand}`,
    ...Object.values(CAR_MAKE_AR).filter(Boolean).map(c => `تيش ميزان ${c}`),
    ...POPULAR_MODELS.flatMap(m => [`تيش ميزان ${m}`, `احسن تيش ميزان ${m}`]),
  ] : [];

  const radiatorKeywords = (product.category === 'دورة تبريد و تكييف' && sub === 'ردياتير') ? [
    `ردياتير ${brand}`, `ردياتير ${carAr} ${model}`.trim(),
    `سعر ردياتير ${brand}`, `ردياتير مصر`, `افضل ردياتير`, `احسن ردياتير`,
    `radiator ${brand}`,
    ...Object.values(CAR_MAKE_AR).filter(Boolean).map(c => `ردياتير ${c}`),
    ...POPULAR_MODELS.flatMap(m => [`ردياتير ${m}`, `احسن ردياتير ${m}`]),
  ] : [];

  const thermostatKeywords = (product.category === 'دورة تبريد و تكييف' && sub === 'كوعة و ثرموستات') ? [
    `ثرموستات ${brand}`, `كوعة ثرموستات ${brand}`, `ثرموستات ${carAr} ${model}`.trim(),
    `سعر ثرموستات ${brand}`, `ثرموستات مصر`, `احسن ثرموستات`,
    `thermostat ${brand}`,
    ...Object.values(CAR_MAKE_AR).filter(Boolean).map(c => `ثرموستات ${c}`),
    ...POPULAR_MODELS.flatMap(m => [`ثرموستات ${m}`, `احسن ثرموستات ${m}`]),
  ] : [];

  const coolantKeywords = (product.category === 'دورة تبريد و تكييف' && (sub === 'زيت تبريد' || sub === 'تيل تبريد' || sub === 'كولانت')) ? [
    `كولانت ${brand}`, `زيت تبريد ${brand}`, `سعر كولانت ${brand}`,
    `كولانت مصر`, `افضل كولانت مصر`, `احسن كولانت مصر`,
    `coolant ${brand}`, `antifreeze ${brand}`,
    ...Object.values(CAR_MAKE_AR).filter(Boolean).map(c => `كولانت ${c}`),
    ...POPULAR_MODELS.flatMap(m => [`كولانت ${m}`, `زيت تبريد ${m}`]),
  ] : [];

  const acKeywords = (product.category === 'دورة تبريد و تكييف' && sub === 'سربنتينة تكييف') ? [
    `سربنتينة تكييف ${brand}`, `سربنتينة ${carAr} ${model}`.trim(),
    `سعر سربنتينة تكييف ${brand}`, `سربنتينة تكييف مصر`, `احسن سربنتينة تكييف`,
    `ac compressor ${brand}`,
    ...Object.values(CAR_MAKE_AR).filter(Boolean).map(c => `سربنتينة تكييف ${c}`),
    ...POPULAR_MODELS.flatMap(m => [`سربنتينة تكييف ${m}`, `احسن سربنتينة ${m}`]),
  ] : [];

  const masterBrakeKeywords = (product.category === 'الفرامل' && sub === 'ماستر فرامل') ? [
    `ماستر فرامل ${brand}`, `ماستر فرامل ${carAr} ${model}`.trim(),
    `سعر ماستر فرامل ${brand}`, `ماستر فرامل مصر`, `احسن ماستر فرامل`,
    `brake master cylinder ${brand}`,
    ...Object.values(CAR_MAKE_AR).filter(Boolean).map(c => `ماستر فرامل ${c}`),
    ...POPULAR_MODELS.flatMap(m => [`ماستر فرامل ${m}`, `احسن ماستر فرامل ${m}`]),
  ] : [];

  const ignitionCoilKeywords = (product.category === 'بوجيهات و سلوك بوجيهات و موبينة' && sub === 'موبينة') ? [
    `موبينة ${brand}`, `موبينة ${carAr} ${model}`.trim(),
    `سعر موبينة ${brand}`, `موبينة مصر`, `افضل موبينة`, `احسن موبينة`,
    `ignition coil ${brand}`, `coil pack ${brand}`,
    ...Object.values(CAR_MAKE_AR).filter(Boolean).map(c => `موبينة ${c}`),
    ...POPULAR_MODELS.flatMap(m => [`موبينة ${m}`, `احسن موبينة ${m}`]),
  ] : [];

  const gasketKeywords = product.category === 'جوانات و أويل سيل' ? [
    `جوان ${brand}`, `اويل سيل ${brand}`, `جوان ${carAr} ${model}`.trim(),
    `سعر جوانات ${brand}`, `جوانات مصر`, `اويل سيل مصر`, `احسن جوانات`,
    `gasket ${brand}`, `oil seal ${brand}`, `جوان وش سلندر ${brand}`,
    ...Object.values(CAR_MAKE_AR).filter(Boolean).map(c => `جوان ${c}`),
    ...POPULAR_MODELS.flatMap(m => [`جوان ${m}`, `اويل سيل ${m}`, `جوان وش سلندر ${m}`]),
  ] : [];

  const engineOverhaulKeywords = product.category === 'مستلزمات عمرة موتور' ? [
    `عمرة موتور ${brand}`, `طقم بستم ${brand}`, `عامود كامة ${brand}`,
    `${sub} ${brand}`, `${sub} ${carAr} ${model}`.trim(),
    `سعر ${sub} ${brand}`, `عمرة موتور مصر`, `احسن طقم بستم`,
    `piston kit ${brand}`, `engine rebuild ${brand}`,
    ...Object.values(CAR_MAKE_AR).filter(Boolean).map(c => `عمرة موتور ${c}`),
    ...POPULAR_MODELS.flatMap(m => [`طقم بستم ${m}`, `عمرة موتور ${m}`]),
  ] : [];

  const enginePartsKeywords = product.category === 'قطع الموتور و ملحقاته' ? [
    `${sub || 'قطعة موتور'} ${brand}`, `${sub} ${carAr} ${model}`.trim(),
    `سعر ${sub} ${brand}`, `قطع موتور مصر`, `${sub} مصر`,
    `${sub} اصلي ${brand}`,
    ...Object.values(CAR_MAKE_AR).filter(Boolean).map(c => `${sub} ${c}`),
    ...POPULAR_MODELS.flatMap(m => [`${sub} ${m}`]),
  ] : [];

  const clutchKeywords = product.category === 'دبرياج و قطع فتيس' ? [
    `دبرياج ${brand}`, `طقم دبرياج ${brand}`, `${sub} ${brand}`,
    `${sub} ${carAr} ${model}`.trim(), `سعر دبرياج ${brand}`,
    `دبرياج مصر`, `افضل دبرياج`, `احسن دبرياج`,
    `clutch kit ${brand}`, `clutch ${brand}`,
    ...Object.values(CAR_MAKE_AR).filter(Boolean).map(c => `دبرياج ${c}`),
    ...POPULAR_MODELS.flatMap(m => [`دبرياج ${m}`, `طقم دبرياج ${m}`, `احسن دبرياج ${m}`]),
  ] : [];

  const wiperKeywords = product.category === 'مساحات' ? [
    `مساحة زجاج ${brand}`, `مساحات ${brand}`, `مساحة ${carAr} ${model}`.trim(),
    `سعر مساحات ${brand}`, `مساحات مصر`, `افضل مساحات`, `احسن مساحات`,
    `wiper blade ${brand}`, `مساحة امامي ${brand}`, `مساحة خلفي ${brand}`,
    ...Object.values(CAR_MAKE_AR).filter(Boolean).map(c => `مساحة ${c}`),
    ...POPULAR_MODELS.flatMap(m => [`مساحة ${m}`, `مساحات ${m}`, `احسن مساحة ${m}`]),
  ] : [];

  const waterPumpKeywords = (product.category === 'دورة تبريد و تكييف' && sub === 'طلمبات مياه') ? [
    `طلمبة مياه ${brand}`, `طلمبة مياه ${carAr} ${model}`.trim(),
    `سعر طلمبة مياه ${brand}`, `طلمبة مياه مصر`, `افضل طلمبة مياه`, `احسن طلمبة مياه`,
    `water pump ${brand}`,
    ...Object.values(CAR_MAKE_AR).filter(Boolean).map(c => `طلمبة مياه ${c}`),
    ...POPULAR_MODELS.flatMap(m => [`طلمبة مياه ${m}`, `احسن طلمبة مياه ${m}`]),
  ] : [];

  const waterElbowKeywords = (product.category === 'دورة تبريد و تكييف' && sub === 'كوعة و ثرموستات') ? [
    `كوعة مياه ${brand}`, `كوعة مياه ${carAr} ${model}`.trim(),
    `سعر كوعة مياه ${brand}`, `كوعة مياه مصر`, `احسن كوعة مياه`,
    `water elbow ${brand}`, `coolant elbow ${brand}`,
    ...Object.values(CAR_MAKE_AR).filter(Boolean).map(c => `كوعة مياه ${c}`),
    ...POPULAR_MODELS.flatMap(m => [`كوعة مياه ${m}`, `كوعة ثرموستات ${m}`]),
  ] : [];

  const brakeWheelMasterKeywords = (product.category === 'الفرامل' && sub === 'ماستر عجل') ? [
    `ماستر عجل ${brand}`, `ماستر عجل ${carAr} ${model}`.trim(),
    `سعر ماستر عجل ${brand}`, `ماستر عجل مصر`, `احسن ماستر عجل`,
    `wheel cylinder ${brand}`, `ماستر عجل امامي ${brand}`, `ماستر عجل خلفي ${brand}`,
    ...Object.values(CAR_MAKE_AR).filter(Boolean).map(c => `ماستر عجل ${c}`),
    ...POPULAR_MODELS.flatMap(m => [`ماستر عجل ${m}`, `ماستر عجل امامي ${m}`, `ماستر عجل خلفي ${m}`]),
  ] : [];

  const clutchDiscKeywords = (product.category === 'دبرياج و قطع فتيس' && sub === 'ديسك') ? [
    `ديسك دبرياج ${brand}`, `ديسك ${carAr} ${model}`.trim(),
    `سعر ديسك دبرياج ${brand}`, `ديسك دبرياج مصر`, `احسن ديسك دبرياج`,
    `clutch disc ${brand}`, `clutch plate ${brand}`,
    ...Object.values(CAR_MAKE_AR).filter(Boolean).map(c => `ديسك دبرياج ${c}`),
    ...POPULAR_MODELS.flatMap(m => [`ديسك دبرياج ${m}`, `ديسك ${m}`]),
  ] : [];

  const pressurePlateKeywords = (product.category === 'دبرياج و قطع فتيس' && sub === 'اسطوانة') ? [
    `اسطوانة دبرياج ${brand}`, `اسطوانة ${carAr} ${model}`.trim(),
    `سعر اسطوانة دبرياج ${brand}`, `اسطوانة دبرياج مصر`, `احسن اسطوانة دبرياج`,
    `pressure plate ${brand}`, `clutch pressure plate ${brand}`,
    ...Object.values(CAR_MAKE_AR).filter(Boolean).map(c => `اسطوانة دبرياج ${c}`),
    ...POPULAR_MODELS.flatMap(m => [`اسطوانة دبرياج ${m}`, `اسطوانة ${m}`]),
  ] : [];

  const clutchBearingKeywords = (product.category === 'دبرياج و قطع فتيس' && sub === 'بلية دبرياج') ? [
    `بلية دبرياج ${brand}`, `بلية دبرياج ${carAr} ${model}`.trim(),
    `سعر بلية دبرياج ${brand}`, `بلية دبرياج مصر`, `احسن بلية دبرياج`,
    `clutch release bearing ${brand}`, `throw out bearing ${brand}`,
    ...Object.values(CAR_MAKE_AR).filter(Boolean).map(c => `بلية دبرياج ${c}`),
    ...POPULAR_MODELS.flatMap(m => [`بلية دبرياج ${m}`]),
  ] : [];

  const clutchMasterUpperKeywords = (product.category === 'دبرياج و قطع فتيس' && sub === 'ماستر علوي') ? [
    `ماستر دبرياج علوي ${brand}`, `ماستر علوي ${carAr} ${model}`.trim(),
    `سعر ماستر دبرياج علوي ${brand}`, `ماستر دبرياج علوي مصر`, `احسن ماستر دبرياج`,
    `clutch master cylinder ${brand}`,
    ...Object.values(CAR_MAKE_AR).filter(Boolean).map(c => `ماستر دبرياج علوي ${c}`),
    ...POPULAR_MODELS.flatMap(m => [`ماستر دبرياج علوي ${m}`, `ماستر علوي ${m}`]),
  ] : [];

  const clutchMasterLowerKeywords = (product.category === 'دبرياج و قطع فتيس' && sub === 'ماستر سفلي') ? [
    `ماستر دبرياج سفلي ${brand}`, `ماستر سفلي ${carAr} ${model}`.trim(),
    `سعر ماستر دبرياج سفلي ${brand}`, `ماستر دبرياج سفلي مصر`, `احسن ماستر دبرياج`,
    `clutch slave cylinder ${brand}`,
    ...Object.values(CAR_MAKE_AR).filter(Boolean).map(c => `ماستر دبرياج سفلي ${c}`),
    ...POPULAR_MODELS.flatMap(m => [`ماستر دبرياج سفلي ${m}`, `ماستر سفلي ${m}`]),
  ] : [];

  const fuelPumpSubKeywords = (product.category === 'دورة البنزين' && sub === 'طلمبة بنزين') ? [
    `طلمبة بنزين ${brand}`, `طلمبة بنزين كاملة ${brand}`, `طلمبة بنزين ${carAr} ${model}`.trim(),
    `سعر طلمبة بنزين ${brand}`, `طلمبة بنزين مصر`, `افضل طلمبة بنزين`, `احسن طلمبة بنزين`,
    `fuel pump ${brand}`, `electric fuel pump ${brand}`,
    ...Object.values(CAR_MAKE_AR).filter(Boolean).map(c => `طلمبة بنزين ${c}`),
    ...POPULAR_MODELS.flatMap(m => [`طلمبة بنزين ${m}`, `احسن طلمبة بنزين ${m}`]),
  ] : [];

  const fuelPumpInsertKeywords = (product.category === 'دورة البنزين' && sub === 'قلب طلمبة بنزين') ? [
    `قلب طلمبة بنزين ${brand}`, `قلب طلمبة ${carAr} ${model}`.trim(),
    `سعر قلب طلمبة بنزين ${brand}`, `قلب طلمبة بنزين مصر`, `احسن قلب طلمبة بنزين`,
    `fuel pump insert ${brand}`, `fuel pump module ${brand}`,
    ...Object.values(CAR_MAKE_AR).filter(Boolean).map(c => `قلب طلمبة بنزين ${c}`),
    ...POPULAR_MODELS.flatMap(m => [`قلب طلمبة بنزين ${m}`, `قلب طلمبة ${m}`]),
  ] : [];

  const fuelSenderKeywords = (product.category === 'دورة البنزين' && sub === 'عوامة بنزين') ? [
    `عوامة بنزين ${brand}`, `عوامة بنزين ${carAr} ${model}`.trim(),
    `سعر عوامة بنزين ${brand}`, `عوامة بنزين مصر`, `احسن عوامة بنزين`,
    `fuel sender ${brand}`, `fuel float ${brand}`, `فلوتر بنزين ${brand}`,
    ...Object.values(CAR_MAKE_AR).filter(Boolean).map(c => `عوامة بنزين ${c}`),
    ...POPULAR_MODELS.flatMap(m => [`عوامة بنزين ${m}`, `فلوتر بنزين ${m}`]),
  ] : [];

  const acBeltKeywords = (product.category === 'سيور و بلي' && sub === 'سير تكييف') ? [
    `سير تكييف ${brand}`, `سير تكييف ${carAr} ${model}`.trim(),
    `سعر سير تكييف ${brand}`, `سير تكييف مصر`, `احسن سير تكييف`,
    `ac belt ${brand}`, `air conditioning belt ${brand}`,
    ...Object.values(CAR_MAKE_AR).filter(Boolean).map(c => `سير تكييف ${c}`),
    ...POPULAR_MODELS.flatMap(m => [`سير تكييف ${m}`, `احسن سير تكييف ${m}`]),
  ] : [];

  const timingIdlerKeywords = (product.category === 'سيور و بلي' && sub === 'بلية كاتينة') ? [
    `بلية كاتينة ${brand}`, `بلية كاتينة ${carAr} ${model}`.trim(),
    `سعر بلية كاتينة ${brand}`, `بلية كاتينة مصر`, `احسن بلية كاتينة`,
    `timing chain tensioner ${brand}`, `timing idler ${brand}`,
    ...Object.values(CAR_MAKE_AR).filter(Boolean).map(c => `بلية كاتينة ${c}`),
    ...POPULAR_MODELS.flatMap(m => [`بلية كاتينة ${m}`, `احسن بلية كاتينة ${m}`]),
  ] : [];

  const timingKitKeywords = (product.category === 'سيور و بلي' && (sub === 'طقم كاتينة كامل' || sub === 'سير كاتينة')) ? [
    `طقم كاتينة ${brand}`, `سير كاتينة ${brand}`, `طقم كاتينة ${carAr} ${model}`.trim(),
    `سعر طقم كاتينة ${brand}`, `طقم كاتينة مصر`, `احسن طقم كاتينة`,
    `timing chain kit ${brand}`, `timing belt kit ${brand}`,
    ...Object.values(CAR_MAKE_AR).filter(Boolean).map(c => `طقم كاتينة ${c}`),
    ...POPULAR_MODELS.flatMap(m => [`طقم كاتينة ${m}`, `سير كاتينة ${m}`, `احسن طقم كاتينة ${m}`]),
  ] : [];

  return [
    product.name, `${product.name} ${brand}`, brand, product.category, sub,
    carAr, model, carEn, `${sub} ${carAr}`, `${sub} ${brand}`,
    `${brand} ${carAr} ${model}`.trim(), `سعر ${product.name}`, `${product.name} مصر`,
    `قطع غيار ${carAr}`, `${product.category} ${carAr}`,
    'قطع غيار أصلية', 'زيت أند فلترز', 'قطع غيار مصر',
    'قطع غيار سيارات مصر', 'متجر قطع غيار اونلاين مصر',
    'شحن قطع غيار لباب البيت', 'قطع غيار اصلية مصر',
    product.sku,
    ...yearKeywords,
    ...universalKeywords, ...oilKeywords, ...gearOilKeywords, ...sparkKeywords,
    ...brakeFluidKeywords, ...drumKeywords, ...shockKeywords, ...beltKeywords,
    ...fuelPumpKeywords, ...sensorKeywords, ...tireKeywords, ...cabinFilterKeywords,
    ...oilFilterKeywords, ...airFilterKeywords, ...fuelFilterKeywords,
    ...wheelBearingKeywords, ...controlArmKeywords, ...stabilizerKeywords,
    ...engineMountKeywords, ...cvKeywords, ...bushingKeywords, ...tieRodKeywords,
    ...radiatorKeywords, ...thermostatKeywords, ...coolantKeywords, ...acKeywords,
    ...masterBrakeKeywords, ...ignitionCoilKeywords, ...gasketKeywords,
    ...engineOverhaulKeywords, ...enginePartsKeywords, ...clutchKeywords, ...wiperKeywords,
    ...waterPumpKeywords, ...waterElbowKeywords, ...brakeWheelMasterKeywords,
    ...clutchDiscKeywords, ...pressurePlateKeywords, ...clutchBearingKeywords,
    ...clutchMasterUpperKeywords, ...clutchMasterLowerKeywords,
    ...fuelPumpSubKeywords, ...fuelPumpInsertKeywords, ...fuelSenderKeywords,
    ...acBeltKeywords, ...timingIdlerKeywords, ...timingKitKeywords,
  ].filter(Boolean) as string[];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;

  const product = await getProduct(slug);
  if (!product) return { title: 'المنتج غير موجود' };

  const title = buildTitle(product);
  const description = buildDescription(product);
  const keywords = buildKeywords(product);
  const imageUrl = product.image_url || 'https://zaitandfilters.com/og-image.jpg';
  const canonicalSlug = product.slug || product.id;
  const canonicalUrl = `https://zaitandfilters.com/products/${canonicalSlug}`;
  const shoppingTitle = buildShoppingTitle(product);

  const price = product.sale_price || product.regular_price;
  const productOgExtras = price
    ? {
        'product:price:amount': String(price),
        'product:price:currency': 'EGP',
        'product:availability': (product.is_active && product.stock_quantity > 0) ? 'in stock' : 'out of stock',
        'product:brand': product.brand || '',
        'product:condition': 'new',
      }
    : {};

  return {
    title,
    description,
    keywords,
    authors: [{ name: 'Zait & Filters' }],
    creator: 'Zait & Filters',
    publisher: 'Zait & Filters',
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      title: shoppingTitle,
      description,
      url: canonicalUrl,
      siteName: 'زيت أند فلترز - Zait & Filters',
      images: [{ url: imageUrl, width: 1200, height: 630, alt: product.name }],
      locale: 'ar_EG',
      type: 'website',
      ...productOgExtras,
    },
    twitter: { card: 'summary_large_image', title: shoppingTitle, description, images: [imageUrl] },
    alternates: { canonical: canonicalUrl },
  };
}

// ============================================================
// CWV FIX: Product image preload link injected into <head>
// This tells the browser to fetch the LCP image as early as
// possible — before the JS bundle is parsed — cutting LCP
// by hundreds of milliseconds on mobile.
// ============================================================
function ProductImagePreload({ imageUrl }: { imageUrl: string }) {
  if (!imageUrl) return null;
  return (
    // eslint-disable-next-line @next/next/no-head-element
    <>
      {/* @ts-ignore — Next.js flushes <link> tags in RSC output into <head> */}
      <link rel="preload" as="image" href={imageUrl} fetchPriority="high" />
    </>
  );
}

// ============================================================
// CWV FIX: Skeleton placeholder — reserves the exact space the
// ProductDetailsClient will occupy, preventing CLS from the
// content popping in after hydration.
// ============================================================
// Replace ProductPageSkeleton entirely
function ProductPageSkeleton() {
  return (
    <>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
        .skeleton-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          padding: 20px 16px;
          max-width: 1200px;
          margin: 0 auto;
          box-sizing: border-box;
        }
        @media (max-width: 768px) {
          .skeleton-grid { grid-template-columns: 1fr !important; gap: 12px !important; padding: 10px 10px !important; }
        }
      `}</style>
      <div className="skeleton-grid" aria-hidden="true">
        {/* Image */}
        <div style={{ aspectRatio: '1/1', background: '#e5e7eb', borderRadius: '24px', animation: 'pulse 1.5s ease-in-out infinite' }} />
        {/* Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ height: '28px', width: '30%', background: '#e5e7eb', borderRadius: '8px', animation: 'pulse 1.5s ease-in-out infinite' }} />
          <div style={{ height: '36px', width: '85%', background: '#e5e7eb', borderRadius: '8px', animation: 'pulse 1.5s ease-in-out infinite', animationDelay: '80ms' }} />
          <div style={{ height: '36px', width: '60%', background: '#e5e7eb', borderRadius: '8px', animation: 'pulse 1.5s ease-in-out infinite', animationDelay: '100ms' }} />
          <div style={{ height: '20px', width: '40%', background: '#e5e7eb', borderRadius: '8px', animation: 'pulse 1.5s ease-in-out infinite', animationDelay: '120ms' }} />
          <div style={{ height: '120px', width: '100%', background: '#f3f4f6', borderRadius: '20px', animation: 'pulse 1.5s ease-in-out infinite', animationDelay: '140ms' }} />
          <div style={{ height: '48px', width: '100%', background: '#e5e7eb', borderRadius: '12px', marginTop: '8px', animation: 'pulse 1.5s ease-in-out infinite', animationDelay: '160ms' }} />
          <div style={{ height: '48px', width: '100%', background: '#f59e0b22', borderRadius: '12px', animation: 'pulse 1.5s ease-in-out infinite', animationDelay: '180ms' }} />
        </div>
      </div>
    </>
  );
}

function ProductSchema({ product }: { product: any }) {
  const price = product.sale_price || product.regular_price;
  const canonicalSlug = product.slug || product.id;

  const merchantReturnPolicy = {
    '@type': 'MerchantReturnPolicy',
    applicableCountry: 'EG',
    returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
    merchantReturnDays: 14,
    returnMethod: 'https://schema.org/ReturnByMail',
    returnFees: 'https://schema.org/FreeReturn',
  };

  const shippingDetails = {
    '@type': 'OfferShippingDetails',
    shippingRate: { '@type': 'MonetaryAmount', value: 60, currency: 'EGP' },
    shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'EG' },
    deliveryTime: {
      '@type': 'ShippingDeliveryTime',
      handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 1, unitCode: 'DAY' },
      transitTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 3, unitCode: 'DAY' },
    },
  };

  const isUniversal = !product.car_make || product.car_make === 'UNIVERSAL';
  const schemaCarAr = isUniversal ? '' : (CAR_MAKE_AR[product.car_make] || product.car_make || '');
  const schemaModel = product.car_model && product.car_model !== 'UNIVERSAL' ? product.car_model : '';
  const schemaYear = product.car_model_year || '';
  const schemaOrigin = product.country_of_origin || '';
  const schemaCarParts = [schemaCarAr, schemaModel, schemaYear].filter(Boolean).join(' ');
  const schemaModelRaw = schemaModel ? schemaModel : '';
const schemaModelAr = schemaModelRaw ? (CAR_MODEL_AR[schemaModelRaw.toUpperCase()] ?? schemaModelRaw) : '';
const schemaYears = expandYearRange(schemaYear);
const schemaYearStr = schemaYears.join(' ');
const schemaFullName = [
  product.name,
  schemaCarAr,
  schemaModelAr,
  schemaYearStr,
  product.brand,
].filter(Boolean).join(' ');

  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: schemaFullName,
    description: buildDescription(product),
    image: product.image_url,
    brand: { '@type': 'Brand', name: product.brand },
    category: product.category,
    sku: product.sku || undefined,
    mpn: product.sku || undefined,
    aggregateRating: product.rating_count && product.rating_avg ? {
      '@type': 'AggregateRating',
      ratingValue: product.rating_avg,
      reviewCount: product.rating_count,
      bestRating: 5,
      worstRating: 1,
    } : undefined,
    offers: {
      '@type': 'Offer',
      url: `https://zaitandfilters.com/products/${canonicalSlug}`,
      priceCurrency: 'EGP',
      price: price,
      priceValidUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      availability: (product.is_active && product.stock_quantity > 0) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: 'Zait and Filters', url: 'https://zaitandfilters.com' },
      hasMerchantReturnPolicy: merchantReturnPolicy,
      shippingDetails: shippingDetails,
    },
    additionalProperty: [
      { '@type': 'PropertyValue', name: 'Car Make', value: product.car_make },
      { '@type': 'PropertyValue', name: 'Car Model', value: product.car_model },
      { '@type': 'PropertyValue', name: 'Model Year', value: product.car_model_year },
      { '@type': 'PropertyValue', name: 'Country of Origin', value: product.country_of_origin },
      { '@type': 'PropertyValue', name: 'Part Number', value: product.sku },
      ...(product.category === 'زيوت موتور' ? [
        { '@type': 'PropertyValue', name: 'Viscosity Grade', value: product.subcategory },
        { '@type': 'PropertyValue', name: 'Oil Type', value: 'Engine Oil - زيت موتور' },
      ] : []),
      ...(product.category === 'إطارات' ? [
        { '@type': 'PropertyValue', name: 'Tire Size', value: product.subcategory },
        { '@type': 'PropertyValue', name: 'نوع المنتج', value: 'إطار - كاوتش' },
      ] : []),
      ...(product.category === 'حساسات و قطع كهربائية' ? [
        { '@type': 'PropertyValue', name: 'Sensor Type', value: product.name },
        { '@type': 'PropertyValue', name: 'نوع الحساس', value: getSensorLabel(product).ar },
      ] : []),
    ].filter((prop: any) => prop.value),
  };

  if (!schema.aggregateRating) delete schema.aggregateRating;

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: 'https://zaitandfilters.com' },
      { '@type': 'ListItem', position: 2, name: 'المتجر', item: 'https://zaitandfilters.com/store' },
      { '@type': 'ListItem', position: 3, name: product.category, item: `https://zaitandfilters.com/categories/${encodeURIComponent(product.category)}` },
      { '@type': 'ListItem', position: 4, name: product.name, item: `https://zaitandfilters.com/products/${canonicalSlug}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
    </>
  );
}

function PartFAQSchema({ product }: { product: any }) {
  const brand = product.brand || '';
  const sub = product.subcategory || '';
  const cat = product.category || '';
  const carAr = CAR_MAKE_AR[product.car_make] || '';
const modelRaw = product.car_model && product.car_model !== 'UNIVERSAL' ? product.car_model : '';
const modelAr = modelRaw ? (CAR_MODEL_AR[modelRaw.toUpperCase()] ?? modelRaw) : '';
const carPhrase = [carAr, modelAr].filter(Boolean).join(' ');

  type FAQItem = { name: string; text: string };
  let questions: FAQItem[] = [];

  if (cat === 'زيوت موتور') {
    questions = [
      { name: `ما هو أفضل زيت موتور ${sub}؟`, text: `زيت موتور ${brand} ${sub} من أفضل الخيارات في مصر. يوفر حماية ممتازة للموتور في درجات الحرارة العالية ومناسب لجميع السيارات التي تستخدم مواصفة ${sub} مثل أوبترا، كروز، كورولا، لانسر، النترا وغيرها.` },
      { name: `هل زيت ${brand} ${sub} مناسب لسيارة أوبترا وكروز؟`, text: `نعم، زيت ${brand} ${sub} مناسب لسيارات شيفروليه أوبترا وكروز وغيرها من السيارات التي تتطلب مواصفة ${sub}. يُنصح دائمًا بمراجعة دليل السيارة للتأكد من المواصفة الصحيحة.` },
      { name: `ما سعر زيت ${brand} ${sub} في مصر؟`, text: `زيت ${brand} ${sub} متاح بأفضل سعر في مصر من زيت أند فلترز مع شحن لباب البيت في جميع المحافظات. تفضل بزيارة صفحة المنتج للاطلاع على السعر الحالي.` },
      { name: `احسن زيت موتور لسيارة أوبترا؟`, text: `زيت موتور ${brand} ${sub} هو من أفضل الخيارات لسيارة أوبترا. يحمي الموتور ويطيل عمره ومتوفر بسعر مناسب من زيت أند فلترز.` },
      { name: `ما الفرق بين زيت ${sub} المعدني والتخليقي؟`, text: `زيت الموتور التخليقي (Synthetic) مثل ${brand} ${sub} أفضل من المعدني لأنه يتحمل درجات الحرارة العالية أكثر، يطيل عمر الموتور، ويقلل الاحتكاك. مناسب بشكل خاص للمناخ الحار في مصر.` },
    ];
  } else if (cat === 'بوجيهات و سلوك بوجيهات و موبينة' && sub === 'بوجيهات') {
    questions = [
      { name: `ما هي أفضل بوجيهات ${brand}؟`, text: `بوجيهات ${brand} من أفضل الخيارات في مصر. توفر شرارة احتراق قوية وثابتة لتحسين أداء الموتور وتوفير الوقود. مناسبة لسيارات أوبترا، كروز، كورولا، لانسر، النترا وغيرها.` },
      { name: carPhrase ? `ما هي البوجيهات المناسبة لسيارة ${carPhrase}؟` : `كيف أختار البوجيهات الصحيحة لسيارتي؟`, text: carPhrase ? `بوجيهات ${brand} مناسبة لسيارة ${carPhrase}. تأكد دائمًا من رقم القطعة الصحيح قبل الشراء. متوفرة في زيت أند فلترز بأفضل سعر في مصر.` : `اختر البوجيهات المناسبة لسيارتك حسب نوع السيارة والموديل. بوجيهات ${brand} متوفرة لمعظم أنواع السيارات في زيت أند فلترز.` },
      { name: `ما سعر بوجيهات ${brand} في مصر؟`, text: `بوجيهات ${brand} متاحة بأفضل سعر في مصر من زيت أند فلترز مع شحن لباب البيت في جميع المحافظات.` },
      { name: `احسن بوجيهات لسيارة أوبترا وكروز؟`, text: `بوجيهات ${brand} من أفضل الخيارات لسيارات أوبترا وكروز. تحسن أداء الموتور وتوفر الوقود. متوفرة في زيت أند فلترز بأفضل سعر.` },
      { name: `كل كام كيلو بغير البوجيهات؟`, text: `يُنصح بتغيير البوجيهات العادية كل 20,000-30,000 كيلومتر، أما البوجيهات الإيريديوم والبلاتينيوم مثل ${brand} فتدوم حتى 60,000-100,000 كيلومتر. راجع دليل سيارتك لمعرفة الفترة الصحيحة.` },
    ];
  } else if (cat === 'الفرامل' && (sub === 'تيل فرامل' || sub === 'تيل امامي' || sub === 'تيل خلفي')) {
    const label = sub === 'تيل امامي' ? 'تيل فرامل امامي' : sub === 'تيل خلفي' ? 'تيل فرامل خلفي' : 'تيل فرامل';
    questions = [
      { name: `ما هو أفضل ${label}؟`, text: `${label} ماركة ${brand} من أفضل الخيارات في مصر. يضمن التوقف الآمن ويحمي منظومة الفرامل. مناسب لسيارات أوبترا، كروز، كورولا، لانسر، النترا وغيرها.` },
      { name: `احسن تيل فرامل لسيارة أوبترا وكروز؟`, text: `${label} ماركة ${brand} مناسب لسيارات أوبترا وكروز وغيرها. يوفر أداء فرامل ممتاز وأمان عالي. متوفر في زيت أند فلترز بأفضل سعر في مصر.` },
      { name: `ما سعر ${label} ${brand} في مصر؟`, text: `${label} ماركة ${brand} متاح بأفضل سعر في مصر من زيت أند فلترز مع شحن لباب البيت في جميع المحافظات.` },
      { name: `ما هي علامات تآكل تيل الفرامل؟`, text: `أبرز علامات تآكل تيل الفرامل: صوت صرير عند الكبح، اهتزاز عجلة القيادة، زيادة مسافة التوقف، أو إضاءة تحذير الفرامل. عند ظهور هذه الأعراض يجب استبدال تيل الفرامل فوراً لضمان أمانك.` },
    ];
  } else if (cat === 'الفرامل' && sub === 'طنابير') {
    questions = [
      { name: `ما هي أفضل طنابير فرامل ${brand}؟`, text: `طنابير فرامل ${brand} من أفضل الخيارات في مصر. توفر أداء فرامل ممتاز وعمرًا طويلًا. مناسبة لسيارات أوبترا، كروز، كورولا، لانسر وغيرها.` },
      { name: `احسن طنابير فرامل لسيارة أوبترا وكروز؟`, text: `طنابير فرامل ${brand} مناسبة لسيارات أوبترا وكروز وغيرها. تضمن التوقف الآمن وطول العمر. متوفرة في زيت أند فلترز بأفضل سعر في مصر.` },
      { name: `ما سعر طنابير فرامل ${brand} في مصر؟`, text: `طنابير فرامل ${brand} متاحة بأفضل سعر في مصر من زيت أند فلترز مع شحن لباب البيت في جميع المحافظات.` },
    ];
  } else if (cat === 'عفشة' && sub === 'مساعدين و صدادات') {
    questions = [
      { name: `ما هي أفضل مساعدين ${brand}؟`, text: `مساعدين ${brand} من أفضل الخيارات في مصر. يحسنون ثبات السيارة وراحة الركوب ويطيلون عمر الإطارات. مناسبة لسيارات أوبترا، كروز، كورولا، لانسر، النترا وغيرها.` },
      { name: `احسن مساعدين لسيارة أوبترا وكروز؟`, text: `مساعدين ${brand} من أفضل الخيارات لسيارات أوبترا وكروز. يوفرون ثباتًا عاليًا وراحة في الركوب. متوفرة في زيت أند فلترز بأفضل سعر في مصر.` },
      { name: `ما سعر مساعدين ${brand} في مصر؟`, text: `مساعدين ${brand} متاحة بأفضل سعر في مصر من زيت أند فلترز مع شحن لباب البيت في جميع المحافظات.` },
      { name: `ما علامات تلف المساعدين؟`, text: `أبرز علامات تلف المساعدين: اهتزاز السيارة على الطرق الوعرة، ميل السيارة عند الكبح، تآكل غير منتظم في الإطارات، أو صوت طرق من تحت السيارة. يُنصح بفحص المساعدين كل 50,000 كيلومتر.` },
    ];
  } else if (cat === 'سيور و بلي') {
    const beltLabel = sub === 'سير مجموعة' ? 'سير مجموعة' : sub === 'سير دينامو' ? 'سير دينامو' : (sub === 'سير كاتينة' || sub === 'طقم كاتينة كامل') ? 'سير كاتينة' : 'سير';
    questions = [
      { name: `ما هو أفضل ${beltLabel} ${brand}؟`, text: `${beltLabel} ماركة ${brand} من أفضل الخيارات في مصر. يضمن أداء الموتور بكفاءة عالية ويطيل عمر القطع. مناسب لسيارات أوبترا، كروز، كورولا، لانسر وغيرها.` },
      { name: `احسن ${beltLabel} لسيارة أوبترا وكروز؟`, text: `${beltLabel} ماركة ${brand} مناسب لسيارات أوبترا وكروز وغيرها. يوفر أداءً ممتازًا وعمرًا طويلًا. متوفر في زيت أند فلترز بأفضل سعر في مصر.` },
      { name: `ما سعر ${beltLabel} ${brand} في مصر؟`, text: `${beltLabel} ماركة ${brand} متاح بأفضل سعر في مصر من زيت أند فلترز مع شحن لباب البيت في جميع المحافظات.` },
      { name: `كل كام كيلو بغير السير؟`, text: `يُنصح بتغيير سير التوقيت (سير الكاتينة) كل 60,000-80,000 كيلومتر أو حسب تعليمات المصنع. سير المجموعة يُغير عند ظهور شقوق أو تلف واضح. عدم التغيير في الوقت المناسب قد يتسبب في أضرار جسيمة للموتور.` },
    ];
  } else if (cat === 'دورة البنزين') {
    questions = [
      { name: `ما هي أفضل طلمبة بنزين ${brand}؟`, text: `طلمبة بنزين ${brand} من أفضل الخيارات في مصر. تضمن تدفق الوقود بشكل سليم وحماية الموتور. مناسبة لسيارات أوبترا، كروز، كورولا، لانسر، النترا وغيرها.` },
      { name: `احسن طلمبة بنزين لسيارة أوبترا وكروز؟`, text: `طلمبة بنزين ${brand} مناسبة لسيارات أوبترا وكروز وغيرها. تضمن التدفق الصحيح للوقود وحماية المحرك. متوفرة في زيت أند فلترز بأفضل سعر في مصر.` },
      { name: `ما سعر طلمبة بنزين ${brand} في مصر؟`, text: `طلمبة بنزين ${brand} متاحة بأفضل سعر في مصر من زيت أند فلترز مع شحن لباب البيت في جميع المحافظات.` },
      { name: `ما علامات تلف طلمبة البنزين؟`, text: `أبرز علامات تلف طلمبة البنزين: صعوبة تشغيل الموتور، فقدان القوة عند التسارع، صوت طنين من خزان البنزين، أو توقف الموتور فجأة. عند ظهور هذه الأعراض يجب فحص واستبدال طلمبة البنزين.` },
    ];
  } else if (cat === 'حساسات و قطع كهربائية' && sub === 'حساسات') {
    const { ar: sensorAr } = getSensorLabel(product);
    const carLine = carPhrase || 'سيارتك';
    questions = [
      { name: `ما هي أعراض عطل ${sensorAr}؟`, text: `أبرز أعراض عطل ${sensorAr} هي: إضاءة لمبة Check Engine على لوحة التحكم، ارتفاع ملحوظ في استهلاك الوقود، اهتزاز الموتور أو ضعف الاستجابة عند تدوير الحارة. في حال ظهور هذه الأعراض يُنصح باستبدال ${sensorAr} فورًا.` },
      { name: carPhrase ? `ما هو ${sensorAr} المناسب لسيارة ${carPhrase}؟` : `كيف أختار ${sensorAr} المناسب لسيارتي؟`, text: carPhrase ? `${sensorAr} ماركة ${brand} مصمم خصيصًا لسيارة ${carPhrase}. تأكد من رقم القطعة قبل الشراء. متوفر في زيت أند فلترز بأفضل سعر في مصر مع ضمان استبدال.` : `اختر ${sensorAr} المناسب حسب نوع سيارتك وموديلها. ${sensorAr} ماركة ${brand} متوفر لمعظم أنواع السيارات في زيت أند فلترز.` },
      { name: `ما سعر ${sensorAr} ${brand} في مصر؟`, text: `${sensorAr} ماركة ${brand} متاح بأفضل سعر في مصر من زيت أند فلترز مع شحن لباب البيت في جميع المحافظات وضمان استبدال.` },
      { name: `هل يمكن تركيب ${sensorAr} بدون ميكانيكي؟`, text: `تركيب ${sensorAr} يحتاج أدوات بسيطة لكن يُنصح بالتركيب على يد ميكانيكي متخصص لضمان الضبط الصحيح وتجنب أعطال إضافية. بعد التركيب يُفضل مسح كودات الأعطال بجهاز الكمبيوتر.` },
    ];
  } else if (cat === 'إطارات') {
    const size = sub || '';
    questions = [
      { name: `ما هي أفضل إطارات ${brand} في مصر؟`, text: `إطارات ${brand} ${size} من أفضل الخيارات في مصر. توفر ثباتًا عاليًا وتحكمًا ممتازًا وعمرًا طويلًا. مناسبة لمعظم أنواع السيارات الشائعة في مصر مثل أوبترا، كروز، كورولا، النترا وغيرها.` },
      { name: size ? `ما هو سعر إطار ${brand} ${size} في مصر؟` : `ما هو سعر إطارات ${brand} في مصر؟`, text: `إطارات ${brand} متاحة بأفضل سعر كاوتشات في مصر من زيت أند فلترز مع شحن لباب البيت في جميع المحافظات. تفضل بزيارة صفحة المنتج للاطلاع على السعر الحالي.` },
      { name: `كيف أعرف المقاس المناسب من الإطارات لسيارتي؟`, text: `مقاس الإطار المناسب مكتوب على الإطار الحالي لسيارتك أو في دليل السيارة وعلى لوحة داخل باب السيارة. المقاس يكون على شكل 205/55R16 مثلاً. يمكنك التواصل مع زيت أند فلترز وسيساعدونك في اختيار المقاس الصحيح.` },
      { name: `كل كام كيلو بغير الإطارات؟`, text: `عمر الإطار عادةً 40,000-60,000 كيلومتر حسب نوع الإطار وأسلوب القيادة والطرق. يُنصح بفحص إطاراتك كل 10,000 كيلومتر والتأكد من عدم وجود تآكل غير منتظم.` },
    ];
  } else if (cat === 'فلاتر' && (sub === 'فلتر تكييف' || sub === 'فلتر كابينة')) {
    questions = [
      { name: `ما هي فوائد تغيير فلتر تكييف السيارة؟`, text: `تغيير فلتر تكييف السيارة (فلتر الكابينة) يحسن جودة الهواء داخل السيارة، يقضي على الأتربة والبكتيريا والروائح الكريهة، ويحمي نظام تكييف السيارة من التلف. يُنصح بتغييره كل 15,000 كيلومتر أو مرة كل عام.` },
      { name: `ما هو أفضل فلتر تكييف ${brand}؟`, text: `فلتر تكييف ${brand} من أفضل الخيارات في مصر. يوفر تنقية عالية للهواء ويطيل عمر نظام التكييف. مناسب لمعظم أنواع السيارات الشائعة. متوفر في زيت أند فلترز بأفضل سعر في مصر.` },
      { name: carPhrase ? `ما هو فلتر التكييف المناسب لسيارة ${carPhrase}؟` : `كيف أختار فلتر التكييف المناسب لسيارتي؟`, text: carPhrase ? `فلتر تكييف ${brand} متوافق مع سيارة ${carPhrase}. تأكد من رقم القطعة قبل الشراء. متوفر في زيت أند فلترز بأفضل سعر في مصر مع شحن لباب البيت.` : `اختر فلتر التكييف المناسب حسب نوع سيارتك وموديلها. فلاتر تكييف ${brand} متوفرة لمعظم أنواع السيارات في زيت أند فلترز.` },
    ];
  } else if (cat === 'دورة تبريد و تكييف' && sub === 'طلمبات مياه') {
    questions = [
      { name: `ما هي علامات تلف طلمبة المياه؟`, text: `أبرز علامات تلف طلمبة المياه: ارتفاع مقياس حرارة الموتور، تسريب مياه التبريد (الكولانت) من الموتور، صوت طرق من منطقة الموتور الأمامية، أو رائحة حرق من تحت الكابوت. يجب استبدال طلمبة المياه فور ظهور هذه الأعراض لتجنب احتراق الموتور.` },
      { name: `ما هو أفضل طلمبة مياه ${brand}؟`, text: `طلمبة مياه ${brand} من أفضل الخيارات في مصر. تضمن تبريد الموتور بكفاءة وتطيل عمره. مناسبة لسيارات أوبترا، كروز، كورولا، لانسر وغيرها. متوفرة في زيت أند فلترز بأفضل سعر.` },
      { name: `ما سعر طلمبة مياه ${brand} في مصر؟`, text: `طلمبة مياه ${brand} متاحة بأفضل سعر في مصر من زيت أند فلترز مع شحن لباب البيت في جميع المحافظات.` },
    ];
  } else if (cat === 'دورة تبريد و تكييف' && sub === 'كوعة و ثرموستات') {
    questions = [
      { name: `ما هي علامات تلف كوعة المياه أو الثرموستات؟`, text: `أبرز العلامات: ارتفاع حرارة الموتور بسرعة، تسريب مياه تبريد من المنطقة الأمامية للموتور، أو عدم وصول الحرارة للدرجة الصحيحة. استبدال الكوعة والثرموستات يمنع احتراق الموتور ويحافظ على كفاءة التبريد.` },
      { name: `ما هو أفضل كوعة مياه وثرموستات ${brand}؟`, text: `كوعة المياه والثرموستات ماركة ${brand} من أفضل الخيارات في مصر. تضمن تنظيم حرارة الموتور بدقة. مناسبة لسيارات أوبترا، كروز، كورولا، لانسر وغيرها. متوفرة في زيت أند فلترز بأفضل سعر.` },
      { name: `ما سعر كوعة مياه ${brand} في مصر؟`, text: `كوعة مياه وثرموستات ${brand} متاحة بأفضل سعر في مصر من زيت أند فلترز مع شحن لباب البيت في جميع المحافظات.` },
    ];
  } else if (cat === 'الفرامل' && sub === 'ماستر عجل') {
    questions = [
      { name: `ما هي علامات تلف ماستر العجل؟`, text: `أبرز علامات تلف ماستر العجل: تسريب زيت فرامل من داخل العجل، ميل السيارة لجهة عند الكبح، أو ضعف أداء الفرامل من جهة واحدة. استبدال ماستر العجل فوري ضروري للأمان.` },
      { name: `ما هو أفضل ماستر عجل ${brand}؟`, text: `ماستر عجل ${brand} من أفضل الخيارات في مصر. يضمن توزيع ضغط الفرامل بالتساوي وأمان التوقف. متوفر في زيت أند فلترز بأفضل سعر.` },
      { name: carPhrase ? `ما هو ماستر العجل المناسب لسيارة ${carPhrase}؟` : `ما سعر ماستر عجل ${brand} في مصر؟`, text: carPhrase ? `ماستر عجل ${brand} متوافق مع سيارة ${carPhrase}. تأكد من رقم القطعة قبل الشراء. متوفر في زيت أند فلترز بأفضل سعر في مصر.` : `ماستر عجل ${brand} متاح بأفضل سعر في مصر من زيت أند فلترز مع شحن لباب البيت في جميع المحافظات.` },
    ];
  } else if (cat === 'دبرياج و قطع فتيس' && sub === 'ديسك') {
    questions = [
      { name: `ما هي علامات تلف ديسك الدبرياج؟`, text: `أبرز علامات تلف ديسك الدبرياج: انزلاق الدبرياج عند التسارع، رائحة احتراق عند الضغط على الدبرياج، صعوبة تغيير التروس، أو اهتزاز عند الإقلاع. يجب استبداله فوراً لتجنب تلف الفلايويل.` },
      { name: `ما هو أفضل ديسك دبرياج ${brand}؟`, text: `ديسك دبرياج ${brand} من أفضل الخيارات في مصر. يوفر التحام ناعم وعمراً طويلاً. مناسب لسيارات أوبترا، كروز، كورولا، لانسر وغيرها. متوفر في زيت أند فلترز بأفضل سعر.` },
      { name: `ما سعر ديسك دبرياج ${brand} في مصر؟`, text: `ديسك دبرياج ${brand} متاح بأفضل سعر في مصر من زيت أند فلترز مع شحن لباب البيت في جميع المحافظات.` },
    ];
  } else if (cat === 'دبرياج و قطع فتيس' && sub === 'اسطوانة') {
    questions = [
      { name: `ما هي وظيفة اسطوانة الدبرياج؟`, text: `اسطوانة الدبرياج (Pressure Plate) هي المسؤولة عن الضغط على ديسك الدبرياج وتثبيته. عند تلفها يحدث انزلاق الدبرياج أو صعوبة في تغيير التروس. يُفضل تغييرها مع الديسك في نفس الوقت.` },
      { name: `ما هو أفضل اسطوانة دبرياج ${brand}؟`, text: `اسطوانة دبرياج ${brand} من أفضل الخيارات في مصر. تضمن ضغطاً منتظماً على الديسك وعمراً طويلاً. متوفرة في زيت أند فلترز بأفضل سعر.` },
      { name: `ما سعر اسطوانة دبرياج ${brand} في مصر؟`, text: `اسطوانة دبرياج ${brand} متاحة بأفضل سعر في مصر من زيت أند فلترز مع شحن لباب البيت في جميع المحافظات.` },
    ];
  } else if (cat === 'دبرياج و قطع فتيس' && sub === 'بلية دبرياج') {
    questions = [
      { name: `ما هي علامات تلف بلية الدبرياج؟`, text: `أبرز علامات تلف بلية الدبرياج: صوت طرق أو صرير عند الضغط على البيدال، اهتزاز عند تحرير الدبرياج، أو صعوبة في تغيير التروس. تُغير عادةً مع الديسك والاسطوانة لتوفير التكلفة.` },
      { name: `ما هو أفضل بلية دبرياج ${brand}؟`, text: `بلية دبرياج ${brand} من أفضل الخيارات في مصر. تضمن تحرير ناعم للدبرياج وعمراً طويلاً. متوفرة في زيت أند فلترز بأفضل سعر.` },
      { name: `ما سعر بلية دبرياج ${brand} في مصر؟`, text: `بلية دبرياج ${brand} متاحة بأفضل سعر في مصر من زيت أند فلترز مع شحن لباب البيت في جميع المحافظات.` },
    ];
  } else if (cat === 'دبرياج و قطع فتيس' && (sub === 'ماستر علوي' || sub === 'ماستر سفلي')) {
    const label = sub === 'ماستر علوي' ? 'ماستر دبرياج علوي' : 'ماستر دبرياج سفلي';
    questions = [
      { name: `ما هي علامات تلف ${label}؟`, text: `أبرز علامات تلف ${label}: تسريب زيت الدبرياج، غرق بيدال الدبرياج في الأرض، أو صعوبة تغيير التروس. يجب إصلاحه فوراً لضمان أمان القيادة وحماية منظومة الدبرياج.` },
      { name: `ما هو أفضل ${label} ${brand}؟`, text: `${label} ماركة ${brand} من أفضل الخيارات في مصر. يضمن ضغطاً هيدروليكياً مثالياً لمنظومة الدبرياج. متوفر في زيت أند فلترز بأفضل سعر.` },
      { name: `ما سعر ${label} ${brand} في مصر؟`, text: `${label} ماركة ${brand} متاح بأفضل سعر في مصر من زيت أند فلترز مع شحن لباب البيت في جميع المحافظات.` },
    ];
  } else if (cat === 'دورة البنزين' && sub === 'طلمبة بنزين') {
    questions = [
      { name: `ما هي علامات تلف طلمبة البنزين؟`, text: `أبرز العلامات: صعوبة تشغيل الموتور، فقدان القوة عند التسارع، صوت طنين من خزان البنزين، أو توقف الموتور فجأة. عند ظهور هذه الأعراض يجب فحص واستبدال طلمبة البنزين.` },
      { name: `ما هو أفضل طلمبة بنزين ${brand}؟`, text: `طلمبة بنزين ${brand} من أفضل الخيارات في مصر. تضمن تدفق الوقود بشكل سليم وحماية الإنجكتورات والموتور. متوفرة في زيت أند فلترز بأفضل سعر.` },
      { name: `ما سعر طلمبة بنزين ${brand} في مصر؟`, text: `طلمبة بنزين ${brand} متاحة بأفضل سعر في مصر من زيت أند فلترز مع شحن لباب البيت في جميع المحافظات.` },
    ];
  } else if (cat === 'دورة البنزين' && sub === 'قلب طلمبة بنزين') {
    questions = [
      { name: `ما الفرق بين طلمبة البنزين الكاملة وقلب الطلمبة؟`, text: `قلب طلمبة البنزين هو الجزء الميكانيكي داخل الطلمبة المسؤول عن ضخ الوقود. عند تلف الطلمبة يمكن أحياناً تغيير القلب فقط بتكلفة أقل بدلاً من الطلمبة الكاملة. ${brand} توفر قلوب طلمبة عالية الجودة متوفرة في زيت أند فلترز.` },
      { name: `ما هو أفضل قلب طلمبة بنزين ${brand}؟`, text: `قلب طلمبة بنزين ${brand} من أفضل الخيارات في مصر. يستعيد أداء الطلمبة الأصلي بسعر أقل من الطلمبة الكاملة. متوفر في زيت أند فلترز بأفضل سعر.` },
      { name: `ما سعر قلب طلمبة بنزين ${brand} في مصر؟`, text: `قلب طلمبة بنزين ${brand} متاح بأفضل سعر في مصر من زيت أند فلترز مع شحن لباب البيت في جميع المحافظات.` },
    ];
  } else if (cat === 'دورة البنزين' && sub === 'عوامة بنزين') {
    questions = [
      { name: `ما هي علامات تلف عوامة البنزين؟`, text: `أبرز العلامات: قراءة خاطئة لعداد البنزين (يُظهر ممتلئاً وهو فارغاً أو العكس)، أو عدم تحرك إبرة عداد البنزين. استبدال العوامة يعيد دقة قراءة مستوى الوقود.` },
      { name: `ما هو أفضل عوامة بنزين ${brand}؟`, text: `عوامة بنزين ${brand} من أفضل الخيارات في مصر. تضمن قراءة دقيقة لمستوى الوقود وعمراً طويلاً. متوفرة في زيت أند فلترز بأفضل سعر.` },
      { name: `ما سعر عوامة بنزين ${brand} في مصر؟`, text: `عوامة بنزين ${brand} متاحة بأفضل سعر في مصر من زيت أند فلترز مع شحن لباب البيت في جميع المحافظات.` },
    ];
  } else if (cat === 'سيور و بلي' && sub === 'سير تكييف') {
    questions = [
      { name: `ما هي علامات تلف سير التكييف؟`, text: `أبرز العلامات: صوت صفير أو طرق من الموتور، توقف التكييف عن العمل فجأة، أو تحذير من البطارية. سير التكييف يُشغّل الضاغط، وانقطاعه يعطل التكييف بالكامل.` },
      { name: `ما هو أفضل سير تكييف ${brand}؟`, text: `سير تكييف ${brand} من أفضل الخيارات في مصر. يضمن تشغيل ضاغط التكييف بكفاءة وعمراً طويلاً. متوفر في زيت أند فلترز بأفضل سعر.` },
      { name: `ما سعر سير تكييف ${brand} في مصر؟`, text: `سير تكييف ${brand} متاح بأفضل سعر في مصر من زيت أند فلترز مع شحن لباب البيت في جميع المحافظات.` },
    ];
  } else if (cat === 'سيور و بلي' && sub === 'بلية كاتينة') {
    questions = [
      { name: `ما هي وظيفة بلية الكاتينة؟`, text: `بلية الكاتينة (Timing Chain Tensioner/Idler) تحافظ على شد سير التوقيت بالضغط الصحيح. تلفها يسبب ارتخاء السير وأصوات طقطقة من الموتور عند التشغيل، وقد يؤدي لتلف كامل في الموتور.` },
      { name: `ما هو أفضل بلية كاتينة ${brand}؟`, text: `بلية كاتينة ${brand} من أفضل الخيارات في مصر. تضمن شد مثالي لسير التوقيت وعمراً طويلاً. يُنصح بتغييرها مع طقم الكاتينة الكامل. متوفرة في زيت أند فلترز بأفضل سعر.` },
      { name: `ما سعر بلية كاتينة ${brand} في مصر؟`, text: `بلية كاتينة ${brand} متاحة بأفضل سعر في مصر من زيت أند فلترز مع شحن لباب البيت في جميع المحافظات.` },
    ];
  } else if (cat === 'سيور و بلي' && (sub === 'سير كاتينة' || sub === 'طقم كاتينة كامل')) {
    questions = [
      { name: `كل كام كيلو بغير سير الكاتينة؟`, text: `يُنصح بتغيير طقم الكاتينة الكامل كل 60,000-80,000 كيلومتر أو حسب تعليمات الشركة المصنعة. الطقم الكامل يشمل السير والبلية والشداد لضمان أداء مثالي لمنظومة التوقيت.` },
      { name: `ما هو أفضل طقم كاتينة ${brand}؟`, text: `طقم كاتينة ${brand} من أفضل الخيارات في مصر. يشمل جميع القطع اللازمة لاستبدال منظومة التوقيت بالكامل. مناسب لسيارات أوبترا، كروز، كورولا، لانسر وغيرها. متوفر في زيت أند فلترز بأفضل سعر.` },
      { name: `ما سعر طقم كاتينة ${brand} في مصر؟`, text: `طقم كاتينة ${brand} متاح بأفضل سعر في مصر من زيت أند فلترز مع شحن لباب البيت في جميع المحافظات.` },
      { name: `ما الفرق بين سير الكاتينة والطقم الكامل؟`, text: `طقم الكاتينة الكامل يشمل سير التوقيت + بلية الكاتينة + شداد السير، بينما سير الكاتينة فقط هو قطعة واحدة. يُفضل دائماً شراء الطقم الكامل عند التغيير لتوفير التكلفة وضمان أداء مثالي.` },
    ];
  } else if (cat === 'فلاتر' && (sub === 'فلتر زيت' || sub === 'فلتر الزيت')) {
    questions = [
      { name: `كل كام كيلو بغير فلتر الزيت؟`, text: `يُنصح بتغيير فلتر الزيت مع كل تغيير زيت موتور، عادةً كل 5,000-10,000 كيلومتر حسب نوع الزيت المستخدم ونوع السيارة. الزيت التخليقي يسمح بفترة أطول بين التغييرات.` },
      { name: `ما هو أفضل فلتر زيت ${brand}؟`, text: `فلتر زيت ${brand} من أفضل الخيارات في مصر. يحمي الموتور من الشوائب ويضمن نظافة الزيت. مناسب لسيارات أوبترا، كروز، كورولا، لانسر، النترا وغيرها. متوفر في زيت أند فلترز بأفضل سعر.` },
      { name: `ما سعر فلتر زيت ${brand} في مصر؟`, text: `فلتر زيت ${brand} متاح بأفضل سعر في مصر من زيت أند فلترز مع شحن لباب البيت في جميع المحافظات.` },
    ];
  }

  if (questions.length === 0) return null;

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map(q => ({
      '@type': 'Question',
      name: q.name,
      acceptedAnswer: { '@type': 'Answer', text: q.text },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
    />
  );
}

function LocalBusinessSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': ['AutoPartsStore', 'LocalBusiness'],
    name: 'زيت أند فلترز - Zait & Filters',
    alternateName: 'Zait and Filters',
    description: 'متجر قطع غيار سيارات أونلاين في مصر - زيوت موتور، فلاتر، إطارات، قطع غيار أصلية بأفضل سعر مع شحن لباب البيت في جميع المحافظات',
    url: 'https://zaitandfilters.com',
    logo: 'https://zaitandfilters.com/logo.png',
    image: 'https://zaitandfilters.com/og-image.jpg',
    telephone: process.env.NEXT_PUBLIC_STORE_PHONE || '+20-XXXXXXXXXX',
    email: 'info@zaitandfilters.com',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'EG',
      addressLocality: 'Cairo',
      addressRegion: 'Cairo',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 30.0444,
      longitude: 31.2357,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Saturday', 'Sunday'],
        opens: '09:00',
        closes: '22:00',
      },
    ],
    priceRange: '$$',
    sameAs: [
      'https://www.facebook.com/zaitandfilters',
      'https://www.instagram.com/zaitandfilters',
    ],
    hasMap: 'https://maps.google.com/?q=zait+and+filters+egypt',
    areaServed: {
      '@type': 'Country',
      name: 'Egypt',
    },
    currenciesAccepted: 'EGP',
    paymentAccepted: 'Cash, Credit Card, Fawry, Vodafone Cash, Instapay',
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

function SiteLinksSearchBoxSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'زيت أند فلترز',
    url: 'https://zaitandfilters.com',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://zaitandfilters.com/store?search={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

  const product = await getProduct(slug);

  if (isUUID) {
    if (!product) notFound();
    if (product._redirect) redirect(`/products/${encodeURIComponent(product._redirect)}`);
    if (product.slug) redirect(`/products/${encodeURIComponent(product.slug)}`);
    return (
      <>
        {/* CWV FIX: Preload the LCP image as early as possible */}
        <ProductImagePreload imageUrl={product.image_url} />
        <LocalBusinessSchema />
        <SiteLinksSearchBoxSchema />
        <ProductSchema product={product} />
        <PartFAQSchema product={product} />
        {/*
          CWV FIX: ProductPageSkeleton is the fallback.
          It mirrors the two-column layout of ProductDetailsClient so the
          browser reserves the correct amount of space before hydration,
          eliminating CLS from content popping in.
        */}
        <Suspense fallback={<ProductPageSkeleton />}>
          <ProductDetailsClient initialProduct={product} productId={product.id} />
        </Suspense>
      </>
    );
  }

  if (!product) notFound();
  if (product._redirect) redirect(`/products/${encodeURIComponent(product._redirect)}`);

  return (
    <>
      {/* CWV FIX: Preload the LCP image as early as possible */}
      <ProductImagePreload imageUrl={product.image_url} />
      <LocalBusinessSchema />
      <SiteLinksSearchBoxSchema />
      <ProductSchema product={product} />
      <PartFAQSchema product={product} />
      {/*
        CWV FIX: ProductPageSkeleton is the fallback.
        It mirrors the two-column layout of ProductDetailsClient so the
        browser reserves the correct amount of space before hydration,
        eliminating CLS from content popping in.
      */}
      <Suspense fallback={<ProductPageSkeleton />}>
        <ProductDetailsClient initialProduct={product} productId={product.id} />
      </Suspense>
    </>
  );
}