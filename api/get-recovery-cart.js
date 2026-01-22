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
        const cartsSnapshot = await db.collection('abandoned_carts')
            .where('recoveryToken', '==', token)
            .limit(1)
            .get();

        if (cartsSnapshot.empty) {
            return res.status(404).json({ error: 'Cart not found' });
        }

        const cart = cartsSnapshot.docs[0].data();

        // Optional: Mark as partially recovered or increment view count
        await cartsSnapshot.docs[0].ref.update({
            lastViewedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return res.status(200).json({
            items: cart.items,
            customerName: cart.customerName
        });

    } catch (error) {
        console.error('Error fetching recovery cart:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
