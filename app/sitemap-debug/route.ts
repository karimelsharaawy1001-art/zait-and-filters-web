import { supabase } from '@/app/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Test 1: count all products
  const { count: totalCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });

  // Test 2: fetch first 3 products with all columns
  const { data: sample, error } = await supabase
    .from('products')
    .select('id, available, is_available, status, created_at, updated_at')
    .limit(3);

  return Response.json({
    totalCount,
    sample,
    error: error?.message,
  });
}
