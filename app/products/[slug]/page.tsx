import { supabase } from '@/app/lib/supabase';
import ProductDetailsClient from './ProductDetailsClient';
import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

// ============================================================
// Arabic translations for car makes
// ============================================================
const CAR_MAKE_AR: Record<string, string> = {
  TOYOTA: 'تويوتا',
  HYUNDAI: 'هيونداي',
  KIA: 'كيا',
  NISSAN: 'نيسان',
  CHEVROLET: 'شيفروليه',
  MITSUBISHI: 'ميتسوبيشي',
  VOLKSWAGEN: 'فولكس فاجن',
  SKODA: 'سكودا',
  PEUGEOT: 'بيجو',
  RENAULT: 'رينو',
  OPEL: 'أوبل',
  MG: 'إم جي',
  MAZDA: 'مازدا',
  SEAT: 'سيات',
  HONDA: 'هوندا',
  SUZUKI: 'سوزوكي',
  BMW: 'بي إم دبليو',
  MERCEDES: 'مرسيدس',
  FORD: 'فورد',
  JEEP: 'جيب',
  UNIVERSAL: '',
};

function buildDescription(product: any): string {
  const brand = product.brand || '';
  const carAr = CAR_MAKE_AR[product.car_make] || product.car_make || '';
  const model = product.car_model && product.car_model !== 'UNIVERSAL' ? product.car_model : '';
  const year = product.car_model_year || '';
  const price = product.sale_price || product.regular_price || '';
  const partNumber = product.part_number ? `رقم القطعة: ${product.part_number}.` : '';

  const carPhrase = [carAr, model, year].filter(Boolean).join(' ');
  const fitPhrase = carPhrase ? `متوافقة مع سيارة ${carPhrase}` : 'متوافقة مع عدة موديلات';
  const pricePhrase = price ? `السعر: ${price} ج.م.` : '';

  const cat = product.category || '';
  const sub = product.subcategory || '';
  const isUniversal = !product.car_make || product.car_make === 'UNIVERSAL';

  if (cat === 'فلاتر') {
    if (sub === 'فلتر زيت' || sub === 'فلتر الزيت')
      return `فلتر زيت ${brand} ${fitPhrase}. ${pricePhrase} اشتري فلتر زيت أصلي ماركة ${brand} بأفضل سعر في مصر من زيت أند فلترز مع شحن سريع لباب البيت. ${partNumber}`;
    if (sub === 'فلتر هواء')
      return `فلتر هواء ${brand} ${fitPhrase}. ${pricePhrase} فلتر هواء أصلي ماركة ${brand} يحمي موتور سيارتك ويحسن الأداء. متوفر الآن في زيت أند فلترز. ${partNumber}`;
    if (sub === 'فلتر تكييف' || sub === 'فلتر كابينة')
      return `فلتر تكييف ${brand} ${fitPhrase}. ${pricePhrase} فلتر كابينة أصلي لتنقية هواء التكييف داخل السيارة. اطلبه الآن من زيت أند فلترز بشحن لباب البيت. ${partNumber}`;
    if (sub === 'فلتر بنزين' || sub === 'فتر بنزين')
      return `فلتر بنزين ${brand} ${fitPhrase}. ${pricePhrase} فلتر وقود أصلي ماركة ${brand} يحمي طلمبة البنزين ويضمن أداء الموتور. متوفر في زيت أند فلترز. ${partNumber}`;
    return `${sub} ${brand} ${fitPhrase}. ${pricePhrase} قطعة أصلية من ماركة ${brand} متوفرة في زيت أند فلترز بأفضل سعر في مصر. ${partNumber}`;
  }

  if (cat === 'زيوت موتور')
    return `زيت موتور ${brand} مواصفة ${sub} - ${product.name}. ${pricePhrase} زيت موتور ${sub} ماركة ${brand} أصلي تخليقي كامل. يحمي الموتور في درجات الحرارة العالية ويطيل عمره. مناسب لجميع أنواع السيارات. اشتري زيت ${brand} ${sub} بأفضل سعر في مصر من زيت أند فلترز مع شحن لباب البيت في جميع المحافظات.`;

  if (cat === 'زيوت فتيس و دبرياج و باور')
    return `زيت ${sub} ماركة ${brand} - ${product.name}. ${pricePhrase} زيت ${sub} أصلي ماركة ${brand} لحماية الفتيس والدبرياج. مناسب لجميع أنواع السيارات. اشتري زيت ${brand} ${sub} بأفضل سعر في مصر من زيت أند فلترز مع شحن لباب البيت في جميع المحافظات.`;

  if (cat === 'الفرامل') {
    if (sub === 'تيل فرامل')
      return `تيل فرامل ${brand} ${fitPhrase}. ${pricePhrase} تيل فرامل أصلي ماركة ${brand} لضمان الأمان والتوقف الآمن. اطلبه الآن من زيت أند فلترز بشحن لباب البيت. ${partNumber}`;
    if (sub === 'طنابير')
      return `طنبور فرامل ${brand} ${fitPhrase}. ${pricePhrase} طنابير فرامل أصلية ماركة ${brand} بأفضل جودة وسعر في مصر. متوفر في زيت أند فلترز. ${partNumber}`;
    if (sub === 'ماستر فرامل')
      return `ماستر فرامل ${brand} ${fitPhrase}. ${pricePhrase} ماستر فرامل أصلي ماركة ${brand}. اطلبه الآن من زيت أند فلترز بأفضل سعر في مصر. ${partNumber}`;
    return `${sub} ${brand} ${fitPhrase}. ${pricePhrase} قطعة فرامل أصلية ماركة ${brand} متوفرة في زيت أند فلترز. ${partNumber}`;
  }

  if (cat === 'عفشة') {
    if (sub === 'مساعدين و صدادات')
      return `مساعد ${brand} ${fitPhrase}. ${pricePhrase} مساعدين أصليين ماركة ${brand} لتحسين ثبات السيارة وراحة الركوب. متوفر في زيت أند فلترز بأفضل سعر في مصر. ${partNumber}`;
    if (sub === 'بلية عجل')
      return `بلية عجل ${brand} ${fitPhrase}. ${pricePhrase} بلية عجل أصلية ماركة ${brand} لضمان أمان القيادة وتقليل الاهتزاز. اطلبها من زيت أند فلترز. ${partNumber}`;
    if (sub === 'مقصات كاملة')
      return `مقص كامل ${brand} ${fitPhrase}. ${pricePhrase} مقصات عفشة أصلية ماركة ${brand} متوفرة في زيت أند فلترز بأفضل سعر. ${partNumber}`;
    if (sub === 'جلب و بيض مقصات')
      return `جلب و بيض مقصات ${brand} ${fitPhrase}. ${pricePhrase} قطع عفشة أصلية ماركة ${brand}. متوفر في زيت أند فلترز. ${partNumber}`;
    if (sub === 'بارات')
      return `بار عفشة ${brand} ${fitPhrase}. ${pricePhrase} بارات عفشة أصلية ماركة ${brand} متوفرة في زيت أند فلترز بأفضل سعر في مصر. ${partNumber}`;
    if (sub === 'بطاحات و بلي بطاحات')
      return `بطاحة و بلي بطاحة ${brand} ${fitPhrase}. ${pricePhrase} قطعة أصلية ماركة ${brand} من زيت أند فلترز. ${partNumber}`;
    if (sub === 'قواعد و شدادات')
      return `قاعدة و شداد موتور ${brand} ${fitPhrase}. ${pricePhrase} قواعد وشدادات أصلية ماركة ${brand} متوفرة في زيت أند فلترز. ${partNumber}`;
    if (sub === 'كبالن و كاوتش كوبلن')
      return `كبالن و كاوتش كوبلن ${brand} ${fitPhrase}. ${pricePhrase} قطع عفشة أصلية ماركة ${brand} من زيت أند فلترز بأفضل سعر في مصر. ${partNumber}`;
    if (sub === 'تيش ميزان و مسامير ميزان')
      return `تيش ميزان ${brand} ${fitPhrase}. ${pricePhrase} تيش ميزان ومسامير ميزان أصلية ماركة ${brand} من زيت أند فلترز. ${partNumber}`;
    return `${sub} ${brand} ${fitPhrase}. ${pricePhrase} قطعة عفشة أصلية ماركة ${brand} متوفرة في زيت أند فلترز بأفضل سعر في مصر. ${partNumber}`;
  }

  if (cat === 'سيور و بلي') {
    if (sub === 'سيور')
      return `سير ${brand} ${fitPhrase}. ${pricePhrase} سيور أصلية ماركة ${brand} لأفضل أداء للموتور. متوفر في زيت أند فلترز بأفضل سعر في مصر. ${partNumber}`;
    if (sub === 'بلي و شدادات')
      return `بلي وشداد سير ${brand} ${fitPhrase}. ${pricePhrase} بلي وشدادات أصلية ماركة ${brand} متوفرة في زيت أند فلترز. ${partNumber}`;
    if (sub === 'طقم كاتينة كامل')
      return `طقم كاتينة كامل ${brand} ${fitPhrase}. ${pricePhrase} طقم كاتينة أصلي ماركة ${brand} يشمل جميع القطع. اطلبه من زيت أند فلترز بأفضل سعر في مصر. ${partNumber}`;
    return `${sub} ${brand} ${fitPhrase}. ${pricePhrase} قطعة أصلية ماركة ${brand} من زيت أند فلترز. ${partNumber}`;
  }

  if (cat === 'دورة تبريد و تكييف') {
    if (sub === 'طلمبات مياه')
      return `طلمبة مياه ${brand} ${fitPhrase}. ${pricePhrase} طلمبة مياه أصلية ماركة ${brand} لضمان تبريد الموتور بكفاءة. متوفرة في زيت أند فلترز بأفضل سعر في مصر. ${partNumber}`;
    if (sub === 'ردياتير')
      return `ردياتير ${brand} ${fitPhrase}. ${pricePhrase} ردياتير أصلي ماركة ${brand} لتبريد الموتور. اطلبه من زيت أند فلترز بأفضل سعر مع شحن لباب البيت. ${partNumber}`;
    if (sub === 'كوعة و ثرموستات')
      return `ثرموستات و كوعة ${brand} ${fitPhrase}. ${pricePhrase} ثرموستات أصلي ماركة ${brand} لتنظيم درجة حرارة الموتور. متوفر في زيت أند فلترز. ${partNumber}`;
    if (sub === 'سربنتينة تكييف')
      return `سربنتينة تكييف ${brand} ${fitPhrase}. ${pricePhrase} سربنتينة تكييف أصلية ماركة ${brand} متوفرة في زيت أند فلترز بأفضل سعر في مصر. ${partNumber}`;
    if (sub === 'خراطيم و مواسير تبريد')
      return `خرطوم تبريد ${brand} ${fitPhrase}. ${pricePhrase} خراطيم ومواسير تبريد أصلية ماركة ${brand}. اطلبها من زيت أند فلترز. ${partNumber}`;
    return `${sub} ${brand} ${fitPhrase}. ${pricePhrase} قطعة تبريد أصلية ماركة ${brand} من زيت أند فلترز بأفضل سعر. ${partNumber}`;
  }

  if (cat === 'دورة البنزين')
    return `طلمبة بنزين ${brand} ${fitPhrase}. ${pricePhrase} طلمبة بنزين أصلية ماركة ${brand} لضمان تدفق الوقود بشكل سليم. متوفرة في زيت أند فلترز بأفضل سعر في مصر. ${partNumber}`;

  if (cat === 'بوجيهات و سلوك بوجيهات و موبينة') {
    if (sub === 'بوجيهات')
      return `بوجيه ${brand} ${fitPhrase}. ${pricePhrase} بوجيهات أصلية ماركة ${brand} لتحسين أداء الموتور وتوفير الوقود. متوفرة في زيت أند فلترز بأفضل سعر في مصر. ${partNumber}`;
    if (sub === 'موبينة')
      return `موبينة ${brand} ${fitPhrase}. ${pricePhrase} موبينة أصلية ماركة ${brand} لتوليد شرارة احتراق قوية وثابتة. متوفرة في زيت أند فلترز. ${partNumber}`;
    return `${sub} ${brand} ${fitPhrase}. ${pricePhrase} قطعة إشعال أصلية ماركة ${brand} من زيت أند فلترز. ${partNumber}`;
  }

  if (cat === 'حساسات و قطع كهربائية') {
    if (sub === 'حساسات')
      return `حساس ${brand} ${fitPhrase}. ${pricePhrase} حساسات أصلية ماركة ${brand} لضمان دقة قراءات السيارة. متوفرة في زيت أند فلترز بأفضل سعر في مصر. ${partNumber}`;
    return `${sub} ${brand} ${fitPhrase}. ${pricePhrase} قطعة كهربائية أصلية ماركة ${brand} متوفرة في زيت أند فلترز. ${partNumber}`;
  }

  if (cat === 'جوانات و أويل سيل')
    return `جوان وأويل سيل ${brand} ${fitPhrase}. ${pricePhrase} جوانات وأويل سيل أصلية ماركة ${brand} لمنع تسرب الزيت. متوفرة في زيت أند فلترز بأفضل سعر في مصر. ${partNumber}`;

  if (cat === 'مستلزمات عمرة موتور') {
    if (sub === 'طقم بستم')
      return `طقم بستم ${brand} ${fitPhrase}. ${pricePhrase} طقم بستم أصلي ماركة ${brand} لعمرة الموتور الكاملة. متوفر في زيت أند فلترز بأفضل سعر في مصر. ${partNumber}`;
    if (sub === 'عامود كامة')
      return `عامود كامة ${brand} ${fitPhrase}. ${pricePhrase} عامود كامة أصلي ماركة ${brand}. اطلبه من زيت أند فلترز بأفضل سعر في مصر. ${partNumber}`;
    return `${sub} ${brand} ${fitPhrase}. ${pricePhrase} قطعة موتور أصلية ماركة ${brand} من زيت أند فلترز. ${partNumber}`;
  }

  if (cat === 'قطع الموتور و ملحقاته')
    return `${sub || 'قطعة موتور'} ${brand} ${fitPhrase}. ${pricePhrase} قطعة موتور أصلية ماركة ${brand} متوفرة في زيت أند فلترز بأفضل سعر في مصر. ${partNumber}`;

  if (cat === 'دبرياج و قطع فتيس')
    return `${sub || 'قطعة دبرياج'} ${brand} ${fitPhrase}. ${pricePhrase} قطعة دبرياج أصلية ماركة ${brand} من زيت أند فلترز بأفضل سعر في مصر. ${partNumber}`;

  if (cat === 'إطارات')
    return `إطار ${brand} ${sub || ''}. ${pricePhrase} إطارات ${brand} أصلية بأفضل سعر في مصر متوفرة في زيت أند فلترز مع شحن لباب البيت.`;

  if (cat === 'مساحات')
    return `مساحة زجاج ${brand} ${fitPhrase}. ${pricePhrase} مساحات زجاج أصلية ماركة ${brand} بأفضل سعر في مصر من زيت أند فلترز. ${partNumber}`;

  // Universal products with no specific car
  if (isUniversal)
    return `${product.name} ماركة ${brand} - ${cat}. ${pricePhrase} ${product.name} أصلي ماركة ${brand} مناسب لجميع أنواع السيارات. متوفر الآن في زيت أند فلترز بأفضل سعر في مصر مع شحن لباب البيت في جميع المحافظات.`;

  // Fallback
  return `${product.name} ماركة ${brand} ${fitPhrase}. ${pricePhrase} قطعة غيار أصلية متوفرة في زيت أند فلترز بأفضل سعر في مصر مع شحن لباب البيت. ${partNumber}`;
}

