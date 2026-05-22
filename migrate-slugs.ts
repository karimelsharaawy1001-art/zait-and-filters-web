import { createClient } from '@supabase/supabase-js';

// paste your values directly here temporarily
const SUPABASE_URL = 'https://dcaecjsmitzugqlyl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjYWVjanNtaXR6dWdxbHlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjM4Nzg2MCwiZXhwIjoyMDYxOTYzODYwfQ.dKSGjJwFsFMsYtEnKQlGrIOlwPFKLVMG6P5oqlXLXXX'; // your service role key from .env.local

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const CAR_MAKE_AR: Record<string, string> = {
  TOYOTA: 'تويوتا',
  HYUNDAI: 'هيونداي',
  KIA: 'كيا',
  NISSAN: 'نيسان',
  CHEVROLET: 'شيفروليه',
  MITSUBISHI: 'ميتسوبيشي',
  VOLKSWAGEN: 'فولكس-فاجن',
  SKODA: 'سكودا',
  PEUGEOT: 'بيجو',
  RENAULT: 'رينو',
  OPEL: 'أوبل',
  MG: 'ام-جي',
  MAZDA: 'مازدا',
  SEAT: 'سيات',
  HONDA: 'هوندا',
  SUZUKI: 'سوزوكي',
  BMW: 'بي-ام-دبليو',
  MERCEDES: 'مرسيدس',
  FORD: 'فورد',
  JEEP: 'جيب',
  BYD: 'byd',
  UNIVERSAL: '',
};

const CAR_MODEL_AR: Record<string, string> = {
  'AVEO': 'افيو',
  'CAPTIVA': 'كابتيفا',
  'CRUZE': 'كروز',
  'LANOS': 'لانوس',
  'OPTRA': 'اوبترا',
  'ACCENT': 'اكسنت',
  'ACCENT HCI': 'اكسنت-hci',
  'ELANTRA': 'النترا',
  'GRAND I10': 'جراند-i10',
  'I10': 'i10',
  'MATRIX': 'ماتريكس',
  'TUCSON': 'توسان',
  'VERNA': 'فيرنا',
  'CARENS': 'كارينز',
  'CERATO LD': 'سيراتو-ld',
  'CERATO TD': 'سيراتو-td',
  'CERATO K3': 'سيراتو-k3',
  'GRAND CERATO': 'جراند-سيراتو',
  'PICANTO': 'بيكانتو',
  'RIO': 'ريو',
  'SOUL': 'سول',
  'SPORTAGE': 'سبورتاج',
  '3': 'mg3',
  '5': 'mg5',
  '6': 'mg6',
  'HS': 'hs',
  'RX5': 'rx5',
  'ZS': 'zs',
  'L3': 'l3',
  'ECLIPSE': 'اكليبس',
  'LANCER PUMA': 'لانسر-بوما',
  'LANCER SHARK': 'لانسر-شارك',
  'QASHQAI': 'قاشقاي',
  'SENTRA': 'سنترا',
  'SUNNY N16': 'صني-n16',
  'SUNNY N17': 'صني-n17',
  'TIIDA': 'تيدا',
  'ASTRA': 'استرا',
  'INSIGNIA': 'انسيجنيا',
  '2008': '2008',
  '3008': '3008',
  '508': '508',
  '308': '308',
  '5008': '5008',
  'CAPTUR': 'كابتشر',
  'CLIO': 'كليو',
  'DUSTER': 'داستر',
  'FLUENCE': 'فلوانس',
  'KADJAR': 'كادجار',
  'LOGAN': 'لوجان',
  'MEGANE': 'ميجان',
  'SANDERO': 'سانديرو',
  'STEPWAY': 'ستيبواي',
  'IBIZA': 'ابيزا',
  'LEON': 'ليون',
  'TOLEDO': 'توليدو',
  'OCTAVIA A4': 'اوكتافيا-a4',
  'OCTAVIA A5': 'اوكتافيا-a5',
  'OCTAVIA A7': 'اوكتافيا-a7',
  'OCTAVIA A8': 'اوكتافيا-a8',
  'COROLLA': 'كورولا',
  'YARIS': 'يارس',
  'PASSAT': 'باسات',
  'GOLF': 'جولف',
  'JETTA': 'جيتا',
};

function generateArabicSlug(product: any): string {
  const namePart = (product.name || '')
    .trim()
    .replace(/\s+/g, '-');

  const isUniversal = !product.car_make || product.car_make === 'UNIVERSAL';

  const makePart = isUniversal
    ? ''
    : (CAR_MAKE_AR[product.car_make?.toUpperCase()] ?? product.car_make?.toLowerCase() ?? '');

  const modelRaw = product.car_model && product.car_model !== 'UNIVERSAL'
    ? product.car_model
    : '';
  const modelPart = modelRaw
    ? (CAR_MODEL_AR[modelRaw.toUpperCase()] ?? modelRaw.toLowerCase())
    : '';

  const yearPart = product.car_model_year
    ? product.car_model_year.replace(/\s+/g, '-')
    : '';

  const brandPart = (product.brand || '')
    .trim()
    .replace(/\s+/g, '-');

  const parts = [namePart, makePart, modelPart, yearPart, brandPart]
    .filter(Boolean);

  return parts.join('-').replace(/-+/g, '-').toLowerCase();
}

async function migrate() {
  console.log('Starting slug migration...');

  // fetch all products
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, slug, car_make, car_model, car_model_year, brand');

  if (error) {
    console.error('Failed to fetch products:', error);
    return;
  }

  console.log(`Found ${products.length} products to process`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const product of products) {
    const newSlug = generateArabicSlug(product);

    // skip if slug unchanged
    if (product.slug === newSlug) {
      skipped++;
      continue;
    }

    // check for slug collision
    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('slug', newSlug)
      .neq('id', product.id)
      .single();

    let finalSlug = newSlug;
    if (existing) {
      // append product id suffix to avoid collision
      finalSlug = `${newSlug}-${product.id.slice(0, 6)}`;
      console.warn(`Collision for slug "${newSlug}", using "${finalSlug}"`);
    }

    // save old slug to redirects table (so old URLs still work)
    if (product.slug) {
      const { error: redirectError } = await supabase
        .from('slug_redirects')
        .upsert({ old_slug: product.slug, new_slug: finalSlug });

      if (redirectError) {
        console.error(`Failed to save redirect for ${product.slug}:`, redirectError);
      }
    }

    // update product slug
    const { error: updateError } = await supabase
      .from('products')
      .update({ slug: finalSlug })
      .eq('id', product.id);

    if (updateError) {
      console.error(`Failed to update product ${product.id}:`, updateError);
      failed++;
    } else {
      console.log(`✓ ${product.slug} → ${finalSlug}`);
      updated++;
    }
  }

  console.log('\n=== Migration Complete ===');
  console.log(`✓ Updated: ${updated}`);
  console.log(`→ Skipped (unchanged): ${skipped}`);
  console.log(`✗ Failed: ${failed}`);
}

migrate();