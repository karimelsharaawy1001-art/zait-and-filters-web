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

⛔ قواعد صارمة جداً — لازم تتبعها:
1. ❌ ممنوع منعاً باتاً تخترع أو تحدس أي منتج أو رابط من عندك.
2. ✅ البيانات الوحيدة اللي تستخدمها هي اللي بتيجي من الداتابيز في الرسالة دي.
3. لو الداتابيز ما رجعتش منتجات، قول بصراحة: "مش لاقي المنتج ده عندنا دلوقتي" وقترح واتساب.
4. لو الداتابيز رجعت منتجات، اعرضهم كلهم — كل منتج في سطور منفصلة بالاسم والسعر والرابط بالظبط.
5. ❌ ممنوع تعدل في الرابط أو تكتبه من عندك — انسخه بالظبط من البيانات.
6. ❌ ممنوع تضيف منتجات مش موجودة في البيانات.`;


// ── Car make normalization map ────────────────────────────────────────────────
const CAR_MAKE_MAP: Record<string, string> = {
  'تويوتا': 'Toyota',      'toyota': 'Toyota',
  'هيونداي': 'Hyundai',    'hyundai': 'Hyundai',
  'كيا': 'Kia',            'kia': 'Kia',
  'أوبل': 'Opel',          'opel': 'Opel',
  'شيفروليه': 'Chevrolet', 'chevrolet': 'Chevrolet',
  'نيسان': 'Nissan',       'nissan': 'Nissan',
  'هوندا': 'Honda',        'honda': 'Honda',
  'بيجو': 'Peugeot',       'peugeot': 'Peugeot',
  'رينو': 'Renault',       'renault': 'Renault',
  'فيات': 'Fiat',          'fiat': 'Fiat',
  'ميتسوبيشي': 'Mitsubishi','mitsubishi': 'Mitsubishi',
  'سوزوكي': 'Suzuki',      'suzuki': 'Suzuki',
  'فولكس': 'Volkswagen',   'volkswagen': 'Volkswagen',
  'bmw': 'BMW',            'بي ام دبليو': 'BMW',
  'مرسيدس': 'Mercedes',    'mercedes': 'Mercedes',
  'لادا': 'Lada',          'lada': 'Lada',
  'جيلي': 'Geely',         'geely': 'Geely',
};

// Arabic part keywords → English equivalents for DB search
const PART_KEYWORD_MAP: Record<string, string[]> = {
  'فلتر زيت':  ['oil filter', 'فلتر زيت'],
  'فلتر هواء': ['air filter', 'فلتر هواء'],
  'فلتر':      ['filter', 'فلتر'],
  'زيت محرك': ['engine oil', 'motor oil', 'زيت'],
  'زيت':       ['oil', 'زيت'],
  'فرامل':     ['brake', 'فرامل'],
  'تيل فرامل': ['brake fluid', 'brake oil', 'تيل فرامل', 'فرامل'],
  'تيل':       ['brake fluid', 'fluid', 'تيل'],
  'بلوف':      ['valve', 'بلوف'],
  'بواجي':     ['spark plug', 'بواجي'],
  'بطارية':    ['battery', 'بطارية'],
  'حزام':      ['belt', 'حزام'],
  'امبير':     ['alternator', 'امبير'],
  'كاوتش':     ['rubber', 'bushing', 'كاوتش'],
  'فلنشة':     ['gasket', 'فلنشة'],
};

// Common car models including Egyptian market variants
const KNOWN_MODELS: string[] = [
  'corolla', 'camry', 'yaris', 'hilux', 'fortuner', 'rav4', 'land cruiser', 'avalon', 'prado',
  'elantra', 'tucson', 'accent', 'sonata', 'i10', 'i20', 'i30', 'i40', 'creta', 'santa fe',
  'sportage', 'cerato', 'picanto', 'rio', 'sorento', 'stinger', 'carnival',
  'lancer', 'لانسر', 'outlander', 'eclipse', 'pajero', 'galant', 'boma', 'بوما',
  'cruze', 'captiva', 'optra', 'aveo', 'spark', 'malibu', 'equinox',
  'astra', 'vectra', 'mokka', 'insignia', 'corsa', 'zafira',
  'sunny', 'sentra', 'qashqai', 'navara', 'patrol', 'x-trail', 'juke',
  'civic', 'accord', 'crv', 'cr-v', 'hrv', 'hr-v', 'odyssey', 'fit',
  '308', '206', '207', '301', '408', '508', '2008', '3008',
  'logan', 'duster', 'symbol', 'megane', 'fluence', 'koleos',
  'punto', 'bravo', 'tipo', 'ducato', '500',
  'swift', 'vitara', 'dzire', 'baleno', 'grand vitara',
  'golf', 'polo', 'passat', 'tiguan', 'jetta',
  '3 series', '5 series', 'x1', 'x3', 'x5', '316', '318', '320', '520',
  'c class', 'c200', 'c180', 'e class', 'e200', 'a class', 'glc', 'gle',
  'emgrand', 'lada vesta', 'lada granta',
];


// ── Smart multi-field product search ─────────────────────────────────────────
async function searchProducts(
  carMake?: string,
  carModel?: string,
  carYear?: string,
  partKeywords?: string[]
): Promise<any[] | null> {

  const select = 'id, name, brand, car_make, car_model, car_model_year, regular_price, sale_price, slug';

  // ── DEBUG: Connection test ─────────────────────────────────────────────────
  const { data: testData, error: testError } = await supabase
    .from('products')
    .select('id, name, car_make, car_model')
    .limit(3);

  console.log('[DB TEST] error:', testError?.message || 'none');
  console.log('[DB TEST] sample rows:', JSON.stringify(testData));
  // ── This tells you: (1) if connection works, (2) real column names & values in your DB

  console.log('[SEARCH] Params → carMake:', carMake, '| carModel:', carModel, '| year:', carYear, '| keywords:', partKeywords);

  const orFilters: string[] = [];
  if (carMake)           orFilters.push(`car_make.ilike.%${carMake}%`, `name.ilike.%${carMake}%`);
  if (carModel)          orFilters.push(`car_model.ilike.%${carModel}%`, `name.ilike.%${carModel}%`);
  if (partKeywords?.length) {
    for (const kw of partKeywords) orFilters.push(`name.ilike.%${kw}%`);
  }

  if (!orFilters.length) {
    console.log('[SEARCH] No filters built — returning null');
    return null;
  }

  // ── Attempt 1: make + model + keyword ─────────────────────────────────────
  if (carMake && (carModel || partKeywords?.length)) {
    let q = supabase.from('products').select(select).limit(8);
    q = q.ilike('car_make', `%${carMake}%`);
    if (carModel) q = q.ilike('car_model', `%${carModel}%`);
    if (carYear)  q = q.ilike('car_model_year', `%${carYear}%`);
    if (partKeywords?.length) {
      const kwOr = partKeywords.map(k => `name.ilike.%${k}%`).join(',');
      q = q.or(kwOr);
    }
    const { data, error } = await q;
    console.log('[ATTEMPT 1] make+model+kw → error:', error?.message || 'none', '| count:', data?.length ?? 0);
    if (data?.length) return data;
  }

  // ── Attempt 2: make + keyword only ────────────────────────────────────────
  if (carMake && partKeywords?.length) {
    let q = supabase.from('products').select(select)
      .ilike('car_make', `%${carMake}%`)
      .limit(8);
    const kwOr = partKeywords.map(k => `name.ilike.%${k}%`).join(',');
    q = q.or(kwOr);
    const { data, error } = await q;
    console.log('[ATTEMPT 2] make+kw → error:', error?.message || 'none', '| count:', data?.length ?? 0);
    if (data?.length) return data;
  }

  // ── Attempt 3: make only ──────────────────────────────────────────────────
  if (carMake) {
    const { data, error } = await supabase.from('products').select(select)
      .ilike('car_make', `%${carMake}%`).limit(8);
    console.log('[ATTEMPT 3] make only → error:', error?.message || 'none', '| count:', data?.length ?? 0);
    if (data?.length) return data;
  }

  // ── Attempt 4: model in product name ──────────────────────────────────────
  if (carModel) {
    const { data, error } = await supabase.from('products').select(select)
      .ilike('name', `%${carModel}%`).limit(8);
    console.log('[ATTEMPT 4] model in name → error:', error?.message || 'none', '| count:', data?.length ?? 0);
    if (data?.length) return data;
  }

  // ── Attempt 5: keyword in name ────────────────────────────────────────────
  if (partKeywords?.length) {
    for (const kw of partKeywords) {
      const { data, error } = await supabase.from('products').select(select)
        .ilike('name', `%${kw}%`).limit(8);
      console.log(`[ATTEMPT 5] keyword "${kw}" → error:`, error?.message || 'none', '| count:', data?.length ?? 0);
      if (data?.length) return data;
    }
  }

  console.log('[SEARCH] All attempts exhausted — no products found');
  return null;
}


// ── Order lookups ─────────────────────────────────────────────────────────────
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
    pending: 'جديد — بيتجهز',
    pending_payment: 'في انتظار الدفع',
    processing: 'قيد التجهيز',
    shipped: 'تم الشحن — في الطريق إليك',
    delivered: 'تم التسليم ✅',
    cancelled: 'ملغي',
    refunded: 'تم الاسترجاع',
  };
  return map[status] || status;
}


// ── Detect intent ─────────────────────────────────────────────────────────────
function detectIntent(message: string): {
  type: 'order_phone' | 'order_id' | 'product_search' | 'general';
  phone?: string;
  orderId?: string;
  carMake?: string;
  carModel?: string;
  carYear?: string;
  partKeywords?: string[];
} {
  const msg = message.trim();
  const lowerMsg = msg.toLowerCase();

  const phoneMatch = msg.match(/(\+?2?0?1[0-9]{9})/);
  if (phoneMatch) return { type: 'order_phone', phone: phoneMatch[1] };

  const orderIdMatch = msg.match(/([0-9a-f]{8}-[0-9a-f]{4}|[A-Z0-9]{8})/i);
  if (orderIdMatch) return { type: 'order_id', orderId: orderIdMatch[1] };

  const foundMakeKey = Object.keys(CAR_MAKE_MAP).find(k =>
    lowerMsg.includes(k.toLowerCase())
  );

  const foundModel = KNOWN_MODELS.find(m => lowerMsg.includes(m.toLowerCase()));

  const sortedKeys = Object.keys(PART_KEYWORD_MAP).sort((a, b) => b.length - a.length);
  const matchedKeywords: string[] = [];
  for (const k of sortedKeys) {
    if (lowerMsg.includes(k.toLowerCase())) {
      matchedKeywords.push(...PART_KEYWORD_MAP[k]);
    }
  }
  const uniqueKeywords = [...new Set(matchedKeywords)];

  const yearMatch = msg.match(/20[0-9]{2}|19[0-9]{2}/);

  console.log('[INTENT] foundMakeKey:', foundMakeKey, '| foundModel:', foundModel, '| keywords:', uniqueKeywords);

  if (foundMakeKey || foundModel || uniqueKeywords.length > 0) {
    return {
      type: 'product_search',
      carMake: foundMakeKey ? CAR_MAKE_MAP[foundMakeKey] : undefined,
      carModel: foundModel,
      carYear: yearMatch ? yearMatch[0] : undefined,
      partKeywords: uniqueKeywords.length > 0 ? uniqueKeywords : undefined,
    };
  }

  return { type: 'general' };
}


// ── Build context ─────────────────────────────────────────────────────────────
function buildContext(intent: ReturnType<typeof detectIntent>, dbResult: any): string {
  if (!dbResult) return '';

  if (intent.type === 'order_phone' || intent.type === 'order_id') {
    const orders = Array.isArray(dbResult) ? dbResult : [dbResult];
    return orders.map((o: any) => `
