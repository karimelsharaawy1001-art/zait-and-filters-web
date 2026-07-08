/**
 * Optimize an image URL for serving.
 *
 * - Cloudinary URLs get auto-format & quality params (f_auto,q_auto)
 * - Supabase Storage URLs are served as-is (transformations require Supabase Pro)
 * - All other URLs are returned unchanged
 */
export function optimizeImageUrl(url: string): string {
  if (!url || typeof url !== 'string') return url;

  // Cloudinary — add auto-format & quality optimizations
  if (url.includes('res.cloudinary.com')) {
    return url.replace('/image/upload/', '/image/upload/f_auto,q_auto/');
  }

  // Supabase Storage & everything else — return as-is
  return url;
}
