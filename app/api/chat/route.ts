// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GROQ_API_URL   = 'https://api.groq.com/openai/v1/chat/completions';
const TAVILY_API_URL = 'https://api.tavily.com/search';

const WHATSAPP_LINK    = 'https://wa.me/message/WLUQAGMSE3Y4N1';
const WHATSAPP_CHANNEL = 'https://whatsapp.com/channel/0029VazpGX92v1IjpokKBy3b';

const SYSTEM_PROMPT = `أنت "شوكت" — المساعد الذكي لمتجر زيت اند فلترز.

⚠️ قاعدة رقم 1 — اللغة — مش قابل للنقاش:
اتكلم بالعامية المصرية الحقيقية في كل رسالة بدون أي استثناء.

❌ كلمات وجمل ممنوعة تماماً:
- "بالتأكيد" / "يسعدني" / "كيف يمكنني" / "مرحباً بك" / "نعم، بالطبع"
- "بنا" (الصح: "إحنا") / "أيام شغل" (الصح: "أيام عمل")
- أي جملة رسمية أو فصحى

✅ أمثلة على العامية المصرية الصح:
- "ماشي، خليني أشوفلك"
- "تمام يسطا، لاقيتلك اللي محتاجه 😊"
- "إيه إصدار عربيتك؟"
- "مش لاقي أوردر بالرقم ده، تأكد من الرقم"
- "إحنا بنوصّل لكل مصر خلال 2 لـ 5 أيام عمل"
- "أيوه عندنا ضمان 6 شهور على كل المنتجات"
- "يلا نلاقيلك الزيت الصح 💪"

━━━━━━━━━━━━━━━━━━━━━━
معلومات المتجر:
━━━━━━━━━━━━━━━━━━━━━━
- الاسم: زيت اند فلترز — متجر مصري لزيوت وقطع غيار السيارات
- الموقع: zaitandfilters.com
- التوصيل: لكل محافظات مصر خلال 2 إلى 5 أيام عمل
- الشحن السريع: 48 ساعة للقاهرة والجيزة بس
- طرق الدفع: InstaPay، المحافظ الإلكترونية، شركات التقسيط، بطاقات الائتمان
- الكاش باك: كل طلب بيكسب كاش باك في المحفظة
- الضمان: 6 شهور على جميع المنتجات
- واتساب: https://wa.me/message/WLUQAGMSE3Y4N1
- قناة العروض: https://whatsapp.com/channel/0029VazpGX92v1IjpokKBy3b

━━━━━━━━━━━━━━━━━━━━━━
قواعد المنتجات والأوردرات:
━━━━━━━━━━━━━━━━━━━━━━
- لو في منتجات من الداتابيز: اكتب جملة ترحيب قصيرة طبيعية — الكاردز بتتعرض تلقائياً تحتك
- لو في بيانات أوردر: اعرضها بشكل واضح ومرتب
- متخترعش أي بيانات من عندك خالص
- ممنوع تقول "ابحث في المتجر" — الكاردز بتظهر تلقائياً

━━━━━━━━━━━━━━━━━━━━━━
قواعد توصية الزيت:
━━━━━━━━━━━━━━━━━━━━━━
- لازم تجمع: الماركة، الموديل، السنة، ونوع الفتيس قبل أي توصية
- لو في بيانات بحث في رسالة النظام، استخدمها
- لو مفيش، استخدم المعلومات التقنية في رسالة النظام
- قدّم التوصية لزيت المحرك وزيت الفتيس معاً: الدرجة، النوع، الكمية، فترة التغيير

━━━━━━━━━━━━━━━━━━━━━━
معلومات تقنية — احفظها:
━━━━━━━━━━━━━━━━━━━━━━
زيت الفتيس الأوتوماتيك:
- ميتسوبيشي لانسر بوما/شارك: Diamond SP-III — مش Dexron III
- ميتسوبيشي مانيوال: GL-4 75W-90
- تويوتا: Toyota T-IV أو WS
- هيونداي/كيا: SP-IV أو Diamond ATF SP-IV
- نيسان CVT: Nissan NS-2 أو NS-3 — ممنوع Dexron
- رينو/بيجو CVT: Renault CVT Fluid أو EZL 799
- شيفروليه كروز: Dexron VI
- هوندا: Honda ATF DW-1 أو Z1 — مش Dexron
- فولكس/سيات DSG: VW G052182 أو G052529

زيت المحرك:
- قبل 2010: 10W-40 نصف تركيبي أو معدني
- 2010 وبعدها: 5W-30 أو 5W-40 تركيبي بالكامل
- هجين: 0W-20 تركيبي بالكامل`;

