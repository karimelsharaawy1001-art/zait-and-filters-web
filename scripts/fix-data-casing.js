import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
};

async function fixCasing() {
    console.log('🚀 Starting One-Time Casing Repair...');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    try {
        const snapshot = await getDocs(collection(db, 'products'));
        console.log(`📡 Found ${snapshot.size} products. Scanning for casing issues...`);

        const batch = writeBatch(db);
        let fixCount = 0;

        snapshot.docs.forEach(docSnap => {
            const data = docSnap.data();
            const updates = {};

            // 1. Fix common Typos
            if (data.make === 'CHEVOLET') {
                updates.make = 'CHEVROLET';
            }

            // 2. Normalize Casing
            const currentMake = updates.make || data.make;
            if (currentMake && currentMake !== currentMake.toUpperCase()) {
                updates.make = currentMake.toUpperCase().trim();
            }

            if (data.model && data.model !== data.model.toUpperCase()) {
                updates.model = data.model.toUpperCase().trim();
            }

            if (Object.keys(updates).length > 0) {
                batch.update(docSnap.ref, { ...updates, updatedAt: new Date() });
                fixCount++;
                console.log(`✅ [${data.name}]: ${data.make} -> ${updates.make || data.make} | ${data.model} -> ${updates.model || data.model}`);
            }
        });

        if (fixCount > 0) {
            await batch.commit();
            console.log(`✨ Successfully repaired ${fixCount} products.`);
        } else {
            console.log('😎 No casing issues found.');
        }
    } catch (error) {
        console.error('❌ Repair failed:', error);
    }
}

fixCasing();
