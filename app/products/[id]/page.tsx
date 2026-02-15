import { supabase } from '@/app/lib/supabase';
import ProductDetailsClient from './ProductDetailsClient';
import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { data: product } = await supabase.from('products').select('*').eq('id', id).single();

  if (!product) return { title: 'المنتج غير موجود' };

  // 1. جعل اسم الموقع في بداية العنوان لضمان ظهوره (اسم الموقع مش ظاهر)
  const title = `زيت أند فلترز | 🛒 ${product.name} - ${product.brand}`;
  
  // 2. تقديم السعر والماركة في أول سطرين لأن الواتساب بيقص الوصف (البيانات مش كاملة)
  const description = `
💰 السعر: ${product.sale_price || product.regular_price} ج.م
🚗 لسيارة: ${product.car_make} ${product.car_model} ${product.car_model_year || ''}
✅ قطعة أصلية من ماركة ${product.brand} - المنشأ: ${product.country_of_origin || 'أصلي'}
🛡️ اطلبها الآن من "زيت أند فلترز" بأفضل جودة وشحن لباب البيت.
  `.trim();

  return {
    title: title,
    description: description,
    openGraph: {
      title: title,
      description: description,
      url: `https://zaitandfilters.vercel.app/products/${id}`,
      // التأكد من تعريف اسم الموقع هنا أيضاً
      siteName: 'زيت أند فلترز - Zait & Filters', 
      images: [
        {
          url: product.image_url || '/og-image.jpg',
          width: 1200,
          height: 630,
          alt: product.name,
        },
      ],
      locale: 'ar_EG',
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
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