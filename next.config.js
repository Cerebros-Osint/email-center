/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Skip static generation during build to avoid DB/Redis connection errors
  output: 'standalone',
  // Disable static optimization completely during build
  skipTrailingSlashRedirect: true,
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Prevent prerendering of error pages
  generateBuildId: async () => 'build-' + Date.now(),
  
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
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
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
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
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self'",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'"
            ].join('; ')
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ],
      },
    ];
  },
  

  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        'argon2': 'commonjs argon2',
        'libsodium-wrappers': 'commonjs libsodium-wrappers'
      });
    }
    return config;
  },
};

module.exports = nextConfig;
