import { Metadata } from 'next';
import { supabase } from '@/app/lib/supabase';
import StoreClient from './StoreClient';

type SearchParams = {
  make?: string;
  model?: string;
  year?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  q?: string;
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const make     = sp.make     || '';
  const model    = sp.model    || '';
  const category = sp.category || '';
  const brand    = sp.brand    || '';
  const query    = sp.q        || '';

  let title       = 'زيت أند فلترز | قطع غيار السيارات الأصلية';
  let description = 'تسوق أفضل قطع غيار السيارات الأصلية في مصر بأفضل الأسعار. شحن لباب البيت.';
  let ogImage     = 'https://zaitandfilters.com/og-image.jpg';

  if (make) {
    title       = `زيت أند فلترز | قطع غيار ${make}${model ? ` ${model}` : ''}`;
    description = `تسوق قطع غيار ${make}${model ? ` ${model}` : ''} الأصلية بأفضل الأسعار. شحن سريع لجميع المحافظات.`;
  } else if (category) {
    title       = `زيت أند فلترز | ${category}`;
    description = `تسوق أفضل منتجات ${category} الأصلية. أسعار تنافسية وشحن لباب البيت.`;
  } else if (brand) {
    title       = `زيت أند فلترز | منتجات ${brand}`;
    description = `تسوق جميع منتجات ${brand} الأصلية بأفضل الأسعار في مصر.`;
  } else if (query) {
    title       = `زيت أند فلترز | نتائج البحث عن: ${query}`;
    description = `نتائج البحث عن "${query}" في متجر زيت أند فلترز لقطع غيار السيارات الأصلية.`;
  }

  try {
    if (make) {
      // 1. Car image with make + model
      if (model) {
        const { data: carImg } = await supabase
          .from('car_images')
          .select('image_url')
          .ilike('car_make', make.trim())
          .ilike('car_model', model.trim())
          .limit(1)
          .single();
        if (carImg?.image_url) ogImage = carImg.image_url;
      }

      // 2. Any car image for this make
      if (ogImage === 'https://zaitandfilters.com/og-image.jpg') {
        const { data: carImg } = await supabase
          .from('car_images')
          .select('image_url')
          .ilike('car_make', make.trim())
          .limit(1)
          .single();
        if (carImg?.image_url) ogImage = carImg.image_url;
      }

      // 3. Fallback: first product image for this make
      if (ogImage === 'https://zaitandfilters.com/og-image.jpg') {
        const { data: product } = await supabase
          .from('products')
          .select('image_url')
          .ilike('car_make', make.trim())
          .not('image_url', 'is', null)
          .limit(1)
          .single();
        if (product?.image_url) ogImage = product.image_url;
      }
    } else if (category) {
      // Category image table
      const { data: catImg } = await supabase
        .from('category_images')
        .select('image_url')
        .ilike('name', category.trim())
        .single();

      if (catImg?.image_url) {
        ogImage = catImg.image_url;
      } else {
        const { data: product } = await supabase
          .from('products')
          .select('image_url')
          .ilike('category', category.trim())
          .not('image_url', 'is', null)
          .limit(1)
          .single();
        if (product?.image_url) ogImage = product.image_url;
      }
    } else if (brand) {
      const { data: product } = await supabase
        .from('products')
        .select('image_url')
        .ilike('brand', brand.trim())
        .not('image_url', 'is', null)
        .limit(1)
        .single();
      if (product?.image_url) ogImage = product.image_url;
    } else if (query) {
      const { data: product } = await supabase
        .from('products')
        .select('image_url')
        .ilike('name', `%${query.trim()}%`)
        .not('image_url', 'is', null)
        .limit(1)
        .single();
      if (product?.image_url) ogImage = product.image_url;
    }
  } catch {
    // keep default og-image.jpg on any error
  }

  const canonicalUrl = `https://zaitandfilters.com/store${
    make     ? `?make=${encodeURIComponent(make)}`         :
    category ? `?category=${encodeURIComponent(category)}` :
    brand    ? `?brand=${encodeURIComponent(brand)}`       :
    query    ? `?q=${encodeURIComponent(query)}`           : ''
  }`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'زيت أند فلترز - Zait & Filters',
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
      locale: 'ar_EG',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export default function StorePage() {
  return <StoreClient />;
}