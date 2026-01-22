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
    const { token } = req.query;

    if (!token) {
        return res.status(400).json({ error: 'Token is required' });
    }

    try {
        // Find the cart by recovery token
        const cartsSnapshot = await db.collection('abandoned_carts')
            .where('recoveryToken', '==', token)
            .limit(1)
            .get();

        if (cartsSnapshot.empty) {
            console.warn(`No cart found for token: ${token}`);
            // Redirect anyway to a graceful error or home page
            return res.redirect(`${process.env.BASE_URL || ''}/`);
        }

        const doc = cartsSnapshot.docs[0];

        // Log the click
        await doc.ref.update({
            clickedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastInteraction: 'email_click'
        });

        console.log(`Tracked click for cart ${doc.id}`);

        // Redirect to the frontend recovery page
        // The frontend will use the same token to fetch and restore the cart
        const frontendUrl = process.env.BASE_URL || `https://${req.headers.host}`;
        return res.redirect(`${frontendUrl}/recover-cart?token=${token}`);

    } catch (error) {
        console.error('Error tracking recovery click:', error);
        // Fail gracefully with a redirect
        const frontendUrl = process.env.BASE_URL || `https://${req.headers.host}`;
        return res.redirect(frontendUrl);
    }
}
