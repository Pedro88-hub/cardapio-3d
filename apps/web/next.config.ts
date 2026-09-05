import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'modelviewer.dev' },
    ],
  },
  transpilePackages: ['@google/model-viewer'],
};

export default nextConfig;