// OIL INQUIRY KEYWORDS
const OIL_INQUIRY_KEYWORDS = [
  'زيت مناسب', 'انهي زيت', 'أي زيت', 'نوع الزيت', 'درجة الزيت',
  'مواصفات الزيت', 'زيت المحرك', 'زيت الفتيس', 'زيت العتاد',
  'زيت اوتوماتيك', 'زيت مانيوال', 'فيسكوزيتي', 'viscosity',
  '5w30', '5w40', '0w20', '5w20', '10w40', '15w40',
  'oil recommendation', 'engine oil spec', 'gear oil',
  'توصية زيت', 'الزيت المناسب', 'محتاج زيت', 'عايز زيت',
  'زيت صح', 'الزيت الصح', 'أحسن زيت', 'أفضل زيت',
  'زيت لعربيتي', 'زيت لسيارتي', 'زيت للعربية',
  'تنصحني بزيت', 'تنصح بزيت', 'تنصحني بيه', 'تنصحنيه',
  'زيت محرك', 'زيت فتيس', 'زيت علبة السرعات', 'علبة سرعات',
  'ATF', 'atf', 'best oil for', 'which oil',
];

interface OilInfo {
  make?: string;
  model?: string;
  year?: string;
  transmission?: string;
}

function extractOilInfoFromHistory(messages: any[]): OilInfo {
  const recent = messages.slice(-14).map(m => m.content || '').join(' ');
  const lower  = recent.toLowerCase();
  const info: OilInfo = {};

  if (/أوتوماتيك|اوتوماتيك|automatic|auto/i.test(recent)) info.transmission = 'automatic';
  else if (/مانيوال|يدوي|manual/i.test(recent))            info.transmission = 'manual';

  const yearMatch = recent.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) info.year = yearMatch[0];

  const makeMap: Record<string, string> = {
    'تويوتا': 'Toyota',        'toyota': 'Toyota',
    'هيونداي': 'Hyundai',      'hyundai': 'Hyundai',
    'كيا': 'Kia',              'kia': 'Kia',
    'نيسان': 'Nissan',         'nissan': 'Nissan',
    'هوندا': 'Honda',          'honda': 'Honda',
    'شيفروليه': 'Chevrolet',   'chevrolet': 'Chevrolet',
    'أوبل': 'Opel',            'opel': 'Opel',    'اوبل': 'Opel',
    'رينو': 'Renault',         'renault': 'Renault',
    'بيجو': 'Peugeot',         'peugeot': 'Peugeot',
    'ميتسوبيشي': 'Mitsubishi', 'mitsubishi': 'Mitsubishi',
    'فيات': 'Fiat',            'fiat': 'Fiat',
    'مرسيدس': 'Mercedes',      'mercedes': 'Mercedes',
    'بي ام دبليو': 'BMW',      'bmw': 'BMW',
    'فولكس': 'Volkswagen',     'volkswagen': 'Volkswagen',
    'إم جي': 'MG',             'mg': 'MG',
    'سيات': 'Seat',            'seat': 'Seat',
    'جيلي': 'Geely',           'geely': 'Geely',
    'سوزوكي': 'Suzuki',        'suzuki': 'Suzuki',
    'لادا': 'Lada',            'lada': 'Lada',
  };
  const sortedMakeKeys = Object.keys(makeMap).sort((a, b) => b.length - a.length);
  for (const key of sortedMakeKeys) {
    if (lower.includes(key.toLowerCase())) { info.make = makeMap[key]; break; }
  }

  const models = [
    'lancer puma','lancer shark','accent hci','grand cerato',
    'sunny n16','sunny n17',
    'corolla','camry','yaris','hilux','fortuner','rav4','prado',
    'elantra','tucson','accent','sonata','i10','i20','i30','creta','matrix','verna',
    'sportage','cerato','picanto','rio',
    'sunny','sentra','qashqai','navara',
    'civic','accord','crv','hrv',
    'cruze','optra','aveo','lanos','captiva',
    'astra','insignia','vectra',
    'logan','duster','megane','fluence','captur','clio','sandero','stepway','kadjar',
    '206','207','301','308','408','508','2008','3008','5008',
    'lancer','pajero','outlander','eclipse',
    'mg5','mg6','mg hs','mg zs','mg rx5',
    'golf','polo','passat','tiguan',
    'ibiza','leon','toledo',
    'كورولا','كامري','ياريس',
    'النترا','توسان','أكسنت','ماتريكس','فيرنا',
    'سبورتاج','سيراتو','جراند سيراتو',
    'كروز','أوبترا','أفيو','لانوس','أسترا','إنسيجنيا',
    'لوجان','داستر','ميجان','فلونس','كابتشر','كليو','كادجار','سانديرو','ستيبواي',
    'لانسر بوما','لانسر شارك','لانسر','بوما',
    'إيبيزا','ليون','توليدو',
    'صني n16','صني n17','صني','سنترا','قشقاي',
  ];
  const sortedModels = [...models].sort((a, b) => b.length - a.length);
  for (const m of sortedModels) {
    if (lower.includes(m.toLowerCase())) { info.model = m; break; }
  }

  return info;
}

