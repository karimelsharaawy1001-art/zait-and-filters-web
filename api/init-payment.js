import crypto from 'crypto';

export default async function handler(req, res) {
    console.log('API Hit!');
    console.log('=== Payment API Called (Client-Side Mode) ===');

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

    const EASYKASH_API_KEY = process.env.EASYKASH_API_KEY;
    const EASYKASH_SECRET_KEY = process.env.EASYKASH_HMAC_SECRET;

    if (!EASYKASH_API_KEY || !EASYKASH_SECRET_KEY) {
        console.error('❌ Server configuration error: missing keys');
        return res.status(500).json({ error: 'Server configuration error: missing keys' });
    }

    try {
        const {
            amount,
            orderId,
            customerName,
            customerPhone,
            customerEmail,
            returnUrl
        } = req.body;

        const parsedAmount = parseFloat(amount) || 0;
        const finalAmount = Math.round(parsedAmount * 100).toString(); // 100 pips = 1 EGP

        const merchantOrderId = orderId || `ORDER_${Date.now()}`;
        const currency = 'EGP';
        const email = customerEmail || "customer@example.com";
        const name = customerName || "Customer";
        const phone = customerPhone || "01000000000";

        // Signature construction
        const signatureString = `${EASYKASH_API_KEY}|${finalAmount}|${currency}|${merchantOrderId}`;
        const signature = crypto
            .createHmac('sha256', EASYKASH_SECRET_KEY)
            .update(signatureString)
            .digest('hex');

        // Return params for client-side form submission
        // CRITICAL: URL must be www.easykash.net to avoid 301 Redirect (POST -> GET)
        return res.status(200).json({
            success: true,
            method: 'POST',
            url: 'https://www.easykash.net/api/v1/checkout',
            params: {
                api_key: EASYKASH_API_KEY,
                merchant_order_id: merchantOrderId,
                amount: finalAmount,
                currency: currency,
                customer_name: name,
                customer_email: email,
                customer_phone: phone,
                return_url: returnUrl || `${req.headers.origin}/order-success`,
                signature: signature
            }
        });

    } catch (error) {
        console.error('❌ Error generating payment params:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
}
