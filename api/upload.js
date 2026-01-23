import formidable from 'formidable';
import { v2 as cloudinary } from 'cloudinary';
import admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
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

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

export const config = {
    api: {
        bodyParser: false, // Disable built-in body parser for multipart
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const form = new formidable.IncomingForm();

    return new Promise((resolve, reject) => {
        form.parse(req, async (err, fields, files) => {
            if (err) {
                console.error('Form parsing error:', err);
                res.status(500).json({ error: 'Failed to parse form data' });
                return resolve();
            }

            const file = files.file;
            const folder = fields.folder || 'general';

            if (!file) {
                res.status(400).json({ error: 'No file uploaded' });
                return resolve();
            }

            try {
                // Upload to Cloudinary
                const result = await cloudinary.uploader.upload(file.filepath || file.path, {
                    folder: `zait-and-filters/${folder}`,
                });

                // Return the secure URL
                res.status(200).json({
                    url: result.secure_url,
                    public_id: result.public_id
                });
                resolve();
            } catch (error) {
                console.error('Cloudinary upload error:', error);
                res.status(500).json({ error: 'Upload to Cloudinary failed' });
                resolve();
            }
        });
    });
}
