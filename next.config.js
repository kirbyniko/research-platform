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
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      // Avoid bundling these heavy ESMs; load at runtime in Node
      config.externals.push('pdf-parse', 'pdfjs-dist');
    }
    return config;
  },
}

module.exports = nextConfig
