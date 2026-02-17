import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ['images.unsplash.com', 'supabase.co'], // Add your image domains
  },
  env: {
  EASYKASH_API_KEY: process.env.EASYKASH_API_KEY || 'apdj858gekt0naz1',
  EASYKASH_HMAC_SECRET: process.env.EASYKASH_HMAC_SECRET || '87ca3d5640dc3f5809d3dfbf4a5045ad',
  EASYKASH_MERCHANT_ID: process.env.EASYKASH_MERCHANT_ID || 'DNH7034',
},
};

export default nextConfig;