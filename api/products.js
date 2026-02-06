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
        if ('stringValue' in wrapper) data[key] = wrapper.stringValue;
        else if ('integerValue' in wrapper) data[key] = parseInt(wrapper.integerValue);
        else if ('doubleValue' in wrapper) data[key] = parseFloat(wrapper.doubleValue);
        else if ('booleanValue' in wrapper) data[key] = wrapper.booleanValue;
        else if ('arrayValue' in wrapper) data[key] = (wrapper.arrayValue.values || []).map(v => Object.values(v)[0]);
        else if ('timestampValue' in wrapper) data[key] = wrapper.timestampValue;
        else data[key] = Object.values(wrapper)[0];
    }
    return data;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const PROJECT_ID = sanitize(process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'zaitandfilters');
    const REST_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

    const fetchAllProducts = async () => {
        if (globalProductCache && (Date.now() - lastCacheUpdate < CACHE_TTL)) {
            return globalProductCache;
        }

        try {
            // Try to load from static JSON if it exists
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

            // Fallback to Firestore REST API
            let allMinimalProducts = [];
            let pageToken = null;
            do {
                const url = `${REST_URL}/products?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ''}`;
                const listRes = await axios.get(url, { timeout: 20000 });
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

    try {
        const { action } = { ...req.query, ...req.body };

        if (action === 'getIndex') {
            const index = await fetchAllProducts();
            return res.status(200).json(index);
        }

        if (action === 'getMakes') {
            const products = await fetchAllProducts();
            const makes = [...new Set(products.map(p => p.make))].filter(Boolean).sort();
            return res.status(200).json(makes);
        }

        if (action === 'check-seo') {
            const { tagName, expectedValue } = req.body;
            try {
                // Fetch settings using REST API (Avoid service account issues)
                const settingsUrl = `${REST_URL}/settings/integrations`;
                const settingsRes = await axios.get(settingsUrl);
                const settings = mapRestDoc(settingsRes.data) || {};

                if (tagName === 'google-analytics') {
                    const savedId = settings.googleAnalyticsId;
                    if (!savedId) return res.status(200).json({ status: 'not_found' });
                    if (expectedValue && savedId !== expectedValue) return res.status(200).json({ status: 'mismatch' });
                    return res.status(200).json({ status: 'found' });
                }

                return res.status(400).json({ error: 'Unsupported tag check' });
            } catch (err) {
                if (err.response && err.response.status === 404) {
                    return res.status(200).json({ status: 'not_found' });
                }
                return res.status(500).json({ error: err.message });
            }
        }

        return res.status(400).json({ error: 'Invalid action' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
