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
- ردودك تكون مختصرة ومفيدة
- لو مش عارف حاجة، قول بصراحة وقترح يتواصلوا معانا

قدراتك:
1. البحث عن قطع غيار مناسبة للسيارة — لو العميل ذكر ماركة وموديل وسنة، بتبحث في المنتجات
2. متابعة الأوردرات — لو العميل ديك رقم موبايل أو رقم أوردر، بتجيب معلومات الطلب
3. الإجابة عن أسئلة عامة عن المتجر والشحن والدفع

مهم: لو العميل عايز يشوف أوردره، اطلب منه رقم موبايله أو رقم الأوردر. لو عايز قطعة غيار، اطلب منه ماركة السيارة والموديل والسنة.`;


// ── FIX 1: Arabic/English car make → normalized English for DB search ─────────
const CAR_MAKE_MAP: Record<string, string> = {
  'تويوتا': 'Toyota',    'toyota': 'Toyota',
  'هيونداي': 'Hyundai',  'hyundai': 'Hyundai',
  'كيا': 'Kia',          'kia': 'Kia',
  'أوبل': 'Opel',        'opel': 'Opel',
  'شيفروليه': 'Chevrolet','chevrolet': 'Chevrolet',
  'نيسان': 'Nissan',     'nissan': 'Nissan',
  'هوندا': 'Honda',      'honda': 'Honda',
  'بيجو': 'Peugeot',     'peugeot': 'Peugeot',
  'رينو': 'Renault',     'renault': 'Renault',
  'فيات': 'Fiat',        'fiat': 'Fiat',
  'ميتسوبيشي': 'Mitsubishi', 'mitsubishi': 'Mitsubishi',
  'سوزوكي': 'Suzuki',    'suzuki': 'Suzuki',
  'فولكس': 'Volkswagen', 'volkswagen': 'Volkswagen',
  'bmw': 'BMW',          'بي ام دبليو': 'BMW',
  'مرسيدس': 'Mercedes',  'mercedes': 'Mercedes',
  'لادا': 'Lada',        'lada': 'Lada',
  'جيلي': 'Geely',       'geely': 'Geely',
};


// ── Tool: search products ─────────────────────────────────────────────────────
async function searchProducts(
  carMake: string,
  carModel: string,
  carYear?: string,
  keyword?: string
) {
  // FIX 2: Try precise search first (make + model + year + keyword)
  let query = supabase
    .from('products')
    .select('id, name, brand, car_make, car_model, car_model_year, regular_price, sale_price, slug, image_url')
    .limit(6);

  if (carMake)  query = query.ilike('car_make', `%${carMake}%`);
  if (carModel) query = query.ilike('car_model', `%${carModel}%`);
  if (carYear)  query = query.ilike('car_model_year', `%${carYear}%`);
  if (keyword)  query = query.ilike('name', `%${keyword}%`);

  const { data, error } = await query;
  if (!error && data?.length) return data;

  // FIX 3: Fallback — search by make only (drop model/year/keyword filters)
  if (carMake) {
    const { data: fallbackData } = await supabase
      .from('products')
      .select('id, name, brand, car_make, car_model, car_model_year, regular_price, sale_price, slug, image_url')
      .ilike('car_make', `%${carMake}%`)
      .limit(6);
    if (fallbackData?.length) return fallbackData;
  }

  // FIX 4: Fallback — search by keyword in product name only
  if (keyword) {
    const { data: keywordData } = await supabase
      .from('products')
      .select('id, name, brand, car_make, car_model, car_model_year, regular_price, sale_price, slug, image_url')
      .ilike('name', `%${keyword}%`)
      .limit(6);
    if (keywordData?.length) return keywordData;
  }

  return null;
}


// ── Tool: get order by phone ──────────────────────────────────────────────────
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


// ── Tool: get order by ID ─────────────────────────────────────────────────────
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


// ── Status translator ─────────────────────────────────────────────────────────
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


// ── Detect intent from message ────────────────────────────────────────────────
function detectIntent(message: string): {
  type: 'order_phone' | 'order_id' | 'product_search' | 'general';
  phone?: string;
  orderId?: string;
  carMake?: string;
  carModel?: string;
  carYear?: string;
  keyword?: string;
} {
  const msg = message.trim();
  const lowerMsg = msg.toLowerCase();

  // Phone number pattern
  const phoneMatch = msg.match(/(\+?2?0?1[0-9]{9})/);
  if (phoneMatch) return { type: 'order_phone', phone: phoneMatch[1] };

  // Order ID (UUID-like or short code)
  const orderIdMatch = msg.match(/([0-9a-f]{8}-[0-9a-f]{4}|[A-Z0-9]{8})/i);
  if (orderIdMatch) return { type: 'order_id', orderId: orderIdMatch[1] };

  // FIX 5: Detect car make using the map keys
  const foundMakeKey = Object.keys(CAR_MAKE_MAP).find(make =>
    lowerMsg.includes(make.toLowerCase())
  );

  if (foundMakeKey) {
    // FIX 6: Map Arabic/variant name to English DB value
    const normalizedMake = CAR_MAKE_MAP[foundMakeKey];

    // FIX 7: Extract year properly and store it
    const yearMatch = msg.match(/20[0-9]{2}|19[0-9]{2}/);
    const carYear = yearMatch ? yearMatch[0] : undefined;

    // FIX 8: Try to extract car model (word after the make that looks like a model)
    // Common models in Egypt
    const knownModels = [
      'corolla', 'camry', 'yaris', 'hilux', 'fortuner', 'rav4', 'land cruiser',
      'elantra', 'tucson', 'accent', 'sonata', 'i10', 'i20', 'i30', 'creta',
      'sportage', 'cerato', 'picanto', 'rio',
      'astra', 'vectra', 'mokka', 'insignia',
      'cruze', 'captiva', 'optra',
      'sunny', 'sentra', 'qashqai', 'navara',
      'civic', 'accord', 'crv', 'cr-v',
      '308', '206', '207', '301', '408',
      'logan', 'duster', 'symbol',
      'punto', 'bravo', 'tipo',
      'lancer', 'outlander', 'eclipse',
      'swift', 'vitara', 'dzire',
      'golf', 'polo', 'passat',
      '3 series', '5 series', 'x1', 'x3',
      'c class', 'e class', 'a class',
      'emgrand', 'geely',
    ];
    const foundModel = knownModels.find(model => lowerMsg.includes(model.toLowerCase()));

    // FIX 9: Part keywords — Arabic AND English
    const partKeywords = [
      'فلتر زيت', 'oil filter',
      'فلتر هواء', 'air filter',
      'فلتر', 'filter',
      'زيت', 'oil',
      'فرامل', 'brake', 'brakes',
      'تيل', 'بلوف', 'بواجي', 'spark plug',
      'بطارية', 'battery',
      'حزام', 'belt',
      'امبير', 'alternator',
    ];
    const foundKeyword = partKeywords.find(k => lowerMsg.includes(k.toLowerCase()));

    return {
      type: 'product_search',
      carMake: normalizedMake,       // ✅ Now English, matches DB
      carModel: foundModel,           // ✅ Now actually extracted
      carYear,                        // ✅ Now stored and passed
      keyword: foundKeyword,
    };
  }

  return { type: 'general' };
}


// ── Build context string from DB results ──────────────────────────────────────
function buildContext(intent: ReturnType<typeof detectIntent>, dbResult: any): string {
  if (!dbResult) return '';

  if (intent.type === 'order_phone' || intent.type === 'order_id') {
    const orders = Array.isArray(dbResult) ? dbResult : [dbResult];
    return `معلومات الأوردرات من الداتابيز:\n` + orders.map((o: any) => `
