import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { products } = await req.json();

    let updateCount = 0;
    let insertCount = 0;
    let deleteCount = 0;
    let noMatchCount = 0;
    const errors: string[] = [];

    for (const product of products) {
      const { id, ...productData } = product;

      // Find delete column safely, even if header has spaces or different case
      const deleteKey = Object.keys(productData).find(
        (k) => k.toLowerCase().trim() === 'delete'
      );

      const deleteValue =
        deleteKey !== undefined ? (productData as any)[deleteKey] : undefined;

      // Delete only if value is clearly marked
      const shouldDelete =
        deleteValue === true ||
        deleteValue === 1 ||
        String(deleteValue ?? '').trim().toLowerCase() === 'true' ||
        String(deleteValue ?? '').trim().toLowerCase() === 'yes' ||
        String(deleteValue ?? '').trim() === '1';

      if (shouldDelete) {
        if (!id || String(id).trim().length <= 10) {
          errors.push(
            `Delete skipped: no valid ID provided for "${productData.name || 'unknown'}"`
          );
          continue;
        }

        const { error: deleteError } = await supabaseAdmin
          .from('products')
          .delete()
          .eq('id', String(id).trim());

        if (deleteError) {
          errors.push(`Delete error for id ${id}: ${deleteError.message}`);
        } else {
          deleteCount++;
        }

        continue;
      }

      // Clean data and NEVER send delete column to Supabase
      const cleanData: any = {};
      for (const [key, val] of Object.entries(productData)) {
        if (key.toLowerCase().trim() === 'delete') continue;

        if (key === 'active' && (val === undefined || val === '' || val === null)) {
          cleanData[key] = 0;
        } else if (val !== undefined && val !== '') {
          cleanData[key] = val;
        }
      }

      if (id && String(id).trim().length > 10) {
        const { data: existing, error: fetchError } = await supabaseAdmin
          .from('products')
          .select('id')
          .eq('id', String(id).trim())
          .maybeSingle();

        if (fetchError) {
          errors.push(`Fetch error for id ${id}: ${fetchError.message}`);
          continue;
        }

        if (existing) {
          const { error: updateError } = await supabaseAdmin
            .from('products')
            .update(cleanData)
            .eq('id', String(id).trim());

          if (updateError) {
            errors.push(`Update error for id ${id}: ${updateError.message}`);
          } else {
            updateCount++;
          }
        } else {
          const { error: insertError } = await supabaseAdmin
            .from('products')
            .insert([{ id: String(id).trim(), ...cleanData }]);

          if (insertError) {
            errors.push(`Insert error (with id) for ${cleanData.name}: ${insertError.message}`);
          } else {
            insertCount++;
          }
        }
      } else {
        const { error: insertError } = await supabaseAdmin
          .from('products')
          .insert([cleanData]);

        if (insertError) {
          errors.push(`Insert error for ${cleanData.name}: ${insertError.message}`);
        } else {
          insertCount++;
        }
      }
    }

    return NextResponse.json({
      updateCount,
      insertCount,
      deleteCount,
      noMatchCount,
      errors,
      message: `✅ تم تحديث ${updateCount} منتج، إضافة ${insertCount} جديد، وحذف ${deleteCount} منتج${errors.length > 0 ? ` مع ${errors.length} خطأ` : ''}`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}