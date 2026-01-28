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

async function syncProducts() {
    console.log('🚀 Starting Static Database Sync (SDK Mode)...');

    const DATA_DIR = path.join(__dirname, '../public/data');
    const OUTPUT_FILE = path.join(DATA_DIR, 'products-db.json');

    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }

        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);

        const q = query(collection(db, 'products'), where('isActive', '==', true));
        const snapshot = await getDocs(q);

        const products = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Ensure dates are stringified
                createdAt: data.createdAt?.toDate?.() || data.createdAt,
                updatedAt: data.updatedAt?.toDate?.() || data.updatedAt
            };
        });

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(products, null, 2));
        console.log(`✅ Successfully synced ${products.length} products to static database.`);

    } catch (error) {
        console.error('❌ Sync failed:', error);
        // We don't exit(1) to prevent breaking the build if Firebase is temporarily down,
        // but it's a critical failure for zero-cost scaling.
    }
}

syncProducts();
