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
    const { action, make, model, productId, category, brand } = req.query;
    console.log(`[API/Products] Action: ${action}, Make: ${make}, Model: ${model}`);

    try {
        const productsRef = db.collection('products');
        let productsQuery = productsRef.where('isActive', '==', true);

        // 1. Inventory Metadata Actions
        if (action === 'getMakes') {
            try {
                const snapshot = await productsQuery.get();
                if (snapshot.empty) return res.status(200).json([]);

                const rawData = snapshot.docs.map(doc => doc.data());
                // Handle both 'make' and 'car_make' fields
                const makes = [...new Set(rawData.map(d => d.make || d.car_make))].filter(Boolean).sort();
                return res.status(200).json(makes);
            } catch (err) {
                console.error("[API/Products] getMakes error:", err);
                return res.status(200).json([]); // Suppress 500, return empty
            }
        }

        if (action === 'getModels' && make) {
            try {
                const snapshot = await productsQuery.where('make', '==', make).get();
                const snapshotAlt = await productsQuery.where('car_make', '==', make).get();

                const rawData = [
                    ...snapshot.docs.map(doc => doc.data()),
                    ...snapshotAlt.docs.map(doc => doc.data())
                ];

                const models = [...new Set(rawData.map(d => d.model || d.car_model))].filter(Boolean).sort();
                return res.status(200).json(models);
            } catch (err) {
                console.error("[API/Products] getModels error:", err);
                return res.status(200).json([]);
            }
        }

        if (action === 'getYears' && make && model) {
            try {
                const snapshot = await productsQuery.where('make', '==', make).where('model', '==', model).get();
                const snapshotAlt = await productsQuery.where('car_make', '==', make).where('car_model', '==', model).get();

                const docs = [...snapshot.docs, ...snapshotAlt.docs];
                const years = new Set();
                docs.forEach(doc => {
                    const data = doc.data();
                    if (data.yearStart && data.yearEnd) {
                        for (let y = Number(data.yearStart); y <= Number(data.yearEnd); y++) {
                            years.add(y);
                        }
                    } else if (data.yearStart) {
                        years.add(Number(data.yearStart));
                    }
                });
                return res.status(200).json(Array.from(years).sort((a, b) => b - a));
            } catch (err) {
                console.error("[API/Products] getYears error:", err);
                return res.status(200).json([]);
            }
        }

        // 2. Related Products Action
        if (action === 'getRelated' && productId) {
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

                // Priority 1: Same Make & Model
                if (make && model && make !== 'Universal' && model !== 'Universal') {
                    const carQuery = await productsRef
                        .where('isActive', '==', true)
                        .where('make', '==', make)
                        .where('model', '==', model)
                        .limit(10)
                        .get();
                    addProducts(carQuery);
                }

                // Priority 2: Same Category
                if (relatedProducts.length < 8 && category) {
                    const categoryQuery = await productsRef
                        .where('isActive', '==', true)
                        .where('category', '==', category)
                        .limit(10)
                        .get();
                    addProducts(categoryQuery);
                }

                // Priority 3: Global Best Sellers (Fallback)
                if (relatedProducts.length < 8) {
                    const popularQuery = await productsRef
                        .where('isActive', '==', true)
                        .orderBy('soldCount', 'desc')
                        .limit(10)
                        .get();
                    addProducts(popularQuery);
                }

                return res.status(200).json(relatedProducts.slice(0, 8));
            } catch (err) {
                console.error("[API/Products] getRelated error:", err);
                return res.status(200).json([]);
            }
        }

        return res.status(400).json({ error: 'Invalid action or missing parameters' });
    } catch (error) {
        console.error('Fatal error in products API:', error);
        return res.status(200).json([]); // Always return an array to prevent frontend crash
    }
}
