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
    const { productId, make, model, year, category, brand } = req.query;

    if (!productId) {
        return res.status(400).json({ error: 'productId is required' });
    }

    try {
        let relatedProducts = [];
        const seenIds = new Set([productId]);

        const addProducts = (snapshot) => {
            snapshot.docs.forEach(doc => {
                if (!seenIds.has(doc.id)) {
                    relatedProducts.push({ id: doc.id, ...doc.data() });
                    seenIds.add(doc.id);
                }
            });
        };

        // 1. Car-Specific Logic (Prioritize same model)
        if (make && model && make !== 'Universal' && model !== 'Universal') {
            const carQuery = await db.collection('products')
                .where('isActive', '!=', false)
                .where('make', '==', make)
                .where('model', '==', model)
                .limit(10)
                .get();
            addProducts(carQuery);
        }

        // 2. Category Logic (Universal or fallback)
        if (relatedProducts.length < 8 && category) {
            const categoryQuery = await db.collection('products')
                .where('isActive', '!=', false)
                .where('category', '==', category)
                .limit(10)
                .get();
            addProducts(categoryQuery);
        }

        // 3. Brand Fallback (Brand within same category)
        if (relatedProducts.length < 8 && category && brand) {
            const brandQuery = await db.collection('products')
                .where('isActive', '!=', false)
                .where('category', '==', category)
                .where('brand', '==', brand)
                .limit(10)
                .get();
            addProducts(brandQuery);
        }

        // Final trimming to 8 products
        return res.status(200).json(relatedProducts.slice(0, 8));

    } catch (error) {
        console.error('Error fetching related products:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