رقم الأوردر: ${o.id.slice(0, 8).toUpperCase()}
الحالة: ${translateStatus(o.status)}
الإجمالي: ${o.total_price} ج.م
المدينة: ${o.city || 'غير محدد'}
طريقة الدفع: ${o.payment_method || 'غير محدد'}
تاريخ الطلب: ${new Date(o.created_at).toLocaleDateString('ar-EG')}
رقم التتبع: ${o.tracking_number || 'لم يُضاف بعد'}
عدد المنتجات: ${o.items?.length || 0}
`).join('\n---\n');
  }

  if (intent.type === 'product_search') {
    const products = Array.isArray(dbResult) ? dbResult : [dbResult];
    if (!products.length) return 'NO_PRODUCTS_FOUND';

    return (
      `عدد المنتجات الموجودة في الداتابيز: ${products.length}\n\n` +
      `⚠️ المنتجات دي هي الوحيدة الموجودة. اعرضهم بالظبط كما هم — لا تضيف ولا تعدل:\n\n` +
      products.map((p: any, i: number) => {
        const price = p.sale_price > 0
          ? `${p.sale_price} ج.م (خصم من ${p.regular_price} ج.م)`
          : `${p.regular_price} ج.م`;
        return [
          `[منتج ${i + 1}]`,
          `الاسم: ${p.name}`,
          `البراند: ${p.brand || 'غير محدد'}`,
          `السيارة: ${[p.car_make, p.car_model, p.car_model_year].filter(Boolean).join(' ')}`,
          `السعر: ${price}`,
          `الرابط: https://zaitandfilters.com/products/${p.slug}`,
        ].join('\n');
      }).join('\n\n')
    );
  }

  return '';
}


// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    if (!messages?.length) return NextResponse.json({ error: 'No messages' }, { status: 400 });

    const lastMessage = messages[messages.length - 1]?.content || '';
    console.log('[CHAT] User message:', lastMessage);

    const intent = detectIntent(lastMessage);
    console.log('[CHAT] Detected intent:', JSON.stringify(intent));

    let dbResult = null;

    if (intent.type === 'order_phone' && intent.phone) {
      dbResult = await getOrderByPhone(intent.phone);
      console.log('[CHAT] Order by phone result:', dbResult ? `${dbResult.length} orders` : 'null');
    } else if (intent.type === 'order_id' && intent.orderId) {
      dbResult = await getOrderById(intent.orderId);
      console.log('[CHAT] Order by ID result:', dbResult ? 'found' : 'null');
    } else if (intent.type === 'product_search') {
      dbResult = await searchProducts(
        intent.carMake,
        intent.carModel,
        intent.carYear,
        intent.partKeywords
      );
      console.log('[CHAT] Product search result:', dbResult ? `${dbResult.length} products found` : 'null');
    }

    const contextStr = dbResult ? buildContext(intent, dbResult) : '';

    const noResultsNote = (intent.type === 'product_search' && !dbResult)
      ? '\n\n⚠️ الداتابيز ما رجعتش أي منتجات. قول للعميل بصراحة إن المنتج مش موجود دلوقتي واقترح يتواصل على واتساب.'
      : '';

    const systemContent =
      SYSTEM_PROMPT +
      noResultsNote +
      (contextStr
        ? `\n\n════ بيانات من الداتابيز (استخدمها بالظبط) ════\n${contextStr}\n════ نهاية البيانات ════`
        : '');

    const groqMessages = [
      { role: 'system', content: systemContent },
      ...messages.slice(-10),
    ];

    const groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: groqMessages,
        max_tokens: 900,
        temperature: 0.1,
      }),
    });

    if (!groqResponse.ok) {
      const err = await groqResponse.text();
      console.error('[Groq Error]', err);
      return NextResponse.json({ error: 'Groq API error' }, { status: 500 });
    }

    const data = await groqResponse.json();
    const reply = data.choices?.[0]?.message?.content || 'معلش، حصل خطأ. جرب تاني.';
    console.log('[CHAT] Groq reply preview:', reply.slice(0, 100));

    return NextResponse.json({ reply });

  } catch (err: any) {
    console.error('[Chat API Error]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}