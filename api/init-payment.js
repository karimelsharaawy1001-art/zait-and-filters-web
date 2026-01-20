import crypto from 'crypto';
import axios from 'axios';

export default async function handler(req, res) {
    console.log('API Hit!');
    console.log('=== Payment API Called ===');
    console.log('Method:', req.method);
    console.log('Origin:', req.headers.origin);

    // Set CORS headers
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

    // Explicit Presence Logging (Secure)
    console.log('API Key present:', !!process.env.EASYKASH_API_KEY);
    console.log('HMAC Secret present:', !!process.env.EASYKASH_HMAC_SECRET);

    // Strict Environment Variable Check
    const EASYKASH_API_KEY = process.env.EASYKASH_API_KEY;
    const EASYKASH_SECRET_KEY = process.env.EASYKASH_HMAC_SECRET;

    if (!EASYKASH_API_KEY || !EASYKASH_SECRET_KEY) {
        console.error('❌ Server configuration error: missing keys');
        return res.status(500).json({
            error: 'Server configuration error: missing keys'
        });
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

        // Validate required fields
        if (!amount || !orderId || !customerName || !customerPhone) {
            return res.status(400).json({ error: 'Missing required payment information' });
        }

        // 1. Amount Format: Convert to pips (sent as string for safety)
        const amountInPips = Math.round(parseFloat(amount) * 100).toString();

        // 2. Merchant Order ID
        const merchantOrderId = `ORDER_${Date.now()}_${orderId}`;

        // 3. HMAC Signature
        const currency = 'EGP';
        const signatureString = `${EASYKASH_API_KEY}|${amountInPips}|${currency}|${merchantOrderId}`;
        const signature = crypto
            .createHmac('sha256', EASYKASH_SECRET_KEY)
            .update(signatureString)
            .digest('hex');

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

        // Make request to EasyKash API using Axios
        console.log('Calling EasyKash API with axios...');
        const response = await axios({
            method: 'post',
            url: 'https://easykash.net/api/v1/orders',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${EASYKASH_API_KEY}`,
                'X-Secret-Key': EASYKASH_SECRET_KEY,
                'X-Signature': signature
            },
            data: payload,
            timeout: 10000 // 10 seconds timeout
        });

        const data = response.data;
        console.log('✅ Payment URL generated:', data.url);

        return res.status(200).json({
            success: true,
            url: data.url,
            orderId: data.order_id || orderId
        });

    } catch (error) {
        console.error('❌ Payment API Error:', error.message);

        if (error.response) {
            // Log exact status code and raw data
            const statusCode = error.response.status;
            const errorData = error.response.data;

            console.error(`EasyKash Gateway Error [Status ${statusCode}]:`, errorData);

            // Return a clean JSON error even if the gateway returned HTML
            return res.status(statusCode).json({
                error: 'Payment gateway error',
                status: statusCode,
                details: typeof errorData === 'object' ? errorData : { raw: String(errorData).substring(0, 500) }
            });
        } else if (error.request) {
            console.error('No response from EasyKash Gateway. Request sent:', !!error.request);
            return res.status(504).json({
                error: 'Payment gateway timeout/no response',
                message: error.message
            });
        } else {
            return res.status(500).json({
                error: 'Internal server error',
                message: error.message
            });
        }
    }
}
