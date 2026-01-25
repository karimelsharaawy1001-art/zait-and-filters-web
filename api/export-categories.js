import admin from 'firebase-admin';
import * as XLSX from 'xlsx';

// Initialize Firebase Admin
if (!admin.apps.length) {
    try {
        console.log('[API/Init] Initializing Firebase Admin...');
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            console.log('[API/Init] Using FIREBASE_SERVICE_ACCOUNT env var');
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            console.log('[API/Init] Firebase initialized with service account');
        } else {
            console.warn('[API/Init] No service account found, using default credentials');
            admin.initializeApp();
        }
    } catch (error) {
        console.error('[API/Init] Firebase Admin initialization failed:', error.message);
        // Throwing here might prevent the handler from even loading
    }
}

const db = admin.firestore();

export default async function handler(req, res) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    try {
        const { format = 'xlsx' } = req.query;
        console.log(`[API/ExportCategories] Starting export process (format: ${format})...`);

        // Ensure DB is available
        const db = admin.apps.length ? admin.firestore() : null;
        if (!db) {
            console.error('[API/ExportCategories] Firestore DB not initialized');
            return res.status(500).json({ error: 'Database connection not initialized. Please check server logs.' });
        }

        // 1. Fetch Categories
        let categories = [];
        try {
            const categoriesSnapshot = await db.collection('categories').get();
            categories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log(`[API/ExportCategories] Fetched ${categories.length} categories.`);
        } catch (catError) {
            console.error('[API/ExportCategories] Error fetching categories:', catError);
            return res.status(500).json({ error: 'Failed to fetch categories from database', details: catError.message });
        }

        // 2. Fetch Products for counting
        let products = [];
        try {
            const productsSnapshot = await db.collection('products').get();
            products = productsSnapshot.docs.map(doc => doc.data());
            console.log(`[API/ExportCategories] Fetched ${products.length} products total.`);
        } catch (prodError) {
            console.warn('[API/ExportCategories] Error fetching products (will proceed with 0 counts):', prodError);
            // We can proceed even if product count fails
        }

        // 3. Prepare Export Data
        const exportData = categories.map(cat => {
            // Handle subcategories which might be strings or objects { name, imageUrl }
            const subCatsList = cat.subCategories
                ? Array.isArray(cat.subCategories)
                    ? cat.subCategories.map(sub => typeof sub === 'string' ? sub : (sub.name || 'Unnamed Sub')).join(', ')
                    : cat.subCategories
                : '';

            // Count products in this category
            const productCount = products.filter(p => p.category === cat.name).length;

            return {
                'Category Name': cat.name || 'Unnamed',
                'Subcategories': subCatsList,
                'Active Status': cat.isActive !== false ? 'Active' : 'Hidden',
                'Product Count': productCount
            };
        });

        if (exportData.length === 0) {
            return res.status(404).json({ error: 'No categories found to export' });
        }

        // 4. Generate Output
        try {
            const worksheet = XLSX.utils.json_to_sheet(exportData);

            if (format === 'csv') {
                const csv = XLSX.utils.sheet_to_csv(worksheet);
                res.setHeader('Content-Type', 'text/csv; charset=utf-8');
                res.setHeader('Content-Disposition', 'attachment; filename="categories_export.csv"');
                return res.status(200).send(csv);
            }

            // Default to XLSX
            const wscols = [
                { wch: 30 }, // Category Name
                { wch: 60 }, // Subcategories
                { wch: 15 }, // Active Status
                { wch: 15 }  // Product Count
            ];
            worksheet['!cols'] = wscols;

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Categories");

            // 5. Create Buffer and Send Response
            const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename="categories_export.xlsx"');

            return res.status(200).send(buf);
        } catch (xlsxError) {
            console.error('[API/ExportCategories] XLSX generation error:', xlsxError);
            return res.status(500).json({ error: 'Failed to generate file format', details: xlsxError.message });
        }

    } catch (error) {
        console.error('[API/ExportCategories] Fatal error:', error);
        return res.status(500).json({
            error: 'An unexpected error occurred during export',
            message: error.message
        });
    }
}
