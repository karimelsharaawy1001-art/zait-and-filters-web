import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
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

async function listUniques() {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    try {
        const snapshot = await getDocs(collection(db, 'products'));
        const makes = new Set();
        const modelsByMake = {};

        const productsByMakeCount = {};
        snapshot.docs.forEach(docSnap => {
            const data = docSnap.data();
            const m = data.make || 'EMPTY';
            productsByMakeCount[m] = (productsByMakeCount[m] || 0) + 1;
            makes.add(m);
            if (!modelsByMake[m]) modelsByMake[m] = new Set();
            modelsByMake[m].add(data.model || 'UNKNOWN');
        });

        console.log(`--- UNIQUE MAKES IN PRODUCTS ---`);
        Array.from(makes).sort().forEach(m => {
            console.log(`${m}: ${productsByMakeCount[m]} products (${modelsByMake[m].size} models)`);
        });
        Array.from(makes).sort().forEach(m => {
            console.log(`${m} (${modelsByMake[m].size} models)`);
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

listUniques();
