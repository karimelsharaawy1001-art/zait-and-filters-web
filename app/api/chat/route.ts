// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// ✅ FIX: Much stronger product display instructions
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

⚠️ قواعد عرض المنتجات — اتبعها بدقة:
1. لو في بيانات منتجات جاية من الداتابيز في رسالتك، لازم تعرضها مباشرةً في ردك.
2. لكل منتج، اذكر: الاسم، البراند، السعر، ورابط المنتج المباشر.
3. ❌ ممنوع تقول "ابحث على الموقع" أو "دخل الموقع وابحث" لو عندك بيانات منتجات.
4. ❌ ممنوع تقول "مش عندنا" أو "مش موجود" لو في منتجات في البيانات.
5. ✅ دايماً اعرض الرابط المباشر للمنتج زي ما هو من البيانات.
6. لو مفيش بيانات منتجات خالص، قولهم يتواصلوا معانا على واتساب.

قدراتك:
1. البحث عن قطع غيار مناسبة للسيارة — لو العميل ذكر ماركة وموديل وسنة، بتبحث في المنتجات
2. متابعة الأوردرات — لو العميل ديك رقم موبايل أو رقم أوردر، بتجيب معلومات الطلب
3. الإجابة عن أسئلة عامة عن المتجر والشحن والدفع

مهم: لو العميل عايز يشوف أوردره، اطلب منه رقم موبايله أو رقم الأوردر. لو عايز قطعة غيار، اطلب منه ماركة السيارة والموديل والسنة.`;


// ── Arabic/English car make map ───────────────────────────────────────────────
const CAR_MAKE_MAP: Record<string, string> = {
  'تويوتا': 'Toyota',     'toyota': 'Toyota',
  'هيونداي': 'Hyundai',   'hyundai': 'Hyundai',
  'كيا': 'Kia',           'kia': 'Kia',
  'أوبل': 'Opel',         'opel': 'Opel',
  'شيفروليه': 'Chevrolet','chevrolet': 'Chevrolet',
  'نيسان': 'Nissan',      'nissan': 'Nissan',
  'هوندا': 'Honda',       'honda': 'Honda',
  'بيجو': 'Peugeot',      'peugeot': 'Peugeot',
  'رينو': 'Renault',      'renault': 'Renault',
  'فيات': 'Fiat',         'fiat': 'Fiat',
  'ميتسوبيشي': 'Mitsubishi','mitsubishi': 'Mitsubishi',
  'سوزوكي': 'Suzuki',     'suzuki': 'Suzuki',
  'فولكس': 'Volkswagen',  'volkswagen': 'Volkswagen',
  'bmw': 'BMW',           'بي ام دبليو': 'BMW',
  'مرسيدس': 'Mercedes',   'mercedes': 'Mercedes',
  'لادا': 'Lada',         'lada': 'Lada',
  'جيلي': 'Geely',        'geely': 'Geely',
};


// ── Tool: search products ─────────────────────────────────────────────────────
async function searchProducts(
  carMake: string,
  carModel: string,
  carYear?: string,
  keyword?: string
) {
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

  // Fallback 1: make only
  if (carMake) {
    const { data: f1 } = await supabase
      .from('products')
      .select('id, name, brand, car_make, car_model, car_model_year, regular_price, sale_price, slug, image_url')
      .ilike('car_make', `%${carMake}%`)
      .limit(6);
    if (f1?.length) return f1;
  }

  // Fallback 2: keyword only
  if (keyword) {
    const { data: f2 } = await supabase
      .from('products')
      .select('id, name, brand, car_make, car_model, car_model_year, regular_price, sale_price, slug, image_url')
      .ilike('name', `%${keyword}%`)
      .limit(6);
    if (f2?.length) return f2;
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


// ── Detect intent ─────────────────────────────────────────────────────────────
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

  const phoneMatch = msg.match(/(\+?2?0?1[0-9]{9})/);
  if (phoneMatch) return { type: 'order_phone', phone: phoneMatch[1] };

  const orderIdMatch = msg.match(/([0-9a-f]{8}-[0-9a-f]{4}|[A-Z0-9]{8})/i);
  if (orderIdMatch) return { type: 'order_id', orderId: orderIdMatch[1] };

  const foundMakeKey = Object.keys(CAR_MAKE_MAP).find(make =>
    lowerMsg.includes(make.toLowerCase())
  );

  if (foundMakeKey) {
    const normalizedMake = CAR_MAKE_MAP[foundMakeKey];
    const yearMatch = msg.match(/20[0-9]{2}|19[0-9]{2}/);
    const carYear = yearMatch ? yearMatch[0] : undefined;

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
      'emgrand',
    ];
    const foundModel = knownModels.find(m => lowerMsg.includes(m.toLowerCase()));

    const partKeywords = [
      'فلتر زيت', 'oil filter', 'فلتر هواء', 'air filter',
      'فلتر', 'filter', 'زيت', 'oil',
      'فرامل', 'brake', 'تيل', 'بلوف',
      'بواجي', 'spark plug', 'بطارية', 'battery',
      'حزام', 'belt', 'امبير', 'alternator',
    ];
    const foundKeyword = partKeywords.find(k => lowerMsg.includes(k.toLowerCase()));

    return {
      type: 'product_search',
      carMake: normalizedMake,
      carModel: foundModel,
      carYear,
      keyword: foundKeyword,
    };
  }

  return { type: 'general' };
}


// ── Build context ─────────────────────────────────────────────────────────────
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

    // ✅ FIX: Explicit instruction injected WITH the data so the AI cannot ignore it
    return (
      `✅ تم إيجاد ${products.length} منتج في الداتابيز. يجب عليك عرضهم جميعاً في ردك مع الروابط المباشرة:\n\n` +
      products.map((p: any, i: number) => {
        const price = p.sale_price > 0
          ? `${p.sale_price} ج.م (خصم من ${p.regular_price} ج.م)`
          : `${p.regular_price} ج.م`;
        const link = `https://zaitandfilters.com/products/${p.slug}`;
        return (
          `المنتج ${i + 1}:\n` +
          `  - الاسم: ${p.name}\n` +
          `  - البراند: ${p.brand || 'غير محدد'}\n` +
          `  - السيارة: ${p.car_make} ${p.car_model || ''} ${p.car_model_year || ''}\n` +
          `  - السعر: ${price}\n` +
          `  - الرابط المباشر: ${link}`
        );
      }).join('\n\n') +
      `\n\n⚠️ تعليمات: اعرض كل منتج من دول في ردك مع اسمه وسعره ورابطه المباشر. لا تقل "ابحث على الموقع".`
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
        ? `\n\n--- بيانات من الداتابيز ---\n${contextStr}\n--- نهاية البيانات ---\n\nاستخدم البيانات دي في ردك على العميل واعرض كل المنتجات مع روابطها.`
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
        max_tokens: 800,  // ✅ increased to fit multiple product links
        temperature: 0.4, // ✅ lowered so AI sticks to the data, less creative
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