import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function detectPageType(path: string): string {
  if (path === '/' || path === '') return 'home';
  if (path.startsWith('/products/')) return 'product';
  if (path.startsWith('/categories/')) return 'category';
  if (path.startsWith('/store')) return 'store';
  if (path.startsWith('/cart')) return 'cart';
  if (path.startsWith('/checkout')) return 'checkout';
  if (path.startsWith('/orders/')) return 'order';
  if (path.startsWith('/profile')) return 'profile';
  if (path.startsWith('/blog')) return 'blog';
  if (path.startsWith('/about')) return 'about';
  if (path.startsWith('/contact')) return 'contact';
  return 'other';
}

function extractEntitySlug(path: string): string {
  if (path.startsWith('/products/')) {
    return path.replace('/products/', '').split('/')[0].split('?')[0];
  }
  if (path.startsWith('/categories/')) {
    return path.replace('/categories/', '').split('/')[0].split('?')[0];
  }
  return '';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_id, page_title, current_page } = body;

    if (!session_id || !current_page) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const pageType = detectPageType(current_page);
    const entitySlug = extractEntitySlug(current_page);

    let entityId = '';
    let entityName = '';
    let brand = '';
    let carMake = '';
    let carModel = '';
    let carYear = '';
    let category = '';

    if (pageType === 'product' && entitySlug) {
      const decodedSlug = decodeURIComponent(entitySlug);
      const { data: product } = await supabase
        .from('products')
        .select('id, name, brand, car_make, car_model, car_model_year, category')
        .eq('slug', decodedSlug)
        .maybeSingle();

      if (product) {
        entityId = product.id;
        entityName = product.name;
        brand = product.brand || '';
        carMake = product.car_make || '';
        carModel = product.car_model || '';
        carYear = product.car_model_year || '';
        category = product.category || '';
      } else {
        const { data: productByUuid } = await supabase
          .from('products')
          .select('id, name, brand, car_make, car_model, car_model_year, category')
          .eq('id', decodedSlug)
          .maybeSingle();

        if (productByUuid) {
          entityId = productByUuid.id;
          entityName = productByUuid.name;
          brand = productByUuid.brand || '';
          carMake = productByUuid.car_make || '';
          carModel = productByUuid.car_model || '';
          carYear = productByUuid.car_model_year || '';
          category = productByUuid.category || '';
        }
      }
    }

    if (pageType === 'category' && entitySlug) {
      entityName = decodeURIComponent(entitySlug);
      category = entityName;
    }

    const { error } = await supabase
      .from('page_views')
      .insert({
        session_id,
        page_type: pageType,
        entity_id: entityId,
        entity_name: entityName,
        entity_slug: entitySlug,
        page_title: page_title || '',
        current_page,
        brand,
        car_make: carMake,
        car_model: carModel,
        car_year: carYear,
        category,
      });

    if (error) {
      console.error('page-view insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('page-view error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
