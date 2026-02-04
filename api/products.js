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

    const fetchAllProducts = async (isMinimal = false) => {
        if (globalProductCache && (Date.now() - lastCacheUpdate < CACHE_TTL)) {
            return globalProductCache;
        }

        try {
            // Fetch more for the index to ensure full coverage
            const listRes = await axios.get(`${REST_URL}/products?pageSize=300`, { timeout: 15000 });
            const products = (listRes.data.documents || []).map(mapRestDoc).filter(p => p && p.isActive !== false);

            // Minimal version for client-side search to save bandwidth
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
            console.error("Fetch Error:", e.message);
            if (globalProductCache) return globalProductCache;
            throw e;
        }
    };

    try {
        const { action } = { ...req.query, ...req.body };

        // 1. --- NEW ACTION: getIndex ---
        // Provides the full product list for client-side search
        if (action === 'getIndex') {
            const index = await fetchAllProducts();
            return res.status(200).json(index);
        }

        // 2. --- CHAT ACTION (Stateless/Routing) ---
        if (action === 'chat') {
            const { language } = req.body || {};
            const isAR = language === 'ar';

            // We still provide basic routing/formatting if needed, 
            // but the SEARCH logic itself will move to ChatWidget.jsx
            return res.status(200).json({
                response: isAR ? "وصلت! أقدر أساعدك في إيه؟" : "How can I help you today?",
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
        console.error("API Error:", err.message);
        return res.status(200).json({
            response: "Search is temporarily limited. Please try again in 5 minutes.",
            state: 'idle'
        });
    }
}
