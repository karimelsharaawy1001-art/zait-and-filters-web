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

                    if (relatedProducts.length < 5) {
                        const carQueryAlt = await productsRef
                            .where('isActive', '==', true)
                            .where('car_make', '==', make)
                            .where('car_model', '==', model)
                            .limit(10)
                            .get();
                        addProducts(carQueryAlt);
                    }
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

                // Priority 3: Global Popularity (Fallback - No OrderBy to avoid index issues)
                if (relatedProducts.length < 8) {
                    const popularQuery = await productsRef
                        .where('isActive', '==', true)
                        .limit(10)
                        .get();
                    addProducts(popularQuery);
                }

                // Priority 4: Absolute Fallback (Total backup)
                if (relatedProducts.length < 4) {
                    const backupQuery = await productsRef
                        .limit(10)
                        .get();
                    addProducts(backupQuery);
                }

                return res.status(200).json(relatedProducts.slice(0, 8));
            } catch (err) {
                console.error("[API/Products] getRelated error:", err);
                return res.status(200).json([]);
            }
        }

        // 3. Removed: Sync Action moved to articles.js

        // 4. Feed Generation (Consolidated)
        if (action === 'generateFeed') {
            const productsSnap = await productsRef.where('isActive', '==', true).get();
            const products = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const settingsSnap = await db.collection('settings').doc('general').get();
            const settings = settingsSnap.exists ? settingsSnap.data() : {};
            const baseUrl = process.env.SITE_URL || 'https://zait-and-filters-web.vercel.app';
            const platform = req.query.platform; // 'google' or 'facebook'

            let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
    <channel>
        <title>${settings.siteName || 'Zait &amp; Filters'}</title>
        <link>${baseUrl}</link>
        <description>${settings.siteDescription || 'Genuine Spirits &amp; Auto Filters'}</description>
`;

            products.forEach(product => {
                const title = (product.nameEn || product.name || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                const description = (product.descriptionEn || product.description || 'Genuine auto part').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                const price = product.price || 0;
                const link = `${baseUrl}/product/${product.id}`;
                const imageLink = product.imageUrl || '';
                const availability = product.stock > 0 ? (platform === 'facebook' ? 'in stock' : 'in_stock') : (platform === 'facebook' ? 'out of stock' : 'out_of_stock');
                const brand = product.partBrand || 'Zait &amp; Filters';

                xml += `        <item>
            <g:id>${product.id}</g:id>
            <g:title>${title}</g:title>
            <g:description>${description}</g:description>
            <g:link>${link}</g:link>
            <g:image_link>${imageLink}</g:image_link>
            <g:condition>new</g:condition>
            <g:availability>${availability}</g:availability>
            <g:price>${price} EGP</g:price>
            <g:brand>${brand}</g:brand>
        </item>
`;
            });

            xml += `    </channel>
</rss>`;

            res.setHeader('Content-Type', 'text/xml');
            return res.status(200).send(xml);
        }

        return res.status(400).json({ error: 'Invalid action or missing parameters' });
    } catch (error) {
        console.error('Fatal error in products API:', error);
        return res.status(200).json([]); // Always return an array to prevent frontend crash
    }
}
