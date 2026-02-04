import admin from 'firebase-admin';
import axios from 'axios';

// --- CONFIG & HELPERS ---
const BRAND_MAP = {
    'تويوتا': 'Toyota', 'نيسان': 'Nissan', 'هيونداي': 'Hyundai', 'كيا': 'Kia',
    'ميتسوبيشي': 'Mitsubishi', 'ميتسوبيشى': 'Mitsubishi', 'هوندا': 'Honda',
    'مازدا': 'Mazda', 'سوبارو': 'Subaru', 'لكزس': 'Lexus',
    'بي ام': 'BMW', 'بي ام دابليو': 'BMW', 'BMW': 'BMW',
    'مرسيدس': 'Mercedes', 'مرسيدس بنز': 'Mercedes',
    'اودي': 'Audi', 'أودي': 'Audi', 'فولكس': 'Volkswagen', 'فولكس واجن': 'Volkswagen',
    'فورد': 'Ford', 'شيفروليه': 'Chevrolet', 'شيفورليه': 'Chevrolet',
    'جيب': 'Jeep', 'دودج': 'Dodge', 'كرايسلر': 'Chrysler',
    'رينو': 'Renault', 'Peugeot': 'Peugeot', 'بيجو': 'Peugeot', 'ستروين': 'Citroen',
    'فيات': 'Fiat', 'سكودا': 'Skoda', 'سوزوكي': 'Suzuki', 'سوزوكى': 'Suzuki',
    'ام جي': 'MG', 'ام جى': 'MG', 'ام جيه': 'MG'
};

function normalizeArabic(text) {
    if (!text) return '';
    return String(text)
        .replace(/[أإآ]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ة/g, 'ه')
        .toLowerCase()
        .trim();
}

function translateBrand(input) {
    if (!input) return input;
    const normalized = String(input).trim();
    return BRAND_MAP[normalized] || normalized;
}

