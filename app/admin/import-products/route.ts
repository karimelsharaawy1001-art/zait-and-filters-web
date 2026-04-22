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


    let updateCount   = 0;
    let insertCount   = 0;
    let deleteCount   = 0;  // ✅ NEW
    let noMatchCount  = 0;
    const errors: string[] = [];


    for (const product of products) {
      const { id, ...productData } = product;

      // ── ✅ DELETE: if the row is marked for deletion, remove it and skip ──
      const shouldDelete =
        productData.delete === true ||
        String(productData.delete).trim().toLowerCase() === 'true' ||
        String(productData.delete).trim().toLowerCase() === 'yes' ||
        String(productData.delete).trim() === '1';

      if (shouldDelete) {
        if (!id || String(id).trim().length <= 10) {
          errors.push(`Delete skipped: no valid ID provided for "${productData.name || 'unknown'}"`);
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
        continue; // skip update/insert logic entirely
      }


      // ── Clean up productData: remove undefined/empty string fields
      // so we don't overwrite good data with blanks
      const cleanData: any = {};
      for (const [key, val] of Object.entries(productData)) {
        if (val !== undefined && val !== '') {
          cleanData[key] = val;
        }
      }


      if (id && String(id).trim().length > 10) {
        // ── FIX: check if the row actually exists before updating ──
        const { data: existing, error: fetchError } = await supabaseAdmin
          .from('products')
          .select('id')
          .eq('id', id.trim())
          .maybeSingle();


        if (fetchError) {
          errors.push(`Fetch error for id ${id}: ${fetchError.message}`);
          continue;
        }


        if (existing) {
          // Row exists → update it
          const { error: updateError } = await supabaseAdmin
            .from('products')
            .update(cleanData)
            .eq('id', id.trim());


          if (updateError) {
            errors.push(`Update error for id ${id}: ${updateError.message}`);
          } else {
            updateCount++;
          }
        } else {
          // ID was provided but doesn't exist in DB → insert as new
          const { error: insertError } = await supabaseAdmin
            .from('products')
            .insert([{ id: id.trim(), ...cleanData }]);


          if (insertError) {
            errors.push(`Insert error (with id) for ${cleanData.name}: ${insertError.message}`);
          } else {
            insertCount++;
          }
        }
      } else {
        // No ID → insert as new product
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
      deleteCount,  // ✅ NEW
      noMatchCount,
      errors,
      message: `✅ تم تحديث ${updateCount} منتج، إضافة ${insertCount} جديد، وحذف ${deleteCount} منتج${errors.length > 0 ? ` مع ${errors.length} خطأ` : ''}`,
    });


  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}