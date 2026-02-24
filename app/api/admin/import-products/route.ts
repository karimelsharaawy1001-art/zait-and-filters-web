import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ── Cleans a single value: converts "null", "", undefined → null ──────────────
function clean(val: any): any {
  if (val === undefined) return null;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed === '' || trimmed.toLowerCase() === 'null') return null;
    return trimmed;
  }
  return val;
}

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { products } = await req.json();

    let updateCount = 0;
    let insertCount = 0;
    const errors: string[] = [];

    for (const product of products) {
      const { id, ...rawData } = product;

      // ── Clean every field: turn "null" strings and "" into actual null ────
      const cleanData: any = {};
      for (const [key, val] of Object.entries(rawData)) {
        cleanData[key] = clean(val);
      }

      // ── Also clean numeric fields properly ────────────────────────────────
      if (cleanData.regular_price !== null) {
        const n = parseFloat(cleanData.regular_price);
        cleanData.regular_price = isNaN(n) ? null : n;
      }
      if (cleanData.sale_price !== null) {
        const n = parseFloat(cleanData.sale_price);
        cleanData.sale_price = isNaN(n) ? null : n;
      }
      if (cleanData.is_active !== null && cleanData.is_active !== undefined) {
        cleanData.is_active = cleanData.is_active === true ||
          cleanData.is_active === 1 ||
          cleanData.is_active === '1' ||
          String(cleanData.is_active).toLowerCase() === 'true';
      }

      const cleanId = clean(id);

      if (cleanId && String(cleanId).length > 10) {
        // ── Check if row exists ───────────────────────────────────────────
        const { data: existing, error: fetchError } = await supabaseAdmin
          .from('products')
          .select('id')
          .eq('id', cleanId)
          .maybeSingle();

        if (fetchError) {
          errors.push(`خطأ في البحث عن id ${cleanId}: ${fetchError.message}`);
          continue;
        }

        if (existing) {
          // ── UPDATE ───────────────────────────────────────────────────────
          const { error: updateError } = await supabaseAdmin
            .from('products')
            .update(cleanData)
            .eq('id', cleanId);

          if (updateError) {
            errors.push(`خطأ في التحديث ${cleanId}: ${updateError.message}`);
          } else {
            updateCount++;
          }
        } else {
          // ── INSERT with provided id ───────────────────────────────────────
          const { error: insertError } = await supabaseAdmin
            .from('products')
            .insert([{ id: cleanId, ...cleanData }]);

          if (insertError) {
            errors.push(`خطأ في الإضافة ${cleanData.name}: ${insertError.message}`);
          } else {
            insertCount++;
          }
        }
      } else {
        // ── INSERT new product (no id) ────────────────────────────────────
        const { error: insertError } = await supabaseAdmin
          .from('products')
          .insert([cleanData]);

        if (insertError) {
          errors.push(`خطأ في الإضافة ${cleanData.name}: ${insertError.message}`);
        } else {
          insertCount++;
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