import admin from 'firebase-admin';
import * as XLSX from 'xlsx';

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
    // Only allow GET requests
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    try {
        const { format = 'xlsx' } = req.query;
        console.log(`[API/ExportCategories] Starting export process (format: ${format})...`);

        // 1. Fetch Categories
        const categoriesSnapshot = await db.collection('categories').get();
        const categories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`[API/ExportCategories] Fetched ${categories.length} categories.`);

        // 2. Fetch Products for counting
        const productsSnapshot = await db.collection('products').get();
        const products = productsSnapshot.docs.map(doc => doc.data());
        console.log(`[API/ExportCategories] Fetched ${products.length} products total.`);

        // 3. Prepare Export Data
        const exportData = categories.map(cat => {
            // Handle subcategories which might be strings or objects { name, imageUrl }
            const subCatsList = cat.subCategories
                ? cat.subCategories.map(sub => typeof sub === 'string' ? sub : sub.name).join(', ')
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

        // 4. Generate Output
        const worksheet = XLSX.utils.json_to_sheet(exportData);

        if (format === 'csv') {
            const csv = XLSX.utils.sheet_to_csv(worksheet);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="categories_export.csv"');
            return res.status(200).send(csv);
        }

        // Default to XLSX
        // Adjust column widths for better readability
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

    } catch (error) {
        console.error('[API/ExportCategories] Fatal error:', error);
        return res.status(500).json({
            error: 'Failed to generate export file',
            message: error.message
        });
    }
}
