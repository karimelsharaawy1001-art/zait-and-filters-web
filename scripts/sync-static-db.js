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

    const DATA_DIR = path.join(__dirname, '../public/data');

    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }

        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);

        const syncCollection = async (collectionName, fileName, queryConstraints = []) => {
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
        };

        // Sync all core entities
        await syncCollection('products', 'products-db.json', [where('isActive', '==', true)]);
        await syncCollection('categories', 'categories-db.json');
        await syncCollection('cars', 'cars-db.json');
        await syncCollection('brand_logos', 'brands-db.json');

        console.log('✨ Global Static Data Sync Complete.');

    } catch (error) {
        console.error('❌ Sync failed:', error);
    }
}

syncAllData();
