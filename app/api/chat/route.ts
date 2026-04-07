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

const SYSTEM_PROMPT = `أنت "شوكت" — المساعد الذكي لمتجر زيت اند فلترز، متجر مصري متخصص في زيوت المحركات وقطع غيار السيارات.

━━━━━━━━━━━━━━━━━━━━━━
معلومات المتجر:
━━━━━━━━━━━━━━━━━━━━━━
- الموقع: zaitandfilters.com
- التوصيل: لكل محافظات مصر خلال 2 إلى 5 أيام عمل
- الشحن السريع: خلال 48 ساعة داخل القاهرة والجيزة فقط
- طرق الدفع: InstaPay، المحافظ الإلكترونية، شركات التقسيط، بطاقات الائتمان
- الكاش باك: كل طلب بيكسب كاش باك في المحفظة
- الضمان: 6 شهور على جميع المنتجات
- واتساب: ${WHATSAPP_LINK}
- قناة العروض على واتساب: ${WHATSAPP_CHANNEL}

━━━━━━━━━━━━━━━━━━━━━━
أسلوبك في الكلام — مهم جداً:
━━━━━━━━━━━━━━━━━━━━━━
- بتتكلم بالعامية المصرية الصح دايماً
- ردودك قصيرة، واضحة، وطبيعية
- بتستخدم كلمات زي: "تمام"، "ماشي"، "حلو"، "يلا"، "عندك"، "خليني أشوفلك"، "إيه اللي محتاجه"

كلمات وجمل ممنوع تستخدمها أبداً:
- ❌ "بنا" → الصح: "إحنا"
- ❌ "أيام شغل" → الصح: "أيام عمل"
- ❌ "نساعدناك" → الصح: "نساعدك"
- ❌ أي جملة مكسورة أو مش مفهومة
- ❌ ترجمة حرفية من الإنجليزية للعربية

━━━━━━━━━━━━━━━━━━━━━━
أمثلة على ردود صح — احفظها واتعلم منها:
━━━━━━━━━━━━━━━━━━━━━━

مثال 1 — لما حد يسأل عن التوصيل:
"إحنا بنوصّل لكل محافظات مصر خلال 2 إلى 5 أيام عمل، ولو كنت في القاهرة أو الجيزة، بنوصّلك خلال 48 ساعة بس 😊"

مثال 2 — لما حد يسأل عن طرق الدفع:
"عندنا أكتر من طريقة دفع: InstaPay، المحافظ الإلكترونية زي فودافون كاش ووي باي، بطاقات الائتمان، أو عن طريق شركات التقسيط. تحب تدفع بإيه؟"

مثال 3 — لما حد يسأل عن الزيت المناسب لعربيته:
"يلا نلاقيلك الزيت الصح! 💪 محتاج منك معلومات بسيطة:
1️⃣ ماركة العربية؟ (مثلاً: تويوتا، هيونداي، كيا...)
2️⃣ الموديل؟ (مثلاً: كورولا، أكسنت، سبورتاج...)
3️⃣ سنة الإصدار؟
4️⃣ الفتيس أوتوماتيك ولا مانيوال؟"

مثال 4 — بعد عرض المنتجات:
"لو عايز تشوف أكتر، ادخل الصفحة الرئيسية واختار ماركة وموديل عربيتك وهتلاقي كل المنتجات المناسبة، وتقدر تفلتر حسب نوع المنتج اللي محتاجه 👍"

مثال 5 — لما حد يسأل عن أوردر من غير رقم:
"ممكن تديني رقم تليفونك أو رقم الأوردر عشان أجيبلك التفاصيل؟ 😊"

مثال 6 — لما مفيش أوردر:
"مش لاقي أوردر بالبيانات دي. تأكد من الرقم، أو تواصل معنا على واتساب وهنساعدك على طول: ${WHATSAPP_LINK}"

مثال 7 — لما مفيش منتج:
"للأسف المنتج ده مش متاح عندنا دلوقتي. تواصل معنا على واتساب وهنحاول نساعدك: ${WHATSAPP_LINK}"

مثال 8 — إنهاء المحادثة:
"أي حاجة تانية أساعدك فيها؟ 😊 وبالمناسبة، انضم لقناة الواتساب بتاعتنا عشان تعرف أول بأول بأحدث العروض والمنتجات الجديدة: ${WHATSAPP_CHANNEL}"

مثال 9 — لما حد يسأل عن الضمان:
"كل المنتجات عندنا ليها ضمان 6 شهور 👍"

مثال 10 — بعد الحصول على كل المعلومات وعرض توصية الزيت:
"ده الزيت المناسب لعربيتك حسب مواصفات الشركة المصنّعة. لو عايز تطلب، ابحث عنه عندنا في المتجر أو تواصل معنا على واتساب: ${WHATSAPP_LINK} 😊"

━━━━━━━━━━━━━━━━━━━━━━
قواعد المنتجات والأوردرات:
━━━━━━━━━━━━━━━━━━━━━━
- قبل ما تدور على منتجات، اسأل عن سنة الموديل الأول
- لو في منتجات من الداتابيز: اكتب جملة ترحيب قصيرة بس — الكاردز بتتعرض تلقائياً
- لو في بيانات أوردر: اعرضها بشكل واضح ومرتب
- متخترعش أي بيانات من عندك خالص

━━━━━━━━━━━━━━━━━━━━━━
قواعد توصية الزيت:
━━━━━━━━━━━━━━━━━━━━━━
- لازم تجمع: الماركة، الموديل، السنة، ونوع الفتيس (أوتوماتيك / مانيوال) قبل ما تدي أي توصية
- لو في بيانات بحث من الإنترنت هتتديلك في رسالة النظام، استخدمها عشان إجابتك تبقى دقيقة ومبنية على مصادر موثوقة
- لو مفيش بيانات بحث، استخدم معرفتك عن مواصفات الشركات المصنّعة
- قدّم التوصية بشكل واضح لزيت المحرك وزيت الفتيس معاً: درجة اللزوجة، نوع الزيت، وكمية التغيير المقترحة
- بعد التوصية، قول للعميل إنه يقدر يلاقي الزيت ده عندنا في المتجر

━━━━━━━━━━━━━━━━━━━━━━
⚠️ معلومات تقنية مهمة — احفظها واستخدمها:
━━━━━━━━━━━━━━━━━━━━━━
زيت الفتيس الأوتوماتيك — حسب الماركة:
- ميتسوبيشي لانسر بوما / شارك (4G92 / 4G93): Diamond SP-III أو Dia Queen ATF SP-III — مش Dexron III العادي
- ميتسوبيشي لانسر مانيوال: GL-4 75W-90
- تويوتا (معظم موديلات): Toyota T-IV أو WS (حسب السنة)
- هيونداي / كيا (6-speed auto): SP-IV أو Diamond ATF SP-IV
- نيسان (Jatco CVT): Nissan NS-2 أو NS-3 CVT Fluid — ممنوع تماماً Dexron
- رينو / بيجو (CVT): Renault CVT Fluid أو EZL 799
- شيفروليه كروز أوتوماتيك: Dexron VI
- هوندا أوتوماتيك: Honda ATF DW-1 أو Z1 — مش Dexron
- فولكس واجن / سيات (DSG): VW G052182 أو G052529

زيت المحرك — قواعد عامة:
- عربيات قبل 2010: في الغالب 10W-40 نصف تركيبي أو معدني
- عربيات 2010 وبعدها: في الغالب 5W-30 أو 5W-40 تركيبي بالكامل
- عربيات هجين (Hybrid): 0W-20 تركيبي بالكامل`;


