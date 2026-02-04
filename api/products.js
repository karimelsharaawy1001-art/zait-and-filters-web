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
    'رينو': 'Renault', 'بيجو': 'Peugeot', 'ستروين': 'Citroen',
    'فيات': 'Fiat', 'سكودا': 'Skoda', 'سوزوكي': 'Suzuki', 'سوزوكى': 'Suzuki',
    'ام جي': 'MG', 'ام جى': 'MG', 'ام جيه': 'MG'
};

function translateBrand(input) {
    if (!input) return input;
    const normalized = input.trim();
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

                // CRITICAL: Handle Active State FIRST to prevent intent recursion
                if (currentState && currentState !== 'idle') {
                    if (currentState === 'ask_make') {
                        const translated = translateBrand(lastMsg);
                        return chatRespond(isAR ? `جميل! موديل الـ ${lastMsg} إيه؟` : `Great! Which ${lastMsg} model?`, 'ask_model', [], { make: translated });
                    }
                    if (currentState === 'ask_model') return chatRespond(isAR ? "تمام، سنة الموديل كام؟" : "Manufacturing year?", 'ask_year', [], { model: lastMsg });
                    if (currentState === 'ask_year') return chatRespond(isAR ? "بتبحث عن أي قطعة غيار؟" : "What part are you looking for?", 'searching_products', [], { year: lastMsg });

                    if (currentState === 'searching_products') {
                        const { make: cMake, model: cModel } = collectedData || {};
                        const snapshot = await productsRef.where('isActive', '==', true).limit(500).get();
                        const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(p => {
                            const pMake = (p.make || p.car_make || p.carMake || '').toLowerCase();
                            const pModel = (p.model || p.car_model || '').toLowerCase();
                            if (cMake && !pMake.includes(cMake.toLowerCase())) return false;
                            if (cModel && !pModel.includes(cModel.toLowerCase())) return false;

                            const terms = lastMsgLower.split(' ').filter(t => t.length > 1);
                            if (terms.length === 0) return true;
                            const txt = `${p.name || p.nameEn || ''} ${p.category || ''} ${p.partBrand || ''}`.toLowerCase();
                            return terms.some(t => txt.includes(t));
                        }).slice(0, 5);

                        if (results.length > 0) {
                            let text = isAR ? "هذه بعض النتائج المتوفرة:" : "Found these options:";
                            results.forEach(r => text += `\n\n• **[${r.nameEn || r.name}](https://zaitandfilters.com/product/${r.id})**\n  ${r.price} EGP`);
                            return chatRespond(text, 'idle', [{ label: isAR ? "بحث جديد" : "New Search", value: "find_part" }]);
                        }
                        return chatRespond(isAR ? `لم أجد نتائج لـ "${lastMsg}". تريد خبير؟` : `No results for "${lastMsg}". Talk expert?`, 'idle', [{ label: isAR ? "تكلم مع خبير" : "Talk Expert", value: "talk_to_expert" }]);
                    }

                    if (currentState === 'track_order') {
                        const match = lastMsg.match(/\d+/);
                        if (match) {
                            const q = await db.collection('orders').where('shippingAddress.phone', '==', match[0]).limit(1).get();
                            if (!q.empty) {
                                const o = q.docs[0].data();
                                return chatRespond(isAR ? `تم العثور ع الطلب! الحالة: ${o.paymentStatus || 'Processing'}` : `Order found! Status: ${o.paymentStatus || 'Processing'}`, 'idle');
                            }
                        }
                        return chatRespond(isAR ? "رقم الطلب غير صحيح." : "Invalid Order ID.", 'idle');
                    }

                    if (currentState === 'await_phone') {
                        await db.collection('bot_leads').add({ phone: lastMsg, data: collectedData, time: new Date() });
                        return chatRespond(isAR ? "شكراً! خبيرنا هيكلمك." : "Thanks! Our expert will call.", 'idle');
                    }
                }

                // Intent Triggers (Only if idle or starting fresh)
                if (chatIntent === 'find_part' || lastMsgLower.includes('part') || lastMsgLower.includes('قطعة')) {
                    return chatRespond(isAR ? "سأساعدك في العثور على ما تحتاجه! ما هو نوع سيارتك؟ (Toyota, Nissan...)" : "I can help! What is your car make? (Toyota, Nissan...)", 'ask_make');
                }
                if (lastMsgLower.includes('track') || lastMsgLower.includes('تتبع')) return chatRespond(isAR ? "أرسل رقم الطلب أو رقم الهاتف." : "Send Order ID or Phone.", 'track_order');
                if (lastMsgLower.includes('expert') || lastMsgLower.includes('خبير')) return chatRespond(isAR ? "سيب رقم الواتساب وخبيرنا هيكلمك." : "Leave WhatsApp for expert.", 'await_phone');

                // Default Welcome
                const welcome = isAR ? "أنا زيتون، مساعدك الذكي. كيف أساعدك؟" : "I'm Zeitoon, your smart assistant. How can I help?";
                return chatRespond(welcome, 'idle', [
                    { label: isAR ? "قطعة غيار" : "Find Part", value: "find_part" },
                    { label: isAR ? "تتبع طلبي" : "Track Order", value: "track_order" }
                ]);
            } catch (chatError) {
                console.error('Chat Logic Error:', chatError);
                return res.status(500).json({ error: 'Chat Failed', details: chatError.message });
            }
        }

        // --- 5. ORIGINAL ACTIONS ---
        if (action === 'getMakes') {
            const snapshot = await productsRef.where('isActive', '==', true).get();
            const makes = [...new Set(snapshot.docs.map(d => d.data().make || d.data().car_make))].filter(Boolean).sort();
            return res.status(200).json(makes);
        }

        return res.status(400).json({ error: 'Invalid action' });
    } catch (error) {
        console.error('Core API Error:', error);
        return res.status(500).json({ error: 'Internal Error', message: error.message });
    }
}
