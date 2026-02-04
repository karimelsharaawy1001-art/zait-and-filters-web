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
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();

    let db;
    try {
        const sa = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_JSON_CREDENTIALS;
        const appName = 'ZeitoonApp';

        // --- SECURE INITIALIZATION ---
        // We use a NAMED app to ensure we don't pick up a "Poisoned" default app that might have been initialized without credentials elsewhere.
        let chatApp = admin.apps.find(a => a.name === appName);

        if (!chatApp) {
            if (sa) {
                const config = JSON.parse(sa);
                chatApp = admin.initializeApp({
                    credential: admin.credential.cert(config),
                    projectId: config.project_id || 'zaitandfilters'
                }, appName);
            } else {
                // FALLBACK: If SA is absolutely missing, we try default but it will likely fail on Query.
                // We show this in error message if possible.
                console.error("CRITICAL: FIREBASE_SERVICE_ACCOUNT is missing.");
                return res.status(200).json({
                    response: "Error: Search engine credentials are missing. Please contact support.",
                    state: 'idle'
                });
            }
        }
        db = admin.firestore(chatApp);
    } catch (e) {
        return res.status(200).json({ response: `Firebase Init Error: ${e.message}`, state: 'idle' });
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
                if (currentState === 'track_order') return respond(isAR ? "رقم غير معروف. حاول مرة أخرى؟" : "Order not found. Try again?", 'track_order');
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
                const { make: cM, model: cMo } = collectedData || {};
                let snap;
                // Optimization: Filter by Make if we have it
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

        // --- Utility Actions ---
        if (action === 'getMakes') {
            const snap = await pRef.where('isActive', '==', true).get();
            const makes = [...new Set(snap.docs.map(d => d.data().make || d.data().car_make))].filter(Boolean).sort();
            return res.status(200).json(makes);
        }

        return res.status(400).json({ error: 'Invalid action' });
    } catch (err) {
        console.error("FATAL ERROR:", err);
        return res.status(200).json({ response: `System Error: ${err.message}. Please check credentials.`, state: 'idle' });
    }
}
