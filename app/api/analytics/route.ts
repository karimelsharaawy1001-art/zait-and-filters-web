import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function aggregateTop<T>(
  rows: any[],
  keyField: string,
  nameField: string,
  maxResults = 50,
): { name: string; count: number }[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const val = row[keyField];
    if (!val) continue;
    map.set(val, (map.get(val) || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, maxResults);
}

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

    const { data: views, error } = await supabase
      .from('page_views')
      .select('page_type, entity_name, entity_slug, brand, car_make, car_model, car_year, category')
      .gte('created_at', since)
      .limit(20000);

    if (error) {
      console.error('page_views fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!views || views.length === 0) {
      return NextResponse.json({
        products: [],
        categories: [],
        brands: [],
        carMakes: [],
        carModels: [],
        carYears: [],
      });
    }

    const productRows = views.filter(v => v.page_type === 'product' && v.entity_name);
    const products = aggregateTop(productRows, 'entity_name', 'entity_name')
      .map((item, i) => ({
        entity_name: item.name,
        entity_slug: productRows.find(r => r.entity_name === item.name)?.entity_slug || '',
        view_count: item.count,
      }));

    const categories = aggregateTop(views, 'category', 'category')
      .map(item => ({ category_name: item.name, view_count: item.count }));

    const brands = aggregateTop(views.filter(v => v.brand), 'brand', 'brand')
      .map(item => ({ brand_name: item.name, view_count: item.count }));

    const carMakes = aggregateTop(
      views.filter(v => v.car_make && v.car_make !== 'UNIVERSAL'),
      'car_make', 'car_make',
    ).map(item => ({ car_make_name: item.name, view_count: item.count }));

    const carModels = aggregateTop(
      views.filter(v => v.car_model && v.car_model !== 'UNIVERSAL'),
      'car_model', 'car_model',
    ).map(item => ({ car_model_name: item.name, view_count: item.count }));

    const carYears = aggregateTop(views.filter(v => v.car_year), 'car_year', 'car_year')
      .map(item => ({ car_year_name: item.name, view_count: item.count }));

    return NextResponse.json({
      products,
      categories,
      brands,
      carMakes,
      carModels,
      carYears,
    });
  } catch (err: any) {
    console.error('Analytics error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
