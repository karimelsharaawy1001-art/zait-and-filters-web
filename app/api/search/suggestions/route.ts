// app/api/search/suggestions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { expandSearchQuery } from '@/lib/searchExpander';

export const runtime = 'edge'; // fast cold starts for autocomplete

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (q.length < 1) return NextResponse.json({ suggestions: [] });

  try {
    const intent = expandSearchQuery(q);
    const suggestions: any[] = [];

    // ── A. Smart expanded suggestions ────────────────────────────────────────
    if (intent.make || intent.category) {
      let query = supabase
        .from('products')
        .select('id, name, slug, image_url, regular_price, sale_price, car_make, car_model, category, subcategory, brand')
        .eq('is_active', true)
        .limit(6);

      if (intent.make)  query = query.ilike('car_make', intent.make);
      if (intent.model) query = query.ilike('car_model', `%${intent.model}%`);
      if (intent.category) query = query.ilike('category', intent.category);
      if (intent.subcategories?.length === 1) {
        query = query.ilike('subcategory', intent.subcategories[0]);
      } else if (intent.subcategories && intent.subcategories.length > 1) {
        // OR filter across subcategories
        query = query.or(intent.subcategories.map(s => `subcategory.ilike.${s}`).join(','));
      }
      if (intent.textSearch) query = query.ilike('name', `%${intent.textSearch}%`);

      let { data } = await query;

      // If model filter yields 0 results, fall back to make+category only
      // (e.g. the user's car has no products in that category yet)
      if (!data?.length && intent.model && intent.make) {
        let fallback = supabase
          .from('products')
          .select('id, name, slug, image_url, regular_price, sale_price, car_make, car_model, category, subcategory, brand')
          .eq('is_active', true)
          .ilike('car_make', intent.make)
          .limit(6);
        if (intent.category) fallback = fallback.ilike('category', intent.category);
        const { data: fb } = await fallback;
        data = fb;
      }

      if (data?.length) {
        suggestions.push(...data.map((p: any) => ({
          type: 'product',
          id: p.id,
          label: p.name,
          sublabel: [p.car_make, p.car_model, p.subcategory].filter(Boolean).join(' · '),
          price: p.sale_price || p.regular_price,
          image: p.image_url,
          url: `/products/${p.slug || p.id}`,
        })));
      }
    }

    // ── B. Product name text search (if not already enough results) ──────────
    if (suggestions.length < 6) {
      const nameQuery = intent.textSearch || q;
      const { data: nameData } = await supabase
        .from('products')
        .select('id, name, slug, image_url, regular_price, sale_price, car_make, car_model, subcategory, brand')
        .eq('is_active', true)
        .ilike('name', `%${nameQuery}%`)
        .limit(6 - suggestions.length);

      if (nameData?.length) {
        const existingIds = new Set(suggestions.map(s => s.id));
        const newItems = nameData
          .filter(p => !existingIds.has(p.id))
          .map(p => ({
            type: 'product',
            id: p.id,
            label: p.name,
            sublabel: [p.car_make, p.car_model, p.subcategory].filter(Boolean).join(' · '),
            price: p.sale_price || p.regular_price,
            image: p.image_url,
            url: `/products/${p.slug || p.id}`,
          }));
        suggestions.push(...newItems);
      }
    }

    // ── C. Category suggestions ───────────────────────────────────────────────
    if (!intent.category && suggestions.length < 8) {
      const catSuggestions = [
        'زيوت موتور', 'فلاتر', 'الفرامل', 'عفشة',
        'بوجيهات و سلوك بوجيهات و موبينة', 'سيور و بلي',
        'دورة تبريد و تكييف', 'دورة البنزين',
        'حساسات و قطع كهربائية', 'إطارات', 'مساحات',
      ].filter(cat => cat.toLowerCase().includes(q.toLowerCase()) || q.includes(cat));

      catSuggestions.slice(0, 3).forEach(cat => {
        suggestions.push({
          type: 'category',
          label: cat,
          sublabel: 'تصفح الفئة',
          url: `/store?category=${encodeURIComponent(cat)}`,
        });
      });
    }

    // ── D. Smart intent suggestion (show as a top-level suggestion) ──────────
    if ((intent.make || intent.category) && suggestions.length > 0) {
      const intentLabel = [
        intent.category,
        intent.subcategories?.join(' + '),
        intent.make,
        intent.model,
      ].filter(Boolean).join(' لـ ');

      const url = new URLSearchParams();
      if (intent.make) url.set('make', intent.make);
      if (intent.model) url.set('model', intent.model);
      if (intent.category) url.set('category', intent.category);
      if (intent.subcategories?.length === 1) url.set('subcategory', intent.subcategories[0]);

      suggestions.unshift({
        type: 'smart',
        label: intentLabel,
        sublabel: `عرض كل ${suggestions.length} منتج`,
        url: `/store?${url.toString()}${intent.textSearch ? `&q=${encodeURIComponent(intent.textSearch)}` : ''}`,
      });
    }

    return NextResponse.json({ suggestions: suggestions.slice(0, 8), intent });
  } catch (err: any) {
    console.error('[search/suggestions] error:', err.message);
    return NextResponse.json({ suggestions: [] });
  }
}
