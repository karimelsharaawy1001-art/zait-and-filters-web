import { supabase } from '@/app/lib/supabase';

// ── Auto-updates every 6 hours — picks up new products automatically ──
export const revalidate = 21600;
export const dynamic = 'force-dynamic';

export async function GET() {
  const baseUrl = 'https://zaitandfilters.com';

  try {
    let allProducts: { id: string; updated_at: string; created_at: string }[] = [];
    let from = 0;
    const batchSize = 1000;

    // ── Paginate through ALL products in batches of 1000 ──
    while (true) {
      const { data, error } = await supabase
        .from('products')
        .select('id, updated_at, created_at')
        .eq('available', true)        // only available products
        .order('created_at', { ascending: false })
        .range(from, from + batchSize - 1);

      if (error) {
        console.error('Supabase error fetching products for sitemap:', error.message);
        break;
      }

      if (!data || data.length === 0) break;

      allProducts = [...allProducts, ...data];
      from += batchSize;

      if (data.length < batchSize) break; // last batch
    }

    // ── Fallback: if still empty, try without the available filter ──
    if (allProducts.length === 0) {
      const { data: fallback } = await supabase
        .from('products')
        .select('id, updated_at, created_at')
        .order('created_at', { ascending: false })
        .range(0, 999);

      if (fallback) allProducts = fallback;
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

    // ── Return a valid but minimal sitemap so Google doesn't error ──
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/store</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>`;

    return new Response(fallbackXml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
  }
}
