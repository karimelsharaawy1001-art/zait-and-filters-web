import admin from 'firebase-admin';

// Initialize Firebase Admin
if (!admin.apps.length) {
    try {
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } else {
            admin.initializeApp();
        }
    } catch (error) {
        console.error('Firebase Admin initialization failed:', error);
    }
}

const db = admin.firestore();

export default async function handler(req, res) {
    const { action, token } = req.query;

    if (!token) {
        return res.status(400).json({ error: 'Token is required' });
    }

    try {
        const cartsSnapshot = await db.collection('abandoned_carts')
            .where('recoveryToken', '==', token)
            .limit(1)
            .get();

        if (cartsSnapshot.empty) {
            if (action === 'track') {
                return res.redirect(`${process.env.BASE_URL || '/'}`);
            }
            return res.status(404).json({ error: 'Cart not found' });
        }

        const doc = cartsSnapshot.docs[0];
        const cart = doc.data();

        if (action === 'track') {
            // Log the click
            await doc.ref.update({
                clickedAt: admin.firestore.FieldValue.serverTimestamp(),
                lastInteraction: 'email_click'
            });

            const frontendUrl = process.env.BASE_URL || `https://${req.headers.host}`;
            return res.redirect(`${frontendUrl}/recover-cart?token=${token}`);
        }

        if (action === 'fetch') {
            await doc.ref.update({
                lastViewedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            return res.status(200).json({
                items: cart.items,
                customerName: cart.customerName
            });
        }

        return res.status(400).json({ error: 'Invalid action' });

    } catch (error) {
        console.error('Error in recovery API:', error);
        if (action === 'track') {
            return res.redirect('/');
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
}
