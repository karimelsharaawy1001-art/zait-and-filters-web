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
    // Basic security check for cron (Optional: verify secret header)
    // if (req.headers['x-cron-auth'] !== process.env.CRON_SECRET) return res.status(401).end();

    try {
        // Fetch SendGrid settings
        const settingsSnap = await db.collection('settings').doc('integrations').get();
        if (!settingsSnap.exists || !settingsSnap.data().sendgrid) {
            return res.status(400).json({ error: 'SendGrid not configured' });
        }

        const { apiKey, senderEmail, senderName } = settingsSnap.data().sendgrid;
        sgMail.setApiKey(apiKey);

        // Define abandoned window (e.g., > 2 hours ago and < 24 hours ago)
        const twoHoursAgo = new Date();
        twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        const abandonedQuery = await db.collection('abandoned_carts')
            .where('lastModified', '<=', admin.firestore.Timestamp.fromDate(twoHoursAgo))
            .where('lastModified', '>=', admin.firestore.Timestamp.fromDate(twentyFourHoursAgo))
            .where('emailSent', '==', false)
            .where('recovered', '==', false)
            .get();

        if (abandonedQuery.empty) {
            return res.status(200).json({ message: 'No abandoned carts to process.' });
        }

        const recoveryCount = abandonedQuery.size;
        const promises = abandonedQuery.docs.map(async (cartDoc) => {
            const cart = cartDoc.data();
            const baseUrl = process.env.SITE_URL || 'https://zaitandfilters.com';
            const recoveryUrl = `${baseUrl}/cart?recover=${cartDoc.id}`;

            const itemsHtml = cart.items.map(item => `
                <div style="display: flex; align-items: center; padding: 15px 0; border-bottom: 1px solid #f0f0f0;">
                    <img src="${item.image}" alt="${item.name}" style="width: 80px; hieght: 80px; object-fit: contain; border-radius: 8px; margin-right: 15px;">
                    <div style="flex: 1;">
                        <div style="font-weight: bold; color: #333; font-size: 14px;">${item.name}</div>
                        <div style="color: #008a40; font-weight: bold; margin-top: 5px;">${item.price} EGP</div>
                    </div>
                </div>
            `).join('');

            const emailMsg = {
                to: cart.email,
                from: { email: senderEmail, name: senderName },
                subject: 'نسيت حاجة في سلتك؟ - ZAIT & FILTERS',
                html: `
                    <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; color: #333; text-align: right;">
                        <div style="background: #008a40; padding: 30px; text-align: center; border-radius: 15px 15px 0 0;">
                            <h1 style="color: white; margin: 0; font-size: 24px;">ZAIT & FILTERS</h1>
                        </div>
                        
                        <div style="padding: 30px; border: 1px solid #eee; border-top: none; border-radius: 0 0 15px 15px; background: #fff;">
                            <p style="font-size: 18px; font-weight: bold; color: #008a40; margin-bottom: 20px;">يا أهلاً يا ${cart.customerName.split(' ')[0]}،</p>
                            
                            <p style="font-size: 16px; line-height: 1.8; margin-bottom: 25px;">
                                نسيت حاجة في سلتك؟ القطع دي أصلية وعليها ضغط كبير، كمل شروتك دلوقتي عشان تضمن إنها تفضل محجوزة ليك.
                            </p>

                            <div style="background: #fdfdfd; padding: 20px; border: 1px solid #f0f0f0; border-radius: 12px; margin-bottom: 30px;">
                                <h3 style="font-size: 14px; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 15px; color: #999;">المنتجات في سلتك:</h3>
                                ${itemsHtml}
                            </div>

                            <div style="text-align: center; margin-top: 40px;">
                                <a href="${recoveryUrl}" style="display: inline-block; background: #008a40; color: white; padding: 18px 40px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 18px; box-shadow: 0 4px 15px rgba(0,138,64,0.25);">
                                    رجوع للسلة وإتمام الشراء
                                </a>
                            </div>

                            <p style="font-size: 13px; color: #999; text-align: center; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
                                لو عندك أي استفسار، رد على الإيميل ده وهنساعدك فوراً.<br>
                                &copy; ${new Date().getFullYear()} Zait & Filters. All rights reserved.
                            </p>
                        </div>
                    </div>
                `
            };

            await sgMail.send(emailMsg);
            await cartDoc.ref.update({
                emailSent: true,
                emailSentAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });

        await Promise.all(promises);
        return res.status(200).json({ success: true, processed: recoveryCount });

    } catch (error) {
        console.error('Abandoned Cart Worker Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
