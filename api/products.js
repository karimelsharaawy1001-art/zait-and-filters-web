import admin from 'firebase-admin';
import axios from 'axios';

// Initialize Firebase Admin
if (!admin.apps.length) {
    try {
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } else {
            admin.initializeApp();
        }
    } catch (error) {
        console.error('Firebase Admin initialization failed:', error);
    }
}

const db = admin.firestore();

// Helper to escape XML
function escapeXml(unsafe) {
    if (!unsafe) return '';
    return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

export default async function handler(req, res) {
    const { action, make, model, productId, category, email, firstName, lastName, targetUrl, tagName, expectedValue } = { ...req.query, ...req.body };
    const BASE_URL = 'https://zait-and-filters-web.vercel.app';

    try {
        const productsRef = db.collection('products');
        let productsQuery = productsRef.where('isActive', '==', true);

        // --- 1. SEO CHECK (Merged from check-seo.js) ---
        if (action === 'check-seo') {
            if (!targetUrl || !tagName) {
                return res.status(400).json({ error: 'Missing targetUrl or tagName' });
            }

            try {
                const response = await axios.get(targetUrl, {
                    timeout: 8000,
                    headers: { 'User-Agent': 'Mozilla/5.0 (Vercel-SEO-Checker)' }
                });

                const html = response.data;
                let match;

                if (tagName === 'facebook-pixel') {
                    const pixelRegex = new RegExp(`fbq\\(['"]init['"]\\s*,\\s*['"](\\d+)['"]\\)`, 'i');
                    match = html.match(pixelRegex);
                } else if (tagName === 'google-analytics') {
                    const gaRegex = new RegExp(`googletagmanager\\.com/gtag/js\\?id=([G|UA]-[A-Z0-9-]+)`, 'i');
                    const gaConfigRegex = new RegExp(`gtag\\(['"]config['"]\\s*,\\s*['"]([G|UA]-[A-Z0-9-]+)['"]\\)`, 'i');
                    match = html.match(gaRegex) || html.match(gaConfigRegex);
                } else if (tagName === 'mailchimp') {
                    return res.status(200).json({ status: 'simulation_active' });
                } else {
                    const metaRegex = new RegExp(`<meta[^>]*name=["']${tagName}["'][^>]*content=["']([^"']+)["']`, 'i');
                    const altMetaRegex = new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']${tagName}["']`, 'i');
                    match = html.match(metaRegex) || html.match(altMetaRegex);
                }

                if (match) {
                    const foundValue = match[1];
                    if (expectedValue && foundValue !== expectedValue) {
                        return res.status(200).json({ status: 'mismatch', found: foundValue, expected: expectedValue });
                    }
                    return res.status(200).json({ status: 'found', value: foundValue });
                }
                return res.status(200).json({ status: 'not_found' });
            } catch (error) {
                return res.status(500).json({ error: 'SEO Check Failed', details: error.message });
            }
        }

        // --- 2. MAILCHIMP (Merged from mailchimp-subscribe.js) ---
        if (action === 'subscribe') {
            if (!email) return res.status(400).json({ error: 'Email is required' });

            const docSnap = await db.collection('settings').doc('integrations').get();
            if (!docSnap.exists) return res.status(404).json({ error: 'Mailchimp not configured' });

            const data = docSnap.data();
            const apiKey = data.mailchimpApiKey;
            const audienceId = data.mailchimpAudienceId;
            if (!apiKey || !audienceId) return res.status(400).json({ error: 'Mailchimp credentials missing' });

            const dc = apiKey.split('-')[1];
            const url = `https://${dc}.api.mailchimp.com/3.0/lists/${audienceId}/members`;

            try {
                await axios.post(url, {
                    email_address: email,
                    status: 'subscribed',
                    merge_fields: { FNAME: firstName || '', LNAME: lastName || '' }
                }, {
                    headers: { Authorization: `apikey ${apiKey}` }
                });
                return res.status(200).json({ success: true });
            } catch (error) {
                if (error.response?.data?.title === 'Member Exists') return res.status(200).json({ success: true, message: 'Existing' });
                return res.status(500).json({ error: 'Subscription failed' });
            }
        }

        // --- 3. PRODUCT FEED (Merged from product-feed.js) ---
        if (action === 'generateFeed') {
            const platform = req.query.platform || 'google'; // 'google' or 'facebook'
            const snapshot = await productsRef.where('isActive', '==', true).get();
            const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const baseUrl = 'https://zaitandfilters.com';
            let xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>Zait &amp; Filters</title><link>${baseUrl}</link>`;

            products.forEach(p => {
                const title = escapeXml(`${p.partBrand || ''} ${p.name || ''}`.trim());
                const availability = p.stock > 0 ? (platform === 'facebook' ? 'in stock' : 'in_stock') : (platform === 'facebook' ? 'out of stock' : 'out_of_stock');
                xml += `<item>
                    <g:id>${p.id}</g:id>
                    <g:title>${title}</g:title>
                    <g:link>${baseUrl}/product/${p.id}</g:link>
                    <g:image_link>${escapeXml(p.image || p.imageUrl)}</g:image_link>
                    <g:availability>${availability}</g:availability>
                    <g:price>${p.price || 0} EGP</g:price>
                    <g:brand>${escapeXml(p.partBrand || 'Generic')}</g:brand>
                    <g:condition>new</g:condition>
                </item>`;
            });

            xml += `</channel></rss>`;
            res.setHeader('Content-Type', 'application/xml');
            return res.status(200).send(xml);
        }

        // --- 4. SITEMAP (Merged from sitemap.js) ---
        if (action === 'generateSitemap') {
            const [productsSnap, postsSnap] = await Promise.all([
                productsRef.where('isActive', '==', true).get(),
                db.collection('blog_posts').where('isActive', '==', true).get()
            ]);

            const staticPages = ['', '/shop', '/oil-advisor', '/contact', '/blog', '/about', '/garage', '/cart'];
            const today = new Date().toISOString().split('T')[0];

            let xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

            staticPages.forEach(p => {
                xml += `<url><loc>${BASE_URL}${p}</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>${p === '' ? '1.0' : '0.8'}</priority></url>`;
            });

            productsSnap.docs.forEach(doc => {
                const data = doc.data();
                xml += `<url><loc>${BASE_URL}/product/${doc.id}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`;
            });

            postsSnap.docs.forEach(doc => {
                const data = doc.data();
                xml += `<url><loc>${BASE_URL}/blog/${data.slug || doc.id}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>`;
            });

            xml += `</urlset>`;
            res.setHeader('Content-Type', 'application/xml');
            return res.status(200).send(xml);
        }

        // --- 5. ORIGINAL PRODUCT ACTIONS ---
        if (action === 'getMakes') {
            const snapshot = await productsQuery.get();
            const rawData = snapshot.docs.map(doc => doc.data());
            const makes = [...new Set(rawData.map(d => d.make || d.car_make || d.carMake))].filter(Boolean).sort();
            return res.status(200).json(makes);
        }

        if (action === 'getModels' && make) {
            const snapshot = await productsQuery.where('make', '==', make).get();
            const snapshotAlt = await productsQuery.where('car_make', '==', make).get();
            const rawData = [...snapshot.docs.map(d => d.data()), ...snapshotAlt.docs.map(d => d.data())];
            const models = [...new Set(rawData.map(d => d.model || d.car_model))].filter(Boolean).sort();
            return res.status(200).json(models);
        }

        if (action === 'getYears' && make && model) {
            const snapshot = await productsQuery.where('make', '==', make).where('model', '==', model).get();
            const snapshotAlt = await productsQuery.where('car_make', '==', make).where('car_model', '==', model).get();
            const docs = [...snapshot.docs, ...snapshotAlt.docs];
            const years = new Set();
            docs.forEach(doc => {
                const data = doc.data();
                if (data.yearStart && data.yearEnd) {
                    for (let y = Number(data.yearStart); y <= Number(data.yearEnd); y++) years.add(y);
                } else if (data.yearStart) years.add(Number(data.yearStart));
            });
            return res.status(200).json(Array.from(years).sort((a, b) => b - a));
        }

        if (action === 'getRelated' && productId) {
            let related = [];
            const seen = new Set([productId]);
            const add = (snap) => snap.docs.forEach(d => { if (!seen.has(d.id)) { related.push({ id: d.id, ...d.data() }); seen.add(d.id); } });

            if (make && model && make !== 'Universal') {
                const s = await productsRef.where('isActive', '==', true).where('make', '==', make).where('model', '==', model).limit(8).get();
                add(s);
            }
            if (related.length < 8 && category) {
                const s = await productsRef.where('isActive', '==', true).where('category', '==', category).limit(8).get();
                add(s);
            }
            if (related.length < 4) {
                const s = await productsRef.where('isActive', '==', true).limit(8).get();
                add(s);
            }
            return res.status(200).json(related.slice(0, 8));
        }

        return res.status(400).json({ error: 'Invalid action' });
    } catch (error) {
        console.error('API Error:', error);
        return res.status(200).json([]);
    }
}
