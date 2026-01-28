import React from 'react';

/**
 * High-Performance Image Component for Zait & Filters
 * Automates Cloudinary transformations to save bandwidth and improve speed.
 * @param {string} src - The original Cloudinary URL
 * @param {string} alt - Accessibility text
 * @param {string} className - Tailwind or CSS classes
 * @param {number} width - Base width for optimization
 * @param {string} loading - 'lazy' or 'eager'
 */
const OptimizedImage = ({ src, alt, className = '', width = 800, loading = 'lazy', ...props }) => {
    // If it's not a Cloudinary image, return standard img
    if (!src || !src.includes('cloudinary.com')) {
        return <img src={src || '/placeholder.png'} alt={alt} className={className} loading={loading} {...props} />;
    }

    try {
        // Inject Cloudinary optimization parameters:
        // f_auto: Automatic format selection (WebP/AVIF)
        // q_auto: Automatic quality optimization
        // w_[width]: Responsive width resizing
        // c_limit: Maintain aspect ratio while limiting width

        let optimizedUrl = src;

        // Check if transformations already exist
        if (src.includes('/upload/')) {
            optimizedUrl = src.replace('/upload/', `/upload/f_auto,q_auto,w_${width},c_limit/`);
        }

        return (
            <img
                src={optimizedUrl}
                alt={alt}
                className={className}
                loading={loading}
                // Provide a lower-res srcSet for mobile if needed
                srcSet={`${optimizedUrl.replace(`w_${width}`, 'w_400')} 400w, ${optimizedUrl} 800w`}
                sizes="(max-width: 640px) 400px, 800px"
                {...props}
            />
        );
    } catch (error) {
        console.warn('Image optimization failed:', error);
        return <img src={src} alt={alt} className={className} loading={loading} {...props} />;
    }
};

export default OptimizedImage;
