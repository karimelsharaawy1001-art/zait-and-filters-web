// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_PROMPT = `أنت مساعد ذكي لمتجر "زيت اند فلترز" — متجر إلكتروني مصري متخصص في قطع غيار السيارات وزيوت المحركات والفلاتر.

معلومات المتجر:
- الاسم: زيت اند فلترز (Zait & Filters)
- الموقع: zaitandfilters.com
- التوصيل: لكل محافظات مصر — 2 إلى 5 أيام عمل
- الشحن السريع: 48 ساعة داخل القاهرة والجيزة فقط
- طرق الدفع: InstaPay، فودافون كاش، بطاقة تقسيط، كاش عند الاستلام
- الكاش باك: كل طلب بيكسب كاش باك في المحفظة
- للتواصل: واتساب على الموقع

أسلوبك:
- اتكلم بالعامية المصرية دايماً
- كون ودود وخفيف الدم لكن محترف
- ردودك مختصرة ومفيدة

⛔ قواعد صارمة جداً:
1. ❌ ممنوع تخترع أي منتج أو رابط من عندك.
2. ✅ البيانات الوحيدة اللي تستخدمها هي اللي بتيجي من الداتابيز.
3. لو الداتابيز ما رجعتش نتايج، قول: "مش لاقي المنتج ده عندنا دلوقتي" وقترح واتساب.

📦 لو السؤال عن منتجات وفي منتجات في الداتابيز:
- اكتب جملة ترحيبية قصيرة بس فقط مثل "لاقيت كذا منتج مناسب ليك 😊"
- ❌ ممنوع تكتب أسماء منتجات أو أسعار أو روابط — الـ cards بتعمل ده تلقائياً.

