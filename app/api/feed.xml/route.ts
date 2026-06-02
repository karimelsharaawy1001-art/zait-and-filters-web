import { supabase } from '@/app/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true); // adjust based on your schema

  const items = products?.map((p) => {
    const price = p.sale_price > 0 ? p.sale_price : p.regular_price;
    return `
    <item>
      <g:id>${p.id}</g:id>
      <title>${escapeXml(p.name)}</title>
      <description>${escapeXml(p.description || p.name)}</description>
      <link>https://zaitandfilters.com/products/${p.id}</link>
      <g:image_link>${p.image_url}</g:image_link>
      <g:price>${price} EGP</g:price>
      <g:availability>in_stock</g:availability>
      <g:condition>new</g:condition>
      <g:brand>${escapeXml(p.brand || '')}</g:brand>
      <g:google_product_category>8236</g:google_product_category>
      <g:mpn>${escapeXml(p.part_number || p.id)}</g:mpn>
    </item>`;
  }).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>زيت اند فلترز</title>
    <link>https://zaitandfilters.com</link>
    <description>اكبر موقع في مصر لقطع غيار السيارات</description>
    ${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

function escapeXml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
