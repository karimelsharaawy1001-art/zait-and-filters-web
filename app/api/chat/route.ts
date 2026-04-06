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
3. لو الداتابيز ما رجعتش منتجات، قول: "مش لاقي المنتج ده عندنا دلوقتي" وقترح واتساب.
4. لو الداتابيز رجعت منتجات — اكتب جملة ترحيبية قصيرة بس فقط مثل "لاقيت كذا منتج مناسب ليك!" ولا تكتب تفاصيل المنتجات لأنها هتتعرض تلقائياً كـ cards تحت ردك.
5. ❌ ممنوع تكتب أسماء منتجات أو أسعار أو روابط في ردك لو في منتجات موجودة — الـ cards بتعمل ده.`;


// ── Car make normalization ────────────────────────────────────────────────────
const CAR_MAKE_MAP: Record<string, string> = {
  'تويوتا': 'Toyota',       'toyota': 'Toyota',
  'هيونداي': 'Hyundai',     'hyundai': 'Hyundai',
  'كيا': 'Kia',             'kia': 'Kia',
  'أوبل': 'Opel',           'opel': 'Opel',
  'شيفروليه': 'Chevrolet',  'chevrolet': 'Chevrolet',
  'نيسان': 'Nissan',        'nissan': 'Nissan',
  'هوندا': 'Honda',         'honda': 'Honda',
  'بيجو': 'Peugeot',        'peugeot': 'Peugeot',
  'رينو': 'Renault',        'renault': 'Renault',
  'فيات': 'Fiat',           'fiat': 'Fiat',
  'ميتسوبيشي': 'Mitsubishi','mitsubishi': 'Mitsubishi',
  'سوزوكي': 'Suzuki',       'suzuki': 'Suzuki',
  'فولكس': 'Volkswagen',    'volkswagen': 'Volkswagen',
  'bmw': 'BMW',             'بي ام دبليو': 'BMW',
  'مرسيدس': 'Mercedes',     'mercedes': 'Mercedes',
  'لادا': 'Lada',           'lada': 'Lada',
  'جيلي': 'Geely',          'geely': 'Geely',
};

const MODEL_TO_MAKE: Record<string, string> = {
  'corolla': 'Toyota',   'camry': 'Toyota',    'yaris': 'Toyota',
  'hilux': 'Toyota',     'fortuner': 'Toyota', 'prado': 'Toyota',
  'elantra': 'Hyundai',  'tucson': 'Hyundai',  'accent': 'Hyundai',
  'sonata': 'Hyundai',   'i10': 'Hyundai',     'i20': 'Hyundai',
  'i30': 'Hyundai',      'creta': 'Hyundai',
  'sportage': 'Kia',     'cerato': 'Kia',      'picanto': 'Kia',    'rio': 'Kia',
  'lancer': 'Mitsubishi','لانسر': 'Mitsubishi',
  'pajero': 'Mitsubishi','boma': 'Mitsubishi',  'بوما': 'Mitsubishi',
  'puma': 'Mitsubishi',  'بومة': 'Mitsubishi',
  'outlander': 'Mitsubishi','eclipse': 'Mitsubishi','galant': 'Mitsubishi',
  'cruze': 'Chevrolet',  'captiva': 'Chevrolet','optra': 'Chevrolet',
  'aveo': 'Chevrolet',   'spark': 'Chevrolet',
  'astra': 'Opel',       'vectra': 'Opel',     'corsa': 'Opel',     'zafira': 'Opel',
  'sunny': 'Nissan',     'sentra': 'Nissan',   'qashqai': 'Nissan', 'navara': 'Nissan',
  'civic': 'Honda',      'accord': 'Honda',    'crv': 'Honda',      'hrv': 'Honda',
  '308': 'Peugeot',      '206': 'Peugeot',     '207': 'Peugeot',
  '301': 'Peugeot',      '408': 'Peugeot',
  'logan': 'Renault',    'duster': 'Renault',  'symbol': 'Renault', 'megane': 'Renault',
  'golf': 'Volkswagen',  'polo': 'Volkswagen', 'passat': 'Volkswagen',
};

const MODEL_EN_MAP: Record<string, string> = {
  'لانسر': 'lancer',
  'بوما':  'puma',
  'بومة':  'puma',
  'كورولا': 'corolla',
  'كامري':  'camry',
  'ياريس':  'yaris',
  'أكسنت':  'accent',
  'النترا':  'elantra',
};

const PART_KEYWORD_MAP: Record<string, string[]> = {
  'فلتر زيت':   ['oil filter', 'فلتر زيت'],
  'فلتر هواء':  ['air filter', 'فلتر هواء'],
  'فلتر':       ['filter', 'فلتر'],
  'زيت محرك':  ['engine oil', 'motor oil', 'زيت'],
  'زيت':        ['oil', 'زيت'],
  'تيل فرامل':  ['تيل فرامل', 'brake pad', 'brake pads'],
  'فرامل':      ['brake', 'فرامل'],
  'تيل':        ['تيل', 'brake pad'],
  'بلوف':       ['valve', 'بلوف'],
  'بواجي':      ['spark plug', 'بواجي'],
  'بطارية':     ['battery', 'بطارية'],
  'حزام':       ['belt', 'حزام'],
  'امبير':      ['alternator', 'امبير'],
  'كاوتش':      ['rubber', 'bushing', 'كاوتش'],
  'فلنشة':      ['gasket', 'فلنشة'],
  'كارتيرة':    ['كارتيرة', 'oil pan'],
  'طرمبة زيت':  ['oil pump', 'طرمبة زيت'],
  'مكينة':      ['engine', 'مكينة'],
};

const KNOWN_MODELS: string[] = [
  'corolla', 'camry', 'yaris', 'hilux', 'fortuner', 'rav4', 'land cruiser', 'prado',
  'elantra', 'tucson', 'accent', 'sonata', 'i10', 'i20', 'i30', 'i40', 'creta',
  'sportage', 'cerato', 'picanto', 'rio', 'sorento',
  'lancer', 'لانسر', 'pajero', 'outlander', 'eclipse', 'galant',
  'boma', 'بوما', 'puma', 'بومة',
  'cruze', 'captiva', 'optra', 'aveo', 'spark', 'malibu',
  'astra', 'vectra', 'mokka', 'corsa', 'zafira',
  'sunny', 'sentra', 'qashqai', 'navara', 'patrol',
  'civic', 'accord', 'crv', 'cr-v', 'hrv',
  '308', '206', '207', '301', '408', '508',
  'logan', 'duster', 'symbol', 'megane', 'fluence',
  'punto', 'bravo', 'tipo',
  'swift', 'vitara', 'dzire',
  'golf', 'polo', 'passat', 'tiguan',
  '316', '318', '320', '520', 'x1', 'x3', 'x5',
  'c200', 'c180', 'e200', 'glc',
  'emgrand',
];


// ── Smart product search ──────────────────────────────────────────────────────
async function searchProducts(
  carMake?: string,
  carModel?: string,
  carModelEn?: string,
  carYear?: string,
  partKeywords?: string[]
): Promise<any[] | null> {

  const select = 'id, name, brand, car_make, car_model, car_model_year, regular_price, sale_price, slug, image_url';

  console.log('[SEARCH] make:', carMake, '| model:', carModel, '| modelEn:', carModelEn, '| year:', carYear, '| kw:', partKeywords);

  // Attempt 1: make + English model + keyword
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

  // Attempt 2: make + Arabic model + keyword
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

  // Attempt 3: make + keyword only
  if (carMake && partKeywords?.length) {
    let q = supabase.from('products').select(select)
      .ilike('car_make', `%${carMake}%`)
      .limit(8);
    q = q.or(partKeywords.map(k => `name.ilike.%${k}%`).join(','));
    const { data, error } = await q;
    console.log('[ATT 3] make+kw →', error?.message || 'ok', '| count:', data?.length ?? 0);
    if (data?.length) return data;
  }

  // Attempt 4: make only
  if (carMake) {
    const { data, error } = await supabase.from('products').select(select)
      .ilike('car_make', `%${carMake}%`).limit(8);
    console.log('[ATT 4] make only →', error?.message || 'ok', '| count:', data?.length ?? 0);
    if (data?.length) return data;
  }

  // Attempt 5: English model in car_model field
  if (carModelEn) {
    const { data, error } = await supabase.from('products').select(select)
      .ilike('car_model', `%${carModelEn}%`).limit(8);
    console.log('[ATT 5] modelEn in car_model →', error?.message || 'ok', '| count:', data?.length ?? 0);
    if (data?.length) return data;
  }

  // Attempt 6: Arabic model in product name
  if (carModel) {
    const { data, error } = await supabase.from('products').select(select)
      .ilike('name', `%${carModel}%`).limit(8);
    console.log('[ATT 6] modelAr in name →', error?.message || 'ok', '| count:', data?.length ?? 0);
    if (data?.length) return data;
  }

  // Attempt 7: keyword in name
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


// ── Detect intent ─────────────────────────────────────────────────────────────
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

  const foundMakeKey = Object.keys(CAR_MAKE_MAP).find(k => lowerMsg.includes(k.toLowerCase()));
  const foundModel   = KNOWN_MODELS.find(m => lowerMsg.includes(m.toLowerCase()));
  const foundModelEn = foundModel
    ? (MODEL_EN_MAP[foundModel] ?? MODEL_EN_MAP[foundModel.toLowerCase()] ?? foundModel)
    : undefined;

  let inferredMake = foundMakeKey ? CAR_MAKE_MAP[foundMakeKey] : undefined;
  if (!inferredMake && foundModel) {
    inferredMake = MODEL_TO_MAKE[foundModel] ?? MODEL_TO_MAKE[foundModel.toLowerCase()];
  }

  const sortedKeys = Object.keys(PART_KEYWORD_MAP).sort((a, b) => b.length - a.length);
  const matchedKeywords: string[] = [];
  for (const k of sortedKeys) {
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


// ── Build context for Groq ────────────────────────────────────────────────────
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
    if (!products.length) return '';
    return `تم إيجاد ${products.length} منتج مناسب في الداتابيز. اكتب جملة قصيرة ومرحبة فقط مثل "لاقيت ${products.length} منتج مناسب ليك 😊" — المنتجات هتتعرض تلقائياً تحت ردك كـ cards.`;
  }

  return '';
}


// ── Main handler ──────────────────────────────────────────────────────────────
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

    // ✅ FIX: strip any extra fields — only send role + content to Groq
    // This is the backend safety net in case any bloated data sneaks through
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

    // ✅ Return products as separate clean array for frontend card rendering
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