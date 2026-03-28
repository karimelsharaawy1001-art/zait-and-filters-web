import { supabase } from '@/app/lib/supabase';
import ProductDetailsClient from './ProductDetailsClient';
import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;

  // Support both slug and legacy UUID
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
  const query = isUUID
    ? supabase.from('products').select('*').eq('id', slug).single()
    : supabase.from('products').select('*').eq('slug', slug).single();

  const { data: product } = await query;
  if (!product) return { title: 'المنتج غير موجود' };

  const price = product.sale_price || product.regular_price;
  const title = `زيت أند فلترز | 🛒 ${product.name} - ${product.brand}`;
  const carInfo = [product.car_make, product.car_model, product.car_model_year].filter(Boolean).join(' ');
  const description = `
💰 السعر: ${price} ج.م
${carInfo ? `🚗 لسيارة: ${carInfo}` : '🔧 قطعة غيار أصلية متوافقة مع عدة موديلات'}
✅ قطعة أصلية من ماركة ${product.brand} - المنشأ: ${product.country_of_origin || 'أصلي'}
🛡️ اطلبها الآن من "زيت أند فلترز" بأفضل جودة وشحن لباب البيت.
  `.trim();

  const imageUrl = product.image_url || 'https://zaitandfilters.com/og-image.jpg';
  const canonicalSlug = product.slug || product.id;

  return {
    title,
    description,
    keywords: [
      product.name, product.brand, product.car_make, product.car_model,
      `قطع غيار ${product.car_make}`, product.category, product.subcategory,
      'قطع غيار أصلية', 'زيت أند فلترز', `${product.brand} ${product.car_make}`,
    ].filter(Boolean),
    authors: [{ name: 'Zait & Filters' }],
    creator: 'Zait & Filters',
    publisher: 'Zait & Filters',
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 } },
    openGraph: {
      title, description,
      url: `https://zaitandfilters.com/products/${canonicalSlug}`,
      siteName: 'زيت أند فلترز - Zait & Filters',
      images: [{ url: imageUrl, width: 1200, height: 630, alt: product.name }],
      locale: 'ar_EG', type: 'website',
    },
    twitter: { card: 'summary_large_image', title, description, images: [imageUrl] },
    alternates: { canonical: `https://zaitandfilters.com/products/${canonicalSlug}` },
  };
}

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
    description: [
      `${product.name} - ${product.brand} قطعة أصلية`,
      product.car_make && product.car_model
        ? `لسيارة ${product.car_make} ${product.car_model} ${product.car_model_year || ''}`.trim()
        : 'متوافقة مع عدة موديلات',
    ].join(' '),
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
    aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.8', reviewCount: '127', bestRating: '5', worstRating: '1' },
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

  // Detect if it's an old UUID and redirect to slug URL (301 redirect)
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

  if (isUUID) {
    const { data: product } = await supabase.from('products').select('id, slug').eq('id', slug).single();
    if (product?.slug) {
      redirect(`/products/${product.slug}`); // 301 redirect automatically
    }
  }

  const { data: initialProduct } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!initialProduct) notFound();

  return (
    <>
      {initialProduct && <ProductSchema product={initialProduct} />}
      <ProductDetailsClient initialProduct={initialProduct} productId={initialProduct.id} />
    </>
  );
}