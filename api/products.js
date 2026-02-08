import axios from 'axios';

// --- GLOBAL CACHE ---
let globalProductCache = null;
let lastCacheUpdate = 0;
const CACHE_TTL = 30 * 60 * 1000; // 30 Minutes

// --- HELPERS ---
const sanitize = (v) => v ? String(v).replace(/^['"]|['"]$/g, '').trim() : '';

function mapRestDoc(doc) {
    if (!doc || !doc.fields) return null;
    const data = { id: doc.name.split('/').pop() };
    for (const [key, wrapper] of Object.entries(doc.fields)) {
        if (!wrapper) continue;
        if ('stringValue' in wrapper) data[key] = wrapper.stringValue;
        else if ('integerValue' in wrapper) data[key] = wrapper.integerValue;
        else if ('doubleValue' in wrapper) data[key] = wrapper.doubleValue;
        else if ('booleanValue' in wrapper) data[key] = wrapper.booleanValue;
        else if ('arrayValue' in wrapper) data[key] = (wrapper.arrayValue.values || []).map(v => Object.values(v)[0]);
        else if ('timestampValue' in wrapper) data[key] = wrapper.timestampValue;
        else {
            const vals = Object.values(wrapper);
            if (vals.length > 0) data[key] = vals[0];
        }
    }
    return data;
}

// 🛡️ REPAIR: Move fetchAllProducts to top-level function declaration to fix hoisting/500 errors
async function fetchAllProducts(REST_URL, API_KEY) {
    if (globalProductCache && (Date.now() - lastCacheUpdate < CACHE_TTL)) {
        return globalProductCache;
    }

    try {
        // Option A: Static Load
        try {
            const fs = await import('fs');
            const path = await import('path');
            const staticPath = path.join(process.cwd(), 'public', 'data', 'products-db.json');
            if (fs.existsSync(staticPath)) {
                const data = JSON.parse(fs.readFileSync(staticPath, 'utf8'));
                const minimal = data.map(p => ({
                    id: p.id || p.$id,
                    name: String(p.name || ''),
                    nameEn: String(p.nameEn || ''),
                    make: String(p.make || p.car_make || p.carMake || ''),
                    model: String(p.model || p.car_model || p.carModel || ''),
                    category: String(p.category || ''),
                    subcategory: String(p.subcategory || ''),
                    partBrand: String(p.partBrand || ''),
                    price: p.price
                }));
                globalProductCache = minimal;
                lastCacheUpdate = Date.now();
                return minimal;
            }
        } catch (staticErr) { }

        // Option B: REST API fetch
        let allMinimalProducts = [];
        let pageToken = null;
        do {
            const url = `${REST_URL}/products?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ''}${API_KEY ? `&key=${API_KEY}` : ''}`;
            const listRes = await axios.get(url, { timeout: 15000 });
            const documents = listRes.data.documents || [];
            const minimalPage = documents.map(mapRestDoc).filter(p => p && p.isActive !== false).map(p => ({
                id: p.id,
                name: String(p.name || ''),
                nameEn: String(p.nameEn || ''),
                make: String(p.make || p.car_make || p.carMake || ''),
                model: String(p.model || p.car_model || p.carModel || ''),
                category: String(p.category || ''),
                subcategory: String(p.subcategory || ''),
                partBrand: String(p.partBrand || ''),
                price: p.price
            }));
            allMinimalProducts = allMinimalProducts.concat(minimalPage);
            pageToken = listRes.data.nextPageToken;
        } while (pageToken);

        globalProductCache = allMinimalProducts;
        lastCacheUpdate = Date.now();
        return allMinimalProducts;
    } catch (e) {
        if (globalProductCache) return globalProductCache;
        throw e;
    }
}

export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        let body = {};
        if (req.body) {
            if (typeof req.body === 'string') {
                try { body = JSON.parse(req.body); } catch (e) { console.error("Body Parse Error:", e); }
            } else {
                body = req.body;
            }
        }

        const action = req.query.action || body.action;
        const PROJECT_ID = sanitize(process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'zaitandfilters');
        const API_KEY = sanitize(process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || '');
        const REST_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

        if (action === 'check-seo') {
            const tagName = body.tagName || req.query.tagName || 'google-site-verification';
            const expectedValue = body.expectedValue || req.query.expectedValue;

            try {
                const endpoint = process.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
                const projectId = process.env.VITE_APPWRITE_PROJECT_ID;
                const databaseId = process.env.VITE_APPWRITE_DATABASE_ID;
                const collectionId = process.env.VITE_APPWRITE_SETTINGS_COLLECTION_ID || 'settings';

                const url = `${endpoint}/databases/${databaseId}/collections/${collectionId}/documents/integrations`;
                const response = await axios.get(url, { headers: { 'X-Appwrite-Project': projectId } });
                const data = response.data;

                const tagMap = {
                    'google-site-verification': 'googleVerificationCode',
                    'facebook-pixel': 'facebookPixelId',
                    'google-analytics': 'googleAnalyticsId'
                };

                const fieldName = tagMap[tagName];
                if (!fieldName) return res.status(200).json({ status: 'unsupported_tag' });

                let savedValue = data[fieldName];
                if (!savedValue) return res.status(200).json({ status: 'not_found' });

                if (tagName === 'google-site-verification' && savedValue.includes('content="')) {
                    savedValue = savedValue.split('content="')[1].split('"')[0];
                }

                if (expectedValue && savedValue !== expectedValue) {
                    return res.status(200).json({ status: 'mismatch', found: savedValue });
                }

                return res.status(200).json({ status: 'found' });
            } catch (err) {
                return res.status(200).json({ status: 'error', msg: `Appwrite Error: ${err.response?.data?.message || err.message}` });
            }
        }

        if (action === 'verify-google') {
            const requestedFile = req.query.file;
            try {
                const endpoint = process.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
                const projectId = process.env.VITE_APPWRITE_PROJECT_ID;
                const databaseId = process.env.VITE_APPWRITE_DATABASE_ID;
                const collectionId = process.env.VITE_APPWRITE_SETTINGS_COLLECTION_ID || 'settings';

                const url = `${endpoint}/databases/${databaseId}/collections/${collectionId}/documents/integrations`;
                const response = await axios.get(url, { headers: { 'X-Appwrite-Project': projectId } });
                const data = response.data;
                const savedFileName = data.googleVerificationFileName || '';
                const savedContent = data.googleVerificationFileContent || '';

                if (savedFileName.startsWith(requestedFile)) {
                    res.setHeader('Content-Type', 'text/html');
                    return res.status(200).send(savedContent);
                }

                return res.status(404).send('Not Found');
            } catch (err) {
                return res.status(500).send('Verification Service Error');
            }
        }

        if (action === 'generateSitemap') {
            try {
                const products = await fetchAllProducts(REST_URL, API_KEY);
                const baseUrl = 'https://zaitandfilters.com';
                const today = new Date().toISOString().split('T')[0];

                let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url><loc>${baseUrl}/</loc><lastmod>${today}</lastmod><priority>1.0</priority></url>
    <url><loc>${baseUrl}/shop</loc><lastmod>${today}</lastmod><priority>0.9</priority></url>
    <url><loc>${baseUrl}/blog</loc><lastmod>${today}</lastmod><priority>0.8</priority></url>
    <url><loc>${baseUrl}/contact-us</loc><lastmod>${today}</lastmod><priority>0.5</priority></url>
    <url><loc>${baseUrl}/policy</loc><lastmod>${today}</lastmod><priority>0.3</priority></url>`;

                products.forEach(p => {
                    xml += `\n    <url><loc>${baseUrl}/product/${p.id}</loc><lastmod>${today}</lastmod><priority>0.7</priority></url>`;
                });

                xml += `\n</urlset>`;
                res.setHeader('Content-Type', 'text/xml');
                return res.status(200).send(xml);
            } catch (err) {
                console.error("Sitemap Error:", err);
                return res.status(500).send('Sitemap Generation Error');
            }
        }

        if (action === 'ping-sitemap') {
            const sitemapUrl = 'https://zaitandfilters.com/sitemap.xml';
            try {
                const googlePing = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
                const bingPing = `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;

                await Promise.allSettled([
                    axios.get(googlePing, { timeout: 5000 }),
                    axios.get(bingPing, { timeout: 5000 })
                ]);

                return res.status(200).json({ status: 'success', msg: 'Sitemap pinged to Google and Bing' });
            } catch (err) {
                return res.status(500).json({ status: 'error', msg: 'Failed to ping search engines' });
            }
        }

        if (action === 'getIndex') {
            const index = await fetchAllProducts(REST_URL, API_KEY);
            return res.status(200).json(index);
        }

        if (action === 'getMakes') {
            const products = await fetchAllProducts(REST_URL, API_KEY);
            const makes = [...new Set(products.map(p => p.make))].filter(Boolean).sort();
            return res.status(200).json(makes);
        }

        return res.status(400).json({ error: 'Invalid action', action });

    } catch (err) {
        console.error("CRITICAL HANDLER FAILURE:", err);
        return res.status(500).json({
            error: 'Critical Handler Failure',
            msg: err.message,
            stack: err.stack
        });
    }
}
