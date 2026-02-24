import { supabase } from '@/app/lib/supabase';

export const revalidate = 3600;

export async function GET() {
  const baseUrl = 'https://zaitandfilters.com';
  const batchSize = 1000;
  let allProducts: any[] = [];
  let from = 0;
  let hasMore = true;

  // ── Paginate through ALL products ──
  while (hasMore) {
    const { data, error } = await supabase
      .from('products')
      .select('id, updated_at, created_at')
      .range(from, from + batchSize - 1);

    if (error || !data || data.length === 0) {
      hasMore = false;
    } else {
      allProducts = [...allProducts, ...data];
      from += batchSize;
      if (data.length < batchSize) hasMore = false;
    }
  }

  const urls = allProducts
    .map((p) => {
      const lastmod = new Date(p.updated_at || p.created_at).toISOString();
      return `
    <url>
      <loc>${baseUrl}/products/${p.id}</loc>
      <lastmod>${lastmod}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>0.8</priority>
    </url>`;
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
