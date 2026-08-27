import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// ── Arabic → English car model names (DB stores English) ────────────────────
const CAR_MODEL_MAP: Record<string, string> = {
  'بوما': 'LANCER PUMA', 'شارك': 'LANCER SHARK',
  'لانسر': 'LANCER', 'لانسير': 'LANCER', 'لنسر': 'LANCER',
  'كورولا': 'COROLLA', 'كورلا': 'COROLLA',
  'اوبترا': 'OPTRA', 'اوبتيرا': 'OPTRA',
  'كروز': 'CRUZE', 'كروزي': 'CRUZE',
  'النترا': 'ELANTRA', 'إلانترا': 'ELANTRA', 'انترا': 'ELANTRA',
  'سبورتاج': 'SPORTAGE', 'سبورتج': 'SPORTAGE',
  'صني': 'SUNNY', 'سني': 'SUNNY',
  'سنترا': 'SENTRA', 'سنتيرا': 'SENTRA',
  'فيرنا': 'VERNA', 'فرنا': 'VERNA',
  'بيكانتو': 'PICANTO', 'بيكنتو': 'PICANTO',
  'ريو': 'RIO',
  'اكسنت': 'ACCENT', 'أكسنت': 'ACCENT',
  'توسان': 'TUCSON', 'توسن': 'TUCSON', 'طوسان': 'TUCSON',
  'افيو': 'AVEO', 'أفيو': 'AVEO',
  'لانوس': 'LANOS', 'لانس': 'LANOS',
  'سيراتو': 'CERATO', 'سراتو': 'CERATO',
  'قاشقاي': 'QASHQAI', 'قشقاي': 'QASHQAI',
  'تيدا': 'TIIDA',
  'ياريس': 'YARIS', 'يارس': 'YARIS',
  'كامري': 'CAMRY',
  'كابتيفا': 'CAPTIVA', 'كابتفا': 'CAPTIVA',
  'داستر': 'DUSTER', 'دستر': 'DUSTER',
  'ميجان': 'MEGANE', 'ميجين': 'MEGANE',
  'لوجان': 'LOGAN',
  'كليو': 'CLIO',
  'سانديرو': 'SANDERO',
  'اوكتافيا': 'OCTAVIA',
  'جولف': 'GOLF',
  'باسات': 'PASSAT',
  'جيتا': 'JETTA',
  'استرا': 'ASTRA',
  'mg5': 'MG5', 'ام جي 5': 'MG5',
  'mg6': 'MG6', 'ام جي 6': 'MG6',
  'كابتشر': 'CAPTUR', 'كادجار': 'KADJAR',
  'فلوانس': 'FLUENCE',
};

// ── Arabic → English car make ─────────────────────────────────────────────────
const CAR_MAKE_MAP: Record<string, string> = {
  'تويوتا': 'TOYOTA', 'تويوتة': 'TOYOTA',
  'هيونداي': 'HYUNDAI', 'هيونده': 'HYUNDAI',
  'كيا': 'KIA',
  'نيسان': 'NISSAN',
  'شيفروليه': 'CHEVROLET', 'شيفروله': 'CHEVROLET',
  'ميتسوبيشي': 'MITSUBISHI', 'ميتسوبيش': 'MITSUBISHI',
  'بيجو': 'PEUGEOT', 'بيجيو': 'PEUGEOT',
  'رينو': 'RENAULT', 'رينول': 'RENAULT',
  'سكودا': 'SKODA', 'سكوده': 'SKODA',
  'فولكس': 'VOLKSWAGEN', 'فولكس فاجن': 'VOLKSWAGEN',
  'اوبل': 'OPEL', 'أوبل': 'OPEL',
  'ام جي': 'MG', 'mg': 'MG',
  'مازدا': 'MAZDA',
  'هوندا': 'HONDA',
  'سوزوكي': 'SUZUKI',
  'فورد': 'FORD',
};

// ── Product keyword detection ─────────────────────────────────────────────────
const PRODUCT_RE = /قطعة|قطع|منتج|سعر|بكام|كتالوج|عندكم|هل في|هل عندكم|ايه|إيه|فين|بدور|محتاج|عايز|فلتر|زيت|زيوت|فرامل|تيل|تيال|بريك|طنابير|ماستر|عفشة|مساعدين|مساعد|شداد|بلية|بلي|مقصات|كبالن|بطاحة|كاوتش|بوجيه|بواجي|شمع|موبينة|سلوك|سير|كاتينة|تنشين|تبريد|ردياتير|طلمبة|ثرموستات|كولانت|تكييف|سربنتينة|دورة بنزين|انجكتور|حساس|سنسور|دبرياج|كلتش|جوانات|اويل سيل|بستم|عمرة|اطار|مساحة/;

