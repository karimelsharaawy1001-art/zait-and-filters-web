import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// ── Detect what the user is asking about ────────────────────────────────────
function detectIntent(msg: string) {
  const m = msg.toLowerCase();
  return {
    wantsProduct : /قطعة|منتج|سعر|بكام|كتالوج|عندكم|فين|إيه|ايه|هل عندكم/.test(m),
    wantsCar     : /سيارة|عربية|موديل|كورولا|اوبترا|كروز|لانسر|نيسان|هيونداي|كيا|تويوتا|شيفروليه|ميتسوبيشي|رينو|بيجو|سكودا|فولكس|فيرنا|سنترا|صني|النترا|سبورتاج/.test(m),
    wantsCategory: /فلتر|زيت|فرامل|عفشة|بوجيه|سير|كاتينة|تبريد|حساس|مساعد|بلية|ردياتير|ثرموستات|دبرياج/.test(m),
  };
}

// ── Fetch relevant products from Supabase ────────────────────────────────────
async function fetchContext(msg: string, intent: ReturnType<typeof detectIntent>) {
  const sections: string[] = [];

  if (intent.wantsProduct || intent.wantsCategory || intent.wantsCar) {
    let q = supabase
      .from('products')
      .select('name, regular_price, sale_price, car_make, car_model, car_model_year, category, subcategory, brand, country_of_origin')
      .eq('is_active', true)
      .limit(8);

    // Car model filter
    const carMatch = msg.match(/(كورولا|اوبترا|كروز|لانسر|النترا|سبورتاج|صني|سنترا|فيرنا|بيكانتو|ريو|اكسنت|توسان|افيو|لانوس|قاشقاي)/i);
    if (carMatch) q = q.ilike('car_model', `%${carMatch[1]}%`);

    // Category filter
    const catMap: Record<string, string> = {
      'فلتر': 'فلاتر', 'زيت': 'زيوت', 'فرامل': 'الفرامل',
      'عفشة': 'عفشة', 'بوجيه': 'بوجيهات', 'سير': 'سيور',
      'تبريد': 'تبريد', 'مساعد': 'عفشة', 'بلية': 'عفشة', 'دبرياج': 'دبرياج',
    };
    for (const [kw, cat] of Object.entries(catMap)) {
      if (msg.includes(kw)) { q = q.ilike('category', `%${cat}%`); break; }
    }

    // Name search if no specific filter
    if (!carMatch && !Object.keys(catMap).some(kw => msg.includes(kw))) {
      const words = msg.trim().split(/\s+/).filter(w => w.length > 3);
      if (words.length) q = q.ilike('name', `%${words[0]}%`);
    }

    const { data: products } = await q;
    if (products?.length) {
      const lines = products.map(p => {
        const price = p.sale_price > 0
          ? `${p.sale_price} ج.م (خصم من ${p.regular_price} ج.م)`
          : `${p.regular_price} ج.م`;
        const car = [p.car_make, p.car_model, p.car_model_year].filter(Boolean).join(' ') || 'جميع السيارات';
        return `• ${p.name} | ماركة: ${p.brand} | ${p.category} | للسيارة: ${car} | السعر: ${price}`;
      }).join('\n');
      sections.push(`منتجات متاحة:\n${lines}`);
    }
  }

  // Fallback: list available categories
  if (!sections.length && (intent.wantsCategory || intent.wantsProduct)) {
    const { data: cats } = await supabase
      .from('products').select('category').eq('is_active', true).limit(300);
    if (cats) {
      const unique = [...new Set(cats.map((c: any) => c.category).filter(Boolean))];
      sections.push(`الفئات المتاحة: ${unique.join(' | ')}`);
    }
  }

  return sections.join('\n\n');
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

${dbContext ? `بيانات من قاعدة بيانات المتجر:\n${dbContext}\n` : ''}

تعليمات:
1. رد بالعربية المصرية البسيطة والمختصرة (2-3 جمل كحد أقصى عادةً)
2. لو في منتجات في البيانات، اذكر الاسم والسعر والتفاصيل بدقة
3. لو المنتج مش في البيانات، قول "مش موجود في قاعدة بياناتي دلوقتي" واقترح الواتساب
4. لو السؤال عن سعر، قول السعر بالضبط من البيانات
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

    const intent  = detectIntent(message);
    const dbCtx   = await fetchContext(message, intent);
    const system  = buildSystemPrompt(dbCtx);

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
      max_tokens : 400,
    });

    const reply = completion.choices[0]?.message?.content?.trim()
      || 'معنديش إجابة دلوقتي، تواصل معانا على الواتساب.';
    return NextResponse.json({ reply });

  } catch (err: any) {
    console.error('[chat]', err?.message);
    return NextResponse.json({ reply: 'حصل خطأ مؤقت. جرب تاني أو تواصل معانا على الواتساب.' });
  }
}
