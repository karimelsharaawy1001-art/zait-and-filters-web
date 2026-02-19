import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { products } = await req.json();

    let updateCount = 0;
    let insertCount = 0;
    const errors: string[] = [];

    for (const product of products) {
      const { id, ...productData } = product;

      if (id && id.length > 10) {
        const { error } = await supabaseAdmin.from('products').update(productData).eq('id', id);
        if (!error) updateCount++;
        else errors.push(`Update error: ${error.message}`);
      } else {
        const { error } = await supabaseAdmin.from('products').insert([productData]);
        if (!error) insertCount++;
        else errors.push(`Insert error: ${error.message}`);
      }
    }

    return NextResponse.json({ updateCount, insertCount, errors });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
