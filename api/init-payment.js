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

    // UPDATED CREDENTIALS FROM USER SCREENSHOT
    // TODO: Move these to environment variables after verification
    const EASYKASH_API_KEY = "mt6ilpuqy9n1bn84";
    const EASYKASH_SECRET_KEY = "87ca3d5640dc3f5809d3dfbf4a5045ad";

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

        // ADJUSTMENT: Send amount as currency decimal string (e.g. "150.00")
        // The previous "pips" logic (x100) might have been creating huge amounts (e.g. 15000 EGP) causing rejection.
        const parsedAmount = parseFloat(amount) || 0;
        const finalAmount = parsedAmount.toFixed(2);

        // Ensure orderId is efficient (alphanumeric)
        const merchantOrderId = orderId || `ORDER_${Date.now()}`;
        const currency = 'EGP';
        const email = customerEmail || "customer@example.com";
        const name = customerName || "Customer";
        const phone = customerPhone || "01000000000";

        // Signature construction
        // Standard: apiKey|amount|currency|merchantMerchantOrderId
        const signatureString = `${EASYKASH_API_KEY}|${finalAmount}|${currency}|${merchantOrderId}`;
        const signature = crypto
            .createHmac('sha256', EASYKASH_SECRET_KEY)
            .update(signatureString)
            .digest('hex');

        // Return params for client-side form submission
        // CRITICAL: URL must be www.easykash.net to avoid 301 Redirect (POST -> GET)
        // URL: https://www.easykash.net/api/v1/checkout
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
                signature: signature,
                source: 'website'
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
