import { supabase } from '@/app/lib/supabase';
import ProductDetailsClient from './ProductDetailsClient';
import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { data: product } = await supabase.from('products').select('*').eq('id', id).single();

  if (!product) return { title: 'المنتج غير موجود' };

  // تنسيق العنوان ليكون جذاباً واحترافياً
  const title = `🛒 ${product.name} لـ ${product.car_make} ${product.car_model} | ${product.brand}`;
  
  // بناء وصف مفصل ومنظم يظهر في المعاينة
  const description = `
✅ قطعة غيار أصلية: ${product.name}
🚗 مناسب لـ: ${product.car_make} ${product.car_model} ${product.car_model_year || ''}
💰 السعر: ${product.sale_price || product.regular_price} ج.م
🌍 المنشأ: ${product.country_of_origin || 'أصلي'}
🛡️ ضمان جودة وشحن سريع لباب البيت.. اطلب الآن!
  `.trim();

  return {
    title: title,
    description: description,
    openGraph: {
      title: title,
      description: description,
      url: `https://zaitandfilters.vercel.app/products/${id}`,
      siteName: 'زيت أند فلترز - Zait & Filters',
      images: [
        {
          url: product.image_url || '/og-image.jpg',
          width: 1200, // العرض المثالي للواتساب والفيسبوك
          height: 630, // الارتفاع المثالي لظهور صورة كبيرة
          alt: product.name,
        },
      ],
      locale: 'ar_EG',
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image', // لإظهار صورة المنتج كبيرة في تويتر
      title: title,
      description: description,
      images: [product.image_url || '/og-image.jpg'],
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: initialProduct } = await supabase.from('products').select('*').eq('id', id).single();
  return <ProductDetailsClient initialProduct={initialProduct} productId={id} />;
}