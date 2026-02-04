import axios from 'axios';

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

    // UPDATED CREDENTIALS
    const EASYKASH_API_KEY = "mt6ilpuqy9n1bn84";
    // Secret not used in this endpoint

    if (!EASYKASH_API_KEY) {
        console.error('❌ Server configuration error: missing API key');
        return res.status(500).json({ error: 'Server configuration error: missing API key' });
    }

    try {
        const {
            amount,
            customerName,
            customerPhone,
            customerEmail,
            returnUrl
        } = req.body;

        const parsedAmount = parseFloat(amount) || 0;

        // Construct Payload for EasyKash DirectPay API
        const payload = {
            amount: parsedAmount, // Standard float/number
            // Card (2), Wallet (4), Fawry (5), Meeza (6)
            // Installments: ValU (17), Aman (21), Souhoula (22), Contact (23), Blnk (25), Forsa (34)
            // Bank Installments: NBE (8-10), Banque Misr (18-20), Multiple Banks (26-28)
            paymentOptions: [
                2, 4, 5, 6,
                17, 21, 22, 23, 25, 34,
                8, 9, 10,
                18, 19, 20,
                26, 27, 28
            ],
            cashExpiry: 24,
            name: customerName || "Customer",
            email: customerEmail || "customer@example.com",
            mobile: customerPhone || "01000000000",
            redirectUrl: returnUrl || `${req.headers.origin}/order-success`,
            customerReference: Date.now() + Math.floor(Math.random() * 1000000) // Ensure uniqueness
        };

        console.log('Sending request to EasyKash DirectPay API...', payload);

        const response = await axios.post('https://back.easykash.net/api/directpayv1/pay', payload, {
            headers: {
                'authorization': EASYKASH_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        const data = response.data;
        console.log('EasyKash Response:', JSON.stringify(data));

        // API returns { "redirectUrl": "..." }
        // We normalize this to 'url' for our frontend
        let paymentUrl = null;
        if (data && data.redirectUrl) paymentUrl = data.redirectUrl;
        else if (data && data.url) paymentUrl = data.url;
        else if (data && typeof data === 'string' && data.startsWith('http')) paymentUrl = data;

        if (paymentUrl) {
            return res.status(200).json({
                success: true,
                url: paymentUrl
            });
        } else {
            throw new Error("No URL in response: " + JSON.stringify(data));
        }

    } catch (error) {
        console.error('❌ EasyKash DirectPay Error:', error.response?.data || error.message);
        // Return detailed error from EasyKash if available
        const apiError = error.response?.data ? JSON.stringify(error.response.data) : error.message;
        return res.status(500).json({
            error: 'Internal server error',
            message: apiError
        });
    }
}
