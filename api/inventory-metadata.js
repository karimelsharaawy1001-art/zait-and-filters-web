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
    const { action, make, model } = req.query;

    try {
        const productsRef = db.collection('products');
        let productsQuery = productsRef.where('isActive', '==', true);

        if (action === 'getMakes') {
            const snapshot = await productsQuery.get();
            const makes = [...new Set(snapshot.docs.map(doc => doc.data().make))].filter(Boolean).sort();
            return res.status(200).json(makes);
        }

        if (action === 'getModels' && make) {
            const snapshot = await productsQuery.where('make', '==', make).get();
            const models = [...new Set(snapshot.docs.map(doc => doc.data().model))].filter(Boolean).sort();
            return res.status(200).json(models);
        }

        if (action === 'getYears' && make && model) {
            const snapshot = await productsQuery.where('make', '==', make).where('model', '==', model).get();
            const years = new Set();
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.yearStart && data.yearEnd) {
                    for (let y = Number(data.yearStart); y <= Number(data.yearEnd); y++) {
                        years.add(y);
                    }
                } else if (data.yearStart) {
                    years.add(Number(data.yearStart));
                }
            });
            // Also include legacy "yearRange" if it exists as a single year
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.yearRange && /^\d+$/.test(data.yearRange.toString())) {
                    years.add(Number(data.yearRange));
                }
            });
            return res.status(200).json(Array.from(years).sort((a, b) => b - a));
        }

        return res.status(400).json({ error: 'Invalid action or missing parameters' });
    } catch (error) {
        console.error('Error in inventory-metadata API:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
