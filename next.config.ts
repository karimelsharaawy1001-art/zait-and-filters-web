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
    EASYKASH_API_KEY: process.env.EASYKASH_API_KEY || 'apdj858gekt0naz1',
    EASYKASH_HMAC_SECRET: process.env.EASYKASH_HMAC_SECRET || '87ca3d5640dc3f5809d3dfbf4a5045ad',
    EASYKASH_MERCHANT_ID: process.env.EASYKASH_MERCHANT_ID || 'DNH7034',
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