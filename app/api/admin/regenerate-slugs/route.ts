import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CAR_MAKE_AR: Record<string, string> = {
  CHEVROLET: 'شيفروليه', TOYOTA: 'تويوتا', HYUNDAI: 'هيونداي',
  KIA: 'كيا', NISSAN: 'نيسان', MITSUBISHI: 'ميتسوبيشي',
  VOLKSWAGEN: 'فولكس-فاجن', SKODA: 'سكودا', PEUGEOT: 'بيجو',
  RENAULT: 'رينو', OPEL: 'أوبل', MG: 'إم-جي', MAZDA: 'مازدا',
  HONDA: 'هوندا', SUZUKI: 'سوزوكي', BMW: 'بي-إم-دبليو',
  MERCEDES: 'مرسيدس', FORD: 'فورد', JEEP: 'جيب', SEAT: 'سيات',
};

const CAR_MODEL_AR: Record<string, string> = {
  'AVEO': 'افيو', 'CAPTIVA': 'كابتيفا', 'CRUZE': 'كروز',
  'LANOS': 'لانوس', 'OPTRA': 'أوبترا',
  'ACCENT': 'اكسنت', 'ACCENT HCI': 'اكسنت-HCI', 'ELANTRA': 'النترا',
  'GRAND I10': 'جراند-i10', 'I10': 'i10', 'MATRIX': 'ماتريكس',
  'TUCSON': 'توسان', 'VERNA': 'فيرنا',
  'CARENS': 'كارينز', 'CERATO LD': 'سيراتو-LD', 'CERATO TD': 'سيراتو-TD',
  'CERATO K3': 'سيراتو-K3', 'GRAND CERATO': 'جراند-سيراتو',
  'PICANTO': 'بيكانتو', 'RIO': 'ريو', 'SOUL': 'سول', 'SPORTAGE': 'سبورتاج',
  'HS': 'HS', 'RX5': 'RX5', 'ZS': 'ZS',
  'ECLIPSE': 'اكليبس', 'LANCER PUM': 'لانسر-بوم', 'LANCER SHA': 'لانسر-شاسيه',
  'QASHQAI': 'قاشقاي', 'SENTRA': 'سنترا', 'SUNNY N16': 'صني-N16',
  'SUNNY N17': 'صني-N17', 'TIIDA': 'تيدا',
  'ASTRA': 'أسترا', 'INSIGNIA': 'انسيجنيا',
  '2008': '2008', '3008': '3008', '508': '508', '308': '308', '5008': '5008',
  'CAPTUR': 'كابتشر', 'CLIO': 'كليو', 'DUSTER': 'داستر', 'FLUENCE': 'فلوانس',
  'KADJAR': 'كادجار', 'LOGAN': 'لوجان', 'MEGANE': 'ميغان',
  'SANDERO': 'سانديرو', 'STEPWAY': 'ستيبواي',
  'IBIZA': 'ابيزا', 'LEON': 'ليون', 'TOLEDO': 'توليدو',
  'OCTAVIA A4': 'اوكتافيا-A4', 'OCTAVIA A5': 'اوكتافيا-A5',
  'OCTAVIA A7': 'اوكتافيا-A7', 'OCTAVIA A8': 'اوكتافيا-A8',
  'COROLLA': 'كورولا', 'YARIS': 'يارس',
  'PASSAT': 'باسات', 'GOLF': 'جولف', 'JETTA': 'جيتا',
};

function expandYearRange(yearStr: string): string {
  if (!yearStr) return '';
  const match = yearStr.match(/(\d{4})\s*[-–]\s*(\d{4})/);
  if (match) {
    const start = parseInt(match[1]);
    const end = parseInt(match[2]);
    const years: string[] = [];
    for (let y = start; y <= end; y++) years.push(String(y));
    return years.join('-');
  }
  return yearStr.trim();
}

function generateSlug(product: any, existingSlugs: Set<string>): string {
  const isUniversal = !product.car_make || product.car_make === 'UNIVERSAL';
  const carAr = isUniversal ? '' : (CAR_MAKE_AR[product.car_make] || product.car_make || '');
  const modelRaw = product.car_model && product.car_model !== 'UNIVERSAL' ? product.car_model : '';
  const modelAr = modelRaw ? (CAR_MODEL_AR[modelRaw.toUpperCase()] ?? modelRaw) : '';
  const year = expandYearRange(product.car_model_year || '');
  const brand = product.brand || '';

  const base = [product.name, carAr, modelAr, year, brand]
    .filter(Boolean)
    .join('-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/[^\u0600-\u06FFa-zA-Z0-9-]/g, '')
    .toLowerCase()
    .slice(0, 100);

  let slug = base;
  let counter = 1;
  while (existingSlugs.has(slug)) {
    slug = `${base}-${counter}`;
    counter++;
  }
  existingSlugs.add(slug);
  return slug;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // get batch params — default page=0, size=200
  const page = parseInt(searchParams.get('page') || '0');
  const size = 200;
  const from = page * size;
  const to = from + size - 1;

  // fetch only this batch
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, brand, car_make, car_model, car_model_year, slug')
    .order('id', { ascending: true })
    .range(from, to);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!products || products.length === 0) {
    return NextResponse.json({ done: true, message: 'All batches complete' });
  }

  // we need all existing slugs to avoid duplicates
  // fetch just slugs for collision detection
  const { data: allSlugs } = await supabase
    .from('products')
    .select('slug')
    .not('slug', 'is', null);

  const existingSlugs = new Set<string>(
    (allSlugs || []).map((p: any) => p.slug).filter(Boolean)
  );

  let updated = 0;
  for (const product of products) {
    const newSlug = generateSlug(product, existingSlugs);
    if (newSlug === product.slug) continue;

    // save redirect
    if (product.slug) {
      await supabase.from('slug_redirects').upsert({
        old_slug: product.slug,
        new_slug: newSlug,
      });
    }

    // update slug
    await supabase
      .from('products')
      .update({ slug: newSlug })
      .eq('id', product.id);

    updated++;
  }

  return NextResponse.json({
    page,
    processed: products.length,
    updated,
    hasMore: products.length === size,
    nextUrl: products.length === size
      ? `/api/admin/regenerate-slugs?secret=${secret}&page=${page + 1}`
      : null,
  });
}