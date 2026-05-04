import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ─── Slug Generator ─────────────────────────────────────────────
function generateSlug(name: string, brand: string, carMake: string, carModel: string, id: string): string {
  const base = [brand, carMake, carModel, name]
    .filter(Boolean)
    .join('-')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')      // remove special chars
    .replace(/\s+/g, '-')           // spaces to hyphens
    .replace(/-+/g, '-');           // collapse multiple hyphens
  
  // Add short ID suffix to guarantee uniqueness
  const shortId = id.slice(0, 8);
  return `${base}-${shortId}`;
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

      // Find delete column safely
      const deleteKey = Object.keys(productData).find(
        (k) => k.toLowerCase().trim() === 'delete'
      );

      const deleteValue =
        deleteKey !== undefined ? (productData as any)[deleteKey] : undefined;

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

      // ─── GENERATE SLUG ──────────────────────────────────────
      const productId = id && String(id).trim().length > 10 
        ? String(id).trim() 
        : crypto.randomUUID();
      
      cleanData.slug = generateSlug(
        cleanData.name || '',
        cleanData.brand || '',
        cleanData.car_make || '',
        cleanData.car_model || '',
        productId
      );

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
          .insert([{ id: productId, ...cleanData }]);

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