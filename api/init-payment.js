// Vercel Serverless Function to proxy EasyKash payment requests
// This bypasses CORS issues and keeps API keys secure

export default async function handler(req, res) {
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
        return res.status(200).end();
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get EasyKash credentials from environment variables
        const EASYKASH_API_KEY = process.env.VITE_EASYKASH_API_KEY;
        const EASYKASH_SECRET_KEY = process.env.VITE_EASYKASH_SECRET_KEY;

        if (!EASYKASH_API_KEY || !EASYKASH_SECRET_KEY) {
            console.error('Missing EasyKash credentials in environment variables');
            return res.status(500).json({ error: 'Payment gateway configuration error' });
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

        // Validate required fields
        if (!amount || !orderId || !customerName || !customerPhone) {
            return res.status(400).json({ error: 'Missing required payment information' });
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

        // Make request to EasyKash API
        const response = await fetch('https://easykash.app/api/v1/orders', {
            method: 'POST',
            headers: {
                'X-Secret-Key': EASYKASH_SECRET_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('EasyKash API error:', data);
            return res.status(response.status).json({
                error: 'Payment gateway error',
                details: data
            });
        }

        // Return the payment URL to the client
        return res.status(200).json({
            success: true,
            url: data.url,
            orderId: data.order_id || orderId
        });

    } catch (error) {
        console.error('Payment proxy error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
}
