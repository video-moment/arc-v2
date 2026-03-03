import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/arc/:path*',
        destination: 'http://localhost:3200/api/arc/:path*',
      },
      {
        source: '/api/admin/:path*',
        destination: 'http://localhost:3200/api/admin/:path*',
      },
    ];
  },
};

export default nextConfig;
