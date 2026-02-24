import { supabase } from '@/app/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { data: sample, error } = await supabase
    .from('products')
    .select('*')  // fetch ALL columns so we can see the exact names
    .limit(1);

  return Response.json({ sample, error: error?.message });
}
