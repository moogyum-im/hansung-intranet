/** @type {import('next').NextConfig} */

import nextPWA from '@ducanh2912/next-pwa';

const withPWA = nextPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: true, // SW 캐싱 비활성화 - 구형 UI 캐시 문제 방지
  cleanupOutdatedCaches: true,
  runtimeCaching: [],
});

const nextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 0,
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dzouudutnlgaolzlsfzb.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/chat-files/**',
      },
    ],
  },
};

export default withPWA(nextConfig);