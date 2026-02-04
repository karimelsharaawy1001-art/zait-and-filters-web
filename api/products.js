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
 * Robust PEM Clean: Extracts exactly the BEGIN/END block and handles Vercel double-escaping.
 */
function cleanPEM(key) {
    if (!key) return '';
    // 1. Convert literal \n to actual newlines
    let k = key.replace(/\\n/g, '\n');
    // 2. Remove any accidental surrounding quotes or whitespace
    k = k.trim().replace(/^['"]|['"]$/g, '');

    // 3. Try to find the standard PEM block
    const match = k.match(/-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----/);
    if (match) return match[0];

    // 4. If no tags, check if it's just the raw base64 and wrap it
    const base64Only = k.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '');
    if (base64Only.length > 100) {
        return `-----BEGIN PRIVATE KEY-----\n${base64Only}\n-----END PRIVATE KEY-----`;
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
    try {
        const appName = 'ZeitoonFinalApp'; // New name for clean start
        let chatApp = admin.apps.find(a => a.name === appName);

        if (!chatApp) {
            const saJson = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_JSON_CREDENTIALS;
            const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'zaitandfilters';
            const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
            const privateKey = process.env.FIREBASE_PRIVATE_KEY;

            let credentials = null;

            if (saJson) {
                const config = JSON.parse(saJson);
                credentials = {
                    projectId: config.project_id || projectId,
                    clientEmail: config.client_email || config.clientEmail,
                    privateKey: cleanPEM(config.private_key || config.privateKey)
                };
            } else if (clientEmail && privateKey) {
                credentials = {
                    projectId: projectId,
                    clientEmail: clientEmail,
                    privateKey: cleanPEM(privateKey)
                };
            }

            if (!credentials || !credentials.privateKey || !credentials.clientEmail) {
                throw new Error("Credentials missing. Ensure FIREBASE_SERVICE_ACCOUNT is set in Vercel.");
            }

            chatApp = admin.initializeApp({
                credential: admin.credential.cert(credentials),
                projectId: credentials.projectId
            }, appName);
        }
        db = admin.firestore(chatApp);
    } catch (e) {
        console.error("FIREBASE FAIL:", e);
        return res.status(200).json({
            response: `Authentication Failure: ${e.message}`,
            state: 'idle'
        });
    }

    const { action, make, model, productId, category, email, firstName, lastName, targetUrl, tagName, expectedValue } = { ...req.query, ...req.body };
    const BASE_URL = 'https://zaitandfilters.com';

    try {
        const pRef = db.collection('products');

        if (action === 'chat') {
            const { messages, language, currentState, intent: chatIntent, collectedData } = req.body || {};
            if (!messages) return res.status(200).json({ response: "Ready to help!", state: 'idle' });

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
                        return respond(isAR ? `حالة طلبك: ${s}` : `Order status: ${s}`, 'idle', [{ label: "Back", value: "idle" }]);
                    }
                }
                if (currentState === 'track_order') return respond(isAR ? "رقم غير صحيح. حاول مرة أخرى؟" : "Order not found. Try again?", 'track_order');
                return respond(isAR ? "أرسل رقم الطلب أو التليفون." : "Send Order ID or Phone.", 'track_order');
            }

            // 2. Lead Capture
            if (currentState === 'await_phone' || lastMsgLower.includes('expert') || lastMsgNorm.includes('خبير')) {
                if (currentState === 'await_phone') {
                    await db.collection('bot_leads').add({ phone: lastMsg, data: collectedData, time: new Date() });
                    return respond(isAR ? "شكراً! خبيرنا سيتواصل معك." : "Thanks! Our expert will call you.", 'idle');
                }
                return respond(isAR ? "سيب رقم الواتساب لخبيرنا." : "Leave WhatsApp for expert.", 'await_phone');
            }

            // 3. Product Search
            if (currentState === 'ask_make') return respond(isAR ? `جميل! موديل الـ ${lastMsg} إيه؟` : `Which ${lastMsg} model?`, 'ask_model', [], { make: translateBrand(lastMsg) });
            if (currentState === 'ask_model') return respond(isAR ? "تمام، سنة الموديل كام؟" : "Year?", 'ask_year', [], { model: lastMsg });
            if (currentState === 'ask_year') return respond(isAR ? "بتبحث عن إيه؟" : "What part?", 'searching_products', [], { year: lastMsg });

            if (currentState === 'searching_products') {
                const { make: cM } = collectedData || {};
                let snap;
                if (cM && cM !== 'Generic') {
                    const q1 = pRef.where('isActive', '==', true).where('make', '==', cM).limit(50).get();
                    const q2 = pRef.where('isActive', '==', true).where('car_make', '==', cM).limit(50).get();
                    const [s1, s2] = await Promise.all([q1, q2]);
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
                return respond(isAR ? `عذراً، لم أجد نتائج لـ "${lastMsg}". تريد خبير؟` : `No results for "${lastMsg}". Talk expert?`, 'idle', [
                    { label: isAR ? "تكلم مع خبير" : "Talk Expert", value: "talk_to_expert" },
                    { label: "بحث جديد", value: "find_part" }
                ]);
            }

            // Start Flow
            if (chatIntent === 'find_part' || lastMsgNorm.includes('قطعه') || lastMsgLower.includes('part')) {
                return respond(isAR ? "ماركة العربية إيه؟ (تويوتا، نيسان...)" : "What is your car make? (Toyota, Nissan...)", 'ask_make');
            }

            // Default Welcome
            return respond(isAR ? "أهلاً بك! أنا زيتون مساعدك الذكي. كيف أساعدك؟" : "Hello! I'm Zeitoon, your smart assistant. How can I help?", 'idle', [
                { label: isAR ? "قطعة غيار" : "Find Part", value: "find_part" },
                { label: isAR ? "تتبع طلبي" : "Track Order", value: "track_order" }
            ]);
        }

        if (action === 'getMakes') {
            const snap = await pRef.where('isActive', '==', true).get();
            const makes = [...new Set(snap.docs.map(d => d.data().make || d.data().car_make))].filter(Boolean).sort();
            return res.status(200).json(makes);
        }

        return res.status(400).json({ error: 'Invalid action' });
    } catch (err) {
        console.error("FATAL ERROR:", err);
        return res.status(200).json({ response: `System Error: ${err.message}`, state: 'idle' });
    }
}
