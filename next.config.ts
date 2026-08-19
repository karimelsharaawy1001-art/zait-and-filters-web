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
    PAYMOB_API_KEY:          process.env.PAYMOB_API_KEY || '',
    PAYMOB_SECRET_KEY:       process.env.PAYMOB_SECRET_KEY || '',
    PAYMOB_PUBLIC_KEY:       process.env.PAYMOB_PUBLIC_KEY || '',
    PAYMOB_HMAC_SECRET:      process.env.PAYMOB_HMAC_SECRET || '',
    PAYMOB_INTEGRATION_IDS:  process.env.PAYMOB_INTEGRATION_IDS || '',
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