import { supabase } from '@/app/lib/supabase';
import ProductDetailsClient from './ProductDetailsClient';
import { Metadata } from 'next';

// 1. تصحيح الـ Metadata لتنتظر الـ ID بشكل صحيح
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params; // إضافة await هنا ضرورية جداً
  const { data: product } = await supabase.from('products').select('*').eq('id', id).single();

  if (!product) {
    return { title: 'المنتج غير موجود | زيت أند فلترز' };
  }

  const title = `${product.name} لسيارة ${product.car_make} ${product.car_model} | قطع غيار أصلية`;
  const description = `اطلب ${product.name} الأصلي ماركة ${product.brand} لسيارات ${product.car_make} ${product.car_model}. السعر: ${product.sale_price || product.regular_price} ج.م.`;

  return {
    title: title,
    description: description,
    openGraph: {
      title: title,
      description: description,
      images: [product.image_url || '/og-image.jpg'],
    },
  };
}

// 2. تصحيح المكون الأساسي لينتظر الـ ID
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // إضافة await هنا لحل مشكلة التحويل اللانهائي
  
  const { data: initialProduct } = await supabase.from('products').select('*').eq('id', id).single();

  return <ProductDetailsClient initialProduct={initialProduct} productId={id} />;
}