function buildTitle(product: any): string {
  const brand = product.brand || '';
  const isUniversal = !product.car_make || product.car_make === 'UNIVERSAL';

  if (isUniversal)
    return `${product.name} ${brand} - أفضل سعر في مصر | زيت أند فلترز`;

  const carAr = CAR_MAKE_AR[product.car_make] || product.car_make || '';
  const model = product.car_model && product.car_model !== 'UNIVERSAL' ? product.car_model : '';
  const carPhrase = [carAr, model].filter(Boolean).join(' ');
  const carSuffix = carPhrase ? ` لسيارة ${carPhrase}` : '';
  return `${product.name} ${brand}${carSuffix} | زيت أند فلترز`;
}

function buildKeywords(product: any): string[] {
  const brand = product.brand || '';
  const isUniversal = !product.car_make || product.car_make === 'UNIVERSAL';
  const carAr = isUniversal ? '' : (CAR_MAKE_AR[product.car_make] || '');
  const model = product.car_model && product.car_model !== 'UNIVERSAL' ? product.car_model : '';
  const carEn = isUniversal ? '' : (product.car_make || '');
  const sub = product.subcategory || '';

  const universalKeywords = isUniversal ? [
    `${product.name} سعر`,
    `${brand} ${sub}`,
    `زيت ${brand} مصر`,
    `افضل ${product.category}`,
    `${sub} مصر`,
  ] : [];

  return [
    product.name,
    `${product.name} ${brand}`,
    brand,
    product.category,
    sub,
    carAr,
    model,
    carEn,
    `${sub} ${carAr}`,
    `${sub} ${brand}`,
    `${brand} ${carAr} ${model}`.trim(),
    `سعر ${product.name}`,
    `${product.name} مصر`,
    `قطع غيار ${carAr}`,
    `${product.category} ${carAr}`,
    'قطع غيار أصلية',
    'زيت أند فلترز',
    'قطع غيار مصر',
    product.part_number,
    ...universalKeywords,
  ].filter(Boolean) as string[];
}

