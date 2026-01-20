// Vercel Serverless Function to proxy EasyKash payment requests
// This bypasses CORS issues and keeps API keys secure

export default async function handler(req, res) {
    console.log('=== Payment API Called ===');
    console.log('Method:', req.method);
    console.log('Origin:', req.headers.origin);

    // Set CORS headers to allow requests from your frontend
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*'); // Or specify your domain
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        console.log('Handling OPTIONS preflight request');
        return res.status(200).end();
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        console.log('Invalid method:', req.method);
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get EasyKash credentials from environment variables
        const EASYKASH_API_KEY = process.env.VITE_EASYKASH_API_KEY;
        const EASYKASH_SECRET_KEY = process.env.VITE_EASYKASH_SECRET_KEY;

        console.log('Environment Variables Check:');
        console.log('API Key exists:', !!EASYKASH_API_KEY);
        console.log('Secret Key exists:', !!EASYKASH_SECRET_KEY);
        console.log('API Key (first 10 chars):', EASYKASH_API_KEY?.substring(0, 10) + '...');

        if (!EASYKASH_API_KEY || !EASYKASH_SECRET_KEY) {
            console.error('❌ Missing EasyKash credentials in environment variables');
            return res.status(500).json({
                error: 'Payment gateway configuration error',
                details: 'Missing API credentials'
            });
        }

        // Get payment data from request body
        const {
            amount,
            orderId,
            customerName,
            customerPhone,
            customerEmail,
            returnUrl
        } = req.body;

        console.log('Request Body:', {
            amount,
            orderId,
            customerName,
            customerPhone,
            customerEmail,
            returnUrl
        });

        // Validate required fields
        if (!amount || !orderId || !customerName || !customerPhone) {
            console.error('❌ Missing required fields');
            return res.status(400).json({
                error: 'Missing required payment information',
                missing: {
                    amount: !amount,
                    orderId: !orderId,
                    customerName: !customerName,
                    customerPhone: !customerPhone
                }
            });
        }

        // Split customer name
        const names = customerName.split(' ');
        const firstName = names[0] || 'Customer';
        const lastName = names.slice(1).join(' ') || 'Name';

        // Prepare EasyKash API payload
        const payload = {
            token: EASYKASH_API_KEY,
            amount: String(amount),
            currency: 'EGP',
            merchant_order_id: `ORDER_${Date.now()}_${orderId}`,
            description: 'Zait & Filters Order',
            return_url: returnUrl || `${req.headers.origin}/order-success?id=${orderId}`,
            customer: {
                first_name: firstName,
                last_name: lastName,
                email: customerEmail || 'customer@example.com',
                mobile: customerPhone
            }
        };

        console.log('EasyKash Payload (without token):', {
            ...payload,
            token: '***HIDDEN***'
        });

        // Make request to EasyKash API
        console.log('Calling EasyKash API...');
        const response = await fetch('https://easykash.app/api/v1/orders', {
            method: 'POST',
            headers: {
                'X-Secret-Key': EASYKASH_SECRET_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        console.log('EasyKash Response Status:', response.status);
        console.log('EasyKash Response Headers:', Object.fromEntries(response.headers.entries()));

        const data = await response.json();
        console.log('EasyKash Response Data:', data);

        if (!response.ok) {
            console.error('❌ EasyKash API error:', {
                status: response.status,
                statusText: response.statusText,
                data: data
            });
            return res.status(response.status).json({
                error: 'Payment gateway error',
                details: data,
                status: response.status
            });
        }

        console.log('✅ Payment URL generated:', data.url);

        // Return the payment URL to the client
        return res.status(200).json({
            success: true,
            url: data.url,
            orderId: data.order_id || orderId
        });

    } catch (error) {
        console.error('❌ Payment proxy error:', error);
        console.error('Error stack:', error.stack);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
