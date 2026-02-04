import admin from 'firebase-admin';

// Initialize Firebase Admin
if (!admin.apps.length) {
    try {
        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
            ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
            : null;

        if (serviceAccount) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } else {
            admin.initializeApp({
                projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'zaitandfilters'
            });
        }
    } catch (e) {
        console.error("Firebase Admin Init Error:", e);
    }
}

const db = admin.firestore();

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { messages, language, currentState, intent, collectedData } = req.body;
    const isAR = language === 'ar';

    // Helper for structured responses
    const respond = (text, nextState = null, options = [], newData = null) => {
        return res.status(200).json({
            response: text,
            state: nextState,
            options: options,
            newData: newData
        });
    };

    try {
        console.log(`[ChatAgent] State: ${currentState}, Intent: ${intent}, LastMsg: ${messages[messages.length - 1].content}`);

        const lastMsg = messages[messages.length - 1].content.trim();
        const lastMsgLower = lastMsg.toLowerCase();

        // 1. GLOBAL ESCAPES: Let user jump into other flows at any time
        if (lastMsgLower.includes('track') || lastMsgLower.includes('تتبع')) {
            return respond(
                isAR ? "من فضلك أرسل رقم الطلب أو رقم الهاتف المستخدم للطلب." : "Please send your Order ID or the Phone Number used for the order.",
                'track_order'
            );
        }
        if (lastMsgLower.includes('expert') || lastMsgLower.includes('خبير') || lastMsgLower.includes('واتساب') || lastMsgLower.includes('whatsapp')) {
            return respond(
                isAR ? "يسعدني جداً مساعدتك. من فضلك سيب رقم الواتساب الخاص بك، وفريقنا الفني هيتواصل معاك فوراً." : "I'd love to help! Please leave your WhatsApp number, and our technical expert will contact you immediately.",
                'await_phone'
            );
        }

        // 2. STATE HANDLERS
        // --- TRACK ORDER STATE ---
        if (currentState === 'track_order') {
            const numberMatch = lastMsg.match(/\d+/);
            if (numberMatch) {
                const idOrPhone = numberMatch[0];
                const ordersRef = db.collection('orders');

                // Try searching by phone and ID
                const [phoneSnap, phoneSnapAlt, docSnap] = await Promise.all([
                    ordersRef.where('customer.phone', '==', idOrPhone).limit(1).get(),
                    ordersRef.where('shippingAddress.phone', '==', idOrPhone).limit(1).get(),
                    ordersRef.doc(idOrPhone).get()
                ]);

                let orderData = docSnap.exists ? docSnap.data() : null;
                if (!orderData && !phoneSnap.empty) orderData = phoneSnap.docs[0].data();
                if (!orderData && !phoneSnapAlt.empty) orderData = phoneSnapAlt.docs[0].data();

                if (orderData) {
                    const statusMap = {
                        'Pending': isAR ? 'قيد الانتظار' : 'Pending',
                        'Processing': isAR ? 'جاري التجهيز' : 'Processing',
                        'Shipped': isAR ? 'تم الشحن' : 'Shipped',
                        'Delivered': isAR ? 'تم التوصيل' : 'Delivered',
                        'Cancelled': isAR ? 'ملغي' : 'Cancelled'
                    };
                    const status = statusMap[orderData.paymentStatus] || orderData.paymentStatus || 'Pending';
                    const msg = isAR
                        ? `تم العثور على طلبك! الحالة الحالية هي: *${status}*. الإجمالي: ${orderData.total} ج.م.`
                        : `Order found! Current status is: *${status}*. Total: ${orderData.total} EGP.`;
                    return respond(msg, 'idle', [
                        { label: isAR ? "الرجوع للرئيسية" : "Back to Home", value: "idle" }
                    ]);
                } else {
                    return respond(
                        isAR ? "عذراً، لم أستطع العثور على طلب بهذا الرقم. هل يمكنك التأكد من الرقم؟" : "Sorry, I couldn't find an order with that number. Could you double-check?",
                        'track_order'
                    );
                }
            }
            return respond(
                isAR ? "من فضلك أرسل رقم الطلب أو رقم الهاتف المستخدم للطلب." : "Please send your Order ID or the Phone Number used for the order.",
                'track_order'
            );
        }

        // --- PRODUCT SEARCH FLOW ---
        if (currentState === 'ask_make') {
            return respond(
                isAR ? `جميل! موديل الـ ${lastMsg} إيه؟ (مثال: Corolla, Sunny)` : `Great! Which ${lastMsg} model? (e.g., Corolla, Sunny)`,
                'ask_model',
                [],
                { make: lastMsg }
            );
        }

        if (currentState === 'ask_model') {
            return respond(
                isAR ? "تمام، سنة الموديل كام؟" : "Understood, and the manufacturing year?",
                'ask_year',
                [],
                { model: lastMsg }
            );
        }

        if (currentState === 'ask_year') {
            return respond(
                isAR ? "بتبحث عن أي قطعة غيار أو زيت؟ (مثال: زيت محرك، فلتر هواء)" : "What part or oil are you looking for? (e.g., Engine Oil, Air Filter)",
                'searching_products',
                [],
                { year: lastMsg }
            );
        }

        if (currentState === 'searching_products') {
            const { make, model } = collectedData || {};

            // Query only active products to avoid missing index errors with composite filters
            // We fetch a larger batch and filter in-memory for speed/simplicity in rule-based bot
            const snapshot = await db.collection('products').where('isActive', '==', true).limit(500).get();

            const results = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(p => {
                    // Match Make (if provided)
                    if (make && p.make !== make && p.car_make !== make) return false;
                    // Match Model (if provided)
                    if (model && p.model !== model && p.car_model !== model) return false;

                    // Keyword Search for Part Name (lastMsg)
                    const searchTerms = lastMsgLower.split(' ').filter(t => t.length > 1);
                    if (searchTerms.length === 0) return true; // Show anything for short inputs

                    const prodText = `${p.name || ''} ${p.nameEn || ''} ${p.category || ''} ${p.subcategory || ''}`.toLowerCase();
                    return searchTerms.some(term => prodText.includes(term));
                })
                .slice(0, 5);

            if (results.length > 0) {
                let respText = isAR
                    ? `إليك بعض النتائج المتوافقة مع ${make || ''} ${model || ''}:`
                    : `Here are some compatible results for ${make || ''} ${model || ''}:`;

                results.forEach(p => {
                    const title = p.nameEn || p.name;
                    respText += `\n\n• **[${title}](https://zaitandfilters.com/product/${p.id})**\n  السعر: ${p.price} EGP`;
                });

                return respond(respText, 'idle', [
                    { label: isAR ? "بحث جديد" : "New Search", value: "find_part" },
                    { label: isAR ? "تحدث مع خبير" : "Talk to Expert", value: "talk_to_expert" }
                ]);
            }

            return respond(
                isAR
                    ? `لم أجد نتائج فورية لـ "${lastMsg}". هل تحب أن يتواصل معك خبير فني للتأكد من التوفر؟`
                    : `No immediate results found for "${lastMsg}". Would you like an expert to contact you to check availability?`,
                'idle',
                [
                    { label: isAR ? "تحدث مع خبير" : "Talk to Expert", value: "talk_to_expert" },
                    { label: isAR ? "بحث جديد" : "New Search", value: "find_part" }
                ]
            );
        }

        if (currentState === 'await_phone') {
            // Save lead to Firestore
            await db.collection('bot_leads').add({
                phone: lastMsg,
                collectedData,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
            return respond(
                isAR ? "شكراً لك! خبيرنا سيتواصل معك عبر الواتساب في أقرب وقت." : "Thank you! Our expert will contact you via WhatsApp shortly.",
                'idle'
            );
        }

        // --- TRIGGER FLOWS FROM IDLE ---
        if (intent === 'find_part' || lastMsgLower.includes('part') || lastMsgLower.includes('قطعة')) {
            return respond(
                isAR ? "سأساعدك في العثور على ما تحتاجه! ما هو نوع سيارتك؟ (مثال: Toyota, Nissan)" : "I can help you find what you need! What is your car make? (e.g., Toyota, Nissan)",
                'ask_make'
            );
        }

        // DEFAULT WELCOME (If nothing else matches)
        const welcome = isAR
            ? "أنا زيتون، مساعدك الذكي. كيف يمكنني مساعدتك اليوم؟"
            : "I'm Zeitoon, your smart assistant. How can I help you today?";
        return respond(welcome, 'idle', [
            { label: isAR ? "أبحث عن قطعة غيار" : "Find a part", value: "find_part" },
            { label: isAR ? "تتبع طلبي" : "Track my order", value: "track_order" },
            { label: isAR ? "تحدث مع خبير" : "Talk to an expert", value: "talk_to_expert" }
        ]);

    } catch (error) {
        console.error("Chat Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}