// ============================================================
// THIS replaces your old generateMetadata function entirely
// ============================================================
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
  const query = isUUID
    ? supabase.from('products').select('*').eq('id', slug).single()
    : supabase.from('products').select('*').eq('slug', slug).single();

  const { data: product } = await query;
  if (!product) return { title: 'المنتج غير موجود' };

  const title = buildTitle(product);
  const description = buildDescription(product);
  const keywords = buildKeywords(product);
  const imageUrl = product.image_url || 'https://zaitandfilters.com/og-image.jpg';
  const canonicalSlug = product.slug || product.id;
  const canonicalUrl = `https://zaitandfilters.com/products/${canonicalSlug}`;

  return {
    title,
    description,
    keywords,
    authors: [{ name: 'Zait & Filters' }],
    creator: 'Zait & Filters',
    publisher: 'Zait & Filters',
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'زيت أند فلترز - Zait & Filters',
      images: [{ url: imageUrl, width: 1200, height: 630, alt: product.name }],
      locale: 'ar_EG',
      type: 'website',
    },
    twitter: { card: 'summary_large_image', title, description, images: [imageUrl] },
    alternates: { canonical: canonicalUrl },
  };
}

// ============================================================
// EVERYTHING BELOW IS UNCHANGED — do not touch
// ============================================================