- رقم الأوردر: ${o.id.slice(0, 8).toUpperCase()}
- الحالة: ${translateStatus(o.status)}
- الإجمالي: ${o.total_price} ج.م
- المدينة: ${o.city || 'غير محدد'}
- طريقة الدفع: ${o.payment_method || 'غير محدد'}
- تاريخ الطلب: ${new Date(o.created_at).toLocaleDateString('ar-EG')}
${o.tracking_number ? `- رقم التتبع: ${o.tracking_number}` : '- رقم التتبع: لم يُضاف بعد'}
- عدد المنتجات: ${o.items?.length || 0} منتج
`).join('\n');
  }

  if (intent.type === 'product_search') {
    const products = Array.isArray(dbResult) ? dbResult : [dbResult];
    return `منتجات متاحة من الداتابيز:\n` + products.map((p: any) => `
- الاسم: ${p.name}
- البراند: ${p.brand}
- السيارة: ${p.car_make} ${p.car_model} ${p.car_model_year || ''}
- السعر: ${p.sale_price > 0 ? p.sale_price + ' ج.م (بعد خصم)' : p.regular_price + ' ج.م'}
- رابط المنتج: https://zaitandfilters.com/products/${p.slug}
`).join('\n');
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
    let contextStr = '';

    if (intent.type === 'order_phone' && intent.phone) {
      dbResult = await getOrderByPhone(intent.phone);
    } else if (intent.type === 'order_id' && intent.orderId) {
      dbResult = await getOrderById(intent.orderId);
    } else if (intent.type === 'product_search') {
      dbResult = await searchProducts(
        intent.carMake || '',
        intent.carModel || '',
        intent.carYear,
        intent.keyword
      );
    }

    if (dbResult) contextStr = buildContext(intent, dbResult);

    const systemMessage = {
      role: 'system',
      content: SYSTEM_PROMPT + (contextStr
        ? `\n\n--- بيانات من الداتابيز ---\n${contextStr}\n--- نهاية البيانات ---\n\nاستخدم البيانات دي في ردك على العميل.`
        : ''),
    };

    const groqMessages = [
      systemMessage,
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
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!groqResponse.ok) {
      const err = await groqResponse.text();
      console.error('[Groq Error]', err);
      return NextResponse.json({ error: 'Groq API error' }, { status: 500 });
    }

    const data = await groqResponse.json();
    const reply = data.choices?.[0]?.message?.content || 'معلش، حصل خطأ. جرب تاني.';

    return NextResponse.json({ reply });

  } catch (err: any) {
    console.error('[Chat API Error]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}