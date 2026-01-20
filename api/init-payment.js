import crypto from 'crypto';

export default async function handler(req, res) {
    console.log('=== Payment API Called ===');
    console.log('Method:', req.method);
    console.log('Origin:', req.headers.origin);

    // Set CORS headers to allow requests from your frontend
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

    try {
        const EASYKASH_API_KEY = process.env.VITE_EASYKASH_API_KEY;
        const EASYKASH_SECRET_KEY = process.env.VITE_EASYKASH_SECRET_KEY;

        if (!EASYKASH_API_KEY || !EASYKASH_SECRET_KEY) {
            console.error('❌ Missing EasyKash credentials');
            return res.status(500).json({ error: 'Payment gateway configuration error' });
        }

        const {
            amount,
            orderId,
            customerName,
            customerPhone,
            customerEmail,
            returnUrl
        } = req.body;

        // Validate required fields
        if (!amount || !orderId || !customerName || !customerPhone) {
            return res.status(400).json({ error: 'Missing required payment information' });
        }

        // 1. Check Amount Format: Convert to pips (e.g., 1080 -> 108000)
        const amountInPips = Math.round(parseFloat(amount) * 100);

        // 2. Prepare Merchant Order ID
        const merchantOrderId = `ORDER_${Date.now()}_${orderId}`;

        // 3. Signature Verification: Generate HMAC Signature
        // Common EasyKash logic: hmac_sha256(api_key | amount | currency | merchant_order_id, secret_key)
        const currency = 'EGP';
        const signatureString = `${EASYKASH_API_KEY}|${amountInPips}|${currency}|${merchantOrderId}`;
        const signature = crypto
            .createHmac('sha256', EASYKASH_SECRET_KEY)
            .update(signatureString)
            .digest('hex');

        // Prepare EasyKash API payload
        const payload = {
            api_key: EASYKASH_API_KEY,
            merchant_order_id: merchantOrderId,
            amount: amountInPips,
            currency: currency,
            customer_name: customerName,
            customer_email: customerEmail || 'customer@example.com',
            customer_phone: customerPhone,
            return_url: returnUrl || `${req.headers.origin}/order-success?id=${orderId}`
        };

        console.log('EasyKash Payload (sanitized):', { ...payload, api_key: '***' });

        // Make request to EasyKash API
        console.log('Calling EasyKash API...');
        const response = await fetch('https://easykash.app/api/v1/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Secret-Key': EASYKASH_SECRET_KEY,
                'X-Signature': signature // Adding signature as a header if required
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            // Debug EasyKash Response: Log exact reason
            console.error('EasyKash Error Details:', data);
            return res.status(response.status).json({
                error: 'Payment gateway error',
                details: data
            });
        }

        console.log('✅ Payment URL generated:', data.url);
        return res.status(200).json({
            success: true,
            url: data.url,
            orderId: data.order_id || orderId
        });

    } catch (error) {
        console.error('❌ Payment proxy error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
}