function ProductSchema({ product }: { product: any }) {
  const price = product.sale_price || product.regular_price;
  const canonicalSlug = product.slug || product.id;

  const merchantReturnPolicy = {
    '@type': 'MerchantReturnPolicy',
    applicableCountry: 'EG',
    returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
    merchantReturnDays: 14,
    returnMethod: 'https://schema.org/ReturnByMail',
    returnFees: 'https://schema.org/FreeReturn',
  };

  const shippingDetails = {
    '@type': 'OfferShippingDetails',
    shippingRate: { '@type': 'MonetaryAmount', value: 60, currency: 'EGP' },
    shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'EG' },
    deliveryTime: {
      '@type': 'ShippingDeliveryTime',
      handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 1, unitCode: 'DAY' },
      transitTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 3, unitCode: 'DAY' },
    },
  };

  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: buildDescription(product),
    image: product.image_url,
    brand: { '@type': 'Brand', name: product.brand },
    category: product.category,
    sku: product.part_number || product.id,
    mpn: product.part_number || product.id,
    offers: {
      '@type': 'Offer',
      url: `https://zaitandfilters.com/products/${canonicalSlug}`,
      priceCurrency: 'EGP',
      price: price,
      priceValidUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      availability: product.available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: 'Zait and Filters', url: 'https://zaitandfilters.com' },
      hasMerchantReturnPolicy: merchantReturnPolicy,
      shippingDetails: shippingDetails,
    },
    // ⚠️ aggregateRating REMOVED — fake ratings violate Google guidelines and can cause penalties
    additionalProperty: [
      { '@type': 'PropertyValue', name: 'Car Make', value: product.car_make },
      { '@type': 'PropertyValue', name: 'Car Model', value: product.car_model },
      { '@type': 'PropertyValue', name: 'Model Year', value: product.car_model_year },
      { '@type': 'PropertyValue', name: 'Country of Origin', value: product.country_of_origin },
      { '@type': 'PropertyValue', name: 'Part Number', value: product.part_number },
    ].filter(prop => prop.value),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: 'https://zaitandfilters.com' },
      { '@type': 'ListItem', position: 2, name: 'المتجر', item: 'https://zaitandfilters.com/store' },
      { '@type': 'ListItem', position: 3, name: product.category, item: `https://zaitandfilters.com/categories/${encodeURIComponent(product.category)}` },
      { '@type': 'ListItem', position: 4, name: product.name, item: `https://zaitandfilters.com/products/${canonicalSlug}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
    </>
  );
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

  if (isUUID) {
    const { data: product } = await supabase.from('products').select('*').eq('id', slug).single();

    if (!product) notFound();

    if (product.slug) {
      redirect(`/products/${product.slug}`);
    }

    return (
      <>
        <ProductSchema product={product} />
        <ProductDetailsClient initialProduct={product} productId={product.id} />
      </>
    );
  }

  const { data: initialProduct } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!initialProduct) notFound();

  return (
    <>
      <ProductSchema product={initialProduct} />
      <ProductDetailsClient initialProduct={initialProduct} productId={initialProduct.id} />
    </>
  );
}