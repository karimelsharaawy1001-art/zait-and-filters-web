import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'assets.wuiltstore.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: '**' },
    ],
  },
  env: {
    PAYMOB_API_KEY:         process.env.PAYMOB_API_KEY || '',
    PAYMOB_HMAC_SECRET:     process.env.PAYMOB_HMAC_SECRET || '',
    PAYMOB_INTEGRATION_ID:  process.env.PAYMOB_INTEGRATION_ID || '',
    PAYMOB_IFRAME_ID:       process.env.PAYMOB_IFRAME_ID || '',
    PAYMOB_IFRAME_BASE:     process.env.PAYMOB_IFRAME_BASE || '',
  },
  async rewrites() {
    return [
      {
        source: '/api/merchant-feed.xml',
        destination: '/api/merchant-feed',
      },
    ];
  },
};

export default nextConfig;
