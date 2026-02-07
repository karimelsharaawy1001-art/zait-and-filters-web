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
        else if ('integerValue' in wrapper) data[key] = parseInt(wrapper.integerValue);
        else if ('doubleValue' in wrapper) data[key] = parseFloat(wrapper.doubleValue);
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

export default async function handler(req, res) {
    // CORS Headers - Essential for all responses
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        // 1. Better Body Parsing for Vercel
        let body = {};
        if (req.body) {
            if (typeof req.body === 'string') {
                try { body = JSON.parse(req.body); } catch (e) { console.error("Body Parse Error:", e); }
            } else {
                body = req.body;
            }
        }

        // 2. Action Detection
        const action = req.query.action || body.action;

        // 3. Environment (Check both VITE_ and standard)
        const PROJECT_ID = sanitize(process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'zaitandfilters');
        const API_KEY = sanitize(process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || '');
        const REST_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

        if (action === 'check-seo') {
            const tagName = body.tagName || req.query.tagName || 'google-site-verification';
            const expectedValue = body.expectedValue || req.query.expectedValue;
            const targetUrl = body.targetUrl || req.query.targetUrl;

            if (!targetUrl) return res.status(400).json({ error: 'targetUrl is required' });

            try {
                // Fetch the actual homepage to see if the tag is injected
                const siteRes = await axios.get(targetUrl, {
                    timeout: 8000,
                    headers: { 'User-Agent': 'ZaitFilters-SEO-Bot/1.0' }
                });
                const html = siteRes.data;

                // Regex to find the meta tag regardless of attribute order
                const regex = new RegExp(`<meta[^>]*name=["']${tagName}["'][^>]*content=["']([^"']*)["']`, 'i');
                const altRegex = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${tagName}["']`, 'i');

                const match = html.match(regex) || html.match(altRegex);

                if (!match) {
                    return res.status(200).json({ status: 'not_found' });
                }

                const foundValue = match[1];
                if (expectedValue && foundValue !== expectedValue) {
                    return res.status(200).json({ status: 'mismatch', found: foundValue });
                }

                return res.status(200).json({ status: 'found' });
            } catch (err) {
                return res.status(200).json({
                    status: 'error',
                    msg: `Failed to fetch site: ${err.message}`
                });
            }
        }

        // --- PRODUCT ACTIONS (Cached) ---
        const fetchAllProducts = async () => {
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
                            id: p.id,
                            name: String(p.name || ''),
                            nameEn: String(p.nameEn || ''),
                            make: String(p.make || p.car_make || ''),
                            model: String(p.model || p.car_model || ''),
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
                        make: String(p.make || p.car_make || ''),
                        model: String(p.model || p.car_model || ''),
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
        };

        if (action === 'getIndex') {
            const index = await fetchAllProducts();
            return res.status(200).json(index);
        }

        if (action === 'getMakes') {
            const products = await fetchAllProducts();
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
