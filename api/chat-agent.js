import { GoogleGenerativeAI } from "@google/generative-ai";
import admin from 'firebase-admin';

// Initialize Firebase Admin (Singleton pattern)
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
            // Local development or if Vercel fallback
            admin.initializeApp({
                projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'zaitandfilters'
            });
        }
    } catch (e) {
        console.error("Firebase Admin Init Error:", e);
    }
}

const db = admin.firestore();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const SYSTEM_PROMPT = `You are 'Zeitoon' (زيتون), the official AI Sales Agent for Zait & Filters (زيت اند فلترز). Your mission is to help customers find the perfect spare parts and oils for their vehicles.

CORE RULES:
1. Friendly & Professional: Greet the customer warmly (e.g., "أهلاً بك في زيت اند فلترز!").
2. Finding Parts:
   - If the user asks for a part (e.g., "أحتاج زيت محرك"), politely ask for car details: Make (الماركة), Model (الموديل), and Year (السنة).
   - Once you have details, use 'search_products' tool.
   - Present results with clear names, prices, and direct links: [Product Name](https://zaitandfilters.com/product/ID).
3. Order Tracking:
   - If the user asks about an order status, ask for 'Order ID' or 'Phone Number'.
   - Use 'get_order_status' tool.
4. Lead Generation:
   - If you can't find a part, or the query is too complex, say: "I'd love to help you find this. Please leave your WhatsApp number, and our technical team will contact you directly."
   - (بالعربية: "يسعدني جداً مساعدتك. من فضلك سيب رقم الواتساب الخاص بك، وفريقنا الفني هيتواصل معاك فوراً.")
5. Multi-lingual: Support Arabic and English fluently.
6. Friendly Exit: Always finish by asking if there's anything else you can do.`;

// tool definitions
const tools = [
    {
        functionDeclarations: [
            {
                name: "search_products",
                description: "Search for automotive products in the database based on vehicle details and part type.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        make: { type: "STRING", description: "Car manufacturer (e.g. Toyota, Nissan)" },
                        model: { type: "STRING", description: "Car model (e.g. Corolla, Sunny)" },
                        year: { type: "STRING", description: "Manufacturing year (e.g. 2015)" },
                        query: { type: "STRING", description: "Search term for the part (e.g. Engine Oil, Air Filter)" }
                    },
                    required: ["query"]
                }
            },
            {
                name: "get_order_status",
                description: "Check the current status and delivery info of a customer order.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        idOrPhone: { type: "STRING", description: "The Order ID (e.g. ORD-123) or the Phone number used for the order." }
                    },
                    required: ["idOrPhone"]
                }
            }
        ]
    }
];

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { messages, language } = req.body;

    if (!process.env.GEMINI_API_KEY) {
        return res.status(200).json({
            response: language === 'ar'
                ? "عذراً، محرك المساعد الذكي قيد الصيانة حالياً. يرجى محاولة التواصل معنا عبر واتساب."
                : "Sorry, the AI engine is currently in maintenance. Please contact us via WhatsApp."
        });
    }

    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            systemInstruction: SYSTEM_PROMPT,
            tools: tools
        });

        const chat = model.startChat({
            history: messages.slice(0, -1).map(m => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.content }]
            }))
        });

        const lastMessage = messages[messages.length - 1].content;
        const result = await chat.sendMessage(lastMessage);
        const response = result.response;

        let finalResponse = "";
        const call = response.functionCalls()?.[0];

        if (call) {
            const { name, args } = call;
            let toolOutput = {};

            if (name === "search_products") {
                const { make, model: carModel, year, query: searchTerms } = args;

                let q = db.collection('products').where('isActive', '==', true);

                // Firestore doesn't support complex full-text search easily here without Algolia, 
                // so we fetch and filter locally for small set, or use startsWith
                const snapshot = await q.limit(50).get();
                let products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Filter by keywords
                if (searchTerms) {
                    const terms = searchTerms.toLowerCase().split(' ');
                    products = products.filter(p => {
                        const searchable = `${p.name} ${p.nameEn} ${p.partBrand} ${p.category} ${p.subcategory}`.toLowerCase();
                        return terms.every(t => searchable.includes(t));
                    });
                }

                // Filter by car if provided
                if (make && make !== 'Universal') {
                    products = products.filter(p => p.make === 'Universal' || p.make?.toLowerCase().includes(make.toLowerCase()));
                }

                toolOutput = products.slice(0, 5).map(p => ({
                    id: p.id,
                    name: p.name,
                    nameEn: p.nameEn,
                    price: p.price,
                    image: p.image || p.images?.[0],
                    brand: p.partBrand || p.brand
                }));

            } else if (name === "get_order_status") {
                const { idOrPhone } = args;
                let orderSnap;

                // Try searching by ID
                if (idOrPhone.length > 5) {
                    orderSnap = await db.collection('orders').doc(idOrPhone).get();
                }

                if (!orderSnap?.exists) {
                    // Try searching by phone
                    const phoneQuery = await db.collection('orders').where('customer.phone', '==', idOrPhone).limit(1).get();
                    if (!phoneQuery.empty) orderSnap = phoneQuery.docs[0];
                }

                if (orderSnap?.exists || !orderSnap?.empty) {
                    const orderData = orderSnap.data?.() || orderSnap.data();
                    toolOutput = {
                        status: orderData.status,
                        total: orderData.total,
                        date: orderData.createdAt?.toDate?.()?.toLocaleDateString() || "Recent",
                        itemsCount: orderData.items?.length || 0
                    };
                } else {
                    toolOutput = { error: "Order not found" };
                }
            }

            // Send tool output back to AI
            const toolResult = await chat.sendMessage([{
                functionResponse: {
                    name: name,
                    response: { result: toolOutput }
                }
            }]);

            finalResponse = toolResult.response.text();
        } else {
            finalResponse = response.text();
        }

        res.status(200).json({ response: finalResponse });

    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}
