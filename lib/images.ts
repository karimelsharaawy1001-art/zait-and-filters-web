export function optimizeImageUrl(url: string): string {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('res.cloudinary.com')) return url;
  return url.replace('/image/upload/', '/image/upload/f_auto,q_auto/');
}
