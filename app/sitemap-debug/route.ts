import { supabase } from '@/app/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Simple fetch without any filter
  const { data: sample, error } = await supabase
    .from('products')
    .select('id, created_at, updated_at')
    .limit(3);

  const { count: totalCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });

  return Response.json({ totalCount, sample, error: error?.message });
}
