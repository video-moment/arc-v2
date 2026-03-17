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
      {
        source: '/api/summarizer/:path*',
        destination: 'http://localhost:3300/api/summarizer/:path*',
      },
      {
        source: '/api/content/:path*',
        destination: 'http://localhost:3300/api/content/:path*',
      },
    ];
  },
};

export default nextConfig;
