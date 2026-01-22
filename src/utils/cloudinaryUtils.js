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