// ═══════════════════════════════════════════════
// OIL RECOMMENDATION
// ═══════════════════════════════════════════════

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
    'تويوتا': 'Toyota',      'toyota': 'Toyota',
    'هيونداي': 'Hyundai',    'hyundai': 'Hyundai',
    'كيا': 'Kia',            'kia': 'Kia',
    'نيسان': 'Nissan',       'nissan': 'Nissan',
    'هوندا': 'Honda',        'honda': 'Honda',
    'شيفروليه': 'Chevrolet', 'chevrolet': 'Chevrolet',
    'أوبل': 'Opel',          'opel': 'Opel',
    'رينو': 'Renault',       'renault': 'Renault',
    'بيجو': 'Peugeot',       'peugeot': 'Peugeot',
    'ميتسوبيشي': 'Mitsubishi','mitsubishi': 'Mitsubishi',
    'فيات': 'Fiat',          'fiat': 'Fiat',
    'مرسيدس': 'Mercedes',    'mercedes': 'Mercedes',
    'بي ام دبليو': 'BMW',    'bmw': 'BMW',
    'فولكس': 'Volkswagen',   'volkswagen': 'Volkswagen',
    'إم جي': 'MG',           'mg': 'MG',
    'سيات': 'Seat',          'seat': 'Seat',
    'جيلي': 'Geely',         'geely': 'Geely',
    'سوزوكي': 'Suzuki',      'suzuki': 'Suzuki',
    'لادا': 'Lada',          'lada': 'Lada',
  };
  for (const [key, val] of Object.entries(makeMap)) {
    if (lower.includes(key.toLowerCase())) { info.make = val; break; }
  }

  const models = [
    'corolla','camry','yaris','hilux','fortuner','rav4','prado',
    'elantra','tucson','accent','sonata','i10','i20','i30','creta','matrix','verna',
    'sportage','cerato','grand cerato','picanto','rio',
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
    'لانسر','لانسر بوما','لانسر شارك','بوما',
  ];
  const sortedModels = [...models].sort((a, b) => b.length - a.length);
  for (const m of sortedModels) {
    if (lower.includes(m.toLowerCase())) { info.model = m; break; }
  }

  return info;
}