async function searchOilSpecs(make: string, model: string, year: string, transmission: string): Promise<string | null> {
  if (!process.env.TAVILY_API_KEY) return null;
  const isAuto = transmission === 'automatic';
  const query = isAuto
    ? `${year} ${make} ${model} engine oil viscosity grade AND automatic transmission fluid type ATF specification owner manual`
    : `${year} ${make} ${model} engine oil viscosity grade AND manual gearbox oil GL-4 GL-5 75W-90 specification`;
  try {
    const res = await fetch(TAVILY_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.TAVILY_API_KEY}` },
      body: JSON.stringify({ query, search_depth: 'basic', max_results: 5, include_answer: true }),
    });
    if (!res.ok) { console.error('[Tavily Error]', await res.text()); return null; }
    const data    = await res.json();
    const answer  = data.answer || '';
    const results = (data.results || []).slice(0, 4).map((r: any) => r.content).join('\n\n');
    return `${answer}\n\n${results}`.trim() || null;
  } catch (err) { console.error('[Tavily Fetch Error]', err); return null; }
}

async function searchOilProducts(carMake?: string): Promise<any[] | null> {
  const select = 'id, name, brand, car_make, car_model, car_model_year, regular_price, sale_price, slug, image_url';
  const oilOr = [
    'name.ilike.%5w-30%','name.ilike.%5w30%','name.ilike.%5W-30%','name.ilike.%5W30%',
    'name.ilike.%5w-40%','name.ilike.%5w40%','name.ilike.%5W-40%','name.ilike.%5W40%',
    'name.ilike.%10w-40%','name.ilike.%10w40%','name.ilike.%10W-40%','name.ilike.%10W40%',
    'name.ilike.%0w-20%','name.ilike.%0w20%','name.ilike.%0W-20%','name.ilike.%0W20%',
    'name.ilike.%5w-20%','name.ilike.%5w20%','name.ilike.%5W-20%','name.ilike.%5W20%',
    'name.ilike.%15w-40%','name.ilike.%15w40%','name.ilike.%15W-40%','name.ilike.%15W40%',
    'name.ilike.%0w-40%','name.ilike.%0w40%','name.ilike.%0W-40%','name.ilike.%0W40%',
    'name.ilike.%10w-30%','name.ilike.%10w30%','name.ilike.%10W-30%','name.ilike.%10W30%',
    'name.ilike.%ATF%','name.ilike.%Dexron%','name.ilike.%dexron%',
    'name.ilike.%SP-III%','name.ilike.%SPIII%','name.ilike.%sp3%',
    'name.ilike.%SP-IV%','name.ilike.%SPIV%','name.ilike.%sp4%',
    'name.ilike.%Diamond ATF%','name.ilike.%Dia Queen%',
    'name.ilike.%75w-90%','name.ilike.%75w90%','name.ilike.%75W-90%','name.ilike.%75W90%',
    'name.ilike.%80w-90%','name.ilike.%80w90%','name.ilike.%80W-90%','name.ilike.%80W90%',
    'name.ilike.%GL-4%','name.ilike.%GL4%','name.ilike.%GL-5%','name.ilike.%GL5%',
    'name.ilike.%castrol%','name.ilike.%total%','name.ilike.%mobil%','name.ilike.%shell%',
    'name.ilike.%valvoline%','name.ilike.%gulf%','name.ilike.%mannol%','name.ilike.%motul%',
    'name.ilike.%liqui moly%','name.ilike.%comma%',
    'name.ilike.%engine oil%','name.ilike.%motor oil%',
    'name.ilike.%زيت محرك%','name.ilike.%زيت فتيس%',
  ].join(',');
  const applyExclusions = (q: any) => q
    .not('name', 'ilike', '%فلتر%').not('name', 'ilike', '%filter%')
    .not('name', 'ilike', '%حشو%').not('name', 'ilike', '%oring%').not('name', 'ilike', '%o-ring%');
  if (carMake) {
    const { data } = await applyExclusions(supabase.from('products').select(select).ilike('car_make', `%${carMake}%`).or(oilOr)).limit(6);
    if (data?.length) return data;
  }
  const { data } = await applyExclusions(supabase.from('products').select(select).or(oilOr)).limit(6);
  return data?.length ? data : null;
}

// CAR MAPS
const CAR_MAKE_MAP: Record<string, string> = {
  'تويوتا': 'Toyota',        'toyota': 'Toyota',
  'هيونداي': 'Hyundai',      'hyundai': 'Hyundai',
  'كيا': 'Kia',              'kia': 'Kia',
  'أوبل': 'Opel',            'opel': 'Opel',    'اوبل': 'Opel',
  'شيفروليه': 'Chevrolet',   'chevrolet': 'Chevrolet',
  'نيسان': 'Nissan',         'nissan': 'Nissan',
  'هوندا': 'Honda',          'honda': 'Honda',
  'بيجو': 'Peugeot',         'peugeot': 'Peugeot',
  'رينو': 'Renault',         'renault': 'Renault',
  'فيات': 'Fiat',            'fiat': 'Fiat',
  'ميتسوبيشي': 'Mitsubishi', 'mitsubishi': 'Mitsubishi',
  'سوزوكي': 'Suzuki',        'suzuki': 'Suzuki',
  'فولكس': 'Volkswagen',     'volkswagen': 'Volkswagen',
  'بي ام دبليو': 'BMW',      'bmw': 'BMW',
  'مرسيدس': 'Mercedes',      'mercedes': 'Mercedes',
  'لادا': 'Lada',            'lada': 'Lada',
  'جيلي': 'Geely',           'geely': 'Geely',
  'إم جي': 'MG',             'mg': 'MG',
  'سيات': 'Seat',            'seat': 'Seat',
};

const MODEL_TO_MAKE: Record<string, string> = {
  'corolla': 'Toyota',       'camry': 'Toyota',        'yaris': 'Toyota',
  'hilux': 'Toyota',         'fortuner': 'Toyota',      'prado': 'Toyota',
  'elantra': 'Hyundai',      'tucson': 'Hyundai',       'accent hci': 'Hyundai',
  'accent': 'Hyundai',       'sonata': 'Hyundai',       'i10': 'Hyundai',
  'i20': 'Hyundai',          'i30': 'Hyundai',          'creta': 'Hyundai',
  'matrix': 'Hyundai',       'verna': 'Hyundai',
  'ماتريكس': 'Hyundai',      'فيرنا': 'Hyundai',        'توسان': 'Hyundai', 'أكسنت': 'Hyundai',
  'sportage': 'Kia',         'cerato': 'Kia',           'picanto': 'Kia',
  'rio': 'Kia',              'grand cerato': 'Kia',
  'سبورتاج': 'Kia',          'جراند سيراتو': 'Kia',     'سيراتو': 'Kia',
  'mg5': 'MG', 'mg 5': 'MG', 'mg6': 'MG', 'mg 6': 'MG', 'mg hs': 'MG', 'mg rx5': 'MG', 'mg zs': 'MG',
  'إم جي 5': 'MG', 'إم جي 6': 'MG',
  'lancer puma': 'Mitsubishi', 'lancer shark': 'Mitsubishi', 'lancer': 'Mitsubishi',
  'لانسر بوما': 'Mitsubishi',  'لانسر شارك': 'Mitsubishi',   'لانسر': 'Mitsubishi',
  'pajero': 'Mitsubishi',    'بوما': 'Mitsubishi',       'puma': 'Mitsubishi',
  'بومة': 'Mitsubishi',      'outlander': 'Mitsubishi',  'eclipse': 'Mitsubishi', 'إيكليبس': 'Mitsubishi',
  'cruze': 'Chevrolet',      'captiva': 'Chevrolet',     'optra': 'Chevrolet',
  'aveo': 'Chevrolet',       'spark': 'Chevrolet',       'lanos': 'Chevrolet',
  'كروز': 'Chevrolet',       'أفيو': 'Chevrolet',        'لانوس': 'Chevrolet', 'أوبترا': 'Chevrolet',
  'astra': 'Opel',   'vectra': 'Opel',  'corsa': 'Opel', 'zafira': 'Opel', 'insignia': 'Opel',
  'أسترا': 'Opel',   'إنسيجنيا': 'Opel',
  'sunny n16': 'Nissan', 'sunny n17': 'Nissan', 'sunny': 'Nissan',
  'sentra': 'Nissan',    'qashqai': 'Nissan',   'navara': 'Nissan',
  'صني n16': 'Nissan',   'صني n17': 'Nissan',   'صني': 'Nissan', 'قشقاي': 'Nissan', 'سنترا': 'Nissan',
  'civic': 'Honda',  'accord': 'Honda', 'crv': 'Honda', 'hrv': 'Honda',
  '206': 'Peugeot',  '207': 'Peugeot', '301': 'Peugeot', '308': 'Peugeot',
  '408': 'Peugeot',  '508': 'Peugeot', '2008': 'Peugeot', '3008': 'Peugeot', '5008': 'Peugeot',
  'logan': 'Renault',   'duster': 'Renault',  'symbol': 'Renault', 'megane': 'Renault',
  'fluence': 'Renault', 'captur': 'Renault',  'clio': 'Renault',   'kadjar': 'Renault',
  'sandero': 'Renault', 'stepway': 'Renault',
  'لوجان': 'Renault',   'داستر': 'Renault',   'ميجان': 'Renault',  'فلونس': 'Renault',
  'كابتشر': 'Renault',  'كليو': 'Renault',    'كادجار': 'Renault', 'سانديرو': 'Renault', 'ستيبواي': 'Renault',
  'ibiza': 'Seat', 'leon': 'Seat', 'toledo': 'Seat',
  'إيبيزا': 'Seat', 'ليون': 'Seat', 'توليدو': 'Seat',
  'golf': 'Volkswagen', 'polo': 'Volkswagen', 'passat': 'Volkswagen',
};

const MODEL_EN_MAP: Record<string, string> = {
  'أفيو': 'aveo',         'كروز': 'cruze',           'لانوس': 'lanos',
  'أوبترا': 'optra',      'أكسنت': 'accent',          'توسان': 'tucson',
  'ماتريكس': 'matrix',    'فيرنا': 'verna',            'النترا': 'elantra',
  'سبورتاج': 'sportage',  'سيراتو': 'cerato',         'جراند سيراتو': 'grand cerato',
  'لانسر': 'lancer',      'لانسر بوما': 'lancer puma', 'لانسر شارك': 'lancer shark',
  'بوما': 'puma',         'بومة': 'puma',              'إيكليبس': 'eclipse',
  'صني n16': 'sunny n16', 'صني n17': 'sunny n17',      'صني': 'sunny',
  'قشقاي': 'qashqai',     'سنترا': 'sentra',
  'أسترا': 'astra',       'إنسيجنيا': 'insignia',
  'لوجان': 'logan',       'داستر': 'duster',          'ميجان': 'megane',
  'فلونس': 'fluence',     'كابتشر': 'captur',         'كليو': 'clio',
  'كادجار': 'kadjar',     'سانديرو': 'sandero',       'ستيبواي': 'stepway',
  'إيبيزا': 'ibiza',      'ليون': 'leon',              'توليدو': 'toledo',
  'كورولا': 'corolla',    'كامري': 'camry',            'ياريس': 'yaris',
};

const PART_KEYWORD_MAP: Record<string, string[]> = {
  'فلتر زيت':  ['oil filter', 'فلتر زيت'],
  'فلتر هواء': ['air filter', 'فلتر هواء'],
  'فلتر':      ['filter', 'فلتر'],
  'زيت محرك':  ['engine oil', 'motor oil', 'زيت'],
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
  'lancer puma','lancer shark','accent hci','grand cerato','sunny n16','sunny n17',
  'صني n16','صني n17','لانسر بوما','لانسر شارك','جراند سيراتو',
  'mg hs','mg rx5','mg zs','mg 5','mg 6','mg5','mg6',
  'إم جي hs','إم جي rx5','إم جي zs','إم جي 5','إم جي 6',
  'land cruiser','cr-v',
  'corolla','camry','yaris','hilux','fortuner','rav4','prado',
  'elantra','tucson','accent','sonata','i10','i20','i30','i40','creta','matrix','verna',
  'النترا','توسان','أكسنت','ماتريكس','فيرنا',
  'sportage','cerato','picanto','rio','sorento','سبورتاج','سيراتو',
  'lancer','pajero','outlander','eclipse','galant','puma',
  'لانسر','بوما','بومة','إيكليبس',
  'cruze','captiva','optra','aveo','lanos','spark','malibu',
  'كروز','أوبترا','أفيو','لانوس',
  'astra','vectra','mokka','corsa','zafira','insignia','أسترا','إنسيجنيا',
  'sunny','sentra','qashqai','navara','patrol','صني','قشقاي','سنترا',
  'civic','accord','crv','hrv',
  '206','207','301','308','408','508','2008','3008','5008',
  'logan','duster','symbol','megane','fluence','captur','clio','kadjar','sandero','stepway',
  'لوجان','داستر','ميجان','فلونس','كابتشر','كليو','كادجار','سانديرو','ستيبواي',
  'punto','bravo','tipo','swift','vitara','dzire',
  'golf','polo','passat','tiguan',
  '316','318','320','520','x1','x3','x5','c200','c180','e200','glc','emgrand',
  'ibiza','leon','toledo','إيبيزا','ليون','توليدو',
  'كورولا','كامري','ياريس',
];

const ORDER_INQUIRY_KEYWORDS = [
  'أوردر','اوردر','طلبي','طلب','حالة طلب','حالة الطلب',
  'وصل','وصلت','شحنة','شحنتي','تتبع','تتبع الطلب',
  'استلمت','استلام','هيوصل','امتى يوصل','order','delivery',
  'بيتجهز','جاهز','شحن طلب','فين طلبي','عايز أعرف طلبي',
];

// DB FUNCTIONS
async function searchProducts(
  carMake?: string, carModel?: string, carModelEn?: string,
  carYear?: string, partKeywords?: string[]
): Promise<any[] | null> {
  const select = 'id, name, brand, car_make, car_model, car_model_year, regular_price, sale_price, slug, image_url';
  if (carMake && carModelEn) {
    let q = supabase.from('products').select(select).ilike('car_make', `%${carMake}%`).ilike('car_model', `%${carModelEn}%`).limit(8);
    if (carYear)              q = q.ilike('car_model_year', `%${carYear}%`);
    if (partKeywords?.length) q = q.or(partKeywords.map(k => `name.ilike.%${k}%`).join(','));
    const { data } = await q;
    if (data?.length) return data;
  }
  if (carMake && carModel) {
    let q = supabase.from('products').select(select).ilike('car_make', `%${carMake}%`).ilike('car_model', `%${carModel}%`).limit(8);
    if (partKeywords?.length) q = q.or(partKeywords.map(k => `name.ilike.%${k}%`).join(','));
    const { data } = await q;
    if (data?.length) return data;
  }
  if (carMake && partKeywords?.length) {
    const { data } = await supabase.from('products').select(select).ilike('car_make', `%${carMake}%`).or(partKeywords.map(k => `name.ilike.%${k}%`).join(',')).limit(8);
    if (data?.length) return data;
  }
  if (carMake) {
    const { data } = await supabase.from('products').select(select).ilike('car_make', `%${carMake}%`).limit(8);
    if (data?.length) return data;
  }
  if (carModelEn) {
    const { data } = await supabase.from('products').select(select).ilike('car_model', `%${carModelEn}%`).limit(8);
    if (data?.length) return data;
  }
  if (partKeywords?.length) {
    for (const kw of partKeywords) {
      const { data } = await supabase.from('products').select(select).ilike('name', `%${kw}%`).limit(8);
      if (data?.length) return data;
    }
  }
  return null;
}

async function getOrderByPhone(phone: string) {
  const cleaned = phone.replace(/\D/g, '');
  let local = cleaned;
  if (cleaned.startsWith('20') && cleaned.length >= 12) local = `0${cleaned.slice(2)}`;
  else if (cleaned.startsWith('2') && cleaned.length === 11) local = `0${cleaned.slice(1)}`;
  const intl     = local.startsWith('0') ? `20${local.slice(1)}` : cleaned;
  const plusIntl = `+${intl}`;
  const last10   = local.slice(-10);
  const variants = [...new Set([local, intl, plusIntl, last10].filter(Boolean))];
  const orParts  = variants.flatMap(v => [`customer_phone.ilike.%${v}%`, `guest_phone.ilike.%${v}%`]);
  const { data, error } = await supabase
    .from('orders')
    .select('id, status, payment_status, total_price, items, created_at, tracking_number, city, payment_method, customer_name')
    .or(orParts.join(','))
    .order('created_at', { ascending: false })
    .limit(3);
  if (error || !data?.length) return null;
  return data;
}

async function getOrderById(orderId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('id, status, payment_status, total_price, items, created_at, tracking_number, city, payment_method, customer_name')
    .ilike('id', `%${orderId.trim()}%`)
    .limit(1).single();
  if (error || !data) return null;
  return data;
}

function translateStatus(status: string): string {
  const map: Record<string, string> = {
    pending: 'جديد — بيتجهز دلوقتي', pending_payment: 'في انتظار الدفع',
    processing: 'جاري التجهيز', shipped: 'اتشحن وفي الطريق إليك 🚚',
    delivered: 'اتسلّم بنجاح ✅', cancelled: 'ملغي', refunded: 'تم الاسترجاع',
  };
  return map[status] || status;
}

function translatePayment(method: string): string {
  const map: Record<string, string> = {
    cash: 'كاش عند الاستلام', vodafone_cash: 'فودافون كاش', instapay: 'InstaPay',
    bank_transfer: 'تحويل بنكي', card_installments: 'بطاقة / تقسيط', wallets: 'محفظة إلكترونية',
  };
  return map[method] || method;
}

// INTENT DETECTION
type IntentType = 'order_phone' | 'order_id' | 'order_inquiry' | 'product_search' | 'needs_year' | 'oil_needs_info' | 'oil_recommendation' | 'general';
interface Intent {
  type: IntentType;
  phone?: string;
  orderId?: string;
  carMake?: string;
  carModel?: string;
  carModelEn?: string;
  carYear?: string;
  partKeywords?: string[];
  oilInfo?: OilInfo;
}

function detectIntent(message: string, allMessages: any[]): Intent {
  const msg      = message.trim();
  const lowerMsg = msg.toLowerCase();

  // FIX: Strict Egyptian phone regex — 01[0125]XXXXXXXX only, word boundary
  const phoneMatch = msg.match(/\b(01[0125][0-9]{8})\b/);
  if (phoneMatch) return { type: 'order_phone', phone: phoneMatch[1] };

  // FIX: Order ID only triggers when user is clearly asking about an order
  const isAskingAboutOrder = ORDER_INQUIRY_KEYWORDS.some(k => lowerMsg.includes(k.toLowerCase()));
  const orderIdMatch = msg.match(/\b([0-9a-f]{8})\b/i);
  if (orderIdMatch && isAskingAboutOrder) return { type: 'order_id', orderId: orderIdMatch[1] };
  if (isAskingAboutOrder) return { type: 'order_inquiry' };

  // Oil flow
  const isOilInquiry = OIL_INQUIRY_KEYWORDS.some(k => lowerMsg.includes(k.toLowerCase()));
  const prevBotMessages = allMessages.filter(m => m.role === 'assistant').slice(-4);
  // FIX: Broader oil context detection
  const askingForOilInfo = prevBotMessages.some(m =>
    m.content && (
      m.content.includes('أوتوماتيك') || m.content.includes('ماركة') ||
      m.content.includes('سنة') || m.content.includes('زيت') ||
      m.content.includes('نلاقيلك') || m.content.includes('إصدار') ||
      m.content.includes('موديل') || m.content.includes('مانيوال')
    )
  );
  if (isOilInquiry || askingForOilInfo) {
    const oilInfo = extractOilInfoFromHistory([...allMessages, { role: 'user', content: msg }]);
    const hasAll  = oilInfo.make && oilInfo.model && oilInfo.year && oilInfo.transmission;
    if (hasAll) return { type: 'oil_recommendation', oilInfo };
    return { type: 'oil_needs_info', oilInfo };
  }

  // FIX: Product search — scan ALL recent messages for context, not just last message
  const recentText  = allMessages.slice(-8).map(m => m.content || '').join(' ');
  const lowerRecent = recentText.toLowerCase();

  const sortedModels = [...KNOWN_MODELS].sort((a, b) => b.length - a.length);
  const foundModel   = sortedModels.find(m => lowerRecent.includes(m.toLowerCase()));
  const foundModelEn = foundModel ? (MODEL_EN_MAP[foundModel] ?? MODEL_EN_MAP[foundModel.toLowerCase()] ?? foundModel) : undefined;

  const sortedMakeKeys = Object.keys(CAR_MAKE_MAP).sort((a, b) => b.length - a.length);
  const foundMakeKey   = sortedMakeKeys.find(k => lowerRecent.includes(k.toLowerCase()));
  let inferredMake     = foundMakeKey ? CAR_MAKE_MAP[foundMakeKey] : undefined;
  if (!inferredMake && foundModel) {
    inferredMake = MODEL_TO_MAKE[foundModel] ?? MODEL_TO_MAKE[foundModel.toLowerCase()];
  }

  // Part keywords — last message only (more relevant)
  const sortedPartKeys = Object.keys(PART_KEYWORD_MAP).sort((a, b) => b.length - a.length);
  const matchedKeywords: string[] = [];
  for (const k of sortedPartKeys) {
    if (lowerMsg.includes(k.toLowerCase())) matchedKeywords.push(...PART_KEYWORD_MAP[k]);
  }
  const uniqueKeywords = [...new Set(matchedKeywords)];

  // FIX: Year — check recent messages too
  const yearMatch = recentText.match(/\b(20[0-9]{2}|19[0-9]{2})\b/);
  const carYear   = yearMatch ? yearMatch[0] : undefined;

  if (inferredMake || foundModel || uniqueKeywords.length > 0) {
    if (!carYear) {
      return { type: 'needs_year', carMake: inferredMake, carModel: foundModel, carModelEn: foundModelEn !== foundModel ? foundModelEn : foundModel, partKeywords: uniqueKeywords.length > 0 ? uniqueKeywords : undefined };
    }
    return { type: 'product_search', carMake: inferredMake, carModel: foundModel, carModelEn: foundModelEn !== foundModel ? foundModelEn : foundModel, carYear, partKeywords: uniqueKeywords.length > 0 ? uniqueKeywords : undefined };
  }

  return { type: 'general' };
}

// BUILD CONTEXT
function buildContext(intent: Intent, dbResult: any, oilSearchResult?: string | null): string {
  if (intent.type === 'order_phone' || intent.type === 'order_id') {
    if (!dbResult) return '';
    const orders = Array.isArray(dbResult) ? dbResult : [dbResult];
    const orderDetails = orders.map((o: any) => `
رقم الأوردر: #${o.id.slice(0, 8).toUpperCase()}
اسم العميل: ${o.customer_name || 'غير مسجل'}
الحالة: ${translateStatus(o.status)}
حالة الدفع: ${o.payment_status === 'paid' ? 'تم الدفع ✅' : o.payment_status === 'pending' ? 'في انتظار الدفع' : 'غير محدد'}
الإجمالي: ${o.total_price} ج.م
المدينة: ${o.city || 'غير محددة'}
طريقة الدفع: ${translatePayment(o.payment_method)}
تاريخ الطلب: ${new Date(o.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
رقم التتبع: ${o.tracking_number || 'لم يُضاف لحد دلوقتي'}
عدد المنتجات: ${o.items?.length || 0}
المنتجات: ${o.items?.map((i: any) => i.name || i.product_name || i.title || 'منتج').join(' — ') || 'غير متاح'}
`).join('\n---\n');
    return `دي بيانات الأوردر — اعرضها بأسلوب طبيعي ومرتب:\n${orderDetails}`;
  }

  if (intent.type === 'product_search' && dbResult) {
    const products = Array.isArray(dbResult) ? dbResult : [dbResult];
    if (!products.length) return '';
    return `لاقيت ${products.length} منتج مناسب. اكتب جملة ترحيب قصيرة طبيعية زي "تمام، لاقيتلك ${products.length} منتج مناسب 😊" — الكاردز بتتعرض تلقائياً. بعدين قول للعميل إنه لو عايز يشوف أكتر يدخل الصفحة الرئيسية ويختار ماركة وموديل عربيته.`;
  }

  if (intent.type === 'oil_recommendation' && intent.oilInfo) {
    const { make, model, year, transmission } = intent.oilInfo;
    const isAuto = transmission === 'automatic';
    const searchContext = oilSearchResult
      ? `\n\nنتائج البحث من الإنترنت:\n${oilSearchResult.slice(0, 2000)}`
      : '\n\n[استخدم المعلومات التقنية في رسالة النظام]';
    return `العميل عنده: ${make} ${model} سنة ${year}، فتيس ${isAuto ? 'أوتوماتيك' : 'مانيوال'}.

قدّم رد واحد واضح بالعامية المصرية:

زيت المحرك:
- درجة اللزوجة / نوع الزيت / الكمية / فترة التغيير

زيت الفتيس (${isAuto ? 'أوتوماتيك' : 'مانيوال'}):
- نوع الزيت بالظبط / الكمية

تعليمات: اعتمد على المعلومات التقنية في رسالة النظام. ممنوع "ابحث في المتجر". بعد التوصية قول: "وده بعض الزيوت المتاحة عندنا 👇" ثم: "أي استفسار: ${WHATSAPP_LINK} 😊"
${searchContext}`;
  }

  return '';
}

// MAIN HANDLER
export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    if (!messages?.length) return NextResponse.json({ error: 'No messages' }, { status: 400 });

    const lastMessage = messages[messages.length - 1]?.content || '';
    const intent      = detectIntent(lastMessage, messages);

    let dbResult: any                  = null;
    let oilSearchResult: string | null = null;

    if (intent.type === 'order_phone' && intent.phone) {
      dbResult = await getOrderByPhone(intent.phone);
    } else if (intent.type === 'order_id' && intent.orderId) {
      dbResult = await getOrderById(intent.orderId);
    } else if (intent.type === 'product_search') {
      dbResult = await searchProducts(intent.carMake, intent.carModel, intent.carModelEn, intent.carYear, intent.partKeywords);
    } else if (intent.type === 'oil_recommendation' && intent.oilInfo) {
      const { make, model, year, transmission } = intent.oilInfo;
      if (make && model && year && transmission) {
        const [oilSearch, oilProducts] = await Promise.all([
          searchOilSpecs(make, model, year, transmission),
          searchOilProducts(make),
        ]);
        oilSearchResult = oilSearch;
        dbResult        = oilProducts;
      }
    }

    console.log('[CHAT] intent:', intent.type, '| DB:', dbResult ? 'found' : 'null', '| oil:', oilSearchResult ? 'yes' : 'no');

    const contextStr = buildContext(intent, dbResult, oilSearchResult);

    const oilInfo      = intent.oilInfo || {};
    const missingLines: string[] = [];
    if (!oilInfo.make)         missingLines.push('1️⃣ ماركة العربية؟ (مثلاً: تويوتا، هيونداي، نيسان، رينو...)');
    if (!oilInfo.model)        missingLines.push('2️⃣ الموديل؟ (مثلاً: كورولا، أكسنت، سبورتاج، لوجان...)');
    if (!oilInfo.year)         missingLines.push('3️⃣ سنة الإصدار؟ (مثلاً: 2018)');
    if (!oilInfo.transmission) missingLines.push('4️⃣ الفتيس أوتوماتيك ولا مانيوال؟');

    const noResultsNote =
      (intent.type === 'oil_needs_info')
        ? `\n\n[تعليمات]: اسأل العميل عن المعلومات الناقصة في رسالة واحدة:\n"يلا نلاقيلك الزيت الصح! 💪 محتاج منك:\n${missingLines.join('\n')}"\n— لا تعرض منتجات دلوقتي.`
      : (intent.type === 'needs_year')
        ? `\n\n[تعليمات]: اسأله ببساطة: "عربيتك إصدار إيه؟ 😊" — جملة واحدة فقط.`
      : (intent.type === 'product_search' && !dbResult)
        ? `\n\n[تعليمات]: مفيش منتجات. قول: "للأسف مش متاح دلوقتي. تواصل معنا: ${WHATSAPP_LINK}" واقترح القناة: ${WHATSAPP_CHANNEL}`
      : (intent.type === 'order_inquiry')
        ? `\n\n[تعليمات]: قول: "ممكن تديني رقم تليفونك أو رقم الأوردر؟ 😊"`
      : ((intent.type === 'order_phone' || intent.type === 'order_id') && !dbResult)
        ? `\n\n[تعليمات]: قول: "مش لاقي أوردر. تأكد من الرقم أو تواصل معنا: ${WHATSAPP_LINK}"`
      : '';

    const systemContent = SYSTEM_PROMPT + noResultsNote + (contextStr ? `\n\n════ بيانات ════\n${contextStr}\n════ نهاية ════` : '');

    const groqMessages = [
      { role: 'system', content: systemContent },
      ...messages.slice(-20).map((m: any) => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content as string })),
    ];

    const groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model:       'llama-3.3-70b-versatile',
        messages:    groqMessages,
        max_tokens:  900,
        temperature: 0.4,
      }),
    });

    if (!groqResponse.ok) {
      console.error('[Groq Error]', await groqResponse.text());
      return NextResponse.json({ error: 'Groq API error' }, { status: 500 });
    }

    const data  = await groqResponse.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || 'معلش، في مشكلة صغيرة. جرب تاني بعد شوية 😊';

    const products = (
      (intent.type === 'product_search' || intent.type === 'oil_recommendation') &&
      Array.isArray(dbResult) && dbResult.length > 0
    )
      ? dbResult.map((p: any) => ({
          id: p.id, name: p.name?.trim(), brand: p.brand || null,
          car_make: p.car_make || null, car_model: p.car_model || null,
          car_model_year: p.car_model_year || null,
          regular_price: p.regular_price || 0, sale_price: p.sale_price || 0,
          slug: p.slug, image_url: p.image_url || null,
          link: `https://zaitandfilters.com/products/${p.slug}`,
        }))
      : null;

    return NextResponse.json({ reply, products });

  } catch (err: any) {
    console.error('[Chat API Error]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}