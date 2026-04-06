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

// ── Tool: search products ─────────────────────────────────────────────────────
async function searchProducts(carMake: string, carModel: string, keyword?: string) {
  let query = supabase
    .from('products')
    .select('id, name, brand, car_make, car_model, car_model_year, regular_price, sale_price, slug, image_url')
    .limit(5);

  if (carMake) query = query.ilike('car_make', `%${carMake}%`);
  if (carModel) query = query.ilike('car_model', `%${carModel}%`);
  if (keyword) query = query.ilike('name', `%${keyword}%`);

  const { data, error } = await query;
  if (error || !data?.length) return null;
  return data;
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
  keyword?: string;
} {
  const msg = message.trim();

  // Phone number pattern
  const phoneMatch = msg.match(/(\+?2?0?1[0-9]{9})/);
  if (phoneMatch) return { type: 'order_phone', phone: phoneMatch[1] };

  // Order ID (UUID-like or short code)
  const orderIdMatch = msg.match(/([0-9a-f]{8}-[0-9a-f]{4}|[A-Z0-9]{8})/i);
  if (orderIdMatch) return { type: 'order_id', orderId: orderIdMatch[1] };

  // Car makes (common Egyptian market)
  const carMakes = ['تويوتا', 'toyota', 'هيونداي', 'hyundai', 'كيا', 'kia', 'أوبل', 'opel', 'شيفروليه', 'chevrolet',
    'نيسان', 'nissan', 'هوندا', 'honda', 'بيجو', 'peugeot', 'رينو', 'renault', 'فيات', 'fiat',
    'ميتسوبيشي', 'mitsubishi', 'سوزوكي', 'suzuki', 'فولكس', 'volkswagen', 'bmw', 'مرسيدس', 'mercedes',
    'لادا', 'lada', 'جيلي', 'geely', 'بي ام دبليو'];

  const lowerMsg = msg.toLowerCase();
  const foundMake = carMakes.find(make => lowerMsg.includes(make.toLowerCase()));

  if (foundMake) {
    // Try to extract model year
    const yearMatch = msg.match(/20[0-9]{2}|19[0-9]{2}/);
    // Keywords for part type
    const partKeywords = ['فلتر', 'زيت', 'فرامل', 'تيل', 'بلوف', 'فلتر هواء', 'بطارية', 'بواجي', 'حزام'];
    const foundKeyword = partKeywords.find(k => msg.includes(k));

    return {
      type: 'product_search',
      carMake: foundMake,
      carModel: yearMatch ? undefined : undefined,
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

    // Detect intent and fetch data if needed
    const intent = detectIntent(lastMessage);
    let dbResult = null;
    let contextStr = '';

    if (intent.type === 'order_phone' && intent.phone) {
      dbResult = await getOrderByPhone(intent.phone);
    } else if (intent.type === 'order_id' && intent.orderId) {
      dbResult = await getOrderById(intent.orderId);
    } else if (intent.type === 'product_search') {
      dbResult = await searchProducts(intent.carMake || '', intent.carModel || '', intent.keyword);
    }

    if (dbResult) contextStr = buildContext(intent, dbResult);

    // Build messages for Groq
    const systemMessage = {
      role: 'system',
      content: SYSTEM_PROMPT + (contextStr ? `\n\n--- بيانات من الداتابيز ---\n${contextStr}\n--- نهاية البيانات ---\n\nاستخدم البيانات دي في ردك على العميل.` : ''),
    };

    const groqMessages = [
      systemMessage,
      ...messages.slice(-10), // keep last 10 messages for context
    ];

    // Call Groq API
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