// ✅ FIX 1: Tavily query now includes both engine oil AND transmission fluid
async function searchOilSpecs(make: string, model: string, year: string, transmission: string): Promise<string | null> {
  if (!process.env.TAVILY_API_KEY) return null;
  const isAuto = transmission === 'automatic';
  const query = isAuto
    ? `${year} ${make} ${model} engine oil viscosity grade AND automatic transmission fluid type ATF specification owner manual`
    : `${year} ${make} ${model} engine oil viscosity grade AND manual gearbox oil GL-4 GL-5 75W-90 specification`;
  try {
    const res = await fetch(TAVILY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.TAVILY_API_KEY}`,
      },
      body: JSON.stringify({ query, search_depth: 'basic', max_results: 5, include_answer: true }),
    });
    if (!res.ok) { console.error('[Tavily Error]', await res.text()); return null; }
    const data    = await res.json();
    const answer  = data.answer || '';
    const results = (data.results || []).slice(0, 4).map((r: any) => r.content).join('\n\n');
    return `${answer}\n\n${results}`.trim() || null;
  } catch (err) {
    console.error('[Tavily Fetch Error]', err);
    return null;
  }
}

// ✅ FIX 2: searchOilProducts now uses viscosity keywords and actively EXCLUDES filters
async function searchOilProducts(carMake?: string): Promise<any[] | null> {
  const select = 'id, name, brand, car_make, car_model, car_model_year, regular_price, sale_price, slug, image_url';

  // Real oil bottle keywords — viscosity grades + oil type names
  const oilOr = [
    'name.ilike.%5W-30%',
    'name.ilike.%5W-40%',
    'name.ilike.%10W-40%',
    'name.ilike.%0W-20%',
    'name.ilike.%5W-20%',
    'name.ilike.%15W-40%',
    'name.ilike.%0W-40%',
    'name.ilike.%10W-30%',
    'name.ilike.%ATF%',
    'name.ilike.%Dexron%',
    'name.ilike.%SP-III%',
    'name.ilike.%SP-IV%',
    'name.ilike.%Diamond ATF%',
    'name.ilike.%Dia Queen%',
    'name.ilike.%75W-90%',
    'name.ilike.%80W-90%',
    'name.ilike.%GL-4%',
    'name.ilike.%GL-5%',
    'name.ilike.%engine oil%',
    'name.ilike.%motor oil%',
    'name.ilike.%زيت محرك%',
    'name.ilike.%زيت فتيس%',
  ].join(',');

  // ── Try car-specific first ──
  if (carMake) {
    const { data } = await supabase
      .from('products')
      .select(select)
      .ilike('car_make', `%${carMake}%`)
      .or(oilOr)
      .not('name', 'ilike', '%فلتر%')
      .not('name', 'ilike', '%filter%')
      .not('name', 'ilike', '%حشو%')
      .not('name', 'ilike', '%oring%')
      .not('name', 'ilike', '%o-ring%')
      .limit(6);
    if (data?.length) return data;
  }

  // ── Fall back: universal oil products (no make restriction) ──
  const { data } = await supabase
    .from('products')
    .select(select)
    .or(oilOr)
    .not('name', 'ilike', '%فلتر%')
    .not('name', 'ilike', '%filter%')
    .not('name', 'ilike', '%حشو%')
    .not('name', 'ilike', '%oring%')
    .not('name', 'ilike', '%o-ring%')
    .limit(6);
  return data?.length ? data : null;
}


// ═══════════════════════════════════════════════
// CAR DATA & MAPS
// ═══════════════════════════════════════════════

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
  'تويوتا': 'Toyota',      'هيونداي': 'Hyundai',
  'كيا': 'Kia',            'أوبل': 'Opel',
  'شيفروليه': 'Chevrolet', 'نيسان': 'Nissan',
  'هوندا': 'Honda',        'بيجو': 'Peugeot',
  'رينو': 'Renault',       'فيات': 'Fiat',
  'ميتسوبيشي': 'Mitsubishi','سوزوكي': 'Suzuki',
  'فولكس': 'Volkswagen',   'بي ام دبليو': 'BMW',
  'مرسيدس': 'Mercedes',    'لادا': 'Lada',
  'جيلي': 'Geely',         'إم جي': 'MG',
  'سيات': 'Seat',
  'toyota': 'Toyota',      'hyundai': 'Hyundai',
  'kia': 'Kia',            'opel': 'Opel',
  'chevrolet': 'Chevrolet','nissan': 'Nissan',
  'honda': 'Honda',        'peugeot': 'Peugeot',
  'renault': 'Renault',    'fiat': 'Fiat',
  'mitsubishi': 'Mitsubishi','suzuki': 'Suzuki',
  'volkswagen': 'Volkswagen','bmw': 'BMW',
  'mercedes': 'Mercedes',  'lada': 'Lada',
  'geely': 'Geely',        'mg': 'MG',
  'seat': 'Seat',
};

const MODEL_TO_MAKE: Record<string, string> = {
  'corolla': 'Toyota',  'camry': 'Toyota',       'yaris': 'Toyota',
  'hilux': 'Toyota',    'fortuner': 'Toyota',     'prado': 'Toyota',
  'elantra': 'Hyundai', 'tucson': 'Hyundai',      'accent': 'Hyundai',
  'sonata': 'Hyundai',  'i10': 'Hyundai',          'i20': 'Hyundai',
  'i30': 'Hyundai',     'creta': 'Hyundai',        'matrix': 'Hyundai',
  'verna': 'Hyundai',   'accent hci': 'Hyundai',
  'ماتريكس': 'Hyundai', 'فيرنا': 'Hyundai',        'توسان': 'Hyundai',
  'أكسنت': 'Hyundai',
  'sportage': 'Kia',    'cerato': 'Kia',           'picanto': 'Kia',
  'rio': 'Kia',         'grand cerato': 'Kia',
  'سبورتاج': 'Kia',     'جراند سيراتو': 'Kia',     'سيراتو': 'Kia',
  'mg5': 'MG', 'mg 5': 'MG', 'mg6': 'MG', 'mg 6': 'MG',
  'mg hs': 'MG', 'mg rx5': 'MG', 'mg zs': 'MG',
  'إم جي 5': 'MG', 'إم جي 6': 'MG',
  'lancer': 'Mitsubishi', 'لانسر': 'Mitsubishi',
  'lancer puma': 'Mitsubishi', 'لانسر بوما': 'Mitsubishi',
  'lancer shark': 'Mitsubishi','لانسر شارك': 'Mitsubishi',
  'pajero': 'Mitsubishi', 'بوما': 'Mitsubishi', 'puma': 'Mitsubishi',
  'بومة': 'Mitsubishi', 'outlander': 'Mitsubishi',
  'eclipse': 'Mitsubishi', 'إيكليبس': 'Mitsubishi',
  'cruze': 'Chevrolet', 'captiva': 'Chevrolet', 'optra': 'Chevrolet',
  'aveo': 'Chevrolet', 'spark': 'Chevrolet', 'lanos': 'Chevrolet',
  'كروز': 'Chevrolet', 'أفيو': 'Chevrolet', 'لانوس': 'Chevrolet', 'أوبترا': 'Chevrolet',
  'astra': 'Opel', 'vectra': 'Opel', 'corsa': 'Opel',
  'zafira': 'Opel', 'insignia': 'Opel',
  'أسترا': 'Opel', 'إنسيجنيا': 'Opel',
  'sunny': 'Nissan', 'sentra': 'Nissan', 'qashqai': 'Nissan',
  'navara': 'Nissan', 'sunny n16': 'Nissan', 'sunny n17': 'Nissan',
  'صني': 'Nissan', 'قشقاي': 'Nissan', 'سنترا': 'Nissan',
  'civic': 'Honda', 'accord': 'Honda', 'crv': 'Honda', 'hrv': 'Honda',
  '206': 'Peugeot', '207': 'Peugeot', '301': 'Peugeot',
  '308': 'Peugeot', '408': 'Peugeot', '508': 'Peugeot',
  '2008': 'Peugeot', '3008': 'Peugeot', '5008': 'Peugeot',
  'logan': 'Renault', 'duster': 'Renault', 'symbol': 'Renault',
  'megane': 'Renault', 'fluence': 'Renault', 'captur': 'Renault',
  'clio': 'Renault', 'kadjar': 'Renault', 'sandero': 'Renault', 'stepway': 'Renault',
  'لوجان': 'Renault', 'داستر': 'Renault', 'ميجان': 'Renault',
  'فلونس': 'Renault', 'كابتشر': 'Renault', 'كليو': 'Renault',
  'كادجار': 'Renault', 'سانديرو': 'Renault', 'ستيبواي': 'Renault',
  'ibiza': 'Seat', 'leon': 'Seat', 'toledo': 'Seat',
  'إيبيزا': 'Seat', 'ليون': 'Seat', 'توليدو': 'Seat',
  'golf': 'Volkswagen', 'polo': 'Volkswagen', 'passat': 'Volkswagen',
};

const MODEL_EN_MAP: Record<string, string> = {
  'أفيو': 'aveo',     'كروز': 'cruze',    'لانوس': 'lanos',
  'أوبترا': 'optra',  'أكسنت': 'accent',  'توسان': 'tucson',
  'ماتريكس': 'matrix','فيرنا': 'verna',   'النترا': 'elantra',
  'سبورتاج': 'sportage','سيراتو': 'cerato',
  'جراند سيراتو': 'grand cerato',
  'لانسر': 'lancer', 'لانسر بوما': 'lancer puma',
  'لانسر شارك': 'lancer shark',
  'بوما': 'puma',    'بومة': 'puma',     'إيكليبس': 'eclipse',
  'قشقاي': 'qashqai','سنترا': 'sentra',  'صني': 'sunny',
  'صني n16': 'sunny n16','صني n17': 'sunny n17',
  'أسترا': 'astra',  'إنسيجنيا': 'insignia',
  'لوجان': 'logan',  'داستر': 'duster',  'ميجان': 'megane',
  'فلونس': 'fluence','كابتشر': 'captur', 'كليو': 'clio',
  'كادجار': 'kadjar','سانديرو': 'sandero','ستيبواي': 'stepway',
  'إيبيزا': 'ibiza', 'ليون': 'leon',     'توليدو': 'toledo',
  'كورولا': 'corolla','كامري': 'camry',  'ياريس': 'yaris',
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
  'corolla','camry','yaris','hilux','fortuner','rav4','land cruiser','prado',
  'كورولا','كامري','ياريس',
  'elantra','tucson','accent','accent hci','sonata','i10','i20','i30','i40','creta','matrix','verna',
  'النترا','توسان','أكسنت','ماتريكس','فيرنا',
  'sportage','cerato','grand cerato','picanto','rio','sorento',
  'سبورتاج','سيراتو','جراند سيراتو',
  'mg5','mg6','mg hs','mg rx5','mg zs','mg 5','mg 6',
  'إم جي 5','إم جي 6','إم جي hs','إم جي rx5','إم جي zs',
  'lancer','lancer puma','lancer shark','pajero','outlander','eclipse','galant','boma','puma',
  'لانسر','لانسر بوما','لانسر شارك','بوما','بومة','إيكليبس',
  'cruze','captiva','optra','aveo','lanos','spark','malibu',
  'كروز','أوبترا','أفيو','لانوس',
  'astra','vectra','mokka','corsa','zafira','insignia',
  'أسترا','إنسيجنيا',
  'sunny','sunny n16','sunny n17','sentra','qashqai','navara','patrol',
  'صني','صني n16','صني n17','قشقاي','سنترا',
  'civic','accord','crv','cr-v','hrv',
  '206','207','301','308','408','508','2008','3008','5008',
  'logan','duster','symbol','megane','fluence','captur','clio','kadjar','sandero','stepway',
  'لوجان','داستر','ميجان','فلونس','كابتشر','كليو','كادجار','سانديرو','ستيبواي',
  'punto','bravo','tipo','swift','vitara','dzire',
  'golf','polo','passat','tiguan',
  '316','318','320','520','x1','x3','x5',
  'c200','c180','e200','glc','emgrand',
  'ibiza','leon','toledo','إيبيزا','ليون','توليدو',
];

const ORDER_INQUIRY_KEYWORDS = [
  'أوردر','اوردر','طلبي','طلب','حالة طلب','حالة الطلب',
  'وصل','وصلت','شحنة','شحنتي','تتبع','تتبع الطلب',
  'استلمت','استلام','هيوصل','امتى يوصل','order','delivery',
  'بيتجهز','جاهز','شحن طلب','فين طلبي','عايز أعرف طلبي',
];


// ═══════════════════════════════════════════════
// DB FUNCTIONS
// ═══════════════════════════════════════════════

async function searchProducts(
  carMake?: string, carModel?: string, carModelEn?: string,
  carYear?: string, partKeywords?: string[]
): Promise<any[] | null> {
  const select = 'id, name, brand, car_make, car_model, car_model_year, regular_price, sale_price, slug, image_url';

  if (carMake && carModelEn) {
    let q = supabase.from('products').select(select)
      .ilike('car_make', `%${carMake}%`)
      .ilike('car_model', `%${carModelEn}%`)
      .limit(8);
    if (carYear) q = q.ilike('car_model_year', `%${carYear}%`);
    if (partKeywords?.length) q = q.or(partKeywords.map(k => `name.ilike.%${k}%`).join(','));
    const { data } = await q;
    if (data?.length) return data;
  }

  if (carMake && carModel) {
    let q = supabase.from('products').select(select)
      .ilike('car_make', `%${carMake}%`)
      .ilike('car_model', `%${carModel}%`)
      .limit(8);
    if (partKeywords?.length) q = q.or(partKeywords.map(k => `name.ilike.%${k}%`).join(','));
    const { data } = await q;
    if (data?.length) return data;
  }

  if (carMake && partKeywords?.length) {
    const { data } = await supabase.from('products').select(select)
      .ilike('car_make', `%${carMake}%`)
      .or(partKeywords.map(k => `name.ilike.%${k}%`).join(','))
      .limit(8);
    if (data?.length) return data;
  }

  if (carMake) {
    const { data } = await supabase.from('products').select(select)
      .ilike('car_make', `%${carMake}%`).limit(8);
    if (data?.length) return data;
  }

  if (carModelEn) {
    const { data } = await supabase.from('products').select(select)
      .ilike('car_model', `%${carModelEn}%`).limit(8);
    if (data?.length) return data;
  }

  if (partKeywords?.length) {
    for (const kw of partKeywords) {
      const { data } = await supabase.from('products').select(select)
        .ilike('name', `%${kw}%`).limit(8);
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
  const orParts  = variants.flatMap(v => [
    `customer_phone.ilike.%${v}%`,
    `guest_phone.ilike.%${v}%`,
  ]);
  const { data, error } = await supabase
    .from('orders')
    .select('id, status, total_price, items, created_at, tracking_number, city, payment_method')
    .or(orParts.join(','))
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
    .limit(1).single();
  if (error || !data) return null;
  return data;
}

function translateStatus(status: string): string {
  const map: Record<string, string> = {
    pending:         'جديد — بيتجهز دلوقتي',
    pending_payment: 'في انتظار الدفع',
    processing:      'جاري التجهيز',
    shipped:         'اتشحن وفي الطريق إليك 🚚',
    delivered:       'اتسلّم بنجاح ✅',
    cancelled:       'ملغي',
    refunded:        'تم الاسترجاع',
  };
  return map[status] || status;
}


// ═══════════════════════════════════════════════
// INTENT DETECTION
// ═══════════════════════════════════════════════

type IntentType =
  | 'order_phone' | 'order_id' | 'order_inquiry'
  | 'product_search' | 'needs_year'
  | 'oil_needs_info' | 'oil_recommendation'
  | 'general';

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

  const phoneMatch = msg.match(/(\+?20?1[0-9]{9}|01[0-9]{9})/);
  if (phoneMatch) return { type: 'order_phone', phone: phoneMatch[1] };

  const orderIdMatch = msg.match(/([0-9a-f]{8}-[0-9a-f]{4}|[A-Z0-9]{8})/i);
  if (orderIdMatch) return { type: 'order_id', orderId: orderIdMatch[1] };

  const isOrderInquiry = ORDER_INQUIRY_KEYWORDS.some(k => lowerMsg.includes(k.toLowerCase()));
  if (isOrderInquiry) return { type: 'order_inquiry' };

  // ── Oil recommendation flow ──────────────────
  const isOilInquiry = OIL_INQUIRY_KEYWORDS.some(k => lowerMsg.includes(k.toLowerCase()));

  const prevBotMessages = allMessages.filter(m => m.role === 'assistant').slice(-3);
  const askingForOilInfo = prevBotMessages.some(m =>
    m.content && (
      m.content.includes('الفتيس أوتوماتيك') ||
      m.content.includes('ماركة العربية') ||
      m.content.includes('سنة الإصدار') ||
      m.content.includes('نلاقيلك الزيت') ||
      m.content.includes('الزيت الصح') ||
      m.content.includes('زيت المناسب') ||
      m.content.includes('إصدار إيه') ||
      m.content.includes('أوتوماتيك ولا مانيوال')
    )
  );

  if (isOilInquiry || askingForOilInfo) {
    const oilInfo = extractOilInfoFromHistory([...allMessages, { role: 'user', content: msg }]);
    const hasAll  = oilInfo.make && oilInfo.model && oilInfo.year && oilInfo.transmission;
    if (hasAll) return { type: 'oil_recommendation', oilInfo };
    return { type: 'oil_needs_info', oilInfo };
  }

  // ── Product search flow ──────────────────────
  const sortedModels = [...KNOWN_MODELS].sort((a, b) => b.length - a.length);
  const foundModel   = sortedModels.find(m => lowerMsg.includes(m.toLowerCase()));
  const foundModelEn = foundModel
    ? (MODEL_EN_MAP[foundModel] ?? MODEL_EN_MAP[foundModel.toLowerCase()] ?? foundModel)
    : undefined;

  const sortedMakeKeys = Object.keys(CAR_MAKE_MAP).sort((a, b) => b.length - a.length);
  const foundMakeKey   = sortedMakeKeys.find(k => lowerMsg.includes(k.toLowerCase()));
  let inferredMake     = foundMakeKey ? CAR_MAKE_MAP[foundMakeKey] : undefined;
  if (!inferredMake && foundModel) {
    inferredMake = MODEL_TO_MAKE[foundModel] ?? MODEL_TO_MAKE[foundModel.toLowerCase()];
  }

  const sortedPartKeys  = Object.keys(PART_KEYWORD_MAP).sort((a, b) => b.length - a.length);
  const matchedKeywords: string[] = [];
  for (const k of sortedPartKeys) {
    if (lowerMsg.includes(k.toLowerCase())) matchedKeywords.push(...PART_KEYWORD_MAP[k]);
  }
  const uniqueKeywords = [...new Set(matchedKeywords)];
  const yearMatch = msg.match(/20[0-9]{2}|19[0-9]{2}/);
  const carYear   = yearMatch ? yearMatch[0] : undefined;

  if (inferredMake || foundModel || uniqueKeywords.length > 0) {
    if (!carYear) {
      return {
        type: 'needs_year', carMake: inferredMake,
        carModel: foundModel,
        carModelEn: foundModelEn !== foundModel ? foundModelEn : foundModel,
        partKeywords: uniqueKeywords.length > 0 ? uniqueKeywords : undefined,
      };
    }
    return {
      type: 'product_search', carMake: inferredMake,
      carModel: foundModel,
      carModelEn: foundModelEn !== foundModel ? foundModelEn : foundModel,
      carYear,
      partKeywords: uniqueKeywords.length > 0 ? uniqueKeywords : undefined,
    };
  }

  return { type: 'general' };
}


// ═══════════════════════════════════════════════
// BUILD CONTEXT
// ═══════════════════════════════════════════════

function buildContext(intent: Intent, dbResult: any, oilSearchResult?: string | null): string {
  if (intent.type === 'order_phone' || intent.type === 'order_id') {
    if (!dbResult) return '';
    const orders = Array.isArray(dbResult) ? dbResult : [dbResult];
    const orderDetails = orders.map((o: any) => `
رقم الأوردر: ${o.id.slice(0, 8).toUpperCase()}
الحالة: ${translateStatus(o.status)}
الإجمالي: ${o.total_price} ج.م
المدينة: ${o.city || 'غير محددة'}
طريقة الدفع: ${o.payment_method || 'غير محددة'}
تاريخ الطلب: ${new Date(o.created_at).toLocaleDateString('ar-EG')}
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

  // ✅ FIX 3: Oil context forces structured response covering BOTH engine + transmission oils
  if (intent.type === 'oil_recommendation' && intent.oilInfo) {
    const { make, model, year, transmission } = intent.oilInfo;
    const isAuto = transmission === 'automatic';
    const searchContext = oilSearchResult
      ? `\n\nنتائج البحث من الإنترنت (استخدمها كمرجع للتوصية):\n${oilSearchResult.slice(0, 2000)}`
      : '\n\n[ملاحظة: استخدم المعلومات التقنية الموجودة في رسالة النظام للإجابة بدقة]';

    return `العميل عنده: ${make} ${model} سنة ${year}، فتيس ${isAuto ? 'أوتوماتيك' : 'مانيوال'}.

قدّم ردك بالشكل ده بالظبط — رسالة واحدة منظمة وواضحة بالعامية المصرية:

**زيت المحرك:**
- درجة اللزوجة (مثلاً: 5W-30 أو 10W-40)
- نوع الزيت: معدني / نصف تركيبي / تركيبي بالكامل
- كمية التغيير المقترحة (مثلاً: 3.5 لتر)
- كل إمتى تغيّره (مثلاً: كل 5,000 كم أو 10,000 كم)

**زيت الفتيس (${isAuto ? 'أوتوماتيك' : 'مانيوال'}):**
- نوع الزيت بالظبط (${isAuto ? 'مثلاً: Diamond SP-III أو Dexron VI — مش بس Dexron' : 'مثلاً: GL-4 75W-90'})
- كمية التغيير المقترحة

⚠️ تعليمات مهمة:
- اعتمد على المعلومات التقنية في رسالة النظام لتحديد نوع زيت الفتيس الصح لكل ماركة
- لو مش متأكد من نوع ATF بالظبط، قول ذلك وانصحه يراجع دليل السيارة أو يتواصل معنا
- الكلام لازم يبقى بالعامية المصرية الصح
- بعد التوصية قول: "وده بعض الزيوت المتاحة عندنا 👇" ثم: "أي استفسار تاني تواصل معنا: ${WHATSAPP_LINK} 😊"
${searchContext}`;
  }

  return '';
}


// ═══════════════════════════════════════════════
// MAIN POST HANDLER
// ═══════════════════════════════════════════════

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
      dbResult = await searchProducts(
        intent.carMake, intent.carModel, intent.carModelEn,
        intent.carYear, intent.partKeywords
      );
    } else if (intent.type === 'oil_recommendation' && intent.oilInfo) {
      const { make, model, year, transmission } = intent.oilInfo;
      if (make && model && year && transmission) {
        const [oilSearch, oilProducts] = await Promise.all([
          searchOilSpecs(make, model, year, transmission),
          searchOilProducts(make),
        ]);
        oilSearchResult = oilSearch;
        dbResult        = oilProducts;
        console.log('[OIL SEARCH]',   oilSearchResult ? 'got results' : 'no results / no key');
        console.log('[OIL PRODUCTS]', dbResult ? `found ${dbResult.length}` : 'none');
      }
    }

    console.log('[CHAT] intent:', intent.type, '| DB:', dbResult ? 'found' : 'null', '| oil:', oilSearchResult ? 'found' : 'null');

    const contextStr = buildContext(intent, dbResult, oilSearchResult);

    const oilInfo = intent.oilInfo || {};
    const missingLines: string[] = [];
    if (!oilInfo.make)         missingLines.push('1️⃣ ماركة العربية؟ (مثلاً: تويوتا، هيونداي، نيسان، رينو...)');
    if (!oilInfo.model)        missingLines.push('2️⃣ الموديل؟ (مثلاً: كورولا، أكسنت، سبورتاج، لوجان...)');
    if (!oilInfo.year)         missingLines.push('3️⃣ سنة الإصدار؟ (مثلاً: 2018)');
    if (!oilInfo.transmission) missingLines.push('4️⃣ الفتيس أوتوماتيك ولا مانيوال؟');

    const noResultsNote =
      (intent.type === 'oil_needs_info')
        ? `\n\n[تعليمات]: اسأل العميل عن المعلومات الناقصة دي كلها في رسالة واحدة بالظبط كده:
"يلا نلاقيلك الزيت الصح! 💪 محتاج منك معلومات بسيطة:
${missingLines.join('\n')}"
— لا تعرض أي منتجات دلوقتي خالص.`
      : (intent.type === 'needs_year')
        ? `\n\n[تعليمات]: اسأله: "عربيتك إصدار إيه؟ يعني اشتريتها في سنة إيه تقريباً؟ 😊" — لا تعرض أي منتجات دلوقتي.`
      : (intent.type === 'product_search' && !dbResult)
        ? `\n\n[تعليمات]: مفيش منتجات. قول: "للأسف المنتج ده مش متاح عندنا دلوقتي. تواصل معنا على واتساب وهنحاول نساعدك: ${WHATSAPP_LINK}" ثم اقترح القناة: ${WHATSAPP_CHANNEL}`
      : (intent.type === 'order_inquiry')
        ? `\n\n[تعليمات]: قول: "ممكن تديني رقم تليفونك أو رقم الأوردر عشان أجيبلك التفاصيل؟ 😊"`
      : ((intent.type === 'order_phone' || intent.type === 'order_id') && !dbResult)
        ? `\n\n[تعليمات]: قول: "مش لاقي أوردر بالبيانات دي. تأكد من الرقم، أو تواصل معنا على واتساب: ${WHATSAPP_LINK}"`
      : '';

    const systemContent =
      SYSTEM_PROMPT +
      noResultsNote +
      (contextStr
        ? `\n\n════ بيانات ════\n${contextStr}\n════ نهاية ════`
        : '');

    const groqMessages = [
      { role: 'system', content: systemContent },
      ...messages.slice(-20).map((m: any) => ({
        role:    m.role    as 'user' | 'assistant' | 'system',
        content: m.content as string,
      })),
    ];

    const groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model:       'llama-3.3-70b-versatile',
        messages:    groqMessages,
        max_tokens:  700,
        temperature: 0.7,
      }),
    });

    if (!groqResponse.ok) {
      console.error('[Groq Error]', await groqResponse.text());
      return NextResponse.json({ error: 'Groq API error' }, { status: 500 });
    }

    const data  = await groqResponse.json();
    const reply = data.choices?.[0]?.message?.content || 'معلش، في مشكلة صغيرة. جرب تاني كمان شوية 😊';

    const products = (
      (intent.type === 'product_search' || intent.type === 'oil_recommendation') &&
      Array.isArray(dbResult) && dbResult.length > 0
    )
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