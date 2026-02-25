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

function prepareCleanData(rawData: any) {
  const cleanData: any = {};
  for (const [key, val] of Object.entries(rawData)) {
    cleanData[key] = clean(val);
  }
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
  return cleanData;
}

const BATCH_SIZE = 100;
const PARALLEL_UPDATES = 10;

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { products } = await req.json();

    if (!products || products.length === 0) {
      return NextResponse.json({ error: 'No products provided' }, { status: 400 });
    }

    const errors: string[] = [];
    let updateCount = 0;
    let insertCount = 0;

    // ── Categorize products by whether they have an ID ────────────────────────
    const withId: { id: string; cleanData: any; carEntries: any[] }[] = [];
    const withoutId: { cleanData: any; carEntries: any[] }[] = [];

    for (const product of products) {
      const { id, cars: carsRaw, ...rawData } = product;
      const cleanData = prepareCleanData(rawData);
      const carEntries = parseCarCompatibility(carsRaw ?? null);

      // Sync first car entry to legacy columns for backwards compat
      if (carEntries.length > 0) {
        cleanData.car_make = carEntries[0].car_make || null;
        cleanData.car_model = carEntries[0].car_model || null;
        cleanData.car_model_year = carEntries[0].car_model_year || null;
      }

      const cleanId = clean(id);
      if (cleanId && String(cleanId).length > 10) {
        withId.push({ id: cleanId, cleanData, carEntries });
      } else {
        withoutId.push({ cleanData, carEntries });
      }
    }

    // ── Step 1: Single batch query to find which IDs already exist ────────────
    const existingIds = new Set<string>();
    if (withId.length > 0) {
      const allIds = withId.map(p => p.id);
      for (let i = 0; i < allIds.length; i += 500) {
        const chunk = allIds.slice(i, i + 500);
        const { data } = await supabaseAdmin
          .from('products')
          .select('id')
          .in('id', chunk);
        if (data) data.forEach((r: any) => existingIds.add(r.id));
      }
    }

    const toUpdate = withId.filter(p => existingIds.has(p.id));
    const toInsertWithId = withId.filter(p => !existingIds.has(p.id));

    // Track which products need compat rows written
    const compatMap: { productId: string; carEntries: any[] }[] = [];

    // ── Step 2: Batch INSERT products without ID ──────────────────────────────
    for (let i = 0; i < withoutId.length; i += BATCH_SIZE) {
      const chunk = withoutId.slice(i, i + BATCH_SIZE);
      const rows = chunk.map(p => p.cleanData);
      const { data: inserted, error } = await supabaseAdmin
        .from('products')
        .insert(rows)
        .select('id');

      if (error) {
        errors.push(`Batch insert error (chunk ${i}): ${error.message}`);
      } else if (inserted) {
        insertCount += inserted.length;
        inserted.forEach((row: any, idx: number) => {
          if (chunk[idx].carEntries.length > 0) {
            compatMap.push({ productId: row.id, carEntries: chunk[idx].carEntries });
          }
        });
      }
    }

    // ── Step 3: Batch INSERT products with new ID ─────────────────────────────
    for (let i = 0; i < toInsertWithId.length; i += BATCH_SIZE) {
      const chunk = toInsertWithId.slice(i, i + BATCH_SIZE);
      const rows = chunk.map(p => ({ id: p.id, ...p.cleanData }));
      const { data: inserted, error } = await supabaseAdmin
        .from('products')
        .insert(rows)
        .select('id');

      if (error) {
        errors.push(`Batch insert (with-id chunk ${i}): ${error.message}`);
      } else if (inserted) {
        insertCount += inserted.length;
        inserted.forEach((row: any, idx: number) => {
          if (chunk[idx].carEntries.length > 0) {
            compatMap.push({ productId: row.id, carEntries: chunk[idx].carEntries });
          }
        });
      }
    }

    // ── Step 4: Parallel UPDATE existing products ─────────────────────────────
    for (let i = 0; i < toUpdate.length; i += PARALLEL_UPDATES) {
      const chunk = toUpdate.slice(i, i + PARALLEL_UPDATES);
      const results = await Promise.allSettled(
        chunk.map(p =>
          supabaseAdmin.from('products').update(p.cleanData).eq('id', p.id)
        )
      );
      results.forEach((result, idx) => {
        if (result.status === 'fulfilled' && result.value.error) {
          errors.push(`Update error for id ${chunk[idx].id}: ${result.value.error.message}`);
        } else if (result.status === 'rejected') {
          errors.push(`Update failed for id ${chunk[idx].id}`);
        } else {
          updateCount++;
          if (chunk[idx].carEntries.length > 0) {
            compatMap.push({ productId: chunk[idx].id, carEntries: chunk[idx].carEntries });
          }
        }
      });
    }

    // ── Step 5: Batch car compatibility upsert ────────────────────────────────
    if (compatMap.length > 0) {
      const allProductIds = compatMap.map(m => m.productId);

      // Delete all old compat rows for these products in one shot
      for (let i = 0; i < allProductIds.length; i += 500) {
        const chunk = allProductIds.slice(i, i + 500);
        await supabaseAdmin
          .from('product_car_compatibility')
          .delete()
          .in('product_id', chunk);
      }

      // Build all new compat rows
      const allCompatRows: any[] = [];
      for (const { productId, carEntries } of compatMap) {
        for (const c of carEntries) {
          allCompatRows.push({
            product_id: productId,
            car_make: c.car_make || null,
            car_model: c.car_model || null,
            car_model_year: c.car_model_year || null,
          });
        }
      }

      // Insert all compat rows in batches
      for (let i = 0; i < allCompatRows.length; i += BATCH_SIZE) {
        const chunk = allCompatRows.slice(i, i + BATCH_SIZE);
        const { error: compatError } = await supabaseAdmin
          .from('product_car_compatibility')
          .insert(chunk);
        if (compatError) {
          errors.push(`Compatibility batch insert error (chunk ${i}): ${compatError.message}`);
        }
      }
    }

    return NextResponse.json({
      updateCount,
      insertCount,
      errorCount: errors.length,
      errors: errors.slice(0, 20),
      message: `✅ تم تحديث ${updateCount} منتج وإضافة ${insertCount} جديد${errors.length > 0 ? ` | ⚠️ ${errors.length} أخطاء` : ''}`,
    });

  } catch (e: any) {
    console.error('Import route error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}