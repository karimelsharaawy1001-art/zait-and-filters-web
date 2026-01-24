import admin from 'firebase-admin';
import sgMail from '@sendgrid/mail';
import { v4 as uuidv4 } from 'uuid';
import { abandonedCartTemplate } from '../_templates/abandoned-cart-email.js';

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Initialize Firebase Admin
if (!admin.apps.length) {
    try {
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } else {
            // Fallback for local dev if default credentials available
            admin.initializeApp();
        }
    } catch (error) {
        console.error('Firebase Admin initialization failed:', error);
    }
}

const db = admin.firestore();

export default async function handler(req, res) {
    console.log('--- Abandoned Cart Cron Job Started ---');

    // Security: Check Vercel Cron Secret (or skip for easier testing if not set)
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && req.headers['authorization'] !== `Bearer ${cronSecret}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const now = new Date();
        const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        console.log(`Checking for carts between ${twentyFourHoursAgo.toISOString()} and ${twoHoursAgo.toISOString()}`);

        // Query abandoned carts that:
        // 1. Have not been emailed yet
        // 2. Have not been recovered/purchased
        // 3. Are between 2 and 24 hours old
        const cartsSnapshot = await db.collection('abandoned_carts')
            .where('emailSent', '==', false)
            .where('recovered', '==', false)
            .where('lastModified', '<=', twoHoursAgo)
            .where('lastModified', '>=', twentyFourHoursAgo)
            .get();

        if (cartsSnapshot.empty) {
            console.log('No abandoned carts found matching criteria.');
            return res.status(200).json({ success: true, message: 'No abandoned carts found.' });
        }

        console.log(`Found ${cartsSnapshot.size} carts to process.`);

        const results = [];
        const baseUrl = process.env.BASE_URL || `https://${req.headers.host}`;

        for (const doc of cartsSnapshot.docs) {
            const cart = doc.data();

            // Safety check: ensure we have an email
            if (!cart.email) {
                console.warn(`Cart ${doc.id} missing email, skipping.`);
                continue;
            }

            const token = uuidv4();
            // Use a tracking link that redirects
            const trackingLink = `${baseUrl}/api/recovery?action=track&token=${token}`;

            // Generate HTML
            const html = abandonedCartTemplate(cart.items || [], trackingLink);

            const msg = {
                to: cart.email,
                from: 'noreply@zaitandfilters.com', // MUST be a verified sender in SendGrid
                subject: 'نسيت حاجة في سلتك؟ 🛒 - ZAIT & FILTERS',
                html: html,
            };

            try {
                await sgMail.send(msg);

                // Update Firestore to avoid duplicate sends
                await doc.ref.update({
                    emailSent: true,
                    emailSentAt: admin.firestore.FieldValue.serverTimestamp(),
                    recoveryToken: token,
                    status: 'recovery_email_sent'
                });

                results.push({ id: doc.id, email: cart.email, status: 'sent' });
                console.log(`Successfully sent recovery email to ${cart.email}`);
            } catch (sendError) {
                console.error(`Failed to send email to ${cart.email}:`, sendError);
                results.push({ id: doc.id, email: cart.email, status: 'error', error: sendError.message });
            }
        }

        return res.status(200).json({
            success: true,
            processed: results.length,
            details: results
        });

    } catch (error) {
        console.error('Fatal error in recovery cron:', error);
        return res.status(500).json({ error: error.message });
    }
}
