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

// Helper to escape XML
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
        let productsQuery = productsRef.where('isActive', '==', true);

        // --- 1. SEO CHECK (Merged from check-seo.js) ---
        if (action === 'check-seo') {
            if (!targetUrl || !tagName) {
                return res.status(400).json({ error: 'Missing targetUrl or tagName' });
            }

            try {
                const response = await axios.get(targetUrl, {
                    timeout: 8000,
                    headers: { 'User-Agent': 'Mozilla/5.0 (Vercel-SEO-Checker)' }
                });

                const html = response.data;
                let match;

                if (tagName === 'facebook-pixel') {
                    const pixelRegex = new RegExp(`fbq\\(['"]init['"]\\s*,\\s*['"](\\d+)['"]\\)`, 'i');
                    match = html.match(pixelRegex);
                } else if (tagName === 'google-analytics') {
                    const gaRegex = new RegExp(`googletagmanager\\.com/gtag/js\\?id=([G|UA]-[A-Z0-9-]+)`, 'i');
                    const gaConfigRegex = new RegExp(`gtag\\(['"]config['"]\\s*,\\s*['"]([G|UA]-[A-Z0-9-]+)['"]\\)`, 'i');
                    match = html.match(gaRegex) || html.match(gaConfigRegex);
                } else if (tagName === 'mailchimp') {
                    return res.status(200).json({ status: 'simulation_active' });
                } else {
                    const metaRegex = new RegExp(`<meta[^>]*name=["']${tagName}["'][^>]*content=["']([^"']+)["']`, 'i');
                    const altMetaRegex = new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']${tagName}["']`, 'i');
                    match = html.match(metaRegex) || html.match(altMetaRegex);
                }

                if (match) {
                    const foundValue = match[1];
                    if (expectedValue && foundValue !== expectedValue) {
                        return res.status(200).json({ status: 'mismatch', found: foundValue, expected: expectedValue });
                    }
                    return res.status(200).json({ status: 'found', value: foundValue });
                }
                return res.status(200).json({ status: 'not_found' });
            } catch (error) {
                return res.status(500).json({ error: 'SEO Check Failed', details: error.message });
            }
        }

        // --- 2. MAILCHIMP (Merged from mailchimp-subscribe.js) ---
        if (action === 'subscribe') {
            if (!email) return res.status(400).json({ error: 'Email is required' });

            const docSnap = await db.collection('settings').doc('integrations').get();
            if (!docSnap.exists) return res.status(404).json({ error: 'Mailchimp not configured' });

            const data = docSnap.data();
            const apiKey = data.mailchimpApiKey;
            const audienceId = data.mailchimpAudienceId;
            if (!apiKey || !audienceId) return res.status(400).json({ error: 'Mailchimp credentials missing' });

            const dc = apiKey.split('-')[1];
            const url = `https://${dc}.api.mailchimp.com/3.0/lists/${audienceId}/members`;

            try {
                await axios.post(url, {
                    email_address: email,
                    status: 'subscribed',
                    merge_fields: { FNAME: firstName || '', LNAME: lastName || '' }
                }, {
                    headers: { Authorization: `apikey ${apiKey}` }
                });
                return res.status(200).json({ success: true });
            } catch (error) {
                if (error.response?.data?.title === 'Member Exists') return res.status(200).json({ success: true, message: 'Existing' });
                return res.status(500).json({ error: 'Subscription failed' });
            }
        }

        // --- 3. PRODUCT FEED (Merged from product-feed.js) ---
        if (action === 'generateFeed') {
            const platform = req.query.platform || 'google'; // 'google' or 'facebook'
            const snapshot = await productsRef.where('isActive', '==', true).get();
            const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const baseUrl = 'https://zaitandfilters.com';
            let xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>Zait &amp; Filters</title><link>${baseUrl}</link>`;

            products.forEach(p => {
                const title = escapeXml(`${p.partBrand || ''} ${p.name || ''}`.trim());
                const availability = p.stock > 0 ? (platform === 'facebook' ? 'in stock' : 'in_stock') : (platform === 'facebook' ? 'out of stock' : 'out_of_stock');
                xml += `<item>
                    <g:id>${p.id}</g:id>
                    <g:title>${title}</g:title>
                    <g:link>${baseUrl}/product/${p.id}</g:link>
                    <g:image_link>${escapeXml(p.image || p.imageUrl)}</g:image_link>
                    <g:availability>${availability}</g:availability>
                    <g:price>${p.price || 0} EGP</g:price>
                    <g:brand>${escapeXml(p.partBrand || 'Generic')}</g:brand>
                    <g:condition>new</g:condition>
                </item>`;
            });

            xml += `</channel></rss>`;
            res.setHeader('Content-Type', 'application/xml');
            return res.status(200).send(xml);
        }

        // --- 4. SITEMAP (Merged from sitemap.js) ---
        if (action === 'generateSitemap') {
            const [productsSnap, postsSnap] = await Promise.all([
                productsRef.where('isActive', '==', true).get(),
                db.collection('blog_posts').where('isActive', '==', true).get()
            ]);

            const staticPages = ['', '/shop', '/oil-advisor', '/contact', '/blog', '/about', '/garage', '/cart'];
            const today = new Date().toISOString().split('T')[0];

            let xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

            staticPages.forEach(p => {
                xml += `<url><loc>${BASE_URL}${p}</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>${p === '' ? '1.0' : '0.8'}</priority></url>`;
            });

            productsSnap.docs.forEach(doc => {
                xml += `<url><loc>${BASE_URL}/product/${doc.id}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`;
            });

            postsSnap.docs.forEach(doc => {
                const data = doc.data();
                xml += `<url><loc>${BASE_URL}/blog/${data.slug || doc.id}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>`;
            });

            xml += `</urlset>`;
            res.setHeader('Content-Type', 'application/xml');
            return res.status(200).send(xml);
        }

        // --- 5. CHATBOT (Merged from chat-agent.js) ---
        if (action === 'chat') {
            const { messages, language, currentState, intent: chatIntent, collectedData } = { ...req.query, ...req.body };
            const isAR = language === 'ar';

            const chatRespond = (text, nextState = null, options = [], newData = null) => {
                return res.status(200).json({
                    response: text,
                    state: nextState,
                    options: options,
                    newData: newData
                });
            };

            const lastMsg = messages?.[messages.length - 1]?.content?.trim() || '';
            const lastMsgLower = lastMsg.toLowerCase();

            // GLOBAL ESCAPES
            if (lastMsgLower.includes('track') || lastMsgLower.includes('تتبع')) {
                return chatRespond(
                    isAR ? "من فضلك أرسل رقم الطلب أو رقم الهاتف المستخدم للطلب." : "Please send your Order ID or the Phone Number used for the order.",
                    'track_order'
                );
            }
            if (lastMsgLower.includes('expert') || lastMsgLower.includes('خبير') || lastMsgLower.includes('واتساب') || lastMsgLower.includes('whatsapp')) {
                return chatRespond(
                    isAR ? "يسعدني جداً مساعدتك. من فضلك سيب رقم الواتساب الخاص بك، وفريقنا الفني هيتواصل معاك فوراً." : "I'd love to help! Please leave your WhatsApp number, and our technical expert will contact you immediately.",
                    'await_phone'
                );
            }

            // STATE HANDLERS
            if (currentState === 'track_order') {
                const numberMatch = lastMsg.match(/\d+/);
                if (numberMatch) {
                    const idOrPhone = numberMatch[0];
                    const ordersRef = db.collection('orders');
                    const [phoneSnap, phoneSnapAlt, docSnap] = await Promise.all([
                        ordersRef.where('customer.phone', '==', idOrPhone).limit(1).get(),
                        ordersRef.where('shippingAddress.phone', '==', idOrPhone).limit(1).get(),
                        ordersRef.doc(idOrPhone).get()
                    ]);
                    let oData = docSnap.exists ? docSnap.data() : null;
                    if (!oData && !phoneSnap.empty) oData = phoneSnap.docs[0].data();
                    if (!oData && !phoneSnapAlt.empty) oData = phoneSnapAlt.docs[0].data();

                    if (oData) {
                        const sMap = { 'Pending': isAR ? 'قيد الانتظار' : 'Pending', 'Processing': isAR ? 'جاري التجهيز' : 'Processing', 'Shipped': isAR ? 'تم الشحن' : 'Shipped', 'Delivered': isAR ? 'تم التوصيل' : 'Delivered', 'Cancelled': isAR ? 'ملغي' : 'Cancelled' };
                        const status = sMap[oData.paymentStatus] || oData.paymentStatus || 'Pending';
                        const msg = isAR ? `تم العثور على طلبك! الحالة الحالية هي: *${status}*. الإجمالي: ${oData.total} ج.م.` : `Order found! Current status is: *${status}*. Total: ${oData.total} EGP.`;
                        return chatRespond(msg, 'idle', [{ label: isAR ? "الرجوع للرئيسية" : "Back to Home", value: "idle" }]);
                    }
                    return chatRespond(isAR ? "عذراً، لم أستطع العثور على طلب بهذا الرقم. هل يمكنك التأكد من الرقم؟" : "Sorry, I couldn't find an order with that number. Could you double-check?", 'track_order');
                }
                return chatRespond(isAR ? "من فضلك أرسل رقم الطلب أو رقم الهاتف المستخدم للطلب." : "Please send your Order ID or the Phone Number used for the order.", 'track_order');
            }

            if (currentState === 'ask_make') return chatRespond(isAR ? `جميل! موديل الـ ${lastMsg} إيه؟ (مثال: Corolla, Sunny)` : `Great! Which ${lastMsg} model? (e.g., Corolla, Sunny)`, 'ask_model', [], { make: lastMsg });
            if (currentState === 'ask_model') return chatRespond(isAR ? "تمام، سنة الموديل كام؟" : "Understood, and the manufacturing year?", 'ask_year', [], { model: lastMsg });
            if (currentState === 'ask_year') return chatRespond(isAR ? "بتبحث عن أي قطعة غيار أو زيت؟ (مثال: زيت محرك، فلتر هواء)" : "What part or oil are you looking for? (e.g., Engine Oil, Air Filter)", 'searching_products', [], { year: lastMsg });

            if (currentState === 'searching_products') {
                const { make, model } = collectedData || {};
                const snapshot = await db.collection('products').where('isActive', '==', true).limit(300).get();
                const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(p => {
                    if (make && p.make !== make && p.car_make !== make) return false;
                    if (model && p.model !== model && p.car_model !== model) return false;
                    const terms = lastMsgLower.split(' ').filter(t => t.length > 1);
                    if (terms.length === 0) return true;
                    const txt = `${p.name || ''} ${p.nameEn || ''} ${p.category || ''} ${p.subcategory || ''}`.toLowerCase();
                    return terms.some(term => txt.includes(term));
                }).slice(0, 5);

                if (results.length > 0) {
                    let respText = isAR ? `إليك بعض النتائج المتوافقة:` : `Compatible results:`;
                    results.forEach(p => { respText += `\n\n• **[${p.nameEn || p.name}](https://zaitandfilters.com/product/${p.id})**\n  Price: ${p.price} EGP`; });
                    return chatRespond(respText, 'idle', [{ label: isAR ? "بحث جديد" : "New Search", value: "find_part" }]);
                }
                return chatRespond(isAR ? `لم أجد نتائج لـ "${lastMsg}". هل تريد خبير؟` : `No results for "${lastMsg}". Talk to expert?`, 'idle', [{ label: isAR ? "تحدث مع خبير" : "Talk Expert", value: "talk_to_expert" }]);
            }

            if (currentState === 'await_phone') {
                await db.collection('bot_leads').add({ phone: lastMsg, collectedData, timestamp: admin.firestore.FieldValue.serverTimestamp() });
                return chatRespond(isAR ? "شكراً لك! سنتواصل معك." : "Thank you! We'll contact you.", 'idle');
            }

            if (chatIntent === 'find_part' || lastMsgLower.includes('part') || lastMsgLower.includes('قطعة')) {
                return chatRespond(isAR ? "سأساعدك في العثور على ما تحتاجه! ما هو نوع سيارتك؟" : "I can help! What is your car make?", 'ask_make');
            }

            const welcome = isAR ? "أنا زيتون، مساعدك الذكي. كيف يمكنني مساعدتك؟" : "I'm Zeitoon, your smart assistant. How can I help?";
            return chatRespond(welcome, 'idle', [
                { label: isAR ? "قطعة غيار" : "Find a part", value: "find_part" },
                { label: isAR ? "تتبع طلبي" : "Track order", value: "track_order" },
                { label: isAR ? "تحدث مع خبير" : "Talk expert", value: "talk_to_expert" }
            ]);
        }

        // --- 6. ORIGINAL PRODUCT ACTIONS ---
        if (action === 'getMakes') {
            const snapshot = await productsQuery.get();
            const rawData = snapshot.docs.map(doc => doc.data());
            const makes = [...new Set(rawData.map(d => d.make || d.car_make || d.carMake))].filter(Boolean).sort();
            return res.status(200).json(makes);
        }

        if (action === 'getModels' && make) {
            const snapshot = await productsQuery.where('make', '==', make).get();
            const snapshotAlt = await productsQuery.where('car_make', '==', make).get();
            const rawData = [...snapshot.docs.map(d => d.data()), ...snapshotAlt.docs.map(d => d.data())];
            const models = [...new Set(rawData.map(d => d.model || d.car_model))].filter(Boolean).sort();
            return res.status(200).json(models);
        }

        if (action === 'getYears' && make && model) {
            const snapshot = await productsQuery.where('make', '==', make).where('model', '==', model).get();
            const snapshotAlt = await productsQuery.where('car_make', '==', make).where('car_model', '==', model).get();
            const docs = [...snapshot.docs, ...snapshotAlt.docs];
            const years = new Set();
            docs.forEach(doc => {
                const data = doc.data();
                if (data.yearStart && data.yearEnd) {
                    for (let y = Number(data.yearStart); y <= Number(data.yearEnd); y++) years.add(y);
                } else if (data.yearStart) years.add(Number(data.yearStart));
            });
            return res.status(200).json(Array.from(years).sort((a, b) => b - a));
        }

        if (action === 'getRelated' && productId) {
            let related = [];
            const seen = new Set([productId]);
            const add = (snap) => snap.docs.forEach(d => { if (!seen.has(d.id)) { related.push({ id: d.id, ...d.data() }); seen.add(d.id); } });

            if (make && model && make !== 'Universal') {
                const s = await productsRef.where('isActive', '==', true).where('make', '==', make).where('model', '==', model).limit(8).get();
                add(s);
            }
            if (related.length < 8 && category) {
                const s = await productsRef.where('isActive', '==', true).where('category', '==', category).limit(8).get();
                add(s);
            }
            if (related.length < 4) {
                const s = await productsRef.where('isActive', '==', true).limit(8).get();
                add(s);
            }
            return res.status(200).json(related.slice(0, 8));
        }

        return res.status(400).json({ error: 'Invalid action' });
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
}