🛒 لو السؤال عن أوردر وفي بيانات أوردر في الداتابيز:
- ❌ ممنوع تقول "مش لاقي" أو تتجاهل البيانات.
- ✅ اعرض بيانات الأوردر بالكامل بشكل واضح ومرتب بالعامية المصرية:
  رقم الأوردر، الحالة، الإجمالي، تاريخ الطلب، رقم التتبع، المدينة، طريقة الدفع.`;

const CAR_DATA = [
  { make: 'CHEVROLET', make_ar: 'شيفروليه', model: 'AVEO',  model_ar: 'أفيو',    years: ['2002-2011', '2012-2021'] },
  { make: 'CHEVROLET', make_ar: 'شيفروليه', model: 'CRUZE', model_ar: 'كروز',    years: ['2009-2013', '2014-2017'] },
  { make: 'CHEVROLET', make_ar: 'شيفروليه', model: 'LANOS', model_ar: 'لانوس',   years: [] },
  { make: 'CHEVROLET', make_ar: 'شيفروليه', model: 'OPTRA', model_ar: 'أوبترا',  years: ['2004-2014', '2014-2023'] },
  { make: 'HYUNDAI', make_ar: 'هيونداي', model: 'ACCENT',     model_ar: 'أكسنت',      years: ['2006-2011', '2011-2024'] },
  { make: 'HYUNDAI', make_ar: 'هيونداي', model: 'ACCENT HCI', model_ar: 'أكسنت HCI',  years: ['2017-2023'] },
  { make: 'HYUNDAI', make_ar: 'هيونداي', model: 'MATRIX',     model_ar: 'ماتريكس',    years: [] },
  { make: 'HYUNDAI', make_ar: 'هيونداي', model: 'TUCSON',     model_ar: 'توسان',       years: ['2014-2021', '2022-2025'] },
  { make: 'HYUNDAI', make_ar: 'هيونداي', model: 'VERNA',      model_ar: 'فيرنا',       years: [] },
  { make: 'KIA', make_ar: 'كيا', model: 'GRAND CERATO', model_ar: 'جراند سيراتو', years: ['2018-2022'] },
  { make: 'KIA', make_ar: 'كيا', model: 'SPORTAGE',     model_ar: 'سبورتاج',       years: ['2005-2010', '2010-2015', '2016-2022'] },
  { make: 'MG', make_ar: 'إم جي', model: '5',   model_ar: 'إم جي 5',   years: [] },
  { make: 'MG', make_ar: 'إم جي', model: '6',   model_ar: 'إم جي 6',   years: [] },
  { make: 'MG', make_ar: 'إم جي', model: 'HS',  model_ar: 'إم جي HS',  years: [] },
  { make: 'MG', make_ar: 'إم جي', model: 'RX5', model_ar: 'إم جي RX5', years: [] },
  { make: 'MG', make_ar: 'إم جي', model: 'ZS',  model_ar: 'إم جي ZS',  years: [] },
  { make: 'MITSUBISHI', make_ar: 'ميتسوبيشي', model: 'ECLIPSE',      model_ar: 'إيكليبس',    years: [] },
  { make: 'MITSUBISHI', make_ar: 'ميتسوبيشي', model: 'LANCER PUMA',  model_ar: 'لانسر بوما', years: [] },
  { make: 'MITSUBISHI', make_ar: 'ميتسوبيشي', model: 'LANCER SHARK', model_ar: 'لانسر شارك', years: [] },
  { make: 'NISSAN', make_ar: 'نيسان', model: 'QASHQAI',   model_ar: 'قشقاي',   years: ['2007-2013', '2014-2021', '2022-2025'] },
  { make: 'NISSAN', make_ar: 'نيسان', model: 'SENTRA',    model_ar: 'سنترا',   years: [] },
  { make: 'NISSAN', make_ar: 'نيسان', model: 'SUNNY N16', model_ar: 'صني N16', years: ['2005-2013'] },
  { make: 'NISSAN', make_ar: 'نيسان', model: 'SUNNY N17', model_ar: 'صني N17', years: ['2014-2025'] },
  { make: 'OPEL', make_ar: 'أوبل', model: 'ASTRA',    model_ar: 'أسترا',    years: ['2004-2009', '2010-2017', '2012-2018'] },
  { make: 'OPEL', make_ar: 'أوبل', model: 'INSIGNIA', model_ar: 'إنسيجنيا', years: ['2013-2017'] },
  { make: 'PEUGEOT', make_ar: 'بيجو', model: '2008', model_ar: 'بيجو 2008', years: ['2013-2018', '2019-2021'] },
  { make: 'PEUGEOT', make_ar: 'بيجو', model: '3008', model_ar: 'بيجو 3008', years: ['2008-2016', '2017-2022'] },
  { make: 'PEUGEOT', make_ar: 'بيجو', model: '308',  model_ar: 'بيجو 308',  years: ['2007-2013', '2011-2018', '2014-2021', '2018-2022'] },
  { make: 'PEUGEOT', make_ar: 'بيجو', model: '5008', model_ar: 'بيجو 5008', years: ['2009-2016', '2017-2022'] },
  { make: 'PEUGEOT', make_ar: 'بيجو', model: '508',  model_ar: 'بيجو 508',  years: ['2011-2018', '2018-2022'] },
  { make: 'RENAULT', make_ar: 'رينو', model: 'CAPTUR',  model_ar: 'كابتشر',  years: ['2013-2018', '2018-2022'] },
  { make: 'RENAULT', make_ar: 'رينو', model: 'CLIO',    model_ar: 'كليو',    years: ['2005-2008'] },
  { make: 'RENAULT', make_ar: 'رينو', model: 'DUSTER',  model_ar: 'داستر',   years: ['2010-2018', '2018-2022'] },
  { make: 'RENAULT', make_ar: 'رينو', model: 'FLUENCE', model_ar: 'فلونس',   years: [] },
  { make: 'RENAULT', make_ar: 'رينو', model: 'KADJAR',  model_ar: 'كادجار',  years: [] },
  { make: 'RENAULT', make_ar: 'رينو', model: 'LOGAN',   model_ar: 'لوجان',   years: ['2004-2013', '2012-2022'] },
  { make: 'RENAULT', make_ar: 'رينو', model: 'MEGANE',  model_ar: 'ميجان',   years: ['2003-2009', '2009-2017', '2017-2023'] },
  { make: 'RENAULT', make_ar: 'رينو', model: 'SANDERO', model_ar: 'سانديرو', years: ['2008-2013', '2013-2021'] },
  { make: 'RENAULT', make_ar: 'رينو', model: 'STEPWAY', model_ar: 'ستيبواي', years: ['2010-2014'] },
  { make: 'SEAT', make_ar: 'سيات', model: 'IBIZA',  model_ar: 'إيبيزا', years: ['2003-2008', '2008-2016', '2017-2022'] },
  { make: 'SEAT', make_ar: 'سيات', model: 'LEON',   model_ar: 'ليون',   years: ['2013-2020', '2021-2024'] },
  { make: 'SEAT', make_ar: 'سيات', model: 'TOLEDO', model_ar: 'توليدو', years: ['2012-2019'] },
];

const CAR_MAKE_MAP: Record<string, string> = {
  'تويوتا': 'Toyota',     'هيونداي': 'Hyundai',
  'كيا': 'Kia',           'أوبل': 'Opel',
  'شيفروليه': 'Chevrolet','نيسان': 'Nissan',
  'هوندا': 'Honda',       'بيجو': 'Peugeot',
  'رينو': 'Renault',      'فيات': 'Fiat',
  'ميتسوبيشي': 'Mitsubishi','سوزوكي': 'Suzuki',
  'فولكس': 'Volkswagen',  'بي ام دبليو': 'BMW',
  'مرسيدس': 'Mercedes',   'لادا': 'Lada',
  'جيلي': 'Geely',        'إم جي': 'MG',
  'سيات': 'Seat',
  'toyota': 'Toyota',     'hyundai': 'Hyundai',
  'kia': 'Kia',           'opel': 'Opel',
  'chevrolet': 'Chevrolet','nissan': 'Nissan',
  'honda': 'Honda',       'peugeot': 'Peugeot',
  'renault': 'Renault',   'fiat': 'Fiat',
  'mitsubishi': 'Mitsubishi','suzuki': 'Suzuki',
  'volkswagen': 'Volkswagen','bmw': 'BMW',
  'mercedes': 'Mercedes', 'lada': 'Lada',
  'geely': 'Geely',       'mg': 'MG',
  'seat': 'Seat',
};

const MODEL_TO_MAKE: Record<string, string> = {
  'corolla': 'Toyota',  'camry': 'Toyota',      'yaris': 'Toyota',
  'hilux': 'Toyota',    'fortuner': 'Toyota',    'prado': 'Toyota',
  'elantra': 'Hyundai', 'tucson': 'Hyundai',     'accent': 'Hyundai',
  'sonata': 'Hyundai',  'i10': 'Hyundai',         'i20': 'Hyundai',
  'i30': 'Hyundai',     'creta': 'Hyundai',       'matrix': 'Hyundai',
  'verna': 'Hyundai',   'accent hci': 'Hyundai',
  'ماتريكس': 'Hyundai', 'فيرنا': 'Hyundai',       'توسان': 'Hyundai',
  'أكسنت': 'Hyundai',
  'sportage': 'Kia',    'cerato': 'Kia',          'picanto': 'Kia',
  'rio': 'Kia',         'grand cerato': 'Kia',
  'سبورتاج': 'Kia',     'جراند سيراتو': 'Kia',    'سيراتو': 'Kia',
  'mg5': 'MG',          'mg 5': 'MG',             'mg6': 'MG',
  'mg 6': 'MG',         'mg hs': 'MG',             'mg rx5': 'MG',
  'mg zs': 'MG',        'إم جي 5': 'MG',           'إم جي 6': 'MG',
  'إم جي hs': 'MG',     'إم جي rx5': 'MG',         'إم جي zs': 'MG',
  'lancer': 'Mitsubishi',      'لانسر': 'Mitsubishi',
  'lancer puma': 'Mitsubishi', 'لانسر بوما': 'Mitsubishi',
  'lancer shark': 'Mitsubishi','لانسر شارك': 'Mitsubishi',
  'pajero': 'Mitsubishi',      'boma': 'Mitsubishi',
  'بوما': 'Mitsubishi',        'puma': 'Mitsubishi',
  'بومة': 'Mitsubishi',        'outlander': 'Mitsubishi',
  'eclipse': 'Mitsubishi',     'galant': 'Mitsubishi',
  'إيكليبس': 'Mitsubishi',
  'cruze': 'Chevrolet',  'captiva': 'Chevrolet',  'optra': 'Chevrolet',
  'aveo': 'Chevrolet',   'spark': 'Chevrolet',     'lanos': 'Chevrolet',
  'كروز': 'Chevrolet',   'أفيو': 'Chevrolet',      'لانوس': 'Chevrolet',
  'أوبترا': 'Chevrolet',
  'astra': 'Opel',       'vectra': 'Opel',         'corsa': 'Opel',
  'zafira': 'Opel',      'insignia': 'Opel',
  'أسترا': 'Opel',       'إنسيجنيا': 'Opel',
  'sunny': 'Nissan',     'sentra': 'Nissan',        'qashqai': 'Nissan',
  'navara': 'Nissan',    'sunny n16': 'Nissan',      'sunny n17': 'Nissan',
  'صني': 'Nissan',       'قشقاي': 'Nissan',          'سنترا': 'Nissan',
  'صني n16': 'Nissan',   'صني n17': 'Nissan',
  'civic': 'Honda',      'accord': 'Honda',          'crv': 'Honda',
  'hrv': 'Honda',
  '206': 'Peugeot',      '207': 'Peugeot',           '301': 'Peugeot',
  '308': 'Peugeot',      '408': 'Peugeot',            '508': 'Peugeot',
  '2008': 'Peugeot',     '3008': 'Peugeot',           '5008': 'Peugeot',
  'logan': 'Renault',    'duster': 'Renault',         'symbol': 'Renault',
  'megane': 'Renault',   'fluence': 'Renault',         'captur': 'Renault',
  'clio': 'Renault',     'kadjar': 'Renault',          'sandero': 'Renault',
  'stepway': 'Renault',
  'لوجان': 'Renault',    'داستر': 'Renault',           'ميجان': 'Renault',
  'فلونس': 'Renault',    'كابتشر': 'Renault',          'كليو': 'Renault',
  'كادجار': 'Renault',   'سانديرو': 'Renault',          'ستيبواي': 'Renault',
  'ibiza': 'Seat',       'leon': 'Seat',               'toledo': 'Seat',
  'إيبيزا': 'Seat',      'ليون': 'Seat',                'توليدو': 'Seat',
  'golf': 'Volkswagen',  'polo': 'Volkswagen',         'passat': 'Volkswagen',
};

const MODEL_EN_MAP: Record<string, string> = {
  'أفيو': 'aveo',           'كروز': 'cruze',
  'لانوس': 'lanos',         'أوبترا': 'optra',
  'أكسنت': 'accent',        'توسان': 'tucson',
  'ماتريكس': 'matrix',      'فيرنا': 'verna',
  'النترا': 'elantra',
  'سبورتاج': 'sportage',    'سيراتو': 'cerato',
  'جراند سيراتو': 'grand cerato',
  'لانسر': 'lancer',        'لانسر بوما': 'lancer puma',
  'لانسر شارك': 'lancer shark',
  'بوما': 'puma',           'بومة': 'puma',
  'إيكليبس': 'eclipse',
  'قشقاي': 'qashqai',       'سنترا': 'sentra',
  'صني': 'sunny',           'صني n16': 'sunny n16',
  'صني n17': 'sunny n17',
  'أسترا': 'astra',         'إنسيجنيا': 'insignia',
  'لوجان': 'logan',         'داستر': 'duster',
  'ميجان': 'megane',        'فلونس': 'fluence',
  'كابتشر': 'captur',       'كليو': 'clio',
  'كادجار': 'kadjar',       'سانديرو': 'sandero',
  'ستيبواي': 'stepway',
  'إيبيزا': 'ibiza',        'ليون': 'leon',
  'توليدو': 'toledo',
  'كورولا': 'corolla',      'كامري': 'camry',
  'ياريس': 'yaris',
};

const PART_KEYWORD_MAP: Record<string, string[]> = {
  'فلتر زيت':  ['oil filter', 'فلتر زيت'],
  'فلتر هواء': ['air filter', 'فلتر هواء'],
  'فلتر':      ['filter', 'فلتر'],
  'زيت محرك': ['engine oil', 'motor oil', 'زيت'],
  'زيت':       ['oil', 'زيت'],
  'تيل فرامل': ['تيل فرامل', 'brake pad', 'brake pads'],
  'فرامل':     ['brake', 'فرامل'],
  'تيل':       ['تيل', 'brake pad'],
  'بلوف':      ['valve', 'بلوف'],
  'بواجي':     ['spark plug', 'بواجي'],
  'بطارية':    ['battery', 'بطارية'],
  'حزام':      ['belt', 'حزام'],
  'امبير':     ['alternator', 'امبير'],
  'كاوتش':     ['rubber', 'bushing', 'كاوتش'],
  'فلنشة':     ['gasket', 'فلنشة'],
  'كارتيرة':   ['كارتيرة', 'oil pan'],
  'طرمبة زيت': ['oil pump', 'طرمبة زيت'],
  'مكينة':     ['engine', 'مكينة'],
};

const KNOWN_MODELS: string[] = [
  'corolla', 'camry', 'yaris', 'hilux', 'fortuner', 'rav4', 'land cruiser', 'prado',
  'كورولا', 'كامري', 'ياريس',
  'elantra', 'tucson', 'accent', 'accent hci', 'sonata',
  'i10', 'i20', 'i30', 'i40', 'creta', 'matrix', 'verna',
  'النترا', 'توسان', 'أكسنت', 'ماتريكس', 'فيرنا',
  'sportage', 'cerato', 'grand cerato', 'picanto', 'rio', 'sorento',
  'سبورتاج', 'سيراتو', 'جراند سيراتو',
  'mg5', 'mg6', 'mg hs', 'mg rx5', 'mg zs', 'mg 5', 'mg 6',
  'إم جي 5', 'إم جي 6', 'إم جي hs', 'إم جي rx5', 'إم جي zs',
  'lancer', 'lancer puma', 'lancer shark',
  'pajero', 'outlander', 'eclipse', 'galant',
  'boma', 'puma',
  'لانسر', 'لانسر بوما', 'لانسر شارك',
  'بوما', 'بومة', 'إيكليبس',
  'cruze', 'captiva', 'optra', 'aveo', 'lanos', 'spark', 'malibu',
  'كروز', 'أوبترا', 'أفيو', 'لانوس',
  'astra', 'vectra', 'mokka', 'corsa', 'zafira', 'insignia',
  'أسترا', 'إنسيجنيا',
  'sunny', 'sunny n16', 'sunny n17',
  'sentra', 'qashqai', 'navara', 'patrol',
  'صني', 'صني n16', 'صني n17', 'قشقاي', 'سنترا',
  'civic', 'accord', 'crv', 'cr-v', 'hrv',
  '206', '207', '301', '308', '408', '508',
  '2008', '3008', '5008',
  'logan', 'duster', 'symbol', 'megane', 'fluence',
  'captur', 'clio', 'kadjar', 'sandero', 'stepway',
  'لوجان', 'داستر', 'ميجان', 'فلونس',
  'كابتشر', 'كليو', 'كادجار', 'سانديرو', 'ستيبواي',
  'punto', 'bravo', 'tipo',
  'swift', 'vitara', 'dzire',
  'golf', 'polo', 'passat', 'tiguan',
  '316', '318', '320', '520', 'x1', 'x3', 'x5',
  'c200', 'c180', 'e200', 'glc',
  'emgrand',
  'ibiza', 'leon', 'toledo',
  'إيبيزا', 'ليون', 'توليدو',
];

async function searchProducts(
  carMake?: string,
  carModel?: string,
  carModelEn?: string,
  carYear?: string,
  partKeywords?: string[]
): Promise<any[] | null> {
  const select = 'id, name, brand, car_make, car_model, car_model_year, regular_price, sale_price, slug, image_url';
  console.log('[SEARCH] make:', carMake, '| model:', carModel, '| modelEn:', carModelEn, '| year:', carYear, '| kw:', partKeywords);

  if (carMake && carModelEn) {
    let q = supabase.from('products').select(select)
      .ilike('car_make', `%${carMake}%`)
      .ilike('car_model', `%${carModelEn}%`)
      .limit(8);
    if (carYear) q = q.ilike('car_model_year', `%${carYear}%`);
    if (partKeywords?.length) q = q.or(partKeywords.map(k => `name.ilike.%${k}%`).join(','));
    const { data, error } = await q;
    console.log('[ATT 1] make+modelEn+kw →', error?.message || 'ok', '| count:', data?.length ?? 0);
    if (data?.length) return data;
  }

  if (carMake && carModel) {
    let q = supabase.from('products').select(select)
      .ilike('car_make', `%${carMake}%`)
      .ilike('car_model', `%${carModel}%`)
      .limit(8);
    if (partKeywords?.length) q = q.or(partKeywords.map(k => `name.ilike.%${k}%`).join(','));
    const { data, error } = await q;
    console.log('[ATT 2] make+modelAr+kw →', error?.message || 'ok', '| count:', data?.length ?? 0);
    if (data?.length) return data;
  }

  if (carMake && partKeywords?.length) {
    let q = supabase.from('products').select(select)
      .ilike('car_make', `%${carMake}%`)
      .limit(8);
    q = q.or(partKeywords.map(k => `name.ilike.%${k}%`).join(','));
    const { data, error } = await q;
    console.log('[ATT 3] make+kw →', error?.message || 'ok', '| count:', data?.length ?? 0);
    if (data?.length) return data;
  }

  if (carMake) {
    const { data, error } = await supabase.from('products').select(select)
      .ilike('car_make', `%${carMake}%`).limit(8);
    console.log('[ATT 4] make only →', error?.message || 'ok', '| count:', data?.length ?? 0);
    if (data?.length) return data;
  }

  if (carModelEn) {
    const { data, error } = await supabase.from('products').select(select)
      .ilike('car_model', `%${carModelEn}%`).limit(8);
    console.log('[ATT 5] modelEn in car_model →', error?.message || 'ok', '| count:', data?.length ?? 0);
    if (data?.length) return data;
  }

  if (carModel) {
    const { data, error } = await supabase.from('products').select(select)
      .ilike('name', `%${carModel}%`).limit(8);
    console.log('[ATT 6] modelAr in name →', error?.message || 'ok', '| count:', data?.length ?? 0);
    if (data?.length) return data;
  }

  if (partKeywords?.length) {
    for (const kw of partKeywords) {
      const { data, error } = await supabase.from('products').select(select)
        .ilike('name', `%${kw}%`).limit(8);
      console.log(`[ATT 7] kw "${kw}" →`, error?.message || 'ok', '| count:', data?.length ?? 0);
      if (data?.length) return data;
    }
  }

  console.log('[SEARCH] All attempts exhausted');
  return null;
}

async function getOrderByPhone(phone: string) {
  const cleaned = phone.replace(/\D/g, '');
  const { data, error } = await supabase
    .from('orders')
    .select('id, status, total_price, items, created_at, tracking_number, city, payment_method')
    .or(`customer_phone.ilike.%${cleaned}%,guest_phone.ilike.%${cleaned}%`)
    .order('created_at', { ascending: false })
    .limit(3);
  if (error || !data?.length) return null;
  return data;
}

async function getOrderById(orderId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('id, status, total_price, items, created_at, tracking_number, city, payment_method')
    .ilike('id', `%${orderId.trim()}%`)
    .limit(1)
    .single();
  if (error || !data) return null;
  return data;
}

function translateStatus(status: string): string {
  const map: Record<string, string> = {
    pending:         'جديد — بيتجهز',
    pending_payment: 'في انتظار الدفع',
    processing:      'قيد التجهيز',
    shipped:         'تم الشحن — في الطريق إليك',
    delivered:       'تم التسليم ✅',
    cancelled:       'ملغي',
    refunded:        'تم الاسترجاع',
  };
  return map[status] || status;
}

function detectIntent(message: string): {
  type: 'order_phone' | 'order_id' | 'product_search' | 'general';
  phone?: string;
  orderId?: string;
  carMake?: string;
  carModel?: string;
  carModelEn?: string;
  carYear?: string;
  partKeywords?: string[];
} {
  const msg      = message.trim();
  const lowerMsg = msg.toLowerCase();

  const phoneMatch = msg.match(/(\+?2?0?1[0-9]{9})/);
  if (phoneMatch) return { type: 'order_phone', phone: phoneMatch[1] };

  const orderIdMatch = msg.match(/([0-9a-f]{8}-[0-9a-f]{4}|[A-Z0-9]{8})/i);
  if (orderIdMatch) return { type: 'order_id', orderId: orderIdMatch[1] };

  const sortedModels = [...KNOWN_MODELS].sort((a, b) => b.length - a.length);
  const foundModel   = sortedModels.find(m => lowerMsg.includes(m.toLowerCase()));

  const foundModelEn = foundModel
    ? (MODEL_EN_MAP[foundModel] ?? MODEL_EN_MAP[foundModel.toLowerCase()] ?? foundModel)
    : undefined;

  const sortedMakeKeys = Object.keys(CAR_MAKE_MAP).sort((a, b) => b.length - a.length);
  const foundMakeKey   = sortedMakeKeys.find(k => lowerMsg.includes(k.toLowerCase()));

  let inferredMake = foundMakeKey ? CAR_MAKE_MAP[foundMakeKey] : undefined;
  if (!inferredMake && foundModel) {
    inferredMake = MODEL_TO_MAKE[foundModel] ?? MODEL_TO_MAKE[foundModel.toLowerCase()];
  }

  const sortedPartKeys = Object.keys(PART_KEYWORD_MAP).sort((a, b) => b.length - a.length);
  const matchedKeywords: string[] = [];
  for (const k of sortedPartKeys) {
    if (lowerMsg.includes(k.toLowerCase())) matchedKeywords.push(...PART_KEYWORD_MAP[k]);
  }
  const uniqueKeywords = [...new Set(matchedKeywords)];
  const yearMatch = msg.match(/20[0-9]{2}|19[0-9]{2}/);

  console.log('[INTENT] make:', inferredMake, '| model:', foundModel, '| modelEn:', foundModelEn, '| kw:', uniqueKeywords);

  if (inferredMake || foundModel || uniqueKeywords.length > 0) {
    return {
      type:         'product_search',
      carMake:      inferredMake,
      carModel:     foundModel,
      carModelEn:   foundModelEn !== foundModel ? foundModelEn : foundModel,
      carYear:      yearMatch ? yearMatch[0] : undefined,
      partKeywords: uniqueKeywords.length > 0 ? uniqueKeywords : undefined,
    };
  }

  return { type: 'general' };
}

function buildContext(intent: ReturnType<typeof detectIntent>, dbResult: any): string {
  if (!dbResult) return '';

  if (intent.type === 'order_phone' || intent.type === 'order_id') {
    const orders = Array.isArray(dbResult) ? dbResult : [dbResult];
    const orderDetails = orders.map((o: any) => `
