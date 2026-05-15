import { supabase } from '@/app/lib/supabase';
import { NextResponse } from 'next/server';

const BASE_URL = 'https://zaitandfilters.com';

export async function GET() {
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .limit(50000);

  const escapeXml = (str: string | null | undefined) =>
    (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const items = (products || []).map((p) => {
    const slug = p.slug || p.id;
    const price = p.sale_price || p.regular_price || 0;
    const brand = p.brand || 'Generic';
    const image = p.image_url || `${BASE_URL}/og-image.jpg`;

    return `
      <item>
        <g:id>${escapeXml(p.id)}</g:id>
        <g:title>${escapeXml(p.name)}</g:title>
        <g:description>${escapeXml(p.description || `${p.name} ماركة ${brand} متوفرة في زيت أند فلترز`)}</g:description>
        <g:link>${escapeXml(`${BASE_URL}/products/${slug}`)}</g:link>
        <g:image_link>${escapeXml(image)}</g:image_link>
        <g:condition>new</g:condition>
        <g:availability>in_stock</g:availability>
        <g:price>${price.toFixed(2)} EGP</g:price>
        <g:brand>${escapeXml(brand)}</g:brand>
        <g:mpn>${escapeXml(p.part_number || p.id)}</g:mpn>
        <g:product_type>${escapeXml(p.category)} &gt; ${escapeXml(p.subcategory || '')}</g:product_type>
        <g:google_product_category>923</g:google_product_category>
        <g:shipping>
          <g:country>EG</g:country>
          <g:service>Standard</g:service>
          <g:price>60.00 EGP</g:price>
        </g:shipping>
      </item>
    `;
  }).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Zait and Filters</title>
    <link>${BASE_URL}</link>
    <description>قطع غيار وزيوت أصلية في مصر</description>
    ${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}