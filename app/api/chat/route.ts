import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// ── All product-related keywords (broad) ─────────────────────────────────────
const PRODUCT_KEYWORDS = /قطعة|قطع|منتج|سعر|بكام|كتالوج|عندكم|هل في|هل عندكم|ايه|إيه|فين|بدور على|محتاج|عايز|فلتر|زيت|زيوت|فرامل|تيل|تيال|بريك|طنابير|ماستر|ماستر فرامل|ماستر عجل|عفشة|مساعدين|مساعد|شداد|بلية|بلي|مقصات|كبالن|بطاحة|كاوتش|بوجيه|بواجي|شمع|موبينة|سلوك|سير|كاتينة|بلي سيور|تنشين|تبريد|ردياتير|طلمبة مياه|ثرموستات|كولانت|تكييف|سربنتينة|دورة بنزين|طلمبة بنزين|انجكتور|حساس|سنسور|دبرياج|كلتش|جوانات|اويل سيل|بستم|عمرة موتور|اطار|كاوتش|مساحة|زجاج/;

const CAR_KEYWORDS = /سيارة|عربية|كورولا|اوبترا|كروز|لانسر|بوما|شارك|نيسان|هيونداي|كيا|تويوتا|شيفروليه|ميتسوبيشي|رينو|بيجو|سكودا|فولكس|فيرنا|سنترا|صني|النترا|سبورتاج|افيو|لانوس|سيراتو|اكسنت|توسان|قاشقاي|تيدا|ياريس|كامري|داستر|ميجان|لوجان|كليو|ليون|ايبيزا|اوكتافيا|جولف|باسات|جيتا/;

// ── Category + subcategory keyword map ──────────────────────────────────────
// Maps Arabic keywords to partial category names for ilike search
const CAT_KEYWORDS: Array<[RegExp, string]> = [
  [/فلتر زيت|فلتر الزيت/,          'فلاتر'],
  [/فلتر هواء/,                      'فلاتر'],
  [/فلتر تكييف|فلتر كابينة/,         'فلاتر'],
  [/فلتر بنزين/,                     'فلاتر'],
  [/فلتر|فلاتر/,                     'فلاتر'],
  [/زيت موتور|زيوت موتور/,           'زيوت موتور'],
  [/زيت فتيس|زيت دبرياج|زيت باور/,  'زيوت فتيس'],
  [/زيت/,                            'زيوت'],
  [/تيل فرامل|تيل امامي|تيل خلفي|تيال|فرامل|برامل|بريك/,  'الفرامل'],
  [/طنابير/,                         'الفرامل'],
  [/ماستر فرامل|ماستر عجل|ماستر/,   'الفرامل'],
  [/مساعدين|مساعد|شداد/,             'عفشة'],
  [/بلية عجل|بلية/,                  'عفشة'],
  [/مقصات|مقص/,                      'عفشة'],
  [/كبالن|كوبلن/,                    'عفشة'],
  [/بطاحة|بوش/,                      'عفشة'],
  [/عفشة|تعليق/,                     'عفشة'],
  [/بوجيه|بواجي|شمع/,                'بوجيهات'],
  [/موبينة|كويل/,                    'بوجيهات'],
  [/سلوك بوجيهات/,                   'بوجيهات'],
  [/سير توقيت|سير مجموعة|سير دينامو/,'سيور'],
  [/كاتينة|كاتنة/,                   'سيور'],
  [/سيور|سير|بلي سيور/,              'سيور'],
  [/ردياتير/,                        'دورة تبريد'],
  [/طلمبة مياه|طلمبة الماء/,         'دورة تبريد'],
  [/ثرموستات/,                       'دورة تبريد'],
  [/كولانت|مياه جهاز/,               'دورة تبريد'],
  [/تكييف|سربنتينة/,                 'دورة تبريد'],
  [/تبريد/,                          'دورة تبريد'],
  [/طلمبة بنزين|طلمبة وقود/,         'دورة البنزين'],
  [/انجكتور/,                        'دورة البنزين'],
  [/حساس|سنسور/,                     'حساسات'],
  [/دبرياج|كلتش/,                    'دبرياج'],
  [/جوانات|اويل سيل/,                'جوانات'],
  [/بستم|عمرة موتور/,                'مستلزمات عمرة'],
  [/اطار|كاوتش/,                     'إطارات'],
  [/مساحة/,                          'مساحات'],
];

// ── Extract multiple search terms from the message ───────────────────────────
function extractSearchTerms(msg: string): string[] {
  // Remove common filler words, keep meaningful terms
  const stopWords = /^(في|على|من|عن|هل|في|ده|دي|كده|بقى|انا|احنا|عايز|محتاج|ممكن|لو|و|او|مع|بس|كمان|هنا|جداً|جدا|اوي)$/;
  return msg.trim()
    .split(/\s+/)
    .map(w => w.replace(/[،,؟?!.]/g, ''))
    .filter(w => w.length >= 3 && !stopWords.test(w))
    .slice(0, 5);
}

