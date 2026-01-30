import admin from 'firebase-admin';

// Initialize Firebase Admin
if (!admin.apps.length) {
    try {
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } else {
            admin.initializeApp();
        }
    } catch (error) {
        console.error('Firebase Admin initialization failed:', error);
    }
}

const db = admin.firestore();

export default async function handler(req, res) {
    const { id, slug } = req.query;

    try {
        const blogRef = db.collection('blog_posts');

        // 1. Fetch single post by ID or Slug
        if (id || slug) {
            let docSnap;
            if (id) {
                docSnap = await blogRef.doc(id).get();
            } else {
                const q = await blogRef.where('slug', '==', slug).limit(1).get();
                docSnap = q.docs[0];
            }

            if (!docSnap || !docSnap.exists) {
                return res.status(404).json({ error: 'Post not found' });
            }

            const data = docSnap.data();
            // Optional: Only show published posts via API unless explicitly authenticated (simpler just to check isActive)
            // if (!data.isActive) return res.status(404).json({ error: 'Post not found' });

            return res.status(200).json({ id: docSnap.id, ...data });
        }

        // 2. Fetch all published posts
        // We fetch all and sort in memory to avoid "Missing Index" errors in Firestore
        // for queries combining filtering (isActive) and ordering (createdAt).
        const snapshot = await blogRef.get();
        const posts = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(post => post.isActive !== false || post.status === 'published')
            .sort((a, b) => {
                const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
                const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
                return dateB - dateA;
            });

        // Add Cache-Control for Vercel (1 second fresh, 1 hour stale-while-revalidate)
        res.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate=3600');

        return res.status(200).json(posts);
    } catch (error) {
        console.error('Fatal error in blog API:', error);
        return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
}
