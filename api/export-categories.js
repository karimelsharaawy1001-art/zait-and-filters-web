import admin from 'firebase-admin';
import * as XLSX from 'xlsx';

// Initialize Firebase Admin (Using the same pattern as products.js)
if (!admin.apps.length) {
    try {
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            console.log('[API/Export] Initialized with Service Account');
        } else {
            admin.initializeApp();
            console.warn('[API/Export] Initialized with Default Credentials (Manual Config might be needed)');
        }
    } catch (error) {
        console.error('[API/Export] Firebase Admin initialization failed:', error.message);
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
        console.log(`[API/ExportCategories] Format requested: ${format}`);

        // 1. Fetch Categories
        let categories = [];
        try {
            const categoriesSnapshot = await db.collection('categories').get();
            categories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (catError) {
            console.error('[API/Export] Error fetching categories:', catError.message);
            return res.status(500).json({
                error: 'Failed to fetch categories from database',
                details: catError.message
            });
        }

        // 2. Fetch Products for counting (Optional, won't block if fails)
        let products = [];
        try {
            const productsSnapshot = await db.collection('products').get();
            products = productsSnapshot.docs.map(doc => doc.data());
        } catch (prodError) {
            console.warn('[API/Export] Error fetching products for counts:', prodError.message);
        }

        if (categories.length === 0) {
            return res.status(404).json({ error: 'No categories found in database.' });
        }

        // 3. Prepare Export Data
        const exportData = categories.map(cat => {
            const subCatsList = cat.subCategories
                ? Array.isArray(cat.subCategories)
                    ? cat.subCategories.map(sub => typeof sub === 'string' ? sub : (sub.name || 'Unnamed Sub')).join(', ')
                    : cat.subCategories
                : '';

            const productCount = products.filter(p => p.category === cat.name).length;

            return {
                'Category Name': cat.name || 'Unnamed',
                'Subcategories': subCatsList,
                'Active Status': cat.isActive !== false ? 'Active' : 'Hidden',
                'Product Count': productCount
            };
        });

        // 4. Generate & Send File
        const worksheet = XLSX.utils.json_to_sheet(exportData);

        if (format === 'csv') {
            const csv = XLSX.utils.sheet_to_csv(worksheet);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="categories_export_${Date.now()}.csv"`);
            return res.status(200).send(csv);
        }

        // Default: XLSX
        const wscols = [
            { wch: 30 }, // Category Name
            { wch: 60 }, // Subcategories
            { wch: 15 }, // Active Status
            { wch: 15 }  // Product Count
        ];
        worksheet['!cols'] = wscols;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Categories");
        const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="categories_export_${Date.now()}.xlsx"`);
        return res.status(200).send(buf);

    } catch (error) {
        console.error('[API/Export] Fatal error:', error);
        return res.status(500).json({
            error: 'An unexpected internal error occurred',
            details: error.message
        });
    }
}
