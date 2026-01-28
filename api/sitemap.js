// Serverless function to generate a dynamic sitemap.xml
// Fetches all active products from Firestore via REST API

const BASE_URL = 'https://zait-and-filters-web.vercel.app';

// Fetch all active products from Firestore using REST API
async function fetchAllProducts(apiKey, projectId) {
    let products = [];
    let pageToken = null;

    try {
        do {
            const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/products?key=${apiKey}&pageSize=100${pageToken ? `&pageToken=${pageToken}` : ''}`;
            const response = await fetch(firestoreUrl);

            if (!response.ok) {
                console.error(`[Sitemap] Firestore API error: ${response.status}`);
                break;
            }

            const data = await response.json();

            if (data.documents) {
                const fetched = data.documents
                    .map(doc => {
                        const id = doc.name.split('/').pop();
                        const fields = doc.fields;
                        const isActive = fields.isActive?.booleanValue ?? false;
                        const updatedAt = doc.updateTime;

                        return isActive ? { id, updatedAt } : null;
                    })
                    .filter(Boolean);

                products = [...products, ...fetched];
            }

            pageToken = data.nextPageToken;
        } while (pageToken);

        return products;
    } catch (error) {
        console.error('[Sitemap] Error fetching products:', error);
        return [];
    }
}

// Fetch all active blog posts from Firestore
async function fetchAllPosts(apiKey, projectId) {
    try {
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/blog_posts?key=${apiKey}&pageSize=100`;
        const response = await fetch(firestoreUrl);
        if (!response.ok) return [];
        const data = await response.json();
        if (!data.documents) return [];
        return data.documents
            .map(doc => {
                const fields = doc.fields;
                const isActive = fields.isActive?.booleanValue ?? false;
                const slug = fields.slug?.stringValue ?? doc.name.split('/').pop();
                const updatedAt = doc.updateTime;
                return isActive ? { slug, updatedAt } : null;
            })
            .filter(Boolean);
    } catch (error) {
        console.error('[Sitemap] Error fetching posts:', error);
        return [];
    }
}

export default async function handler(req, res) {
    const apiKey = process.env.VITE_FIREBASE_API_KEY;
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'zaitandfilters';

    if (!apiKey) {
        return res.status(500).send('API Key not configured');
    }

    const [products, posts] = await Promise.all([
        fetchAllProducts(apiKey, projectId),
        fetchAllPosts(apiKey, projectId)
    ]);

    const staticPages = [
        '',
        '/shop',
        '/oil-advisor',
        '/contact',
        '/blog',
        '/about',
        '/garage',
        '/cart'
    ];

    const today = new Date().toISOString().split('T')[0];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <!-- Static Pages -->
    ${staticPages.map(page => `
    <url>
        <loc>${BASE_URL}${page}</loc>
        <lastmod>${today}</lastmod>
        <changefreq>daily</changefreq>
        <priority>${page === '' ? '1.0' : '0.8'}</priority>
    </url>`).join('')}
    
    <!-- Dynamic Products -->
    ${products.map(product => `
    <url>
        <loc>${BASE_URL}/product/${product.id}</loc>
        <lastmod>${product.updatedAt ? product.updatedAt.split('T')[0] : today}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.7</priority>
    </url>`).join('')}

    <!-- Dynamic Blog Posts -->
    ${posts.map(post => `
    <url>
        <loc>${BASE_URL}/blog/${post.slug}</loc>
        <lastmod>${post.updatedAt ? post.updatedAt.split('T')[0] : today}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.6</priority>
    </url>`).join('')}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=43200'); // Cache for 24 hours
    return res.status(200).send(xml);
}
