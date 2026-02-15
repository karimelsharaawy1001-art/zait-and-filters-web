import { supabase } from '@/app/lib/supabase';
import ProductDetailsClient from './ProductDetailsClient';
import { Metadata } from 'next';

// الضربة القاضية للـ SEO: توليد بيانات المنتج ديناميكياً لجوجل
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const { id } = params;
  const { data: product } = await supabase.from('products').select('*').eq('id', id).single();

  if (!product) {
    return { title: 'المنتج غير موجود | زيت أند فلترز' };
  }

  const title = `${product.name} لسيارة ${product.car_make} ${product.car_model} | قطع غيار أصلية`;
  const description = `اطلب ${product.name} الأصلي ماركة ${product.brand} لسيارات ${product.car_make} ${product.car_model} ${product.car_model_year || ''}. السعر: ${product.sale_price || product.regular_price} ج.م. شحن سريع وضمان جودة من زيت أند فلترز.`;

  return {
    title: title,
    description: description,
    keywords: [product.name, product.brand, product.car_make, product.car_model, "قطع غيار أصلية", "زيت أند فلترز"],
    openGraph: {
      title: title,
      description: description,
      images: [product.image_url || '/og-image.jpg'],
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

export default async function ProductPage({ params }: { params: { id: string } }) {
  // جلب البيانات أول مرة في السيرفر وتمريرها للـ Client لتسريع التحميل
  const { data: initialProduct } = await supabase.from('products').select('*').eq('id', params.id).single();

  return <ProductDetailsClient initialProduct={initialProduct} productId={params.id} />;
}