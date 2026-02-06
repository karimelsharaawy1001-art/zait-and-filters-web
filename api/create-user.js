const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}

const db = admin.firestore();

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Verify admin authentication
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized - No token provided' });
        }

        const token = authHeader.split('Bearer ')[1];
        let decodedToken;

        try {
            decodedToken = await admin.auth().verifyIdToken(token);
        } catch (error) {
            return res.status(401).json({ error: 'Unauthorized - Invalid token' });
        }

        // Check if user is admin
        const userDoc = await db.collection('users').doc(decodedToken.uid).get();
        if (!userDoc.exists || !userDoc.data().isAdmin) {
            return res.status(403).json({ error: 'Forbidden - Admin access required' });
        }

        // Extract customer data from request
        const { fullName, email, phoneNumber, secondaryPhone, address, password } = req.body;

        if (!fullName || !email || !password) {
            return res.status(400).json({ error: 'Missing required fields: fullName, email, password' });
        }

        // Create Firebase Auth user
        let userRecord;
        try {
            userRecord = await admin.auth().createUser({
                email: email,
                password: password,
                displayName: fullName,
                phoneNumber: phoneNumber || undefined, // Only set if provided
            });
        } catch (authError) {
            console.error('Firebase Auth Error:', authError);

            // Handle specific errors
            if (authError.code === 'auth/email-already-exists') {
                return res.status(400).json({ error: 'Email already exists' });
            }
            if (authError.code === 'auth/phone-number-already-exists') {
                return res.status(400).json({ error: 'Phone number already exists' });
            }
            if (authError.code === 'auth/invalid-email') {
                return res.status(400).json({ error: 'Invalid email format' });
            }
            if (authError.code === 'auth/weak-password') {
                return res.status(400).json({ error: 'Password is too weak (min 6 characters)' });
            }

            return res.status(500).json({ error: 'Failed to create authentication account' });
        }

        // Create Firestore user document
        try {
            await db.collection('users').doc(userRecord.uid).set({
                fullName: fullName,
                email: email,
                phoneNumber: phoneNumber || '',
                secondaryPhone: secondaryPhone || '',
                address: address || '',
                isAffiliate: false,
                isBlocked: false,
                isAdmin: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        } catch (firestoreError) {
            console.error('Firestore Error:', firestoreError);

            // If Firestore fails, delete the Auth user to maintain consistency
            try {
                await admin.auth().deleteUser(userRecord.uid);
            } catch (deleteError) {
                console.error('Failed to rollback Auth user:', deleteError);
            }

            return res.status(500).json({ error: 'Failed to create user profile' });
        }

        // Return success with user details
        return res.status(200).json({
            success: true,
            user: {
                id: userRecord.uid,
                email: userRecord.email,
                fullName: fullName,
                phoneNumber: phoneNumber || '',
            }
        });

    } catch (error) {
        console.error('Unexpected error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
