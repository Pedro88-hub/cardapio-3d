import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'modelviewer.dev' },
    ],
  },
  transpilePackages: ['@google/model-viewer'],
  allowedDevOrigins: [
    '*.trycloudflare.com',
    'hands-elimination-producing-fri.trycloudflare.com',
    'trio-mobiles-shadows-guide.trycloudflare.com',
  ],
  headers: async () => [
    {
      source: '/models/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: '*' },
        { key: 'Cache-Control', value: 'public, max-age=86400' },
      ],
    },
  ],
};

export default nextConfig;