// ── Fetch relevant products ───────────────────────────────────────────────────
async function fetchContext(msg: string): Promise<string> {
  const m = msg.toLowerCase();
  const results: string[] = [];

  // Determine if this is a product query
  const isProductQuery = PRODUCT_KEYWORDS.test(m) || CAR_KEYWORDS.test(m);
  if (!isProductQuery) return '';

  // Detect car model
  const carMatch = m.match(/(كورولا|اوبترا|كروز|لانسر|بوما|شارك|النترا|سبورتاج|صني|سنترا|فيرنا|بيكانتو|ريو|اكسنت|توسان|افيو|لانوس|سيراتو|قاشقاي|تيدا|ياريس|كامري|داستر|ميجان|لوجان|كليو|اوكتافيا|جولف|باسات)/);
  const carModel = carMatch?.[1] ?? null;

  // Detect category
  let catFilter: string | null = null;
  for (const [pattern, cat] of CAT_KEYWORDS) {
    if (pattern.test(m)) { catFilter = cat; break; }
  }

  // ── Strategy 1: category + car model ──────────────────────────────────────
  if (catFilter || carModel) {
    let q = supabase
      .from('products')
      .select('name, regular_price, sale_price, car_make, car_model, car_model_year, category, subcategory, brand')
      .eq('is_active', true)
      .limit(10);

    if (carModel) q = q.ilike('car_model', `%${carModel}%`);
    if (catFilter) q = q.ilike('category', `%${catFilter}%`);

    const { data } = await q;
    if (data?.length) {
      results.push(...data.map(formatProduct));
    }
  }

  // ── Strategy 2: keyword search on product name if results < 3 ─────────────
  if (results.length < 3) {
    const terms = extractSearchTerms(msg);
    for (const term of terms.slice(0, 3)) {
      const { data } = await supabase
        .from('products')
        .select('name, regular_price, sale_price, car_make, car_model, car_model_year, category, subcategory, brand')
        .eq('is_active', true)
        .ilike('name', `%${term}%`)
        .limit(6);
      if (data?.length) {
        data.forEach(p => {
          const line = formatProduct(p);
          if (!results.includes(line)) results.push(line);
        });
      }
      if (results.length >= 8) break;
    }
  }

  // ── Strategy 3: subcategory search ────────────────────────────────────────
  if (results.length < 2 && catFilter) {
    const { data } = await supabase
      .from('products')
      .select('name, regular_price, sale_price, car_make, car_model, car_model_year, category, subcategory, brand')
      .eq('is_active', true)
      .ilike('subcategory', `%${catFilter}%`)
      .limit(6);
    if (data?.length) {
      data.forEach(p => {
        const line = formatProduct(p);
        if (!results.includes(line)) results.push(line);
      });
    }
  }

  if (!results.length) return '';
  return `منتجات متاحة في المتجر (${results.length} نتيجة):\n${results.slice(0, 10).join('\n')}`;
}

function formatProduct(p: any): string {
  const price = Number(p.sale_price) > 0
    ? `${p.sale_price} ج.م (خصم من ${p.regular_price} ج.م)`
    : `${p.regular_price} ج.م`;
  const car = [p.car_make, p.car_model, p.car_model_year].filter(Boolean).join(' ') || 'جميع السيارات';
  const sub = p.subcategory ? ` | ${p.subcategory}` : '';
  return `• ${p.name} | ماركة: ${p.brand} | ${p.category}${sub} | للسيارة: ${car} | السعر: ${price}`;
}

// ── System prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt(dbContext: string): string {
  return `أنت شوكت، المساعد الذكي لمتجر "زيت أند فلترز" لقطع غيار السيارات في مصر.

معلومات المتجر:
- المقر والمخازن: التجمع الخامس، القاهرة
- التوصيل: 2-5 أيام عمل في جميع المحافظات | إكسبريس 48 ساعة داخل القاهرة والجيزة (150 ج.م)
- الدفع: InstaPay / محافظ إلكترونية / بطاقات ائتمانية وتقسيط
- الضمان: ضمان استبدال على جميع القطع، مدة الضمان في تفاصيل كل قطعة
- الاسترجاع: 14 يوم من تاريخ الاستلام — القطعة تكون في حالتها الأصلية مع تغليفها
- جميع القطع أصلية من الوكيل الرسمي — لا يوجد كوبي أو هاي كوبي
- لا يوجد استلام شخصي — الطلب من الموقع أو التطبيق فقط
- التتبع: من حسابك على الموقع في صفحة الطلبات
- خدمة العملاء: واتساب على 01206777292

${dbContext
  ? `بيانات من قاعدة بيانات المتجر:\n${dbContext}`
  : 'ملاحظة: لم يتم جلب منتجات محددة لهذا السؤال — رد بناءً على معلومات المتجر العامة.'}

تعليمات:
1. رد بالعربية المصرية البسيطة والمختصرة (2-4 جمل)
2. لو في منتجات في البيانات، اذكر الاسم والسعر بدقة
3. لو المنتج مش في البيانات المرفقة، قول "مش لاقيه في قاعدة بياناتي دلوقتي" واقترح الواتساب
4. لا تقول "مش موجود" لو مش عندك بيانات — الفرق إن مش جاتك بيانات مش إن المنتج مش موجود
5. لا تتكلم عن مواقع أو متاجر منافسة`;
}

// ── Route ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { message, history = [] } = await req.json();
    if (!message?.trim()) return NextResponse.json({ error: 'empty' }, { status: 400 });

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey || groqKey === 'your_groq_api_key_here') {
      return NextResponse.json({ reply: 'الـ Groq API key مش محطوط. حطه في .env.local كـ GROQ_API_KEY' });
    }

    const dbCtx  = await fetchContext(message);
    const system = buildSystemPrompt(dbCtx);

    const groq = new Groq({ apiKey: groqKey });
    const completion = await groq.chat.completions.create({
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

    const reply = completion.choices[0]?.message?.content?.trim()
      || 'معنديش إجابة دلوقتي، تواصل معانا على الواتساب.';
    return NextResponse.json({ reply });

  } catch (err: any) {
    console.error('[chat]', err?.message);
    return NextResponse.json({ reply: 'حصل خطأ مؤقت. جرب تاني أو تواصل معانا على الواتساب.' });
  }
}
