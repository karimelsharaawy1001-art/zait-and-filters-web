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
    console.log('✅ import-products route hit');
    console.log('SUPABASE_URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    console.log('Products received:', body?.products?.length ?? 0);

    const { products } = body;

    if (!products || !Array.isArray(products)) {
      return NextResponse.json({ error: 'Invalid products data' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    let updateCount = 0;
    let insertCount = 0;
    const errors: string[] = [];

    for (const product of products) {
      const { id, ...productData } = product;

      if (id && id.length > 10) {
        const { error } = await supabaseAdmin.from('products').update(productData).eq('id', id);
        if (!error) updateCount++;
        else {
          console.error('Update error:', error.message);
          errors.push(`Update error: ${error.message}`);
        }
      } else {
        const { error } = await supabaseAdmin.from('products').insert([productData]);
        if (!error) insertCount++;
        else {
          console.error('Insert error:', error.message);
          errors.push(`Insert error: ${error.message}`);
        }
      }
    }

    console.log(`Done: ${updateCount} updated, ${insertCount} inserted, ${errors.length} errors`);
    return NextResponse.json({ updateCount, insertCount, errors });
  } catch (e: any) {
    console.error('❌ Caught exception:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
