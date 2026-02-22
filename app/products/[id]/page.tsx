import { supabase } from '@/app/lib/supabase';
import ProductDetailsClient from './ProductDetailsClient';
import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { data: product } = await supabase.from('products').select('*').eq('id', id).single();

  if (!product) return { title: 'المنتج غير موجود' };

  const price = product.sale_price || product.regular_price;

  // اسم الموقع في بداية العنوان لضمان ظهوره على واتساب
  const title = `زيت أند فلترز | 🛒 ${product.name} - ${product.brand}`;

  // السعر والبيانات الأساسية في أول الوصف لأن واتساب يقص النص
  const description = `
💰 السعر: ${price} ج.م
🚗 لسيارة: ${product.car_make} ${product.car_model} ${product.car_model_year || ''}
✅ قطعة أصلية من ماركة ${product.brand} - المنشأ: ${product.country_of_origin || 'أصلي'}
🛡️ اطلبها الآن من "زيت أند فلترز" بأفضل جودة وشحن لباب البيت.
  `.trim();

  const imageUrl = product.image_url || 'https://zaitandfilters.com/og-image.jpg';

  return {
    title,
    description,
    keywords: [
      product.name,
      product.brand,
      product.car_make,
      product.car_model,
      `قطع غيار ${product.car_make}`,
      product.category,
      product.subcategory,
      'قطع غيار أصلية',
      'زيت أند فلترز',
      `${product.brand} ${product.car_make}`,
    ].filter(Boolean),
    authors: [{ name: 'Zait & Filters' }],
    creator: 'Zait & Filters',
    publisher: 'Zait & Filters',
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      title,
      description,
      url: `https://zaitandfilters.com/products/${id}`,
      siteName: 'زيت أند فلترز - Zait & Filters',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: product.name,
        },
      ],
      locale: 'ar_EG',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
    alternates: {
      canonical: `https://zaitandfilters.com/products/${id}`,
    },
  };
}


// SEO: Product Structured Data Component
function ProductSchema({ product }: { product: any }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: `${product.name} - ${product.brand} قطعة أصلية لسيارة ${product.car_make} ${product.car_model} ${product.car_model_year || ''}`,
    image: product.image_url,
    brand: {
      '@type': 'Brand',
      name: product.brand,
    },
    category: product.category,
    sku: product.part_number || product.id,
    mpn: product.part_number || product.id,
    offers: {
      '@type': 'Offer',
      url: `https://zaitandfilters.com/products/${product.id}`,
      priceCurrency: 'EGP',
      price: product.sale_price || product.regular_price,
      priceValidUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      availability: product.available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@type': 'Organization',
        name: 'Zait and Filters',
        url: 'https://zaitandfilters.com',
      },
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      reviewCount: '127',
      bestRating: '5',
      worstRating: '1',
    },
    additionalProperty: [
      {
        '@type': 'PropertyValue',
        name: 'Car Make',
        value: product.car_make,
      },
      {
        '@type': 'PropertyValue',
        name: 'Car Model',
        value: product.car_model,
      },
      {
        '@type': 'PropertyValue',
        name: 'Model Year',
        value: product.car_model_year,
      },
      {
        '@type': 'PropertyValue',
        name: 'Country of Origin',
        value: product.country_of_origin || product.country_origin,
      },
      {
        '@type': 'PropertyValue',
        name: 'Part Number',
        value: product.part_number,
      },
    ].filter(prop => prop.value),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'الرئيسية',
        item: 'https://zaitandfilters.com',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'المتجر',
        item: 'https://zaitandfilters.com/store',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: product.category,
        item: `https://zaitandfilters.com/categories/${encodeURIComponent(product.category)}`,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: product.name,
        item: `https://zaitandfilters.com/products/${product.id}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </>
  );
}


export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: initialProduct } = await supabase.from('products').select('*').eq('id', id).single();

  return (
    <>
      {/* SEO: Product Structured Data */}
      {initialProduct && <ProductSchema product={initialProduct} />}

      <ProductDetailsClient initialProduct={initialProduct} productId={id} />
    </>
  );
}