import admin from 'firebase-admin';
import axios from 'axios';

// Initialize Firebase Admin
if (!admin.apps.length) {
    try {
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } else {
            admin.initializeApp();
        }
    } catch (error) {
        console.error('Firebase Admin initialization failed:', error);
    }
}

const db = admin.firestore();

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
        .replace(/گ/g, 'ج') // Handle some Variations
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

    const { action, make, model, productId, category, email, firstName, lastName, targetUrl, tagName, expectedValue } = { ...req.query, ...req.body };
    const BASE_URL = 'https://zait-and-filters-web.vercel.app';

    try {
        const productsRef = db.collection('products');

        // --- 1. SEO CHECK ---
        if (action === 'check-seo') {
            if (!targetUrl || !tagName) return res.status(400).json({ error: 'Missing targetUrl or tagName' });
            try {
                const response = await axios.get(targetUrl, { timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } });
                const html = response.data;
                let match;
                if (tagName === 'facebook-pixel') match = html.match(/fbq\(['"]init['"]\s*,\s*['"](\d+)['"]\)/i);
                else if (tagName === 'google-analytics') match = html.match(/gtag\/js\?id=([G|UA]-[A-Z0-9-]+)/i);
                else {
                    const metaRegex = new RegExp(`<meta[^>]*name=["']${tagName}["'][^>]*content=["']([^"']+)["']`, 'i');
                    match = html.match(metaRegex);
                }
                return res.status(200).json(match ? { status: 'found', value: match[1] } : { status: 'not_found' });
            } catch (e) { return res.status(500).json({ error: 'SEO Check Failed', details: e.message }); }
        }

        // --- 2. MAILCHIMP ---
        if (action === 'subscribe') {
            if (!email) return res.status(400).json({ error: 'Email is required' });
            const docSnap = await db.collection('settings').doc('integrations').get();
            if (!docSnap.exists) return res.status(404).json({ error: 'Mailchimp not configured' });
            const { mailchimpApiKey, mailchimpAudienceId } = docSnap.data();
            const dc = mailchimpApiKey.split('-')[1];
            try {
                await axios.post(`https://${dc}.api.mailchimp.com/3.0/lists/${mailchimpAudienceId}/members`, {
                    email_address: email, status: 'subscribed', merge_fields: { FNAME: firstName || '', LNAME: lastName || '' }
                }, { headers: { Authorization: `apikey ${mailchimpApiKey}` } });
                return res.status(200).json({ success: true });
            } catch (e) {
                if (e.response?.data?.title === 'Member Exists') return res.status(200).json({ success: true, message: 'Existing' });
                return res.status(500).json({ error: 'Subscription failed' });
            }
        }

        // --- 3. PRODUCT FEED & SITEMAP ---
        if (action === 'generateFeed' || action === 'generateSitemap') {
            const platform = req.query.platform || 'google';
            const snapshot = await productsRef.where('isActive', '==', true).get();
            const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (action === 'generateFeed') {
                let xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>Zait &amp; Filters</title><link>https://zaitandfilters.com</link>`;
                products.forEach(p => {
                    const title = escapeXml(`${p.partBrand || ''} ${p.name || ''}`.trim());
                    xml += `<item><g:id>${p.id}</g:id><g:title>${title}</g:title><g:link>https://zaitandfilters.com/product/${p.id}</g:link><g:image_link>${escapeXml(p.image || p.imageUrl)}</g:image_link><g:availability>${p.stock > 0 ? 'in stock' : 'out of stock'}</g:availability><g:price>${p.price || 0} EGP</g:price><g:brand>${escapeXml(p.partBrand || 'Generic')}</g:brand><g:condition>new</g:condition></item>`;
                });
                xml += `</channel></rss>`;
                res.setHeader('Content-Type', 'application/xml');
                return res.status(200).send(xml);
            }

            const postsSnap = await db.collection('blog_posts').where('isActive', '==', true).get();
            const today = new Date().toISOString().split('T')[0];
            let xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
            ['', '/shop', '/oil-advisor', '/contact', '/blog', '/about', '/garage', '/cart'].forEach(p => {
                xml += `<url><loc>${BASE_URL}${p}</loc><lastmod>${today}</lastmod><priority>${p === '' ? '1.0' : '0.8'}</priority></url>`;
            });
            products.forEach(p => { xml += `<url><loc>${BASE_URL}/product/${p.id}</loc><lastmod>${today}</lastmod><priority>0.7</priority></url>`; });
            postsSnap.docs.forEach(doc => { xml += `<url><loc>${BASE_URL}/blog/${doc.data().slug || doc.id}</loc><lastmod>${today}</lastmod><priority>0.6</priority></url>`; });
            xml += `</urlset>`;
            res.setHeader('Content-Type', 'application/xml');
            return res.status(200).send(xml);
        }

        // --- 4. CHATBOT ---
        if (action === 'chat') {
            try {
                const { messages, language, currentState, intent: chatIntent, collectedData } = { ...req.query, ...req.body };
                const isAR = language === 'ar';

                const chatRespond = (text, nextState = null, options = [], newData = null) => {
                    return res.status(200).json({ response: text, state: nextState, options, newData });
                };

                const lastMsg = messages?.[messages.length - 1]?.content?.trim() || '';
                const lastMsgLower = lastMsg.toLowerCase();
                const lastMsgNorm = normalizeArabic(lastMsg);

                // CRITICAL: Handle Active State FIRST
                if (currentState && currentState !== 'idle') {
                    if (currentState === 'ask_make') {
                        const translated = translateBrand(lastMsg);
                        return chatRespond(isAR ? `جميل! موديل الـ ${lastMsg} إيه؟` : `Great! Which ${lastMsg} model?`, 'ask_model', [], { make: translated });
                    }
                    if (currentState === 'ask_model') return chatRespond(isAR ? "تمام، سنة الموديل كام؟" : "Manufacturing year?", 'ask_year', [], { model: lastMsg });
                    if (currentState === 'ask_year') return chatRespond(isAR ? "بتبحث عن أي قطعة غيار أو زيت؟" : "What part or oil are you looking for?", 'searching_products', [], { year: lastMsg });

                    if (currentState === 'searching_products') {
                        try {
                            const { make: cMake, model: cModel } = collectedData || {};

                            // Strategy: Search specifically by the car build to get relevant docs within Hobby limits
                            let snapshot;
                            if (cMake) {
                                const q1 = productsRef.where('isActive', '==', true).where('make', '==', cMake).limit(200).get();
                                const q2 = productsRef.where('isActive', '==', true).where('car_make', '==', cMake).limit(200).get();
                                const [s1, s2] = await Promise.all([q1, q2]);
                                snapshot = { docs: [...s1.docs, ...s2.docs] };
                            } else {
                                snapshot = await productsRef.where('isActive', '==', true).limit(300).get();
                            }

                            const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(p => {
                                // Robust Match Logic
                                const pMake = String(p.make || p.car_make || p.carMake || '').toLowerCase();
                                const pModel = String(p.model || p.car_model || '').toLowerCase();
                                if (cMake && !pMake.includes(String(cMake).toLowerCase())) return false;
                                if (cModel && !pModel.includes(String(cModel).toLowerCase())) return false;

                                // Keyword Search with Arabic Normalization
                                const terms = lastMsgNorm.split(' ').filter(t => t.length >= 1);
                                if (terms.length === 0) return true;

                                const pText = normalizeArabic(`${p.name || ''} ${p.nameEn || ''} ${p.category || ''} ${p.subcategory || ''} ${p.partBrand || ''}`);
                                return terms.some(t => pText.includes(t));
                            }).slice(0, 5);

                            if (results.length > 0) {
                                let text = isAR ? "لقد وجدت بعض النتائج المتوافقة:" : "Found some compatible results:";
                                results.forEach(r => {
                                    text += `\n\n• **[${r.nameEn || r.name || 'Part'}](https://zaitandfilters.com/product/${r.id})**\n  Price: ${r.price || '---'} EGP`;
                                });
                                return chatRespond(text, 'idle', [{ label: isAR ? "بحث جديد" : "New Search", value: "find_part" }]);
                            }
                            return chatRespond(isAR ? `عذراً، لم أجد نتائج لـ "${lastMsg}". تكلم مع خبير؟` : `No results for "${lastMsg}". Talk to an expert?`, 'idle', [
                                { label: isAR ? "تكلم مع خبير" : "Talk Expert", value: "talk_to_expert" },
                                { label: isAR ? "بحث جديد" : "New Search", value: "find_part" }
                            ]);
                        } catch (searchErr) {
                            console.error("Search Logic Fail:", searchErr);
                            return chatRespond(`Search System Error: ${searchErr.message}`, 'idle');
                        }
                    }

                    if (currentState === 'track_order') {
                        const match = lastMsg.match(/\d+/);
                        if (match) {
                            const o = await db.collection('orders').doc(match[0]).get();
                            if (o.exists) {
                                const data = o.data();
                                return chatRespond(isAR ? `الطلب ${match[0]} حالته: ${data.paymentStatus}` : `Order ${match[0]} status: ${data.paymentStatus}`, 'idle');
                            }
                        }
                        return chatRespond(isAR ? "رقم الطلب غير صحيح." : "Invalid Order ID.", 'idle');
                    }

                    if (currentState === 'await_phone') {
                        await db.collection('bot_leads').add({ phone: lastMsg, data: collectedData, time: new Date() });
                        return chatRespond(isAR ? "شكراً! خبيرنا هيكلمك." : "Thanks! Our expert will call.", 'idle');
                    }
                }

                // Intent Triggers
                if (chatIntent === 'find_part' || lastMsgLower.includes('part') || lastMsgLower.includes('قطعة')) {
                    return chatRespond(isAR ? "أهلاً بك! ما هو نوع سيارتك؟" : "I can help! What is your car make?", 'ask_make');
                }
                if (lastMsgLower.includes('track') || lastMsgLower.includes('تتبع')) return chatRespond(isAR ? "أرسل رقم الطلب." : "Send Order ID.", 'track_order');
                if (lastMsgLower.includes('expert') || lastMsgLower.includes('خبير')) return chatRespond(isAR ? "سيب رقمك لخبيرنا." : "Leave WhatsApp.", 'await_phone');

                return chatRespond(isAR ? "أنا زيتون، مساعدك الذكي. كيف أساعدك؟" : "I'm Zeitoon, your smart assistant. How can I help?", 'idle', [
                    { label: isAR ? "قطعة غيار" : "Find Part", value: "find_part" },
                    { label: isAR ? "تتبع طلبي" : "Track Order", value: "track_order" }
                ]);
            } catch (chatError) {
                console.error("Global Chat Fail:", chatError);
                return res.status(200).json({ response: `System Failure: ${chatError.message}`, state: 'idle' });
            }
        }

        if (action === 'getMakes') {
            const snapshot = await productsRef.where('isActive', '==', true).get();
            const makes = [...new Set(snapshot.docs.map(d => d.data().make || d.data().car_make))].filter(Boolean).sort();
            return res.status(200).json(makes);
        }

        return res.status(400).json({ error: 'Invalid action' });
    } catch (error) {
        console.error("Core API Fatal:", error);
        return res.status(200).json({
            response: `Core System Error: ${error.message}`,
            state: 'idle'
        });
    }
}
