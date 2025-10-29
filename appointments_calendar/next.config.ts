import type { NextConfig } from "next";
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  
  // Transpile packages for Sentry
  transpilePackages: ['@sentry/nextjs'],
  
  // Image optimization
  images: {
    domains: ['www.zone-meet.com'],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=(), payment=(), usb=()'
          }
        ]
      }
    ];
  },
  
  // Redirect non-www to www (SEO best practice)
  async redirects() {
    return [
      {
        source: '/(.*)',
        has: [
          {
            type: 'host',
            value: 'zone-meet.com',
          },
        ],
        destination: 'https://www.zone-meet.com/:path*',
        permanent: true,
      },
    ];
  },
};

// Wrap with Sentry config for enhanced error tracking
export default withSentryConfig(
  nextConfig,
  {
    // Sentry Build Configuration
    silent: process.env.NODE_ENV === 'production', // Less verbose in production
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    
    // Upload source maps for better error tracking but hide from client
    sourcemaps: {
      disable: false, // Enable source map upload
      deleteSourcemapsAfterUpload: true, // Remove source maps after upload to Sentry
    },
    
    // Automatically tree-shake Sentry logger statements for production
    disableLogger: process.env.NODE_ENV === 'production',
    
    // Automatically instrument API routes and middleware
    automaticVercelMonitors: false, // Since you're using Render, not Vercel
  }
);
