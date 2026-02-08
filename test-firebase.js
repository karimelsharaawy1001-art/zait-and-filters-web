import admin from 'firebase-admin';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./firebase-service-account.json', 'utf8'));
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

async function test() {
    try {
        const snap = await db.collection('settings').limit(1).get();
        console.log(`Successfully read settings. Count: ${snap.size}`);
    } catch (error) {
        console.error("Firebase Test Error:", error.message);
    }
    process.exit(0);
}
test();
