import { supabase } from '@/app/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 21600; // auto-refresh every 6 hours

export async function GET() {
  const baseUrl = 'https://zaitandfilters.com';

  try {
    let allProducts: { id: string; updated_at: string; created_at: string }[] = [];
    let from = 0;
    const batchSize = 1000;

    // ── Paginate through ALL 12K+ products in batches of 1000 ──
    while (true) {
      const { data, error } = await supabase
        .from('products')
        .select('id, updated_at, created_at')
        .order('created_at', { ascending: false })
        .range(from, from + batchSize - 1);

      if (error || !data || data.length === 0) break;

      allProducts = [...allProducts, ...data];
      from += batchSize;

      if (data.length < batchSize) break;
    }

    const urls = allProducts
      .map((p) => {
        const lastmod = new Date(p.updated_at || p.created_at || new Date()).toISOString();
        return `  <url>
    <loc>${baseUrl}/products/${p.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
      })
      .join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=21600, stale-while-revalidate=86400',
      },
    });

  } catch (err: any) {
    console.error('Sitemap generation failed:', err.message);
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`, {
      status: 200,
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
  }
}