const CAT_MAP: Array<[RegExp, string]> = [
  [/فلتر زيت/,           'فلاتر'],
  [/فلتر هواء/,          'فلاتر'],
  [/فلتر تكييف|فلتر كابينة/, 'فلاتر'],
  [/فلتر بنزين/,         'فلاتر'],
  [/فلتر|فلاتر/,         'فلاتر'],
  [/زيت موتور|زيوت موتور/, 'زيوت موتور'],
  [/زيت فتيس|زيت دبرياج|زيت باور/, 'زيوت فتيس'],
  [/زيت/,                'زيوت'],
  [/تيل|تيال|فرامل|برامل|بريك|طنابير|ماستر/, 'الفرامل'],
  [/مساعدين|مساعد|شداد/, 'عفشة'],
  [/بلية عجل|بلية/,      'عفشة'],
  [/مقصات/,              'عفشة'],
  [/كبالن/,              'عفشة'],
  [/بطاحة/,              'عفشة'],
  [/عفشة|تعليق/,         'عفشة'],
  [/بوجيه|بواجي|شمع/,    'بوجيهات'],
  [/موبينة|كويل/,        'بوجيهات'],
  [/سلوك بوجيهات/,       'بوجيهات'],
  [/سير توقيت|سير مجموعة|سير دينامو/, 'سيور'],
  [/كاتينة|كاتنة/,       'سيور'],
  [/بلي سيور|تنشين/,     'سيور'],
  [/سيور|سير/,           'سيور'],
  [/ردياتير/,            'دورة تبريد'],
  [/طلمبة مياه|طلمبة الماء/, 'دورة تبريد'],
  [/ثرموستات/,           'دورة تبريد'],
  [/كولانت/,             'دورة تبريد'],
  [/تكييف|سربنتينة/,     'دورة تبريد'],
  [/تبريد/,              'دورة تبريد'],
  [/طلمبة بنزين/,        'دورة البنزين'],
  [/انجكتور/,            'دورة البنزين'],
  [/حساس|سنسور/,         'حساسات'],
  [/دبرياج|كلتش/,        'دبرياج'],
  [/جوانات|اويل سيل/,    'جوانات'],
  [/بستم|عمرة موتور/,    'مستلزمات عمرة'],
  [/اطار|كاوتش سيارة/,   'إطارات'],
  [/مساحة/,              'مساحات'],
];

// ── Translate Arabic car name to English ─────────────────────────────────────
function translateCar(msg: string): { model: string | null; make: string | null } {
  const m = msg.toLowerCase();
  let model: string | null = null;
  let make: string | null = null;

  for (const [ar, en] of Object.entries(CAR_MODEL_MAP)) {
    if (m.includes(ar)) { model = en; break; }
  }
  for (const [ar, en] of Object.entries(CAR_MAKE_MAP)) {
    if (m.includes(ar)) { make = en; break; }
  }
  return { model, make };
}

