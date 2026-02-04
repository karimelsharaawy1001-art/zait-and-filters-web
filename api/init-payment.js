import crypto from 'crypto';
import axios from 'axios';

export default async function handler(req, res) {
    console.log('API Hit!');
    console.log('=== Payment API Called (Server-Side Mode) ===');

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

        // Convert amount to pips (1 EGP = 100 pips)
        const parsedAmount = parseFloat(amount) || 0;
        const finalAmount = Math.round(parsedAmount * 100).toString();

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

        // Form Data Payload
        const params = new URLSearchParams();
        params.append('api_key', EASYKASH_API_KEY);
        params.append('merchant_order_id', merchantOrderId);
        params.append('amount', finalAmount);
        params.append('currency', currency);
        params.append('customer_name', name);
        params.append('customer_email', email);
        params.append('customer_phone', phone);
        params.append('return_url', returnUrl || `${req.headers.origin}/order-success`);

        console.log('Sending request to EasyKash...');

        // CRITICAL: Use www.easykash.net to avoid 301 Redirect which converts POST to GET
        const response = await axios({
            method: 'post',
            url: 'https://www.easykash.net/api/v1/checkout',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
                'Authorization': `Bearer ${EASYKASH_API_KEY}`,
                'X-Secret-Key': EASYKASH_SECRET_KEY,
                'X-Signature': signature
            },
            data: params.toString(),
            timeout: 15000
        });

        const data = response.data;
        console.log('EasyKash Response Status:', response.status);
        console.log('EasyKash Response Data:', typeof data === 'object' ? JSON.stringify(data) : data.substring(0, 100));

        // Handle both possible response fields
        const paymentUrl = data.url || data.checkout_url || data.payment_url;

        if (paymentUrl) {
            return res.status(200).json({
                success: true,
                url: paymentUrl,
                message: "Payment link generated"
            });
        } else {
            // If no URL but success is true?
            throw new Error("No payment URL in response: " + JSON.stringify(data));
        }

    } catch (error) {
        // Enhanced Error Logging
        const errorResponse = error.response ? error.response.data : error.message;
        const statusCode = error.response ? error.response.status : 500;

        console.error('❌ EasyKash Error:', statusCode, errorResponse);

        // Check if we got HTML (which implies endpoint issue or auth page)
        if (typeof errorResponse === 'string' && errorResponse.includes('<!doctype user>')) {
            console.error("Received HTML instead of JSON. Check Endpoint URL.");
        }

        return res.status(statusCode).json({
            error: 'Payment gateway error',
            message: typeof errorResponse === 'object' ? JSON.stringify(errorResponse) : errorResponse
        });
    }
}
