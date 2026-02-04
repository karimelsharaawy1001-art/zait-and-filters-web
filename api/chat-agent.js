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

    const { messages, language, currentState, intent } = req.body;
    const isAR = language === 'ar';

    // Helper for structured responses
    const respond = (text, nextState = null, options = []) => {
        return res.status(200).json({
            response: text,
            state: nextState,
            options: options
        });
    };

    try {
        const lastMsg = messages[messages.length - 1].content.toLowerCase();

        // 1. INTENT: TRACK ORDER
        if (intent === 'track_order' || lastMsg.includes('track') || lastMsg.includes('تتبع')) {
            // Find if there's a number in the message
            const numberMatch = lastMsg.match(/\d+/);
            if (numberMatch) {
                const idOrPhone = numberMatch[0];
                let orderData = null;

                // Try phone search first (more common)
                const phoneQuery = await db.collection('orders').where('customer.phone', '==', idOrPhone).limit(1).get();
                if (!phoneQuery.empty) {
                    orderData = phoneQuery.docs[0].data();
                } else {
                    // Try ID search
                    const doc = await db.collection('orders').doc(idOrPhone).get();
                    if (doc.exists) orderData = doc.data();
                }

                if (orderData) {
                    const statusMap = {
                        'Pending': isAR ? 'قيد الانتظار' : 'Pending',
                        'Processing': isAR ? 'جاري التجهيز' : 'Processing',
                        'Shipped': isAR ? 'تم الشحن' : 'Shipped',
                        'Delivered': isAR ? 'تم التوصيل' : 'Delivered',
                        'Cancelled': isAR ? 'ملغي' : 'Cancelled'
                    };
                    const status = statusMap[orderData.status] || orderData.status;
                    const msg = isAR
                        ? `تم العثور على طلبك! الحالة الحالية هي: *${status}*. الإجمالي: ${orderData.total} ج.م.`
                        : `Order found! Current status is: *${status}*. Total: ${orderData.total} EGP.`;
                    return respond(msg, 'idle');
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

        // 2. INTENT: SEARCH PRODUCTS
        if (intent === 'find_part' || lastMsg.includes('part') || lastMsg.includes('قطعة') || lastMsg.includes('زيت')) {
            // Check for specific car details in message or state
            // For a rule-based bot, we'll guide them step-by-step
            if (!currentState || currentState === 'idle') {
                return respond(
                    isAR ? "سأساعدك في العثور على ما تحتاجه! ما هو نوع سيارتك؟ (مثال: Toyota, Nissan)" : "I can help you find what you need! What is your car make? (e.g., Toyota, Nissan)",
                    'ask_make'
                );
            }
        }

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

        // 3. WHATSAPP LEAD GEN
        if (lastMsg.includes('whatsapp') || lastMsg.includes('واتساب') || lastMsg.includes('خبير') || lastMsg.includes('expert')) {
            return respond(
                isAR ? "يسعدني جداً مساعدتك. من فضلك سيب رقم الواتساب الخاص بك، وفريقنا الفني هيتواصل معاك فوراً." : "I'd love to help! Please leave your WhatsApp number, and our technical expert will contact you immediately.",
                'await_phone'
            );
        }

        // DEFAULT WELCOME
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
        res.status(500).json({ error: "Internal Server Error" });
    }
}
