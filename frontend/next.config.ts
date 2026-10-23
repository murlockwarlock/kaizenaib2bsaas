import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import createBundleAnalyzer from '@next/bundle-analyzer';

const withNextIntl = createNextIntlPlugin();
const withBundleAnalyzer = createBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});
const extraAllowedDevOrigins = (process.env.ALLOWED_DEV_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const backendInternalUrl = (process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

const nextConfig: NextConfig = {
  allowedDevOrigins: extraAllowedDevOrigins,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: `${backendInternalUrl}/uploads/:path*`,
      },
    ];
  },
};

export default withBundleAnalyzer(withNextIntl(nextConfig));