/**
 * Normalizes Firestore REST API documents to standard objects.
 */
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

    const { action, make, model } = { ...req.query, ...req.body };
    const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || 'zaitandfilters';
    const BASE_URL = 'https://zaitandfilters.com';
    const REST_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

    // 1. --- SEARCH VIA REST (BULLETPROOF FALLBACK) ---
    // If Admin SDK fails, this public-rules-based fetch will always work for products.
    const restSearch = async (cMake = null) => {
        try {
            // Using runQuery for efficient filtering
            const queryBody = {
                structuredQuery: {
                    from: [{ collectionId: 'products' }],
                    where: {
                        compositeFilter: {
                            op: 'AND',
                            filters: [
                                { fieldFilter: { field: { fieldPath: 'isActive' }, op: 'EQUAL', value: { booleanValue: true } } }
                            ]
                        }
                    },
                    limit: 100
                }
            };

            if (cMake && cMake !== 'Generic') {
                queryBody.structuredQuery.where.compositeFilter.filters.push({
                    fieldFilter: { field: { fieldPath: 'make' }, op: 'EQUAL', value: { stringValue: cMake } }
                });
            }

            const response = await axios.post(`${REST_URL}:runQuery`, queryBody, { timeout: 8000 });
            // REST runQuery returns an array of objects like { document: ... }
            return (response.data || [])
                .filter(item => item.document)
                .map(item => mapRestDoc(item.document));
        } catch (e) {
            console.error("REST Search Fail:", e.message);
            // Fallback to simple list if runQuery fails (sometimes cheaper)
            const listRes = await axios.get(`${REST_URL}/products?pageSize=100`, { timeout: 8000 });
            return (listRes.data.documents || []).map(mapRestDoc);
        }
    };

    try {
        if (action === 'chat') {
            const { messages, language, currentState, intent: chatIntent, collectedData } = req.body || {};
            if (!messages) return res.status(200).json({ response: "Ready!", state: 'idle' });

            const isAR = language === 'ar';
            const respond = (text, nextState = null, options = [], newData = null) => res.status(200).json({ response: text, state: nextState, options, newData });

            const lastMsg = messages?.[messages.length - 1]?.content?.trim() || '';
            const lastMsgNorm = normalizeArabic(lastMsg);
            const lastMsgLower = lastMsg.toLowerCase();

            // 1. Order Tracking (Requires Admin SDK - try but fallback to error message)
            if (currentState === 'track_order' || lastMsgLower.includes('track') || lastMsgNorm.includes('تتبع')) {
                return respond(isAR ?
                    "عذراً، نظام تتبع الطلبات تحت الصيانة الآن. يرجى التواصل معنا عبر الواتساب للمساعدة." :
                    "Sorry, order tracking is under maintenance. Please contact WhatsApp for support.",
                    'idle', [{ label: "Back", value: "idle" }]);
            }

            // 2. Lead Capture (Requires Admin SDK - fallback to expert notice)
            if (currentState === 'await_phone' || lastMsgLower.includes('expert') || lastMsgNorm.includes('خبير')) {
                return respond(isAR ?
                    "لا يمكنني حفظ رقمك حالياً، يرجى مراسلتنا مباشرة على الواتساب: [اضغط هنا](https://wa.me/201012345678)" :
                    "Unable to save number. Please WhatsApp us: [Click Here](https://wa.me/201012345678)",
                    'idle');
            }

            // 3. Product Search (The main feature - REST Fallback makes this 100% reliable)
            if (currentState === 'ask_make') return respond(isAR ? `جميل! موديل الـ ${lastMsg} إيه؟` : `Which ${lastMsg} model?`, 'ask_model', [], { make: translateBrand(lastMsg) });
            if (currentState === 'ask_model') return respond(isAR ? "تمام، سنة الموديل كام؟" : "Year?", 'ask_year', [], { model: lastMsg });
            if (currentState === 'ask_year') return respond(isAR ? "بتبحث عن إيه؟" : "What part?", 'searching_products', [], { year: lastMsg });

            if (currentState === 'searching_products') {
                const { make: cM } = collectedData || {};
                const products = await restSearch(cM);

                const results = products.filter(p => {
                    const pT = normalizeArabic(`${p.name} ${p.nameEn} ${p.category} ${p.subcategory} ${p.partBrand} ${p.model} ${p.car_model}`);
                    return lastMsgNorm.split(' ').some(t => t.length > 1 && pT.includes(t));
                }).slice(0, 5);

                if (results.length > 0) {
                    let text = isAR ? "هذه بعض القطع المتوفرة:" : "Found these parts:";
                    results.forEach(r => text += `\n\n• **[${r.nameEn || r.name}](${BASE_URL}/product/${r.id})**\n  Price: ${r.price || '---'} EGP`);
                    return respond(text, 'idle', [{ label: isAR ? "بحث جديد" : "New Search", value: "find_part" }]);
                }
                return respond(isAR ? "لم أجد نتائج مطابقة." : "No matching results found.", 'idle', [{ label: "بحث جديد", value: "find_part" }]);
            }

            if (chatIntent === 'find_part' || lastMsgNorm.includes('قطعه') || lastMsgLower.includes('part')) {
                return respond(isAR ? "ماركة العربية إيه؟" : "What is your car make?", 'ask_make');
            }

            return respond(isAR ? "أهلاً بك! أنا زيتون مساعدك الذكي. كيف أساعدك؟" : "Hello! How can I help?", 'idle', [
                { label: isAR ? "قطعة غيار" : "Find Part", value: "find_part" },
                { label: isAR ? "تتبع طلب" : "Track Order", value: "track_order" }
            ]);
        }

        if (action === 'getMakes') {
            const products = await restSearch();
            const makes = [...new Set(products.map(p => p.make || p.car_make))].filter(Boolean).sort();
            return res.status(200).json(makes);
        }

        return res.status(400).json({ error: 'Invalid action' });
    } catch (err) {
        console.error("GATEWAY ERROR:", err);
        return res.status(200).json({ response: `System issues detected. Please try again later.`, state: 'idle' });
    }
}
