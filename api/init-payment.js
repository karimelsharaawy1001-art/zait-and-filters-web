import crypto from 'crypto';
import axios from 'axios';

export default async function handler(req, res) {
    console.log('API Hit!');
    console.log('=== Payment API Called (Form-Data Mode) ===');

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

    // Strict Environment Variable Check
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

        // 1. MINIMAL TEST PAYLOAD (Hardcoded for debugging)
        // We use 100 pips (1 EGP) to see if the gateway accepts the request
        const testAmount = "100";
        const testEmail = "test_customer@example.com";
        const merchantOrderId = `TEST_ORDER_${Date.now()}`;
        const currency = 'EGP';

        // 2. HMAC Signature
        const signatureString = `${EASYKASH_API_KEY}|${testAmount}|${currency}|${merchantOrderId}`;
        const signature = crypto
            .createHmac('sha256', EASYKASH_SECRET_KEY)
            .update(signatureString)
            .digest('hex');

        // 3. FORM DATA PAYLOAD
        const params = new URLSearchParams();
        params.append('api_key', EASYKASH_API_KEY);
        params.append('merchant_order_id', merchantOrderId);
        params.append('amount', testAmount);
        params.append('currency', currency);
        params.append('customer_name', customerName || "Test User");
        params.append('customer_email', testEmail);
        params.append('customer_phone', customerPhone || "01000000000");
        params.append('return_url', returnUrl || `${req.headers.origin}/order-success`);

        console.log('EasyKash Form Payload (sanitized):', params.toString().replace(EASYKASH_API_KEY, '***'));

        // 4. CALL EASYKASH WITH FORM DATA
        const response = await axios({
            method: 'post',
            url: 'https://easykash.net/api/v1/checkout',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
                'Authorization': `Bearer ${EASYKASH_API_KEY}`,
                'X-Secret-Key': EASYKASH_SECRET_KEY,
                'X-Signature': signature
            },
            data: params.toString(),
            timeout: 10000
        });

        const data = response.data;
        console.log('Full JSON Response:', data);

        const paymentUrl = data.url || data.checkout_url || data.payment_url;

        return res.status(200).json({
            success: true,
            url: paymentUrl,
            message: "Test payment link generated",
            raw: data
        });

    } catch (error) {
        if (error.response) {
            const statusCode = error.response.status;
            const errorData = error.response.data;

            // DUAL-MODE DEBUGGING: LOG HTML CONTENT IF PRESENT
            if (typeof errorData === 'string' && errorData.toLowerCase().includes('<!doctype html>')) {
                console.log('--- EASYKASH_HTML_DEBUG START ---');
                console.log(errorData.substring(0, 500));
                console.log('--- EASYKASH_HTML_DEBUG END ---');
            } else {
                console.error(`EasyKash JSON Error [${statusCode}]:`, errorData);
            }

            return res.status(statusCode).json({
                error: 'Payment gateway rejected request',
                status: statusCode,
                is_html: typeof errorData === 'string' && errorData.includes('<!doctype'),
                snippet: typeof errorData === 'string' ? errorData.substring(0, 200) : "N/A"
            });
        }

        console.error('❌ Connection Error:', error.message);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
}
