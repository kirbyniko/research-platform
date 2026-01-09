const path = require('path');
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disabled static export to enable API routes and database
  // output: 'export',
  images: {
    unoptimized: true,
  },
  // Ensure Next.js uses this workspace as the root for file tracing
  outputFileTracingRoot: path.join(__dirname),
  
  // Enable experimental features for proper server-side rendering
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      // Avoid bundling these heavy ESMs; load at runtime in Node
      config.externals.push('pdf-parse', 'pdfjs-dist');
    }
    return config;
  },
  
  // Security headers for production
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      },
      {
        // API routes get additional CORS restrictions
        source: '/api/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate'
          }
        ]
      }
    ];
  },
}

module.exports = nextConfig
