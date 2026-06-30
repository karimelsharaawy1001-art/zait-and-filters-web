import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    const days = parseInt(req.nextUrl.searchParams.get('days') || '30');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const [productsRes, categoriesRes, brandsRes, carMakesRes, carModelsRes, carYearsRes] = await Promise.all([
      supabase.rpc('get_most_viewed_products', { since_date: since }),
      supabase.rpc('get_most_viewed_categories', { since_date: since }),
      supabase.rpc('get_most_viewed_brands', { since_date: since }),
      supabase.rpc('get_most_viewed_car_makes', { since_date: since }),
      supabase.rpc('get_most_viewed_car_models', { since_date: since }),
      supabase.rpc('get_most_viewed_car_years', { since_date: since }),
    ]);

    if (productsRes.error) console.error('products RPC error:', productsRes.error);
    if (categoriesRes.error) console.error('categories RPC error:', categoriesRes.error);
    if (brandsRes.error) console.error('brands RPC error:', brandsRes.error);
    if (carMakesRes.error) console.error('carMakes RPC error:', carMakesRes.error);
    if (carModelsRes.error) console.error('carModels RPC error:', carModelsRes.error);
    if (carYearsRes.error) console.error('carYears RPC error:', carYearsRes.error);

    return NextResponse.json({
      products: productsRes.data || [],
      categories: categoriesRes.data || [],
      brands: brandsRes.data || [],
      carMakes: carMakesRes.data || [],
      carModels: carModelsRes.data || [],
      carYears: carYearsRes.data || [],
    });
  } catch (err: any) {
    console.error('Analytics error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