// ── Fetch relevant products from Supabase ─────────────────────────────────────
async function fetchContext(msg: string): Promise<string> {
  const m = msg.toLowerCase();

  const isProductQ = PRODUCT_RE.test(m) || Object.keys(CAR_MODEL_MAP).some(k => m.includes(k)) || Object.keys(CAR_MAKE_MAP).some(k => m.includes(k));
  if (!isProductQ) return '';

  const { model: carModelEN, make: carMakeEN } = translateCar(m);
  let catFilter: string | null = null;
  for (const [re, cat] of CAT_MAP) { if (re.test(m)) { catFilter = cat; break; } }

  const found = new Map<string, any>();

  const runQuery = async (filters: { model?: string; make?: string; cat?: string; nameTerm?: string }) => {
    let q = supabase
      .from('products')
      .select('id, name, regular_price, sale_price, car_make, car_model, car_model_year, category, subcategory, brand')
      .eq('is_active', true)
      .limit(8);

    if (filters.model) q = q.ilike('car_model', `%${filters.model}%`);
    if (filters.make)  q = q.ilike('car_make',  `%${filters.make}%`);
    if (filters.cat)   q = q.ilike('category',  `%${filters.cat}%`);
    if (filters.nameTerm) q = q.ilike('name',   `%${filters.nameTerm}%`);

    const { data } = await q;
    data?.forEach(p => found.set(p.id, p));
  };

  // Strategy 1: English car model + category
  if (carModelEN && catFilter)  await runQuery({ model: carModelEN, cat: catFilter });
  if (carModelEN && !catFilter) await runQuery({ model: carModelEN });
  if (!carModelEN && catFilter) await runQuery({ cat: catFilter });
  if (carMakeEN && catFilter)   await runQuery({ make: carMakeEN, cat: catFilter });

  // Strategy 2: name keyword search (Arabic terms from message)
  if (found.size < 3) {
    const stop = /^(في|على|من|عن|هل|ده|دي|كده|بقى|انا|عايز|محتاج|ممكن|لو|و|او|مع|بس|كمان|هنا|اوي|بسأل|بسئل|بدور|عايزين)$/;
    const terms = m.trim().split(/\s+/)
      .map(w => w.replace(/[،,؟?!.ل]/g, ''))
      .filter(w => w.length >= 3 && !stop.test(w));

    for (const term of terms.slice(0, 4)) {
      if (found.size >= 10) break;
      await runQuery({ nameTerm: term });
      // Also try with model filter
      if (carModelEN) await runQuery({ nameTerm: term, model: carModelEN });
    }
  }

  if (!found.size) return '';

  const lines = [...found.values()].slice(0, 10).map(p => {
    const price = Number(p.sale_price) > 0
      ? `${p.sale_price} ج.م (خصم من ${p.regular_price} ج.م)`
      : `${p.regular_price} ج.م`;
    const car = [p.car_make, p.car_model, p.car_model_year].filter(Boolean).join(' ') || 'جميع السيارات';
    return `• ${p.name} | ${p.brand} | ${p.category}${p.subcategory ? ' / ' + p.subcategory : ''} | السيارة: ${car} | السعر: ${price}`;
  });

  return `منتجات موجودة في المتجر (${lines.length} نتيجة):\n${lines.join('\n')}`;
}

// ── System prompt ──────────────────────────────────────────────────────────────
function buildSystem(ctx: string) {
  return `أنت شوكت، المساعد الذكي لمتجر "زيت أند فلترز" لقطع غيار السيارات في مصر.

معلومات المتجر:
- المقر والمخازن: التجمع الخامس، القاهرة
- التوصيل: 2-5 أيام عمل | إكسبريس 48 ساعة لجميع المحافظات بـ 150 ج.م
- الدفع: InstaPay / محافظ إلكترونية / بطاقات ائتمانية وتقسيط
- الضمان: ضمان استبدال، المدة مكتوبة في تفاصيل كل قطعة
- الاسترجاع: 14 يوم بشرط أن تكون القطعة في حالتها الأصلية
- كل القطع أصلية من الوكيل الرسمي — لا يوجد كوبي أو هاي كوبي
- لا يوجد استلام شخصي — الطلب من الموقع أو التطبيق فقط
- خدمة العملاء: تابع معنا عبر الموقع

${ctx ? `بيانات من قاعدة بيانات المتجر:\n${ctx}` : ''}

تعليمات:
1. رد بالعربية المصرية البسيطة (2-3 جمل)
2. لو في بيانات منتجات، اذكر الاسم والسعر بدقة
3. لو ما جاتكش بيانات (مش موجود في السياق أعلاه)، قول إن البيانات مش متاحة دلوقتي واقترح التواصل مع خدمة العملاء
4. لا تقول "مش موجود في المتجر" لو مجرد ما جاتكش بيانات — الفرق مهم
5. لا تتكلم عن منافسين`;
}

// ── Route ──────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { message, history = [] } = await req.json();
    if (!message?.trim()) return NextResponse.json({ error: 'empty' }, { status: 400 });

    const key = process.env.GROQ_API_KEY;
    if (!key || key === 'your_groq_api_key_here') {
      return NextResponse.json({ reply: 'الـ Groq API key مش محطوط في بيئة الإنتاج.' });
    }

    const ctx    = await fetchContext(message);
    const system = buildSystem(ctx);

    const groq = new Groq({ apiKey: key });
    const res  = await groq.chat.completions.create({
      model   : 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: system },
        ...history.slice(-6).map((m: any) => ({
          role   : m.from === 'user' ? 'user' : 'assistant',
          content: m.text,
        })),
        { role: 'user', content: message },
      ],
      temperature: 0.4,
      max_tokens : 500,
    });

    const reply = res.choices[0]?.message?.content?.trim()
      || 'معنديش إجابة دلوقتي، تواصل مع خدمة العملاء.';
    return NextResponse.json({ reply });

  } catch (err: any) {
    console.error('[chat]', err?.message);
    return NextResponse.json({ reply: 'حصل خطأ مؤقت. جرب تاني أو تواصل مع خدمة العملاء.' });
  }
}
