import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';
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

async function check() {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const q = query(collection(db, 'users'), limit(5));
    const snap = await getDocs(q);
    console.log('--- User Samples ---');
    snap.docs.forEach(d => console.log(JSON.stringify(d.data(), null, 2)));
    
    // Check total count (rough estimate via snapshot size if not too many)
    const allSnap = await getDocs(collection(db, 'users'));
    console.log('--- Total Users ---');
    console.log(allSnap.size);
}

check();
