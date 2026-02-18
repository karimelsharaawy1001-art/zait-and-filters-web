import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // use anon key

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is required for /api/merchant-feed');
}

if (!supabaseKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required for /api/merchant-feed');
}

const supabase = createClient(supabaseUrl, supabaseKey);

const STORE_URL = 'https://zaitandfilters.com';

export async function GET() {
  try {
    const { data: products, error } = await supabase
      .from('products') // change if your table name is different
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Merchant feed Supabase error:', error);
      return new NextResponse('Feed error', { status: 500 });
    }

    const itemsXml = (products || [])
      .map((p: any) => {
        const id = p.id;
        const title = (p.name || '').trim();
        const description =
          (p.full_description || p.description || '').trim() ||
          `${title} - ${p.category || ''} ${p.subcategory || ''}`.trim();

        const price = (p.sale_price || p.price || p.regular_price || '0').trim();
        const availability =
          p.stock_quantity && p.stock_quantity > 0 ? 'in stock' : 'out of stock';

        // TODO: change to your real product URL pattern
        const url = `${STORE_URL}/product/${id}`;

        const imageUrl =
          p.image_url && p.image_url.trim()
            ? p.image_url
            : `${STORE_URL}/placeholder-product.png`;

        const brand = p.brand || 'Generic';
        const priceWithCurrency = `${price} EGP`;

        return `
        <item>
          <g:id>${escapeXml(id)}</g:id>
          <g:title>${escapeXml(title)}</g:title>
          <g:description>${escapeXml(description)}</g:description>
          <g:link>${escapeXml(url)}</g:link>
          <g:image_link>${escapeXml(imageUrl)}</g:image_link>
          <g:availability>${availability}</g:availability>
          <g:price>${priceWithCurrency}</g:price>
          <g:condition>new</g:condition>
          <g:brand>${escapeXml(brand)}</g:brand>
          <g:google_product_category>888</g:google_product_category>
        </item>
      `;
      })
      .join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Zait & Filters Products</title>
    <link>${STORE_URL}</link>
    <description>Product feed for Zait & Filters</description>
    ${itemsXml}
  </channel>
</rss>`;

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
      },
    });
  } catch (e) {
    console.error('Merchant feed unexpected error:', e);
    return new NextResponse('Feed error', { status: 500 });
  }
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
