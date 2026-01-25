/**
 * Injects Cloudinary transformation parameters into an image URL.
 * Falls back to the original URL if it's not a Cloudinary URL or if transformation fails.
 * @param {string} url - The original image URL.
 * @param {string} transformation - Cloudinary transformation string (e.g., 'f_auto,q_auto,w_500').
 * @returns {string} - The optimized image URL.
 */
export const getOptimizedImage = (url, transformation = 'f_auto,q_auto') => {
    if (!url) return '';

    // Check if it's a Cloudinary URL
    if (url.includes('res.cloudinary.com')) {
        try {
            // URL format: https://res.cloudinary.com/[cloud_name]/image/upload/v[version]/[public_id].[ext]
            // We want to insert transformations after '/upload/'
            const parts = url.split('/upload/');
            if (parts.length === 2) {
                return `${parts[0]}/upload/${transformation}/${parts[1]}`;
            }
        } catch (error) {
            console.warn("Cloudinary transformation failed, returning original URL:", error);
        }
    }

    return url;
};

/**
 * Uploads a file to Cloudinary.
 * @param {File} file - The file to upload.
 * @returns {Promise<string>} - The secure URL of the uploaded image.
 */
export const uploadToCloudinary = async (file) => {
    try {
        // Fetch settings dynamically to ensure we have the latest keys
        const { db } = await import('../firebase');
        const { doc, getDoc } = await import('firebase/firestore');

        const docRef = doc(db, 'settings', 'integrations');
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists() || !docSnap.data().cloudinary) {
            throw new Error('Cloudinary settings not found');
        }

        const settings = docSnap.data().cloudinary;

        if (!settings.cloudName || !settings.uploadPreset) {
            throw new Error('Missing Cloudinary configuration (Cloud Name or Upload Preset)');
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', settings.uploadPreset);

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${settings.cloudName}/image/upload`,
            {
                method: 'POST',
                body: formData,
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Upload failed');
        }

        const data = await response.json();
        return data.secure_url;
    } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        throw error;
    }
};
