import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, limit } from 'firebase/firestore';
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

async function testQuery() {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    try {
        console.log('🧪 Simulating Admin Query: make="CHEVROLET", model="OPTRA", isActive=true');
        const q = query(
            collection(db, 'products'),
            where('make', '==', 'CHEVROLET'),
            where('model', '==', 'OPTRA'),
            where('isActive', '==', true),
            limit(10)
        );

        const snapshot = await getDocs(q);
        console.log(`📊 Query returned ${snapshot.size} products.`);

        if (snapshot.size > 0) {
            snapshot.docs.forEach(d => {
                const data = d.data();
                console.log(`- [${d.id}] ${data.name} | make=${data.make} | model=${data.model} | active=${data.isActive}`);
            });
        } else {
            console.log('❌ NO PRODUCTS FOUND. Checking for variations...');
            // Try without isActive
            const q2 = query(
                collection(db, 'products'),
                where('make', '==', 'CHEVROLET'),
                where('model', '==', 'OPTRA'),
                limit(1)
            );
            const sn2 = await getDocs(q2);
            if (sn2.size > 0) {
                console.log('💡 Found one without active filter. Data:', sn2.docs[0].data());
            } else {
                console.log('🚫 Still nothing. Checking for hidden spaces in values...');
                const sn3 = await getDocs(query(collection(db, 'products'), limit(100)));
                sn3.docs.forEach(d => {
                    const data = d.data();
                    if (String(data.model).includes('OPTRA')) {
                        console.log(`Potential hidden chars in [${data.model}]: length=${data.model.length}, characters=[${data.model.split('').map(c => c.charCodeAt(0)).join(',')}]`);
                    }
                });
            }
        }
    } catch (error) {
        console.error('💥 Query Error:', error);
    }
}

testQuery();
