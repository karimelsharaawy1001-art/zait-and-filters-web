import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CAR_MAKE_AR: Record<string, string> = {
  TOYOTA: 'تويوتا', HYUNDAI: 'هيونداي', KIA: 'كيا', NISSAN: 'نيسان',
  CHEVROLET: 'شيفروليه', MITSUBISHI: 'ميتسوبيشي', VOLKSWAGEN: 'فولكس-فاجن',
  SKODA: 'سكودا', PEUGEOT: 'بيجو', RENAULT: 'رينو', OPEL: 'اوبل',
  MG: 'ام-جي', MAZDA: 'مازدا', SEAT: 'سيات', HONDA: 'هوندا',
  SUZUKI: 'سوزوكي', BMW: 'بي-ام-دبليو', MERCEDES: 'مرسيدس',
  FORD: 'فورد', JEEP: 'جيب', BYD: 'byd', UNIVERSAL: '',
};

const CAR_MODEL_AR: Record<string, string> = {
  'AVEO': 'افيو', 'CAPTIVA': 'كابتيفا', 'CRUZE': 'كروز', 'LANOS': 'لانوس',
  'OPTRA': 'اوبترا', 'ACCENT': 'اكسنت', 'ACCENT HCI': 'اكسنت-hci',
  'ELANTRA': 'النترا', 'GRAND I10': 'جراند-i10', 'I10': 'i10',
  'MATRIX': 'ماتريكس', 'TUCSON': 'توسان', 'VERNA': 'فيرنا',
  'CARENS': 'كارينز', 'CERATO LD': 'سيراتو-ld', 'CERATO TD': 'سيراتو-td',
  'CERATO K3': 'سيراتو-k3', 'GRAND CERATO': 'جراند-سيراتو',
  'PICANTO': 'بيكانتو', 'RIO': 'ريو', 'SOUL': 'سول', 'SPORTAGE': 'سبورتاج',
  '3': 'mg3', '5': 'mg5', '6': 'mg6', 'HS': 'hs', 'RX5': 'rx5', 'ZS': 'zs', 'L3': 'l3',
  'ECLIPSE': 'اكليبس', 'LANCER PUMA': 'لانسر-بوما', 'LANCER SHARK': 'لانسر-شارك',
  'QASHQAI': 'قاشقاي', 'SENTRA': 'سنترا', 'SUNNY N16': 'صني-n16', 'SUNNY N17': 'صني-n17',
  'TIIDA': 'تيدا', 'ASTRA': 'استرا', 'INSIGNIA': 'انسيجنيا',
  '2008': '2008', '3008': '3008', '508': '508', '308': '308', '5008': '5008',
  'CAPTUR': 'كابتشر', 'CLIO': 'كليو', 'DUSTER': 'داستر', 'FLUENCE': 'فلوانس',
  'KADJAR': 'كادجار', 'LOGAN': 'لوجان', 'MEGANE': 'ميجان', 'SANDERO': 'سانديرو',
  'STEPWAY': 'ستيبواي', 'IBIZA': 'ابيزا', 'LEON': 'ليون', 'TOLEDO': 'توليدو',
  'OCTAVIA A4': 'اوكتافيا-a4', 'OCTAVIA A5': 'اوكتافيا-a5',
  'OCTAVIA A7': 'اوكتافيا-a7', 'OCTAVIA A8': 'اوكتافيا-a8',
  'COROLLA': 'كورولا', 'YARIS': 'يارس', 'PASSAT': 'باسات', 'GOLF': 'جولف', 'JETTA': 'جيتا',
};

function generateArabicSlug(product: any): string {
  const namePart = (product.name || '').trim().replace(/\s+/g, '-');
  const isUniversal = !product.car_make || product.car_make === 'UNIVERSAL';
  const makePart = isUniversal ? '' : (CAR_MAKE_AR[product.car_make?.toUpperCase()] ?? product.car_make?.toLowerCase() ?? '');
  const modelRaw = product.car_model && product.car_model !== 'UNIVERSAL' ? product.car_model : '';
  const modelPart = modelRaw ? (CAR_MODEL_AR[modelRaw.toUpperCase()] ?? modelRaw.toLowerCase()) : '';
  const yearPart = product.car_model_year ? product.car_model_year.replace(/\s+/g, '-') : '';
  const brandPart = (product.brand || '').trim().replace(/\s+/g, '-');
  return [namePart, makePart, modelPart, yearPart, brandPart]
    .filter(Boolean).join('-').replace(/-+/g, '-');
}

// first fetch a sample to check what slugs look like
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  // visit ?action=preview first to see sample of current vs new slugs
  if (action === 'preview') {
    const { data: products } = await supabase
      .from('products')
      .select('id, name, slug, car_make, car_model, car_model_year, brand')
      .limit(10);

    const preview = products?.map(p => ({
      current_slug: p.slug,
      new_slug: generateArabicSlug(p),
      will_change: p.slug !== generateArabicSlug(p),
    }));

    return NextResponse.json({ preview });
  }

  // visit ?action=count to see how many need updating
  if (action === 'count') {
    const { count } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });
    return NextResponse.json({ total_products: count });
  }

  // main migration — call ?action=run&page=0, then page=1, etc.
  if (action === 'run') {
    const BATCH_SIZE = 50;
    const page = parseInt(searchParams.get('page') || '0');
    const from = page * BATCH_SIZE;
    const to = from + BATCH_SIZE - 1;

    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, slug, car_make, car_model, car_model_year, brand')
      .range(from, to);

    if (error) return NextResponse.json({ error }, { status: 500 });

    const results = { page, updated: 0, skipped: 0, failed: 0, done: false, log: [] as string[] };
    results.done = products.length < BATCH_SIZE;

    for (const product of products) {
      const newSlug = generateArabicSlug(product);
      if (product.slug === newSlug) { results.skipped++; continue; }

      const { data: existing } = await supabase
        .from('products').select('id').eq('slug', newSlug).neq('id', product.id).single();

      let finalSlug = newSlug;
      if (existing) finalSlug = `${newSlug}-${product.id.slice(0, 6)}`;

      if (product.slug) {
        await supabase.from('slug_redirects').upsert({ old_slug: product.slug, new_slug: finalSlug });
      }

      const { error: updateError } = await supabase
        .from('products').update({ slug: finalSlug }).eq('id', product.id);

      if (updateError) {
        results.failed++;
        results.log.push(`FAILED: ${product.id}`);
      } else {
        results.updated++;
        results.log.push(`✓ ${product.slug} → ${finalSlug}`);
      }
    }

    return NextResponse.json(results);
  }

  return NextResponse.json({ 
    usage: 'Visit ?action=preview to see sample, ?action=count for total, ?action=run&page=0 to migrate' 
  });
}