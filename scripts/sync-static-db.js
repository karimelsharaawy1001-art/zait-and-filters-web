import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
};



async function syncAllData() {
    console.log('🚀 Starting Robust Static Database Sync...');

    // Ensure data dirs exist
    const DATA_DIR = path.join(__dirname, '../public/data');
    const SRC_DATA_DIR = path.join(__dirname, '../src/data');

    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(SRC_DATA_DIR)) fs.mkdirSync(SRC_DATA_DIR, { recursive: true });

    try {
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);

        // Tracker for products to ensure we generate inventory.json even if sync fails
        let productsData = [];

        const syncCollection = async (collectionName, fileName, queryConstraints = []) => {
            try {
                console.log(`📡 Syncing ${collectionName}...`);
                const q = query(collection(db, collectionName), ...queryConstraints);
                const snapshot = await getDocs(q);
                const data = snapshot.docs.map(doc => {
                    const docData = doc.data();
                    return {
                        id: doc.id,
                        ...docData,
                        createdAt: docData.createdAt?.toDate?.() || docData.createdAt,
                        updatedAt: docData.updatedAt?.toDate?.() || docData.updatedAt
                    };
                });

                fs.writeFileSync(path.join(DATA_DIR, fileName), JSON.stringify(data, null, 2));
                console.log(`✅ ${collectionName} synced (${data.length} records).`);
                return data;
            } catch (err) {
                console.warn(`⚠️  Failed to sync ${collectionName}: ${err.message}`);
                // Try to read existing file to populate return data if possible
                try {
                    const existing = fs.readFileSync(path.join(DATA_DIR, fileName), 'utf8');
                    return JSON.parse(existing);
                } catch (readErr) {
                    console.warn(`   Could not read existing ${collectionName}, returning empty array.`);
                    return [];
                }
            }
        };

        // Sync all core entities with individual error handling
        productsData = await syncCollection('products', 'products-db.json', [where('isActive', '==', true)]);
        await syncCollection('categories', 'categories-db.json');
        await syncCollection('cars', 'cars-db.json');
        await syncCollection('brand_logos', 'brands-db.json');
        await syncCollection('shipping_rates', 'shipping-rates-db.json');

        // EXTRA: Write to src/data/inventory.json
        // Use whatever we got (fresh from DB or stale from file)
        fs.writeFileSync(path.join(SRC_DATA_DIR, 'inventory.json'), JSON.stringify(productsData, null, 2));
        console.log(`📦 Written src/data/inventory.json (${productsData.length} products).`);

        console.log('✨ Static Data Sync Process Finished.');

    } catch (error) {
        // This catches initialization errors
        console.warn('❌ Critical Sync Init Failed:', error.message);
        console.warn('   Proceeding with build using existing local files.');
    }
}

syncAllData();
