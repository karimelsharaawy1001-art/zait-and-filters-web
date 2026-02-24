import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function clean(val: any): any {
  if (val === undefined || val === null) return null;
  if (typeof val === 'string') {
    const t = val.trim();
    if (t === '' || t.toLowerCase() === 'null') return null;
    return t;
  }
  return val;
}

// Parse pipe-separated multi-car string:
// "NISSAN|SUNNY|2015-2020;TOYOTA|COROLLA|2018-2022"
// Returns array of { car_make, car_model, car_model_year }
function parseCarCompatibility(raw: string | null): { car_make: string; car_model: string; car_model_year: string }[] {
  if (!raw || raw.trim() === '') return [];
  return raw
    .split(';')
    .map(entry => entry.trim())
    .filter(Boolean)
    .map(entry => {
      const [car_make = '', car_model = '', car_model_year = ''] = entry.split('|').map(s => s.trim());
      return { car_make, car_model, car_model_year };
    })
    .filter(c => c.car_make || c.car_model);
}

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { products } = await req.json();

    let updateCount = 0;
    let insertCount = 0;
    const errors: string[] = [];

    for (const product of products) {
      const { id, cars: carsRaw, ...rawData } = product;

      // Clean all fields
      const cleanData: any = {};
      for (const [key, val] of Object.entries(rawData)) {
        cleanData[key] = clean(val);
      }

      // Clean numerics
      if (cleanData.regular_price !== null) {
        const n = parseFloat(cleanData.regular_price);
        cleanData.regular_price = isNaN(n) ? null : n;
      }
      if (cleanData.sale_price !== null) {
        const n = parseFloat(cleanData.sale_price);
        cleanData.sale_price = isNaN(n) ? null : n;
      }
      if (cleanData.is_active !== null && cleanData.is_active !== undefined) {
        cleanData.is_active =
          cleanData.is_active === true ||
          cleanData.is_active === 1 ||
          cleanData.is_active === '1' ||
          String(cleanData.is_active).toLowerCase() === 'true';
      }

      // Parse multi-car compatibility from the "cars" column
      const carEntries = parseCarCompatibility(carsRaw);

      // Sync first car entry to legacy columns for backwards compat
      if (carEntries.length > 0) {
        cleanData.car_make = carEntries[0].car_make || null;
        cleanData.car_model = carEntries[0].car_model || null;
        cleanData.car_model_year = carEntries[0].car_model_year || null;
      }

      const cleanId = clean(id);
      let productId: string | null = null;

      if (cleanId && String(cleanId).length > 10) {
        // Check if exists
        const { data: existing } = await supabaseAdmin
          .from('products')
          .select('id')
          .eq('id', cleanId)
          .maybeSingle();

        if (existing) {
          const { error } = await supabaseAdmin.from('products').update(cleanData).eq('id', cleanId);
          if (error) { errors.push(`Update error for ${cleanData.name}: ${error.message}`); continue; }
          productId = cleanId;
          updateCount++;
        } else {
          const { data: inserted, error } = await supabaseAdmin
            .from('products')
            .insert([{ id: cleanId, ...cleanData }])
            .select('id')
            .single();
          if (error) { errors.push(`Insert error for ${cleanData.name}: ${error.message}`); continue; }
          productId = inserted?.id;
          insertCount++;
        }
      } else {
        const { data: inserted, error } = await supabaseAdmin
          .from('products')
          .insert([cleanData])
          .select('id')
          .single();
        if (error) { errors.push(`Insert error for ${cleanData.name}: ${error.message}`); continue; }
        productId = inserted?.id;
        insertCount++;
      }

      // ── Upsert car compatibility rows ────────────────────────────────────
      if (productId && carEntries.length > 0) {
        // Delete old compatibility rows for this product
        await supabaseAdmin
          .from('product_car_compatibility')
          .delete()
          .eq('product_id', productId);

        // Insert new ones
        const compatRows = carEntries.map(c => ({
          product_id: productId,
          car_make: c.car_make || null,
          car_model: c.car_model || null,
          car_model_year: c.car_model_year || null,
        }));

        const { error: compatError } = await supabaseAdmin
          .from('product_car_compatibility')
          .insert(compatRows);

        if (compatError) {
          errors.push(`Compatibility insert error for ${cleanData.name}: ${compatError.message}`);
        }
      }
    }

    return NextResponse.json({
      updateCount,
      insertCount,
      errors,
      message: `✅ تم تحديث ${updateCount} منتج وإضافة ${insertCount} جديد${errors.length > 0 ? `\n⚠️ ${errors.length} أخطاء` : ''}`,
    });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}