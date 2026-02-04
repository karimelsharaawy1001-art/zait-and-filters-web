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
 * Super robust PEM repair for OpenSSL 3 / Node 17+
 */
function cleanPEM(key) {
    if (!key) return '';
    // 1. Convert all types of literal and escaped newlines to actual line breaks
    let k = key.replace(/\\\\n/g, '\n').replace(/\\n/g, '\n').trim();
    // 2. Strip any accidental wrapping quotes (usually from .env mangling)
    k = k.replace(/^['"]|['"]$/g, '');

    // 3. Ensure proper PEM headers exist
    if (!k.includes('-----BEGIN PRIVATE KEY-----')) {
        // Strip out existing tags and whitespace to get raw base64
        const raw = k.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s|\n/g, '');
        // Re-wrap with correct format
        k = `-----BEGIN PRIVATE KEY-----\n${raw}\n-----END PRIVATE KEY-----`;
    }

    // 4. Force specific line length if it's all one line (important for some decoders)
    if (!k.includes('\n', 50)) {
        const body = k.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s|\n/g, '');
        const lines = body.match(/.{1,64}/g);
        if (lines) k = `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----`;
    }

    return k;
}

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();

    let db;
    let diag = "Starting...";
    try {
        // ROTATE App Name to bypass any cached failures in serverless instance
        const appName = `Zeitoon_Rotation_${Math.floor(Date.now() / 60000)}`;
        let chatApp = admin.apps.find(a => a.name === appName);

        if (!chatApp) {
            const saJson = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_JSON_CREDENTIALS;
            const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'zaitandfilters';
            const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
            const privateKey = process.env.FIREBASE_PRIVATE_KEY;

            let finalConfig = null;

            if (saJson) {
                try {
                    const parsed = JSON.parse(saJson);
                    finalConfig = {
                        ...parsed,
                        privateKey: cleanPEM(parsed.private_key || parsed.privateKey),
                        projectId: parsed.project_id || parsed.projectId || projectId
                    };
                    diag = `JSON Config [${finalConfig.projectId}]`;
                } catch (pe) {
                    diag = `JSON Error: ${pe.message}`;
                }
            }

            if (!finalConfig && clientEmail && privateKey) {
                finalConfig = {
                    projectId: projectId,
                    clientEmail: clientEmail,
                    privateKey: cleanPEM(privateKey)
                };
                diag = `Individual Vars [${projectId}]`;
            }

            if (!finalConfig) throw new Error("No database keys found. Please set FIREBASE_SERVICE_ACCOUNT in Vercel.");

            chatApp = admin.initializeApp({
                credential: admin.credential.cert(finalConfig),
                projectId: finalConfig.projectId
            }, appName);

            diag += " | App Init OK";
        } else {
            diag = "Using Cached Rotation App";
        }

        db = admin.firestore(chatApp);

        // --- INSTANT WARM-UP CHECK ---
        // If this fails, we know it's a BAD HANDSHAKE immediately.
        await db.collection('settings').doc('integrations').get();
        diag += " | Connection Verified";

    } catch (apiErr) {
        console.error("FIREBASE FATAL:", apiErr);
        let errorMsg = apiErr.message;
        if (errorMsg.includes('UNAUTHENTICATED')) {
            errorMsg = "Authentication failed. The key is decoded but rejected by Firebase (Wrong Project or Revoked).";
        }
        return res.status(200).json({
            response: `Database Error: ${errorMsg}. Diagnostics: ${diag}`,
            state: 'idle'
        });
    }

    const { action } = { ...req.query, ...req.body };
    const BASE_URL = 'https://zaitandfilters.com';

    try {
        const pRef = db.collection('products');

        if (action === 'chat') {
            const { messages, language, currentState, intent: chatIntent, collectedData } = req.body || {};
            if (!messages) return res.status(200).json({ response: "Ready!", state: 'idle' });

            const isAR = language === 'ar';
            const respond = (text, nextState = null, options = [], newData = null) => res.status(200).json({ response: text, state: nextState, options, newData });

            const lastMsg = messages?.[messages.length - 1]?.content?.trim() || '';
            const lastMsgNorm = normalizeArabic(lastMsg);
            const lastMsgLower = lastMsg.toLowerCase();

            // 1. Order Tracking
            if (currentState === 'track_order' || lastMsgLower.includes('track') || lastMsgNorm.includes('تتبع')) {
                const match = lastMsg.match(/\d+/);
                if (match) {
                    const idOrPhone = match[0];
                    const ordersRef = db.collection('orders');
                    const [p1, p2, d1] = await Promise.all([
                        ordersRef.where('customer.phone', '==', idOrPhone).limit(1).get(),
                        ordersRef.where('shippingAddress.phone', '==', idOrPhone).limit(1).get(),
                        ordersRef.doc(idOrPhone).get()
                    ]);
                    let oData = d1.exists ? d1.data() : null;
                    if (!oData && !p1.empty) oData = p1.docs[0].data();
                    if (!oData && !p2.empty) oData = p2.docs[0].data();

                    if (oData) {
                        const s = oData.paymentStatus || 'Processing';
                        return respond(isAR ? `طلبك حالته: ${s}` : `Order status: ${s}`, 'idle', [{ label: "Back", value: "idle" }]);
                    }
                }
                if (currentState === 'track_order') return respond(isAR ? "رقم غير صحيح." : "Order not found.", 'track_order');
                return respond(isAR ? "أرسل رقم الطلب." : "Send Order ID.", 'track_order');
            }

            // 2. Lead Capture
            if (currentState === 'await_phone' || lastMsgLower.includes('expert') || lastMsgNorm.includes('خبير')) {
                if (currentState === 'await_phone') {
                    await db.collection('bot_leads').add({ phone: lastMsg, data: collectedData, time: new Date() });
                    return respond(isAR ? "شكراً! سنتواصل معك." : "Thanks! We'll call you.", 'idle');
                }
                return respond(isAR ? "سيب رقم الواتساب لخبيرنا." : "Leave WhatsApp for expert.", 'await_phone');
            }

            // 3. Product Search
            if (currentState === 'ask_make') return respond(isAR ? `موديل الـ ${lastMsg} إيه؟` : `Which ${lastMsg} model?`, 'ask_model', [], { make: translateBrand(lastMsg) });
            if (currentState === 'ask_model') return respond(isAR ? "سنة كام؟" : "Year?", 'ask_year', [], { model: lastMsg });
            if (currentState === 'ask_year') return respond(isAR ? "بتبحث عن إيه؟" : "What part?", 'searching_products', [], { year: lastMsg });

            if (currentState === 'searching_products') {
                const { make: cM } = collectedData || {};
                let snap;
                if (cM && cM !== 'Generic') {
                    const [s1, s2] = await Promise.all([
                        pRef.where('isActive', '==', true).where('make', '==', cM).limit(50).get(),
                        pRef.where('isActive', '==', true).where('car_make', '==', cM).limit(50).get()
                    ]);
                    snap = { docs: [...s1.docs, ...s2.docs] };
                } else {
                    snap = await pRef.where('isActive', '==', true).limit(100).get();
                }

                const results = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(p => {
                    const pT = normalizeArabic(`${p.name} ${p.nameEn} ${p.category} ${p.subcategory} ${p.partBrand} ${p.model} ${p.car_model}`);
                    return lastMsgNorm.split(' ').some(t => t.length > 1 && pT.includes(t));
                }).slice(0, 5);

                if (results.length > 0) {
                    let text = isAR ? "هذه بعض القطع المتوفرة:" : "Found these parts:";
                    results.forEach(r => text += `\n\n• **[${r.nameEn || r.name}](https://zaitandfilters.com/product/${r.id})**\n  Price: ${r.price || '---'} EGP`);
                    return respond(text, 'idle', [{ label: isAR ? "بحث جديد" : "New Search", value: "find_part" }]);
                }
                return respond(isAR ? "لم أجد نتائج." : "No results found.", 'idle', [{ label: "بحث جديد", value: "find_part" }]);
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
            const snap = await pRef.where('isActive', '==', true).limit(100).get();
            const makes = [...new Set(snap.docs.map(d => d.data().make || d.data().car_make))].filter(Boolean).sort();
            return res.status(200).json(makes);
        }

        return res.status(400).json({ error: 'Invalid action' });
    } catch (err) {
        return res.status(200).json({ response: `System Error: ${err.message}. Diag: ${diag}`, state: 'idle' });
    }
}
