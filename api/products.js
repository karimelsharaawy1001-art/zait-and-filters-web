import admin from 'firebase-admin';
import axios from 'axios';

// --- GLOBAL CACHE ---
let globalProductCache = null;
let lastCacheUpdate = 0;
const CACHE_TTL = 15 * 60 * 1000; // 15 Minutes

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
            const listRes = await axios.get(`${REST_URL}/products?pageSize=300`, { timeout: 15000 });
            const products = (listRes.data.documents || []).map(mapRestDoc).filter(p => p && p.isActive !== false);

            const minimalProducts = products.map(p => ({
                id: p.id,
                name: p.name,
                nameEn: p.nameEn,
                make: p.make,
                car_make: p.car_make,
                model: p.model,
                car_model: p.car_model,
                category: p.category,
                subcategory: p.subcategory,
                partBrand: p.partBrand,
                price: p.price
            }));

            globalProductCache = minimalProducts;
            lastCacheUpdate = Date.now();
            return minimalProducts;
        } catch (e) {
            if (globalProductCache) return globalProductCache;
            throw e;
        }
    };

    try {
        const { action } = { ...req.query, ...req.body };

        if (action === 'getIndex') {
            try {
                const index = await fetchAllProducts();
                return res.status(200).json(index);
            } catch (idxErr) {
                console.error("getIndex failed:", idxErr.message);
                if (idxErr.response && idxErr.response.status === 429) {
                    return res.status(429).json({ error: "QUOTA_EXCEEDED" });
                }
                return res.status(500).json({ error: idxErr.message });
            }
        }

        if (action === 'chat') {
            const { language } = req.body || {};
            const isAR = language === 'ar';
            return res.status(200).json({
                response: isAR ? "أهلاً بك! معاك زيتون. كيف أساعدك اليوم؟" : "Hello! I'm Zeitoon. How can I help you?",
                state: 'idle'
            });
        }

        if (action === 'getMakes') {
            const products = await fetchAllProducts();
            const makes = [...new Set(products.map(p => p.make || p.car_make))].filter(Boolean).sort();
            return res.status(200).json(makes);
        }

        return res.status(400).json({ error: 'Invalid action' });
    } catch (err) {
        console.error("API Global Error:", err.message);
        return res.status(500).json({ error: err.message });
    }
}
