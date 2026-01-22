const sgMail = require('@sendgrid/mail');
const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}

const db = admin.firestore();

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { order, isTest, testEmail } = req.body;

    // Fetch SendGrid settings from Firestore
    let sgApiKey, sgSender, sgName;
    try {
        const settingsSnap = await db.collection('settings').doc('integrations').get();
        if (settingsSnap.exists) {
            const data = settingsSnap.data().sendgrid || {};
            sgApiKey = data.apiKey;
            sgSender = data.senderEmail;
            sgName = data.senderName || 'ZAIT & FILTERS';
        }
    } catch (dbError) {
        console.error("Error fetching SendGrid settings from Firestore:", dbError);
    }

    // Fallback to body (for testing from dashboard) or env
    sgApiKey = sgApiKey || req.body.apiKey || process.env.SENDGRID_API_KEY;
    sgSender = sgSender || req.body.senderEmail || process.env.SENDGRID_SENDER_EMAIL;
    sgName = sgName || req.body.senderName || sgName || 'ZAIT & FILTERS';

    if (!sgApiKey || !sgSender) {
        return res.status(400).json({ error: 'Missing SendGrid configuration.' });
    }

    sgMail.setApiKey(sgApiKey);

    // Build the email content
    let emailData = {};

    if (isTest) {
        emailData = {
            to: testEmail,
            from: { email: sgSender, name: sgName },
            subject: 'Zait & Filters - SendGrid Connection Test',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #008a40; margin: 0;">ZAIT & FILTERS</h1>
                        <p style="color: #666; font-size: 14px;">Connection Test Successful</p>
                    </div>
                    <p>Hello,</p>
                    <p>This is a test email to confirm that your <strong>SendGrid</strong> integration with Zait & Filters is configured correctly.</p>
                    <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0; font-size: 14px;"><strong>Status:</strong> Connected</p>
                        <p style="margin: 10px 0 0; font-size: 14px;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                    </div>
                    <p>Your transactional emails are now ready to be sent!</p>
                </div>
            `
        };
    } else {
        const { id, items, total, shippingAddress, customerName } = order;

        const itemsHtml = items.map(item => `
            <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee;">
                    <div style="font-weight: bold; color: #333;">${item.name}</div>
                    <div style="font-size: 12px; color: #666;">Qty: ${item.quantity} x ${item.price} EGP</div>
                </td>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">
                    ${(item.price * item.quantity).toFixed(2)} EGP
                </td>
            </tr>
        `).join('');

        emailData = {
            to: order.customerEmail,
            from: { email: sgSender, name: sgName },
            subject: `Order Confirmation #${id.slice(-6).toUpperCase()} - Zait & Filters`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                    <div style="background: #008a40; padding: 40px 20px; text-align: center; border-radius: 15px 15px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 28px; letter-spacing: 2px;">ZAIT & FILTERS</h1>
                        <p style="color: #e0e0e0; margin-top: 10px;">Thank you for your order!</p>
                    </div>
                    
                    <div style="padding: 30px; border: 1px solid #eee; border-top: none; border-radius: 0 0 15px 15px;">
                        <h2 style="font-size: 18px; border-bottom: 2px solid #008a40; padding-bottom: 10px; margin-bottom: 20px;">Order Summary</h2>
                        <p style="font-size: 14px;">Hi <strong>${customerName}</strong>,</p>
                        <p style="font-size: 14px; line-height: 1.6;">Your order has been placed successfully and is being processed. Below are your order details:</p>
                        
                        <div style="background: #fbfbfb; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                            <p style="margin: 0; font-size: 12px; color: #666;">Order ID: <span style="font-weight: bold; color: #333;">#${id.toUpperCase()}</span></p>
                            <p style="margin: 5px 0 0; font-size: 12px; color: #666;">Date: <span style="font-weight: bold; color: #333;">${new Date().toLocaleDateString()}</span></p>
                        </div>

                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr>
                                    <th style="text-align: left; font-size: 12px; color: #999; text-transform: uppercase;">Product</th>
                                    <th style="text-align: right; font-size: 12px; color: #999; text-transform: uppercase;">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHtml}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td style="padding: 20px 0 0; font-weight: bold; font-size: 16px;">Total Amount</td>
                                    <td style="padding: 20px 0 0; text-align: right; font-weight: bold; font-size: 18px; color: #008a40;">${total} EGP</td>
                                </tr>
                            </tfoot>
                        </table>

                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                            <h3 style="font-size: 14px; color: #333; margin-bottom: 10px;">Shipping Address</h3>
                            <p style="font-size: 13px; color: #666; line-height: 1.6; margin: 0;">
                                ${shippingAddress.street}<br>
                                ${shippingAddress.city}, ${shippingAddress.state}<br>
                                ${shippingAddress.phone}
                            </p>
                        </div>

                        <div style="margin-top: 40px; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
                            <p style="font-size: 12px; color: #999;">If you have any questions, reply to this email or contact us at ${sgSender}</p>
                            <p style="font-size: 10px; color: #ccc; margin-top: 10px;">&copy; ${new Date().getFullYear()} Zait & Filters. All rights reserved.</p>
                        </div>
                    </div>
                </div>
            `
        };
    }

    try {
        await sgMail.send(emailData);
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('SendGrid Error:', error);
        if (error.response) {
            console.error(error.response.body);
            return res.status(500).json({ error: error.response.body.errors[0].message });
        }
        return res.status(500).json({ error: 'Failed to send email.' });
    }
}
