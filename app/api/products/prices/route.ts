import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { ids } = await req.json();
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json([]);
    }

    const supabase = createServerComponentClient({ cookies });
    const { data, error } = await supabase
      .from('products')
      .select('id, price')
      .in('id', ids);

    if (error) return NextResponse.json([], { status: 500 });

    return NextResponse.json(data || []);
  } catch (e) {
    return NextResponse.json([], { status: 500 });
  }
}