import admin from 'firebase-admin';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./firebase-service-account.json', 'utf8'));
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

async function peek() {
    const snap = await db.collection('orders').limit(5).get();
    console.log(`Total Firebase Orders: ${snap.size}`);
    snap.forEach(doc => {
        console.log(`--- Order: ${doc.id} ---`);
        console.log(JSON.stringify(doc.data(), null, 2));
    });
    process.exit(0);
}
peek();
