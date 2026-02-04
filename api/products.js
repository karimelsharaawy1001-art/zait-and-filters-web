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
        if (!admin.apps.length) {
            const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
            if (sa) {
                const config = JSON.parse(sa);
                admin.initializeApp({
                    credential: admin.credential.cert(config),
                    projectId: config.project_id || process.env.VITE_FIREBASE_PROJECT_ID || 'zaitandfilters'
                });
            } else {
                admin.initializeApp({ projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'zaitandfilters' });
            }
        }
        db = admin.firestore();
    } catch (e) {
        return res.status(200).json({ response: `Firebase Init Error: ${e.message}`, state: 'idle' });
    }

    const { action, make, model, productId, category, email, firstName, lastName, targetUrl, tagName, expectedValue } = { ...req.query, ...req.body };
    const BASE_URL = 'https://zaitandfilters.com';

    try {
        const pRef = db.collection('products');

        if (action === 'chat') {
            const { messages, language, currentState, intent: chatIntent, collectedData } = req.body;
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
                        const status = oData.paymentStatus || 'Processing';
                        return respond(isAR ? `طلبك حالته: ${status}` : `Order status: ${status}`, 'idle', [{ label: "Back", value: "idle" }]);
                    }
                }
                if (currentState === 'track_order') return respond(isAR ? "رقم غير صحيح." : "Order not found. Try again?", 'track_order');
                return respond(isAR ? "أرسل رقم الطلب." : "Send Order ID.", 'track_order');
            }

            // 2. Lead Capture
            if (currentState === 'await_phone' || lastMsgNorm.includes('خبير')) {
                if (currentState === 'await_phone') {
                    await db.collection('bot_leads').add({ phone: lastMsg, data: collectedData, time: new Date() });
                    return respond(isAR ? "شكراً! سنتواصل معك." : "Thanks! We will call you.", 'idle');
                }
                return respond(isAR ? "سيب رقم الواتساب." : "Leave WhatsApp.", 'await_phone');
            }

            // 3. Product Search
            if (currentState === 'ask_make') return respond(isAR ? `موديل ${lastMsg} إيه؟` : `Which ${lastMsg} model?`, 'ask_model', [], { make: translateBrand(lastMsg) });
            if (currentState === 'ask_model') return respond(isAR ? "سنة كام؟" : "Year?", 'ask_year', [], { model: lastMsg });
            if (currentState === 'ask_year') return respond(isAR ? "بتبحث عن إيه؟" : "What part?", 'searching_products', [], { year: lastMsg });

            if (currentState === 'searching_products') {
                const { make: cM, model: cMo } = collectedData || {};
                let snap;
                if (cM) snap = await pRef.where('isActive', '==', true).where('make', '==', cM).limit(50).get();
                else snap = await pRef.where('isActive', '==', true).limit(50).get();

                const results = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => {
                    const pT = normalizeArabic(`${p.name} ${p.nameEn} ${p.category} ${p.partBrand}`);
                    return lastMsgNorm.split(' ').some(t => t.length > 1 && pT.includes(t));
                }).slice(0, 5);

                if (results.length > 0) {
                    let text = isAR ? "نتائج:" : "Results:";
                    results.forEach(r => text += `\n• [${r.nameEn || r.name}](${BASE_URL}/product/${r.id})`);
                    return respond(text, 'idle', [{ label: isAR ? "بحث جديد" : "New Search", value: "find_part" }]);
                }
                return respond(isAR ? "لا يوجد نتائج." : "No results.", 'idle', [{ label: "New Search", value: "find_part" }]);
            }

            // Start Flow
            if (chatIntent === 'find_part' || lastMsgNorm.includes('قطعه')) return respond(isAR ? "ماركة إيه؟" : "What make?", 'ask_make');

            return respond(isAR ? "أهلاً! كيف أساعدك؟" : "How can I help?", 'idle', [
                { label: isAR ? "قطعة غيار" : "Find Part", value: "find_part" },
                { label: isAR ? "تتبع طلب" : "Track Order", value: "track_order" }
            ]);
        }

        // --- Original Utility Actions ---
        if (action === 'getMakes') {
            const snap = await pRef.where('isActive', '==', true).get();
            const makes = [...new Set(snap.docs.map(d => d.data().make || d.data().car_make))].filter(Boolean).sort();
            return res.status(200).json(makes);
        }
        if (action === 'subscribe') {
            const d = await db.collection('settings').doc('integrations').get();
            const { mailchimpApiKey, mailchimpAudienceId } = d.data();
            const dc = mailchimpApiKey.split('-')[1];
            await axios.post(`https://${dc}.api.mailchimp.com/3.0/lists/${mailchimpAudienceId}/members`, { email_address: email, status: 'subscribed' }, { headers: { Authorization: `apikey ${mailchimpApiKey}` } });
            return res.status(200).json({ success: true });
        }

        return res.status(400).json({ error: 'Invalid action' });
    } catch (err) {
        return res.status(200).json({ response: `Error: ${err.message}`, state: 'idle' });
    }
}
