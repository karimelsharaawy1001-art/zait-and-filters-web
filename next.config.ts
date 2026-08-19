import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Enable modern formats for better compression
    formats: ['image/avif', 'image/webp'],
    // Cache optimized images for 1 year
    minimumCacheTTL: 31536000,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'assets.wuiltstore.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  env: {
    PAYMOB_API_KEY:                 process.env.PAYMOB_API_KEY || '',
    PAYMOB_HMAC_SECRET:             process.env.PAYMOB_HMAC_SECRET || '',
    PAYMOB_INTEGRATION_ID_CARDS:    process.env.PAYMOB_INTEGRATION_ID_CARDS || '',
    PAYMOB_INTEGRATION_ID_WALLETS:  process.env.PAYMOB_INTEGRATION_ID_WALLETS || '',
    PAYMOB_IFRAME_ID_CARDS:         process.env.PAYMOB_IFRAME_ID_CARDS || '',
    PAYMOB_IFRAME_BASE:             process.env.PAYMOB_IFRAME_BASE || '',
    PAYMOB_IFRAME_ID_WALLETS:       process.env.PAYMOB_IFRAME_ID_WALLETS || '',
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