رقم الأوردر: ${o.id.slice(0, 8).toUpperCase()}
الحالة: ${translateStatus(o.status)}
الإجمالي: ${o.total_price} ج.م
المدينة: ${o.city || 'غير محدد'}
طريقة الدفع: ${o.payment_method || 'غير محدد'}
تاريخ الطلب: ${new Date(o.created_at).toLocaleDateString('ar-EG')}
رقم التتبع: ${o.tracking_number || 'لم يُضاف بعد'}
عدد المنتجات: ${o.items?.length || 0}
`).join('\n---\n');
    return `دي بيانات الأوردر اللي العميل بيسأل عنه — اعرضها بشكل واضح ومرتب بالعامية المصرية:\n${orderDetails}`;
  }

  if (intent.type === 'product_search') {
    const products = Array.isArray(dbResult) ? dbResult : [dbResult];
    if (!products.length) return '';
    return `تم إيجاد ${products.length} منتج مناسب في الداتابيز. اكتب جملة قصيرة ومرحبة فقط مثل "لاقيت ${products.length} منتج مناسب ليك 😊" — المنتجات هتتعرض تلقائياً تحت ردك كـ cards.`;
  }

  return '';
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    if (!messages?.length) return NextResponse.json({ error: 'No messages' }, { status: 400 });

    const lastMessage = messages[messages.length - 1]?.content || '';
    const intent = detectIntent(lastMessage);

    let dbResult = null;

    if (intent.type === 'order_phone' && intent.phone) {
      dbResult = await getOrderByPhone(intent.phone);
    } else if (intent.type === 'order_id' && intent.orderId) {
      dbResult = await getOrderById(intent.orderId);
    } else if (intent.type === 'product_search') {
      dbResult = await searchProducts(
        intent.carMake,
        intent.carModel,
        intent.carModelEn,
        intent.carYear,
        intent.partKeywords
      );
    }

    console.log('[CHAT] DB result:', dbResult ? `${Array.isArray(dbResult) ? dbResult.length : 1} items` : 'null');

    const contextStr = dbResult ? buildContext(intent, dbResult) : '';

    const noResultsNote = (intent.type === 'product_search' && !dbResult)
      ? '\n\n⚠️ الداتابيز ما رجعتش أي منتجات. قول للعميل إن المنتج مش موجود دلوقتي واقترح يتواصل على واتساب.'
      : '';

    const systemContent =
      SYSTEM_PROMPT +
      noResultsNote +
      (contextStr
        ? `\n\n════ بيانات من الداتابيز ════\n${contextStr}\n════ نهاية البيانات ════`
        : '');

    const groqMessages = [
      { role: 'system', content: systemContent },
      ...messages.slice(-10).map((m: any) => ({
        role:    m.role    as 'user' | 'assistant' | 'system',
        content: m.content as string,
      })),
    ];

    const groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model:       'llama-3.3-70b-versatile',
        messages:    groqMessages,
        max_tokens:  300,
        temperature: 0.1,
      }),
    });

    if (!groqResponse.ok) {
      const err = await groqResponse.text();
      console.error('[Groq Error]', err);
      return NextResponse.json({ error: 'Groq API error' }, { status: 500 });
    }

    const data  = await groqResponse.json();
    const reply = data.choices?.[0]?.message?.content || 'معلش، حصل خطأ. جرب تاني.';

    const products = (intent.type === 'product_search' && Array.isArray(dbResult) && dbResult.length > 0)
      ? dbResult.map((p: any) => ({
          id:             p.id,
          name:           p.name?.trim(),
          brand:          p.brand          || null,
          car_make:       p.car_make       || null,
          car_model:      p.car_model      || null,
          car_model_year: p.car_model_year || null,
          regular_price:  p.regular_price  || 0,
          sale_price:     p.sale_price     || 0,
          slug:           p.slug,
          image_url:      p.image_url      || null,
          link:           `https://zaitandfilters.com/products/${p.slug}`,
        }))
      : null;

    return NextResponse.json({ reply, products });

  } catch (err: any) {
    console.error('[Chat API Error]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}