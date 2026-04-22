import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { product_id, customer_name, customer_email, rating, comment } = await req.json();

    if (!product_id || !customer_name || !rating || !comment) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });
    }
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'التقييم يجب أن يكون بين 1 و 5' }, { status: 400 });
    }
    if (comment.trim().length < 10) {
      return NextResponse.json({ error: 'التعليق قصير جداً' }, { status: 400 });
    }

    const { error } = await supabase.from('product_reviews').insert({
      product_id,
      customer_name: customer_name.trim(),
      customer_email: customer_email?.trim() || null,
      rating,
      comment: comment.trim(),
      is_approved: false,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET approved reviews for a product
export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get('product_id');
  if (!productId) return NextResponse.json({ reviews: [] });

  const { data, error } = await supabase
    .from('product_reviews')
    .select('id, customer_name, rating, comment, created_at')
    .eq('product_id', productId)
    .eq('is_approved', true)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reviews: data });
}