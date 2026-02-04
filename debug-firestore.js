import admin from 'firebase-admin';

// Initialize Firebase Admin check
if (!admin.apps.length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } else {
        admin.initializeApp();
    }
}

const db = admin.firestore();

async function checkConfig() {
    try {
        const doc = await db.collection('payment_configs').doc('easykash').get();
        if (doc.exists) {
            console.log('EasyKash Config found:', JSON.stringify(doc.data(), null, 2));
        } else {
            console.log('EasyKash Config not found in Firestore.');
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

checkConfig();
