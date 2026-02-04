import axios from 'axios';
import admin from 'firebase-admin';

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

export default async function handler(req, res) {
    console.log('API Hit!');
    console.log('=== Payment API Called (DirectPay API v1) ===');

    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // 1. Fetch Dynamic Credentials from Firestore
    let EASYKASH_API_KEY = process.env.EASYKASH_API_KEY; // Fallback to env var

    try {
        console.log('[Payment API] Fetching credentials from Firestore...');
        const configSnap = await db.collection('payment_configs').doc('easykash').get();
        if (configSnap.exists) {
            const config = configSnap.data();
            if (config.apiKey) {
                EASYKASH_API_KEY = config.apiKey;
                console.log('[Payment API] Using API Key from Firestore:', EASYKASH_API_KEY.substring(0, 4) + '****');
            } else {
                console.warn('[Payment API] EasyKash apiKey not found in Firestore config, using fallback.');
            }
        } else {
            console.warn('[Payment API] EasyKash config document not found in Firestore, using fallback.');
        }
    } catch (dbError) {
        console.error('[Payment API] Error fetching Firestore config:', dbError.message);
        // We continue with fallback EASYKASH_API_KEY
    }

    // CRITICAL: If the key is the known-bad one from .env.local or is missing, 
    // fallback to the CONFIRMED working one for this account.
    if (!EASYKASH_API_KEY || EASYKASH_API_KEY === "5cao5gsexgmwpqkx") {
        EASYKASH_API_KEY = "mt6ilpuqy9n1bn84";
        console.log('[Payment API] Using confirmed legacy API key fallback.');
    }

    try {
        const {
            amount,
            customerName,
            customerPhone,
            customerEmail,
            returnUrl,
            orderId
        } = req.body;

        // Ensure amount is a number and handled correctly for EasyKash (typically decimal string or number)
        const parsedAmount = parseFloat(amount) || 0;

        // Construct Payload for EasyKash DirectPay API
        const payload = {
            amount: Number(parsedAmount.toFixed(2)), // Ensure 2 decimal places as number
            currency: "EGP", // REQUIRED FIELD: Verified via direct testing
            paymentOptions: [
                1, 2, 3, 5, 8, 9, 10, // Cards & Wallets
                17, 18, 19, 20, 21, // Apple Pay, ValU, Aman, Souhoola, Contact
                22, 23, 25, 28, 30, // Bank & Installments
                40, 41, 42, 43, 44, 45 // Blnk, Klivvr, Tru/MID and others
            ],
            cashExpiry: 24,
            name: customerName || "Customer",
            email: customerEmail || "customer@example.com",
            mobile: customerPhone || "01000000000",
            redirectUrl: returnUrl || `${req.headers.origin}/order-success`,
            customerReference: orderId || (Date.now() + Math.floor(Math.random() * 1000000)).toString()
        };

        console.log('Sending request to EasyKash DirectPay API...', {
            endpoint: 'https://back.easykash.net/api/directpayv1/pay',
            amount: payload.amount,
            ref: payload.customerReference
        });

        const response = await axios.post('https://back.easykash.net/api/directpayv1/pay', payload, {
            headers: {
                'authorization': EASYKASH_API_KEY,
                'Content-Type': 'application/json'
            },
            timeout: 15000 // Add timeout to prevent hanging
        });

        const data = response.data;
        console.log('EasyKash Response:', JSON.stringify(data));

        // API returns { "redirectUrl": "..." } or sometimes { "url": "..." }
        let paymentUrl = data?.redirectUrl || data?.url || (typeof data === 'string' && data.startsWith('http') ? data : null);

        if (paymentUrl) {
            return res.status(200).json({
                success: true,
                url: paymentUrl
            });
        } else {
            console.error('❌ EasyKash returned unexpected data format:', data);
            throw new Error("No URL in response: " + JSON.stringify(data));
        }

    } catch (error) {
        // Log detailed error for debugging on the server
        const errorData = error.response?.data;
        const statusCode = error.response?.status || 500;

        console.error('❌ EasyKash DirectPay Error:', {
            status: statusCode,
            data: errorData,
            message: error.message
        });

        // Return a more readable error to the frontend
        let friendlyMessage = "Failed to initialize payment gateway.";
        if (errorData) {
            if (typeof errorData === 'string') friendlyMessage += ` Detail: ${errorData}`;
            else if (errorData.message) friendlyMessage += ` Detail: ${errorData.message}`;
            else friendlyMessage += ` Detail: ${JSON.stringify(errorData)}`;
        } else {
            friendlyMessage += ` ${error.message}`;
        }

        return res.status(statusCode).json({
            error: 'Payment initialization failed',
            message: friendlyMessage,
            details: errorData // Return original error for frontend debugging if needed
        });
    }
}
